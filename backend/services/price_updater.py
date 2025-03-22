import os
import asyncio
import yfinance as yf
import databases
import sqlalchemy
import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("price_updater.log"), logging.StreamHandler()]
)
logger = logging.getLogger("price_updater")

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize database connection
database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# Define Securities Table with additional fields and on_yfinance column
securities = sqlalchemy.Table(
    "securities",
    metadata,
    sqlalchemy.Column("ticker", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("name", sqlalchemy.String),
    sqlalchemy.Column("last_queried", sqlalchemy.DateTime, nullable=True),
    sqlalchemy.Column("active", sqlalchemy.Boolean, default=True),
    sqlalchemy.Column("on_yfinance", sqlalchemy.Boolean, default=True),  # New column
    sqlalchemy.Column("current_price", sqlalchemy.Numeric(12,4)),
    sqlalchemy.Column("last_updated", sqlalchemy.DateTime, nullable=True),
    sqlalchemy.Column("price_as_of", sqlalchemy.DateTime, nullable=True),
    sqlalchemy.Column("last_backfilled", sqlalchemy.DateTime, nullable=True),
    sqlalchemy.Column("company_name", sqlalchemy.String),
    sqlalchemy.Column("sector", sqlalchemy.String),
    sqlalchemy.Column("industry", sqlalchemy.String),
    sqlalchemy.Column("pe_ratio", sqlalchemy.Numeric(12,4)),
    sqlalchemy.Column("eps", sqlalchemy.Numeric(12,4)),
    sqlalchemy.Column("market_cap", sqlalchemy.Numeric(20,2)),
    sqlalchemy.Column("avg_volume", sqlalchemy.BigInteger),
    sqlalchemy.Column("dividend_yield", sqlalchemy.Numeric(6,4)),
    sqlalchemy.Column("dividend_rate", sqlalchemy.Numeric(8,4)),
    sqlalchemy.Column("last_metrics_update", sqlalchemy.DateTime, nullable=True)
)

# Define Price History Table
price_history = sqlalchemy.Table(
    "price_history",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("ticker", sqlalchemy.String),
    sqlalchemy.Column("timestamp", sqlalchemy.DateTime),
    sqlalchemy.Column("close_price", sqlalchemy.Numeric(12,4)),
    sqlalchemy.Column("date", sqlalchemy.Date)
)

# Define Dividend History Table
dividend_history = sqlalchemy.Table(
    "dividend_history",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("ticker", sqlalchemy.String),
    sqlalchemy.Column("ex_date", sqlalchemy.Date),
    sqlalchemy.Column("payment_date", sqlalchemy.Date, nullable=True),
    sqlalchemy.Column("amount", sqlalchemy.Numeric(10,4)),
    sqlalchemy.Column("currency", sqlalchemy.String(3)),
    sqlalchemy.Column("is_estimated", sqlalchemy.Boolean, default=False)
)

async def analyze_update_needs():
    """
    Analyze securities table to determine exactly what updates are needed.
    Returns categorized lists of tickers that need different types of updates.
    """
    try:
        await database.connect()
        
        now = datetime.now()
        today = now.date()
        
        # Get all active securities that are available on YFinance
        query = """
            SELECT 
                ticker, 
                last_updated, 
                last_metrics_update, 
                last_backfilled,
                current_price
            FROM securities 
            WHERE active = true AND on_yfinance = true
        """
        securities_data = await database.fetch_all(query)
        
        # Initialize categories
        update_categories = {
            "needs_current_price": [],
            "needs_today_close": [],
            "needs_recent_history": [],
            "needs_backfill": [],
            "needs_metrics_update": []
        }
        
        # Check each security
        for security in securities_data:
            ticker = security['ticker']
            
            # Check if needs current price (hasn't been updated in 30 minutes)
            if not security['last_updated'] or \
               (now - security['last_updated']).total_seconds() > 1800:
                update_categories["needs_current_price"].append(ticker)
            
            # Check if needs today's close (no price for today)
            price_exists_query = """
                SELECT EXISTS(
                    SELECT 1 FROM price_history 
                    WHERE ticker = :ticker AND date = :today
                )
            """
            has_today_price = await database.fetch_val(
                price_exists_query,
                {"ticker": ticker, "today": today}
            )
            
            if not has_today_price:
                update_categories["needs_today_close"].append(ticker)
            
            # Check if needs recent history (missing days in the last week)
            missing_days_query = """
                WITH date_series AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '7 days',
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date as date
                )
                SELECT COUNT(*)
                FROM date_series
                LEFT JOIN price_history ON 
                    price_history.date = date_series.date AND 
                    price_history.ticker = :ticker
                WHERE price_history.id IS NULL AND date_series.date != CURRENT_DATE;
            """
            
            missing_days = await database.fetch_val(missing_days_query, {"ticker": ticker})
            
            if missing_days and missing_days > 0:
                update_categories["needs_recent_history"].append(ticker)
            
            # Check if needs full backfill (never backfilled or over 30 days)
            if not security['last_backfilled'] or \
               (now - security['last_backfilled']).days > 30:
                update_categories["needs_backfill"].append(ticker)
            
            # Check if needs company metrics update (never updated or over 7 days)
            if not security['last_metrics_update'] or \
               (now - security['last_metrics_update']).days > 7:
                update_categories["needs_metrics_update"].append(ticker)
        
        return update_categories
    
    except Exception as e:
        logger.error(f"Error analyzing update needs: {str(e)}")
        return {key: [] for key in ["needs_current_price", "needs_today_close", 
                                   "needs_recent_history", "needs_backfill", 
                                   "needs_metrics_update"]}
    finally:
        await database.disconnect()

async def mark_ticker_unavailable(ticker):
    """Mark a ticker as unavailable on YFinance"""
    try:
        logger.warning(f"Marking ticker {ticker} as unavailable on YFinance")
        await database.execute(
            """
            UPDATE securities 
            SET on_yfinance = false
            WHERE ticker = :ticker
            """,
            {"ticker": ticker}
        )
    except Exception as e:
        logger.error(f"Error marking ticker {ticker} as unavailable: {str(e)}")

async def update_current_prices(tickers, batch_size=20):
    """Update current prices for a list of tickers"""
    if not tickers:
        return
        
    logger.info(f"Updating current prices for {len(tickers)} tickers")
    
    try:
        await database.connect()
        
        # Process in batches to respect API limits
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            ticker_str = ' '.join(batch)
            
            try:
                # Get just current price data
                data = yf.download(ticker_str, period="1d", group_by="ticker")
                now = datetime.utcnow()
                
                for ticker in batch:
                    try:
                        # Handle single vs multiple ticker responses
                        if len(batch) == 1:
                            ticker_data = data
                        else:
                            ticker_data = data[ticker]
                        
                        if not ticker_data.empty:
                            # Get latest price
                            latest = ticker_data.iloc[-1]
                            close_price = float(latest['Close'].iloc[0]) if isinstance(latest['Close'], pd.Series) else float(latest['Close'])
                            
                            # Update securities table only
                            await database.execute(
                                """
                                UPDATE securities 
                                SET current_price = :price, last_updated = :now
                                WHERE ticker = :ticker
                                """,
                                {"ticker": ticker, "price": close_price, "now": now}
                            )
                            
                            logger.debug(f"Updated current price for {ticker}: {close_price}")
                        else:
                            # Mark ticker as not available on YFinance
                            await mark_ticker_unavailable(ticker)
                            
                    except Exception as e:
                        # Check if this is a "ticker not found" type of error
                        error_str = str(e).lower()
                        if "no data" in error_str or "not found" in error_str or "invalid ticker" in error_str:
                            await mark_ticker_unavailable(ticker)
                        else:
                            logger.error(f"Error updating current price for {ticker}: {str(e)}")
                
                # Add delay between batches to respect API limits
                await asyncio.sleep(1)
                
            except Exception as batch_error:
                logger.error(f"Error processing batch for current prices: {str(batch_error)}")
                await asyncio.sleep(10)  # Longer delay if there was an error
                
    except Exception as e:
        logger.error(f"Error in update_current_prices: {str(e)}")
    finally:
        await database.disconnect()

async def update_today_closes(tickers, batch_size=20):
    """Record today's closing prices in price_history table"""
    if not tickers:
        return
        
    logger.info(f"Recording today's close prices for {len(tickers)} tickers")
    
    try:
        await database.connect()
        current_date = datetime.now().date()
        
        # Process in batches to respect API limits
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            ticker_str = ' '.join(batch)
            
            try:
                # Get today's data
                data = yf.download(ticker_str, period="1d", group_by="ticker")
                now = datetime.utcnow()
                
                for ticker in batch:
                    try:
                        # Handle single vs multiple ticker responses
                        if len(batch) == 1:
                            ticker_data = data
                        else:
                            ticker_data = data[ticker]
                        
                        if not ticker_data.empty:
                            # Get latest price
                            latest = ticker_data.iloc[-1]
                            close_price = float(latest['Close'].iloc[0]) if isinstance(latest['Close'], pd.Series) else float(latest['Close'])
                            
                            # Check if we have a constraint on ticker and date in price_history
                            try:
                                # Insert into price_history
                                await database.execute(
                                    """
                                    INSERT INTO price_history 
                                    (ticker, close_price, timestamp, date)
                                    VALUES (:ticker, :close_price, :timestamp, :date)
                                    """,
                                    {
                                        "ticker": ticker,
                                        "close_price": close_price,
                                        "timestamp": now,
                                        "date": current_date
                                    }
                                )
                            except Exception as insert_error:
                                # If insert fails due to constraint, try an update
                                if "duplicate key" in str(insert_error).lower() or "unique constraint" in str(insert_error).lower():
                                    await database.execute(
                                        """
                                        UPDATE price_history
                                        SET close_price = :close_price, timestamp = :timestamp
                                        WHERE ticker = :ticker AND date = :date
                                        """,
                                        {
                                            "ticker": ticker,
                                            "close_price": close_price,
                                            "timestamp": now,
                                            "date": current_date
                                        }
                                    )
                                else:
                                    raise insert_error
                            
                            # Also update securities table
                            await database.execute(
                                """
                                UPDATE securities 
                                SET current_price = :price, last_updated = :now, price_as_of = :now
                                WHERE ticker = :ticker
                                """,
                                {"ticker": ticker, "price": close_price, "now": now}
                            )
                            
                            logger.debug(f"Recorded today's close for {ticker}: {close_price}")
                        else:
                            # Mark ticker as not available on YFinance
                            await mark_ticker_unavailable(ticker)
                            
                    except Exception as e:
                        # Check if this is a "ticker not found" type of error
                        error_str = str(e).lower()
                        if "no data" in error_str or "not found" in error_str or "invalid ticker" in error_str:
                            await mark_ticker_unavailable(ticker)
                        else:
                            logger.error(f"Error recording today's close for {ticker}: {str(e)}")
                
                # Add delay between batches to respect API limits
                await asyncio.sleep(1)
                
            except Exception as batch_error:
                logger.error(f"Error processing batch for today's closes: {str(batch_error)}")
                await asyncio.sleep(10)  # Longer delay if there was an error
                
    except Exception as e:
        logger.error(f"Error in update_today_closes: {str(e)}")
    finally:
        await database.disconnect()

async def update_recent_history(tickers, batch_size=10, days=7):
    """Fill in missing price history for the last few days"""
    if not tickers:
        return
        
    logger.info(f"Updating recent price history for {len(tickers)} tickers")
    
    try:
        await database.connect()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Process each ticker individually for recent history
        for ticker in tickers:
            try:
                # Get historical data for just this ticker
                df = yf.download(ticker, start=start_date, end=end_date)
                
                if not df.empty:
                    # Process each day
                    for date_str, row in df.iterrows():
                        date_key = date_str.strftime("%Y-%m-%d")
                        hist_date = datetime.strptime(date_key, "%Y-%m-%d").date()
                        
                        # Check if we already have this date
                        existing = await database.fetch_one(
                            "SELECT id FROM price_history WHERE ticker = :ticker AND date = :date",
                            {"ticker": ticker, "date": hist_date}
                        )
                        
                        # Only insert if missing
                        if not existing:
                            close_price = float(row['Close'])
                            
                            await database.execute(
                                """
                                INSERT INTO price_history 
                                (ticker, close_price, timestamp, date)
                                VALUES (:ticker, :close_price, :timestamp, :date)
                                """,
                                {
                                    "ticker": ticker,
                                    "close_price": close_price,
                                    "timestamp": datetime.combine(hist_date, datetime.min.time()),
                                    "date": hist_date
                                }
                            )
                            
                    logger.debug(f"Updated recent history for {ticker}")
                else:
                    # Mark ticker as not available on YFinance
                    await mark_ticker_unavailable(ticker)
                
                # Add delay between tickers to respect API limits
                await asyncio.sleep(1)
                
            except Exception as e:
                # Check if this is a "ticker not found" type of error
                error_str = str(e).lower()
                if "no data" in error_str or "not found" in error_str or "invalid ticker" in error_str:
                    await mark_ticker_unavailable(ticker)
                else:
                    logger.error(f"Error updating recent history for {ticker}: {str(e)}")
                await asyncio.sleep(5)  # Longer delay if there was an error
                
    except Exception as e:
        logger.error(f"Error in update_recent_history: {str(e)}")
    finally:
        await database.disconnect()

async def perform_backfill(tickers, batch_size=5):
    """Perform a full historical backfill for the specified tickers"""
    if not tickers:
        return
        
    logger.info(f"Performing historical backfill for {len(tickers)} tickers")
    
    try:
        await database.connect()
        
        # Calculate date range - go back to start of 2023
        end_date = datetime.now()
        start_date = datetime(2023, 1, 1)
        
        # Process in very small batches due to data volume
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            
            for ticker in batch:
                try:
                    # Get full historical data 
                    ticker_obj = yf.Ticker(ticker)
                    df = ticker_obj.history(start=start_date, end=end_date)
                    
                    if not df.empty:
                        # Get existing dates for this ticker
                        existing_dates = await database.fetch_all(
                            "SELECT date FROM price_history WHERE ticker = :ticker",
                            {"ticker": ticker}
                        )
                        
                        existing_date_set = {row['date'].strftime("%Y-%m-%d") for row in existing_dates if row['date']}
                        
                        # Process each day
                        for date_str, row in df.iterrows():
                            date_key = date_str.strftime("%Y-%m-%d")
                            
                            # Skip if we already have this date
                            if date_key in existing_date_set:
                                continue
                                
                            hist_date = datetime.strptime(date_key, "%Y-%m-%d").date()
                            close_price = float(row['Close'])
                            
                            await database.execute(
                                """
                                INSERT INTO price_history 
                                (ticker, close_price, timestamp, date)
                                VALUES (:ticker, :close_price, :timestamp, :date)
                                """,
                                {
                                    "ticker": ticker,
                                    "close_price": close_price,
                                    "timestamp": datetime.combine(hist_date, datetime.min.time()),
                                    "date": hist_date
                                }
                            )
                        
                        # Update last_backfilled timestamp
                        await database.execute(
                            "UPDATE securities SET last_backfilled = :now WHERE ticker = :ticker",
                            {"ticker": ticker, "now": datetime.utcnow()}
                        )
                        
                        logger.info(f"Completed historical backfill for {ticker}")
                    else:
                        # Mark ticker as not available on YFinance
                        await mark_ticker_unavailable(ticker)
                    
                    # Also update company metrics while we have the ticker object
                    await update_company_metrics_for_ticker(ticker, ticker_obj)
                    
                    # Add delay between tickers
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    # Check if this is a "ticker not found" type of error
                    error_str = str(e).lower()
                    if "no data" in error_str or "not found" in error_str or "invalid ticker" in error_str:
                        await mark_ticker_unavailable(ticker)
                    else:
                        logger.error(f"Error performing backfill for {ticker}: {str(e)}")
                    await asyncio.sleep(5)  # Longer delay if there was an error
            
            # Add delay between batches
            await asyncio.sleep(5)
                
    except Exception as e:
        logger.error(f"Error in perform_backfill: {str(e)}")
    finally:
        await database.disconnect()

async def update_company_metrics_for_ticker(ticker, ticker_obj=None):
    """Update company metrics for a specific ticker"""
    try:
        # Create ticker object if not provided
        if ticker_obj is None:
            ticker_obj = yf.Ticker(ticker)
        
        now = datetime.utcnow()
        
        # Get company info
        try:
            info = ticker_obj.info
            
            # Check if ticker is valid (has some basic data)
            if not info or len(info) == 0 or 'symbol' not in info:
                logger.warning(f"No valid data found for ticker {ticker}. Marking as unavailable.")
                await mark_ticker_unavailable(ticker)
                return
        except Exception as info_error:
            logger.warning(f"Failed to get info for {ticker}: {str(info_error)}. Marking as unavailable.")
            await mark_ticker_unavailable(ticker)
            return
        
        # Extract metrics with careful error handling
        metrics = {
            "company_name": info.get("longName") or info.get("shortName") or "",
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "pe_ratio": info.get("trailingPE") or 0.0,
            "eps": info.get("trailingEPS") or 0.0,
            "market_cap": info.get("marketCap") or 0,
            "avg_volume": info.get("averageVolume") or 0,
            "dividend_yield": info.get("dividendYield") or 0.0,
            "dividend_rate": info.get("dividendRate") or 0.0,
            "last_metrics_update": now
        }
        
        # Update securities table
        await database.execute(
            """
            UPDATE securities 
            SET 
                company_name = :company_name,
                sector = :sector,
                industry = :industry,
                pe_ratio = :pe_ratio,
                eps = :eps,
                market_cap = :market_cap,
                avg_volume = :avg_volume,
                dividend_yield = :dividend_yield,
                dividend_rate = :dividend_rate,
                last_metrics_update = :last_metrics_update
            WHERE ticker = :ticker
            """,
            {
                "ticker": ticker,
                **metrics
            }
        )
        
        logger.debug(f"Updated metrics for {ticker}")
            
    except Exception as e:
        # Check if this is a "ticker not found" type of error
        error_str = str(e).lower()
        if ("no data" in error_str or 
            "not found" in error_str or 
            "invalid ticker" in error_str or 
            "failed to get data" in error_str or
            "nonetype" in error_str or
            "index out of range" in error_str or
            "delisted" in error_str):
            
            logger.warning(f"Ticker {ticker} appears unavailable: {str(e)}. Marking as unavailable.")
            await mark_ticker_unavailable(ticker)
        else:
            logger.error(f"Error updating metrics for {ticker}: {str(e)}")

async def update_company_metrics_batch(tickers, batch_size=5):
    """Update company metrics for a batch of tickers"""
    if not tickers:
        return
        
    logger.info(f"Updating company metrics for {len(tickers)} tickers")
    
    try:
        await database.connect()
        
        # Process in small batches
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            
            for ticker in batch:
                try:
                    await update_company_metrics_for_ticker(ticker)
                    # Add delay between tickers
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error updating metrics for {ticker}: {str(e)}")
                    await asyncio.sleep(3)  # Longer delay if there was an error
            
            # Add delay between batches
            await asyncio.sleep(3)
                
    except Exception as e:
        logger.error(f"Error in update_company_metrics_batch: {str(e)}")
    finally:
        await database.disconnect()

async def reset_yfinance_flag(ticker):
    """Reset the on_yfinance flag for a ticker"""
    try:
        await database.connect()
        await database.execute(
            """
            UPDATE securities 
            SET on_yfinance = true
            WHERE ticker = :ticker
            """,
            {"ticker": ticker}
        )
        logger.info(f"Reset on_yfinance flag for {ticker}")
    except Exception as e:
        logger.error(f"Error resetting on_yfinance flag for {ticker}: {str(e)}")
    finally:
        await database.disconnect()

async def check_unavailable_tickers():
    """Check tickers marked as unavailable to see if they're available now"""
    try:
        await database.connect()
        query = "SELECT ticker FROM securities WHERE on_yfinance = false"
        results = await database.fetch_all(query)
        tickers = [row['ticker'] for row in results]
        
        if not tickers:
            logger.info("No unavailable tickers to recheck")
            return
            
        logger.info(f"Rechecking {len(tickers)} unavailable tickers")
        
        # Process in small batches
        batch_size = 5
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            
            for ticker in batch:
                try:
                    ticker_obj = yf.Ticker(ticker)
                    info = ticker_obj.info
                    
                    # Check if we got valid data
                    if info and ('symbol' in info or 'shortName' in info):
                        logger.info(f"Ticker {ticker} is now available. Resetting flag.")
                        await reset_yfinance_flag(ticker)
                except Exception as e:
                    logger.debug(f"Ticker {ticker} is still unavailable: {str(e)}")
                
                await asyncio.sleep(1)
            
            # Add delay between batches
            await asyncio.sleep(3)
            
    except Exception as e:
        logger.error(f"Error checking unavailable tickers: {str(e)}")
    finally:
        await database.disconnect()

async def smart_market_update(max_updates=None):
    """
    Smart market update that analyzes what updates are needed and 
    processes them in priority order, respecting API limits
    """
    logger.info("Starting smart market update")
    
    try:
        # First, analyze what needs to be updated
        update_needs = await analyze_update_needs()
        
        # Log what we found
        for category, tickers in update_needs.items():
            logger.info(f"{category}: {len(tickers)} tickers")
        
        # Apply max_updates limit if specified
        if max_updates:
            for category in update_needs:
                update_needs[category] = update_needs[category][:max_updates]
        
        # Process updates in order of priority (lowest API impact first)
        
        # 1. Update current prices (quick, low impact)
        await update_current_prices(update_needs["needs_current_price"])
        
        # 2. Update today's closes (similar to current prices)
        await update_today_closes(update_needs["needs_today_close"])
        
        # 3. Update metrics (moderate impact)
        await update_company_metrics_batch(update_needs["needs_metrics_update"])
        
        # 4. Update recent history (higher impact)
        await update_recent_history(update_needs["needs_recent_history"])
        
        # 5. Perform backfills (highest impact, do last and limit)
        # Limit backfills to 3 per update to avoid hitting API limits
        backfill_limit = min(3, len(update_needs["needs_backfill"]))
        await perform_backfill(update_needs["needs_backfill"][:backfill_limit])
        
        # 6. Periodically check unavailable tickers (once per day)
        # Only do this check if we've completed a full update
        if datetime.now().hour == 9:  # Do this check once a day at 9 AM
            await check_unavailable_tickers()
        
        logger.info("Smart market update completed")
        
    except Exception as e:
        logger.error(f"Error in smart_market_update: {str(e)}")

async def track_api_usage():
    """
    Create a simple API rate limit tracker
    """
    # Initialize or load API usage counter from file
    api_usage_file = "api_usage.txt"
    
    try:
        if os.path.exists(api_usage_file):
            with open(api_usage_file, "r") as f:
                data = f.read().strip().split(",")
                last_reset = datetime.fromisoformat(data[0])
                count = int(data[1])
        else:
            last_reset = datetime.now()
            count = 0
    
        # Check if we need to reset (Yahoo Finance has a ~2000 request/hour limit)
        now = datetime.now()
        if (now - last_reset).total_seconds() > 3600:  # Reset after an hour
            last_reset = now
            count = 0
    
        return {
            "last_reset": last_reset,
            "count": count,
            "remaining": max(0, 1900 - count)  # Keep 100 requests as buffer
        }
    except Exception as e:
        logger.error(f"Error tracking API usage: {str(e)}")
        return {"last_reset": datetime.now(), "count": 0, "remaining": 1900}

async def increment_api_usage(requests=1):
    """
    Increment the API usage counter
    """
    api_usage_file = "api_usage.txt"
    
    try:
        usage = await track_api_usage()
        usage["count"] += requests
        
        with open(api_usage_file, "w") as f:
            f.write(f"{usage['last_reset'].isoformat()},{usage['count']}")
            
        return usage
    except Exception as e:
        logger.error(f"Error incrementing API usage: {str(e)}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="NestEgg Market Data Updater")
    parser.add_argument("--mode", choices=[
        "smart_update",
        "current_prices", 
        "today_closes",
        "recent_history",
        "backfill",
        "metrics",
        "analyze",
        "check_unavailable",
        "reset_availability"
    ], default="smart_update", help="Operation mode")
    parser.add_argument("--max", type=int, help="Maximum number of securities to update")
    parser.add_argument("--tickers", nargs="+", help="List of specific tickers to process")
    
    args = parser.parse_args()
    
    if args.mode == "smart_update":
        asyncio.run(smart_market_update(args.max))
    elif args.mode == "current_prices":
        if args.tickers:
            asyncio.run(update_current_prices(args.tickers))
        else:
            asyncio.run(update_current_prices([]))            
    elif args.mode == "today_closes":
        if args.tickers:
            asyncio.run(update_today_closes(args.tickers))
        else:
            asyncio.run(update_today_closes([]))
    elif args.mode == "recent_history":
        if args.tickers:
            asyncio.run(update_recent_history(args.tickers))
        else:
            asyncio.run(update_recent_history([]))
    elif args.mode == "backfill":
        if args.tickers:
            asyncio.run(perform_backfill(args.tickers))
        else:
            asyncio.run(perform_backfill([]))
    elif args.mode == "metrics":
        if args.tickers:
            asyncio.run(update_company_metrics_batch(args.tickers))
        else:
            asyncio.run(update_company_metrics_batch([]))
    elif args.mode == "analyze":
        async def print_analysis():
            needs = await analyze_update_needs()
            print("Update needs analysis:")
            for category, tickers in needs.items():
                print(f"{category}: {len(tickers)} tickers")
                if tickers and len(tickers) > 0:
                    print(f"  Sample: {', '.join(tickers[:5])}")
        
        asyncio.run(print_analysis())
    elif args.mode == "check_unavailable":
        asyncio.run(check_unavailable_tickers())
    elif args.mode == "reset_availability":
        async def reset_all_or_specific():
            await database.connect()
            
            if args.tickers:
                for ticker in args.tickers:
                    await reset_yfinance_flag(ticker)
                    print(f"Reset availability flag for {ticker}")
            else:
                query = """
                UPDATE securities 
                SET on_yfinance = true 
                WHERE on_yfinance = false
                """
                result = await database.execute(query)
                print(f"Reset availability flag for all unavailable tickers")
            
            await database.disconnect()
        
        asyncio.run(reset_all_or_specific())            
            