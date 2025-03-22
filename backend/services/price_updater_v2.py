"""
Enhanced price updater that uses multiple data sources and is decoupled from
portfolio calculations.
"""
import os
import logging
import asyncio
import databases
import sqlalchemy
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Set
from dotenv import load_dotenv

# Import our modules
from .api_clients.market_data_manager import MarketDataManager
from .utils.common import record_system_event, update_system_event
from redis_cache import FastCache

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("price_updater_v2")

# Initialize Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL)

class PriceUpdaterV2:
    """
    Enhanced price updater that uses multiple data sources.
    This is decoupled from portfolio calculations.
    """
    
    def __init__(self):
        """Initialize the price updater with necessary clients"""
        self.database = database
        self.market_data = MarketDataManager()
    
    async def connect(self):
        """Connect to the database"""
        if not self.database.is_connected:
            await self.database.connect()
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.database.is_connected:
            await self.database.disconnect()
    
    async def get_active_tickers(self) -> List[str]:
        """
        Get all active tickers from the database
        
        Returns:
            List of active ticker symbols
        """
        query = """
            SELECT ticker 
            FROM securities 
            WHERE active = true
        """
        
        result = await self.database.fetch_all(query)
        return [row['ticker'] for row in result]
    
    async def mark_ticker_unavailable(self, ticker: str) -> None:
        """
        Mark a ticker as unavailable
        
        Args:
            ticker: Ticker symbol to mark as unavailable
        """
        query = """
            UPDATE securities 
            SET on_yfinance = false
            WHERE ticker = :ticker
        """
        
        await self.database.execute(query, {"ticker": ticker})
        logger.warning(f"Marked ticker {ticker} as unavailable")
    
# In price_updater_v2.py - update_security_prices method

    async def update_security_prices(self, tickers=None, max_tickers=None) -> Dict[str, Any]:
            """
            Update current prices for securities using multiple data sources
            
            Args:
                tickers: Optional list of specific tickers to update
                max_tickers: Maximum number of tickers to update (for testing)
                
            Returns:
                Summary of updates made
            """
            try:
                await self.connect()
                
                # Record the start of this operation
                event_id = await record_system_event(
                    self.database, 
                    "price_update", 
                    "started", 
                    {"source": "multiple", "tickers": tickers}
                )
                
                # Start timing
                start_time = datetime.now()
                
                # Get tickers with source availability info
                if tickers:
                    # If specific tickers provided, get their source availability info
                    placeholders = ', '.join([f"'{ticker}'" for ticker in tickers])
                    query = f"""
                        SELECT 
                            ticker, 
                            on_yfinance, 
                            on_polygon
                        FROM securities 
                        WHERE ticker IN ({placeholders})
                        AND active = true
                    """
                else:
                    # Get all active tickers with their source availability info
                    query = """
                    SELECT 
                        ticker, 
                        on_yfinance, 
                        on_polygon
                    FROM securities 
                    WHERE active = true
                    """
                
                ticker_data = await self.database.fetch_all(query)
                
                # Organize tickers by preferred data source
                polygon_tickers = []
                yfinance_tickers = []
                unavailable_tickers = []
                
                for row in ticker_data:
                    ticker = row["ticker"]
                    # Check Polygon first (preferred source)
                    if row["on_polygon"] is None or row["on_polygon"] == True:
                        polygon_tickers.append(ticker)
                    # Then check Yahoo Finance
                    elif row["on_yfinance"] is None or row["on_yfinance"] == True:
                        yfinance_tickers.append(ticker)
                    else:
                        # Ticker isn't available on any source
                        unavailable_tickers.append(ticker)
                
                # Apply max_tickers limit if specified
                all_available_tickers = polygon_tickers + yfinance_tickers
                if max_tickers and len(all_available_tickers) > max_tickers:
                    # Maintain the source priority when limiting
                    total_to_process = max_tickers
                    polygon_count = min(len(polygon_tickers), total_to_process)
                    yfinance_count = min(len(yfinance_tickers), total_to_process - polygon_count)
                    
                    polygon_tickers = polygon_tickers[:polygon_count]
                    yfinance_tickers = yfinance_tickers[:yfinance_count]
                
                logger.info(f"Processing {len(polygon_tickers)} tickers with Polygon and {len(yfinance_tickers)} with Yahoo Finance")
                logger.info(f"Skipping {len(unavailable_tickers)} unavailable tickers")
                
                # Track statistics
                update_count = 0
                polygon_success = 0
                yfinance_success = 0
                sources_used = set()
                price_updates = {}
                processed_tickers = set()
                failed_tickers = []
                
                # Try Polygon tickers first
                if polygon_tickers:
                    logger.info(f"Fetching prices from Polygon for {len(polygon_tickers)} tickers")
                    polygon_source = self.market_data.sources.get("polygon")
                    
                    if polygon_source:
                        polygon_results = await polygon_source.get_batch_prices(polygon_tickers)
                        sources_used.add("polygon")
                        
                        # Process successful results
                        for ticker, data in polygon_results.items():
                            # Update the security record
                            await self.database.execute(
                                """
                                UPDATE securities 
                                SET 
                                    current_price = :price, 
                                    last_updated = :timestamp,
                                    price_timestamp = :price_timestamp_str,
                                    data_source = :source,
                                    on_polygon = TRUE
                                WHERE ticker = :ticker
                                """,
                                {
                                    "ticker": ticker,
                                    "price": data["price"],
                                    "timestamp": datetime.utcnow(),
                                    "price_timestamp_str": data.get("price_timestamp_str"),
                                    "source": "polygon"
                                }
                            )
                            
                            # Add to price history
                            await self.database.execute(
                                """
                                INSERT INTO price_history 
                                (ticker, close_price, timestamp, date, source)
                                VALUES (:ticker, :price, :timestamp, :date, :source)
                                ON CONFLICT (ticker, date) DO UPDATE
                                SET close_price = :price, timestamp = :timestamp, source = :source
                                """,
                                {
                                    "ticker": ticker,
                                    "price": data["price"],
                                    "timestamp": datetime.utcnow(),
                                    "date": datetime.utcnow().date(),
                                    "source": "polygon"
                                }
                            )
                            
                            # Store update information
                            price_updates[ticker] = {
                                "price": data["price"],
                                "source": "polygon",
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            
                            processed_tickers.add(ticker)
                            update_count += 1
                            polygon_success += 1
                        
                        # Identify failed Polygon tickers to try with Yahoo Finance
                        failed_polygon_tickers = [t for t in polygon_tickers if t not in processed_tickers]
                        logger.info(f"{len(failed_polygon_tickers)} tickers failed with Polygon, adding to Yahoo Finance queue")
                        
                        # Mark tickers not found on Polygon
                        for ticker in failed_polygon_tickers:
                            await self.database.execute(
                                "UPDATE securities SET on_polygon = FALSE WHERE ticker = :ticker",
                                {"ticker": ticker}
                            )
                            
                        # Add failed Polygon tickers to Yahoo Finance queue if they're not already known to be unavailable
                        yfinance_tickers.extend(failed_polygon_tickers)
                
                # Process Yahoo Finance tickers
                if yfinance_tickers:
                    logger.info(f"Fetching prices from Yahoo Finance for {len(yfinance_tickers)} tickers")
                    yf_source = self.market_data.sources.get("yahoo_finance")
                    
                    if yf_source:
                        yf_results = await yf_source.get_batch_prices(yfinance_tickers)
                        sources_used.add("yahoo_finance")
                        
                        # Process successful results
                        for ticker, data in yf_results.items():
                            # Skip if we already processed this ticker with Polygon
                            if ticker in processed_tickers:
                                continue
                                
                            # Update the security record - don't set on_yfinance=FALSE on timeout
                            # Find this section of code in update_security_prices
                            await self.database.execute(
                                """
                                UPDATE securities 
                                SET 
                                    current_price = :price, 
                                    last_updated = :timestamp,
                                    price_timestamp = :price_timestamp,
                                    day_open = :day_open,
                                    day_high = :day_high,
                                    day_low = :day_low,
                                    volume = :volume,
                                    data_source = :source
                                WHERE ticker = :ticker
                                """,
                                {
                                    "ticker": ticker,
                                    "price": data["price"],
                                    "timestamp": datetime.utcnow(),
                                    "price_timestamp": data.get("price_timestamp"),
                                    "day_open": data.get("day_open"),  
                                    "day_high": data.get("day_high"),  
                                    "day_low": data.get("day_low"),    
                                    "volume": data.get("volume"),
                                    "source": "yahoo_finance"
                                }
                            )

                            await self.database.execute(
                                """
                                INSERT INTO price_history 
                                (ticker, close_price, day_open, day_high, day_low, volume, timestamp, date, price_timestamp, source)
                                VALUES (:ticker, :price, :day_open, :day_high, :day_low, :volume, :timestamp, :date, :price_timestamp, :source)
                                ON CONFLICT (ticker, date) DO UPDATE
                                SET close_price = :price, 
                                    day_open = :day_open,
                                    day_high = :day_high,
                                    day_low = :day_low,
                                    volume = :volume,
                                    timestamp = :timestamp, 
                                    price_timestamp = :price_timestamp,
                                    source = :source
                                """,
                                {
                                    "ticker": ticker,
                                    "price": data["price"],
                                    "day_open": data.get("day_open"),  
                                    "day_high": data.get("day_high"),  
                                    "day_low": data.get("day_low"),    
                                    "volume": data.get("volume"),
                                    "timestamp": datetime.utcnow(),
                                    "date": datetime.utcnow().date(),
                                    "price_timestamp": data.get("price_timestamp"),
                                    "source": "yahoo_finance"
                                }
                            )
                            
                            # Store update information
                            price_updates[ticker] = {
                                "price": data["price"],
                                "source": "yahoo_finance",
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            
                            processed_tickers.add(ticker)
                            update_count += 1
                            yfinance_success += 1
                        
                        # Identify failed Yahoo Finance tickers
                        failed_yf_tickers = [t for t in yfinance_tickers if t not in processed_tickers]
                        
                        # Don't automatically mark as unavailable - YF timeouts shouldn't be treated as "not found"
                        failed_tickers.extend(failed_yf_tickers)
                        logger.warning(f"{len(failed_yf_tickers)} tickers failed with Yahoo Finance")
                
                # Calculate duration
                duration = (datetime.now() - start_time).total_seconds()
                
                # Record completion
                result = {
                    "total_tickers_evaluated": len(ticker_data),
                    "unavailable_tickers_count": len(unavailable_tickers),
                    "updated_count": update_count,
                    "polygon_success": polygon_success,
                    "yfinance_success": yfinance_success,
                    "failed_tickers_count": len(failed_tickers),
                    "sources_used": list(sources_used),
                    "duration_seconds": duration
                }
                
                await update_system_event(
                    self.database,
                    event_id,
                    "completed",
                    result
                )
                
                logger.info(f"Price update completed: {update_count} tickers updated in {duration:.2f} seconds")
                logger.info(f"Sources used: {', '.join(sources_used)}")
                logger.info(f"Polygon: {polygon_success} tickers, Yahoo Finance: {yfinance_success} tickers")
                
                # After successful update, invalidate relevant caches
                if FastCache.is_available():
                    # Invalidate cached portfolio calculations
                    FastCache.delete_pattern("portfolio:*")
                    
                    # Invalidate cached security data for processed tickers
                    for ticker in processed_tickers:
                        FastCache.delete(f"security:{ticker}")
                        FastCache.delete(f"security_history:{ticker}*")
                        
                    # Invalidate securities list
                    FastCache.delete("securities:all")
                    
                    logger.info(f"Invalidated cache for {len(processed_tickers)} securities")
                
                return result
                
            except Exception as e:
                logger.error(f"Error updating security prices: {str(e)}")
                
                # Record failure
                if 'event_id' in locals() and event_id:
                    await update_system_event(
                        self.database,
                        event_id,
                        "failed",
                        {"error": str(e)},
                        str(e)
                    )
                
                raise
            finally:
                await self.disconnect()
              
    async def update_company_metrics(self, tickers=None, max_tickers=None) -> Dict[str, Any]:
        try:
            await self.connect()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "metrics_update", 
                "started", 
                {"tickers": tickers}
            )
            
            # Start timing
            start_time = datetime.now(timezone.utc)
            
            # Get active tickers
            if tickers:
                placeholders = ', '.join([f"'{ticker}'" for ticker in tickers])
                query = f"""
                    SELECT ticker 
                    FROM securities 
                    WHERE ticker IN ({placeholders})
                    AND (
                        (on_yfinance IS NULL OR on_yfinance = true) 
                        OR 
                        (on_polygon IS NULL OR on_polygon = true)
                    )
                """
                result = await self.database.fetch_all(query)
                all_tickers = [row['ticker'] for row in result]
                
                missing_tickers = set(tickers) - set(all_tickers)
                if missing_tickers:
                    logger.warning(f"Tickers not found in database or unavailable on all sources: {missing_tickers}")
            else:
                query = """
                SELECT ticker 
                FROM securities 
                WHERE active = true 
                AND (
                    (on_yfinance IS NULL OR on_yfinance = true) 
                    OR 
                    (on_polygon IS NULL OR on_polygon = true)
                )
                """
                result = await self.database.fetch_all(query)
                all_tickers = [row['ticker'] for row in result]
            
            # Apply max_tickers limit if specified
            if max_tickers and len(all_tickers) > max_tickers:
                selected_tickers = all_tickers[:max_tickers]
            else:
                selected_tickers = all_tickers
                
            logger.info(f"Updating metrics for {len(selected_tickers)} securities")
            
            # Track statistics
            update_count = 0
            unavailable_count = 0
            not_found_tickers = []  # Track tickers not found on any source
            sources_used = set()
            metrics_updates = {}
            updated_tickers = set()
            
            # Process each ticker individually
            for ticker in selected_tickers:
                try:
                    # Get company metrics
                    metrics = await self.market_data.get_company_metrics(ticker)
                    
                    # Check if metrics are completely unavailable
                    if not metrics or metrics.get("not_found"):
                        logger.warning(f"No metrics available for {ticker}")
                        unavailable_count += 1
                        not_found_tickers.append(ticker)
                        
                        # Mark the ticker as unavailable on YFinance
                        await self.database.execute(
                            """
                            UPDATE securities 
                            SET 
                                on_yfinance = FALSE,
                                last_metrics_update = NOW()
                            WHERE ticker = :ticker
                            """,
                            {"ticker": ticker}
                        )
                        
                        continue
                    
                    # Prepare update dictionary with type conversion and safe casting
                    update_data = {
                        "ticker": ticker,
                        "company_name": str(metrics.get("company_name", ""))[:255],
                        "sector": str(metrics.get("sector", ""))[:100],
                        "industry": str(metrics.get("industry", ""))[:100],
                        "market_cap": metrics.get("market_cap"),
                        "current_price": metrics.get("current_price"),
                        "previous_close": metrics.get("previous_close"),
                        "day_open": metrics.get("day_open"),
                        "day_low": metrics.get("day_low"),
                        "day_high": metrics.get("day_high"),
                        "volume": metrics.get("volume"),
                        "average_volume": metrics.get("average_volume"),
                        "pe_ratio": metrics.get("pe_ratio"),
                        "forward_pe": metrics.get("forward_pe"),
                        "beta": metrics.get("beta"),
                        "fifty_two_week_low": metrics.get("fifty_two_week_low"),
                        "fifty_two_week_high": metrics.get("fifty_two_week_high"),
                        "market_cap": metrics.get("market_cap"),
                        "timestamp": datetime.now(timezone.utc),
                        "source": metrics.get("source", "unknown"),
                        "eps": metrics.get("eps"),
                        "forward_eps": metrics.get("forward_eps"),
                        "fifty_two_week_range": metrics.get("fifty_two_week_range"),
                        "target_median_price": metrics.get("target_median_price"),
                        "bid_price": metrics.get("bid_price"),
                        "ask_price": metrics.get("ask_price")
                    }
                    
                    # Type-safe column mapping with conversion
                    column_mapping = {
                        "current_price": ("current_price", float),
                        "previous_close": ("previous_close", float),
                        "day_open": ("day_open", float),
                        "day_low": ("day_low", float), 
                        "day_high": ("day_high", float),
                        "volume": ("volume", int),
                        "average_volume": ("average_volume", int),
                        "pe_ratio": ("pe_ratio", float),
                        "forward_pe": ("forward_pe", float),
                        "dividend_rate": ("dividend_rate", float),
                        "dividend_yield": ("dividend_yield", float),
                        "target_high_price": ("target_high_price", float),
                        "target_low_price": ("target_low_price", float),
                        "target_mean_price": ("target_mean_price", float),
                        "beta": ("beta", float),
                        "fifty_two_week_low": ("fifty_two_week_low", float),
                        "fifty_two_week_high": ("fifty_two_week_high", float),
                        "eps": ("eps", float),
                        "forward_eps": ("forward_eps", float),
                        "bid_price": ("bid_price", float),
                        "ask_price": ("ask_price", float),
                        "target_median_price": ("target_median_price", float),
                        "fifty_two_week_range": ("fifty_two_week_range", str)
                    }
                    
                    for key in ['market_cap', 'target_mean_price']:
                        if key in update_data and update_data[key] is not None:
                            try:
                                update_data[key] = float(update_data[key])
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert {key} for {ticker}")
                                # Set to None if conversion fails
                                update_data[key] = None
                    
                    # Add columns to update with type conversion
                    for metric_key, (db_column, conversion_func) in column_mapping.items():
                        if metric_key in metrics and metrics[metric_key] is not None:
                            try:
                                update_data[db_column] = conversion_func(metrics[metric_key])
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert {metric_key} for {ticker}")
                                
                    # Add this right before executing the database query
                    if "timestamp" in update_data and update_data["timestamp"] is not None:
                        if update_data["timestamp"].tzinfo is not None:
                            # Remove timezone info for PostgreSQL
                            update_data["timestamp"] = update_data["timestamp"].replace(tzinfo=None)
                    
                    # Construct dynamic SQL query
                    query = """
                    UPDATE securities 
                    SET 
                        company_name = CAST(:company_name AS VARCHAR),
                        sector = CAST(:sector AS VARCHAR),
                        industry = CAST(:industry AS VARCHAR),
                        market_cap = CAST(:market_cap AS NUMERIC),
                        current_price = CAST(:current_price AS NUMERIC),
                        previous_close = CAST(:previous_close AS NUMERIC),
                        day_open = CAST(:day_open AS NUMERIC),
                        day_low = CAST(:day_low AS NUMERIC),
                        day_high = CAST(:day_high AS NUMERIC),
                        volume = CAST(:volume AS BIGINT),
                        average_volume = CAST(:average_volume AS BIGINT),
                        pe_ratio = CAST(:pe_ratio AS NUMERIC),
                        forward_pe = CAST(:forward_pe AS NUMERIC),
                        dividend_rate = CAST(:dividend_rate AS NUMERIC),
                        dividend_yield = CAST(:dividend_yield AS NUMERIC),
                        target_high_price = CAST(:target_high_price AS NUMERIC),
                        target_low_price = CAST(:target_low_price AS NUMERIC),
                        target_mean_price = CAST(:target_mean_price AS NUMERIC),
                        target_median_price = CAST(:target_median_price AS NUMERIC),
                        beta = CAST(:beta AS NUMERIC),
                        fifty_two_week_low = CAST(:fifty_two_week_low AS NUMERIC),
                        fifty_two_week_high = CAST(:fifty_two_week_high AS NUMERIC),
                        fifty_two_week_range = CAST(:fifty_two_week_range AS TEXT),
                        eps = CAST(:eps AS NUMERIC),
                        forward_eps = CAST(:forward_eps AS NUMERIC),
                        bid_price = CAST(:bid_price AS NUMERIC),
                        ask_price = CAST(:ask_price AS NUMERIC),
                        last_metrics_update = CAST(:timestamp AS TIMESTAMP),
                        metrics_source = CAST(:source AS VARCHAR),
                        on_yfinance = CASE WHEN :source = 'yahoo_finance' THEN TRUE ELSE on_yfinance END
                    WHERE ticker = :ticker
                    """
                    
                    # Log the update data for debugging
                    logger.info(f"Update data for {ticker}: {update_data}")
                    
                    # Execute the update
                    await self.database.execute(query, update_data)
                    
                    # Store metrics information for response
                    metrics_updates[ticker] = {
                        "company_name": update_data.get("company_name"),
                        "sector": update_data.get("sector"),
                        "current_price": update_data.get("current_price"),
                        "source": update_data.get("source"),
                        "timestamp": datetime.now().replace(tzinfo=None),
                    }
                    
                    updated_tickers.add(ticker)
                    update_count += 1
                    
                except Exception as e:
                    logger.error(f"Error updating metrics for {ticker}: {str(e)}")
                    logger.error(f"Problematic metrics: {metrics}")
                    unavailable_count += 1
                    not_found_tickers.append(ticker)
            
            # Create comprehensive result
            result = {
                "total_tickers": len(selected_tickers),
                "updated_count": update_count,
                "unavailable_count": unavailable_count,
                "not_found_tickers": not_found_tickers,
                "updated_tickers": list(updated_tickers),
                "duration_seconds": (datetime.now(timezone.utc) - start_time).total_seconds()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Comprehensive error updating metrics: {str(e)}")
            raise
        finally:
            await self.disconnect()
            
    async def update_historical_prices(self, tickers=None, max_tickers=None, days=30, batch_size=5) -> Dict[str, Any]:
        """
        Update historical prices for securities with batch processing
        
        Args:
            tickers: Optional list of specific tickers to update
            max_tickers: Maximum number of tickers to update (for testing)
            days: Number of days of history to fetch
            batch_size: Size of batches for API calls
            
        Returns:
            Summary of updates made
        """
        try:
            await self.connect()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "history_update", 
                "started", 
                {"days": days, "tickers": tickers, "batch_size": batch_size}
            )
            
            # Start timing
            start_time = datetime.now()
            
            # Get tickers to update
            if tickers:
                # If specific tickers provided, validate they exist in the database
                placeholders = ', '.join([f"'{ticker}'" for ticker in tickers])
                query = f"""
                    SELECT ticker 
                    FROM securities 
                    WHERE ticker IN ({placeholders})
                """
                result = await self.database.fetch_all(query)
                all_tickers = [row['ticker'] for row in result]
                
                # Check if any requested tickers don't exist
                missing_tickers = set(tickers) - set(all_tickers)
                if missing_tickers:
                    logger.warning(f"Tickers not found in database: {missing_tickers}")
            else:
                # Otherwise get all active tickers
                all_tickers = await self.get_active_tickers()
            
            # Apply max_tickers limit if specified
            if max_tickers and len(all_tickers) > max_tickers:
                selected_tickers = all_tickers[:max_tickers]
            else:
                selected_tickers = all_tickers
                
            logger.info(f"Updating historical prices for {len(selected_tickers)} securities ({days} days)")
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Track statistics
            update_count = 0
            unavailable_count = 0
            price_points_added = 0
            sources_used = set()
            history_updates = {}
            updated_tickers = set()
            
            # Process tickers in batches
            for i in range(0, len(selected_tickers), batch_size):
                batch_tickers = selected_tickers[i:i+batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(selected_tickers) + batch_size - 1)//batch_size}: {batch_tickers}")
                
                try:
                    # Get historical data in batch if Yahoo Finance client supports it
                    yahoo_client = self.market_data.sources.get("yahoo_finance")
                    if hasattr(yahoo_client, "get_batch_historical_prices"):
                        # Use batch method if available
                        batch_results = await yahoo_client.get_batch_historical_prices(
                            batch_tickers, start_date, end_date
                        )
                        sources_used.add("yahoo_finance")
                        
                        # Process each ticker's results from the batch
                        for ticker, ticker_data in batch_results.items():
                            if not ticker_data:
                                logger.warning(f"No historical data available for {ticker} in batch")
                                unavailable_count += 1
                                continue
                                
                            ticker_points = 0
                            # Process each data point
                            for point in ticker_data:
                                try:
                                    # Insert or update price history record
                                    await self.database.execute(
                                        """
                                        INSERT INTO price_history 
                                        (ticker, close_price, day_open, day_high, day_low, volume, timestamp, date, source)
                                        VALUES (:ticker, :close_price, :day_open, :day_high, :day_low, :volume, :timestamp, :date, :source)
                                        ON CONFLICT (ticker, date) DO UPDATE
                                        SET 
                                            close_price = :close_price,
                                            day_open = :day_open,
                                            day_high = :day_high,
                                            day_low = :day_low,
                                            volume = :volume,
                                            timestamp = :timestamp,
                                            source = :source
                                        """,
                                        {
                                            "ticker": ticker,
                                            "close_price": point.get("close_price"),
                                            "day_open": point.get("day_open"),
                                            "day_high": point.get("day_high"),
                                            "day_low": point.get("day_low"),
                                            "volume": point.get("volume"),
                                            "timestamp": point.get("timestamp") or datetime.utcnow(),
                                            "date": point.get("date"),
                                            "source": point.get("source", "unknown")
                                        }
                                    )                        
                                    price_points_added += 1
                                    ticker_points += 1
                                    
                                except Exception as point_error:
                                    logger.error(f"Error adding historical price for {ticker} on {point.get('date')}: {str(point_error)}")
                            
                            # Store summary for this ticker
                            history_updates[ticker] = {
                                "points_added": ticker_points,
                                "date_range": {
                                    "start": start_date.isoformat(),
                                    "end": end_date.isoformat()
                                }
                            }
                            
                            # Update security's last_backfilled timestamp
                            await self.database.execute(
                                """
                                UPDATE securities 
                                SET last_backfilled = :timestamp
                                WHERE ticker = :ticker
                                """,
                                {
                                    "ticker": ticker,
                                    "timestamp": datetime.utcnow()
                                }
                            )
                            
                            updated_tickers.add(ticker)
                            update_count += 1
                    else:
                        # Fall back to individual processing if batch method not available
                        for ticker in batch_tickers:
                            # Process individual ticker (using existing method)
                            historical_data = await self.market_data.get_historical_prices(ticker, start_date, end_date)
                            
                            if not historical_data:
                                logger.warning(f"No historical data available for {ticker}")
                                unavailable_count += 1
                                continue
                            
                            # Track the source that was used
                            for point in historical_data:
                                if "source" in point:
                                    sources_used.add(point["source"])
                                    break
                            
                            ticker_points = 0
                            # Process each data point
                            for point in historical_data:
                                try:
                                    # Insert or update price history record
                                    await self.database.execute(
                                        """
                                        INSERT INTO price_history 
                                        (ticker, close_price, day_open, day_high, day_low, volume, timestamp, date, source)
                                        VALUES (:ticker, :close_price, :day_open, :day_high, :day_low, :volume, :timestamp, :date, :source)
                                        ON CONFLICT (ticker, date) DO UPDATE
                                        SET 
                                            close_price = :close_price,
                                            day_open = :day_open,
                                            day_high = :day_high,
                                            day_low = :day_low,
                                            volume = :volume,
                                            timestamp = :timestamp,
                                            source = :source
                                        """,
                                        {
                                            "ticker": ticker,
                                            "close_price": point.get("close_price"),
                                            "day_open": point.get("day_open"),
                                            "day_high": point.get("day_high"),
                                            "day_low": point.get("day_low"),
                                            "volume": point.get("volume"),
                                            "timestamp": point.get("timestamp") or datetime.utcnow(),
                                            "date": point.get("date"),
                                            "source": point.get("source", "unknown")
                                        }
                                    )                        
                                    price_points_added += 1
                                    ticker_points += 1
                                    
                                except Exception as point_error:
                                    logger.error(f"Error adding historical price for {ticker} on {point.get('date')}: {str(point_error)}")
                            
                            # Store summary for this ticker
                            history_updates[ticker] = {
                                "points_added": ticker_points,
                                "date_range": {
                                    "start": start_date.isoformat(),
                                    "end": end_date.isoformat()
                                }
                            }
                            
                            # Update security's last_backfilled timestamp
                            await self.database.execute(
                                """
                                UPDATE securities 
                                SET last_backfilled = :timestamp
                                WHERE ticker = :ticker
                                """,
                                {
                                    "ticker": ticker,
                                    "timestamp": datetime.utcnow()
                                }
                            )
                            
                            updated_tickers.add(ticker)
                            update_count += 1
                
                except Exception as batch_error:
                    logger.error(f"Error processing batch: {str(batch_error)}")
                    # Continue with the next batch
                
                # Small delay between batches to avoid rate limiting
                await asyncio.sleep(1)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Record completion
            result = {
                "total_tickers": len(selected_tickers),
                "updated_count": update_count,
                "unavailable_count": unavailable_count,
                "price_points_added": price_points_added,
                "sources_used": list(sources_used),
                "history_updates": history_updates,
                "duration_seconds": duration
            }
            
            await update_system_event(
                self.database,
                event_id,
                "completed",
                result
            )
            
            # After successful update, invalidate relevant caches
            if FastCache.is_available():
                # Invalidate security history caches
                for ticker in updated_tickers:
                    FastCache.delete(f"security_history:{ticker}*")
                
                logger.info(f"Invalidated historical data cache for {len(updated_tickers)} securities")
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating historical prices: {str(e)}")
            
            # Record failure
            if event_id:
                await update_system_event(
                    self.database,
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
            
            raise
        finally:
            await self.disconnect()

    async def smart_update(self, update_type="all", max_tickers=None) -> Dict[str, Any]:
            """
            Perform a smart update of security data based on what needs updating most
            
            Args:
                update_type: Type of update to perform (all, prices, metrics, history)
                max_tickers: Maximum number of tickers to update per operation
                
            Returns:
                Summary of updates made
            """
            try:
                await self.connect()
                
                start_time = datetime.now()
                
                # Record the start of this operation
                event_id = await record_system_event(
                    self.database, 
                    "smart_update", 
                    "started", 
                    {"update_type": update_type, "max_tickers": max_tickers}
                )
                
                results = {}
                
                # Determine which tickers need price updates most urgently
                if update_type in ["all", "prices"]:
                    # Find tickers with oldest price updates
                    price_query = """
                    SELECT ticker
                    FROM securities
                    WHERE active = true AND on_yfinance = true
                    ORDER BY COALESCE(last_updated, '1970-01-01') ASC
                    LIMIT :limit
                    """
                    
                    price_tickers = await self.database.fetch_all(
                        price_query, 
                        {"limit": max_tickers or 100}
                    )
                    
                    if price_tickers:
                        price_tickers_list = [row["ticker"] for row in price_tickers]
                        logger.info(f"Smart update: Updating prices for {len(price_tickers_list)} securities")
                        results["prices"] = await self.update_security_prices(
                            tickers=price_tickers_list
                        )
                
                # Determine which tickers need metrics updates most urgently
                if update_type in ["all", "metrics"]:
                    # Find tickers with oldest metrics updates
                    metrics_query = """
                    SELECT ticker
                    FROM securities
                    WHERE active = true AND on_yfinance = true
                    ORDER BY COALESCE(last_metrics_update, '1970-01-01') ASC
                    LIMIT :limit
                    """
                    
                    metrics_tickers = await self.database.fetch_all(
                        metrics_query, 
                        {"limit": max_tickers or 50}  # Fewer tickers for metrics as it's slower
                    )
                    
                    if metrics_tickers:
                        metrics_tickers_list = [row["ticker"] for row in metrics_tickers]
                        logger.info(f"Smart update: Updating metrics for {len(metrics_tickers_list)} securities")
                        results["metrics"] = await self.update_company_metrics(
                            tickers=metrics_tickers_list
                        )
                
                # Determine which tickers need historical data updates most urgently
                if update_type in ["all", "history"]:
                    # Find tickers with oldest historical updates
                    history_query = """
                    SELECT ticker
                    FROM securities
                    WHERE active = true AND on_yfinance = true
                    ORDER BY COALESCE(last_backfilled, '1970-01-01') ASC
                    LIMIT :limit
                    """
                    
                    history_tickers = await self.database.fetch_all(
                        history_query, 
                        {"limit": max_tickers or 20}  # Even fewer tickers for history as it's most intensive
                    )
                    
                    if history_tickers:
                        history_tickers_list = [row["ticker"] for row in history_tickers]
                        logger.info(f"Smart update: Updating historical data for {len(history_tickers_list)} securities")
                        results["history"] = await self.update_historical_prices(
                            tickers=history_tickers_list,
                            days=30  # Default to 30 days of history
                        )
                
                # Calculate duration
                duration = (datetime.now() - start_time).total_seconds()
                
                # Create summary result
                summary = {
                    "update_type": update_type,
                    "duration_seconds": duration,
                    "results": results
                }
                
                # Compute overall statistics
                total_updated = 0
                total_unavailable = 0
                all_sources_used = set()
                
                for key, result in results.items():
                    if "updated_count" in result:
                        total_updated += result["updated_count"]
                    if "unavailable_count" in result:
                        total_unavailable += result["unavailable_count"]
                    if "sources_used" in result:
                        all_sources_used.update(result["sources_used"])
                
                summary["total_updated"] = total_updated
                summary["total_unavailable"] = total_unavailable
                summary["all_sources_used"] = list(all_sources_used)
                
                # Record completion
                await update_system_event(
                    self.database,
                    event_id,
                    "completed",
                    summary
                )
                
                return summary
                
            except Exception as e:
                logger.error(f"Error in smart update: {str(e)}")
                
                # Record failure
                if event_id:
                    await update_system_event(
                        self.database,
                        event_id,
                        "failed",
                        {"error": str(e)},
                        str(e)
                    )
                
                raise
            finally:
                await self.disconnect()
                
    async def update_stale_securities(self, metrics_days_threshold=7, price_days_threshold=1, max_metrics_tickers=50, max_prices_tickers=100) -> Dict[str, Any]:
        """
        Update securities prioritized by staleness of metrics and prices
        """
        try:
            await self.connect()
            
            # Use a timezone-naive datetime for consistency
            start_time = datetime.now()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "stale_update", 
                "started", 
                {
                    "metrics_days_threshold": metrics_days_threshold,
                    "price_days_threshold": price_days_threshold,
                    "max_metrics_tickers": max_metrics_tickers, 
                    "max_prices_tickers": max_prices_tickers
                }
            )
            
            results = {}
            
            # Find tickers with stale metrics (older than metrics_days_threshold days)
            metrics_query = """
            SELECT ticker
            FROM securities
            WHERE active = true
            AND (
                last_metrics_update IS NULL 
                OR last_metrics_update < NOW() - INTERVAL '1 days' * :days
            )
            ORDER BY COALESCE(last_metrics_update, '1970-01-01') ASC
            LIMIT :limit
            """
            
            metrics_tickers = await self.database.fetch_all(
                metrics_query, 
                {"days": metrics_days_threshold, "limit": max_metrics_tickers}
            )
            
            # Find tickers with stale prices (older than price_days_threshold days)
            price_query = """
            SELECT ticker
            FROM securities
            WHERE active = true
            AND (
                last_updated IS NULL 
                OR last_updated < NOW() - INTERVAL '1 days' * :days
            )
            ORDER BY COALESCE(last_updated, '1970-01-01') ASC
            LIMIT :limit
            """
            
            price_tickers = await self.database.fetch_all(
                price_query, 
                {"days": price_days_threshold, "limit": max_prices_tickers}
            )
            
            # Update stale metrics
            if metrics_tickers:
                metrics_tickers_list = [row["ticker"] for row in metrics_tickers]
                logger.info(f"Stale update: Updating metrics for {len(metrics_tickers_list)} securities (not updated in {metrics_days_threshold} days)")
                results["metrics"] = await self.update_company_metrics(
                    tickers=metrics_tickers_list
                )
            else:
                logger.info(f"No stale metrics found (older than {metrics_days_threshold} days)")
                results["metrics"] = {"updated_count": 0, "message": "No stale metrics found"}
            
            # Update stale prices
            if price_tickers:
                price_tickers_list = [row["ticker"] for row in price_tickers]
                logger.info(f"Stale update: Updating prices for {len(price_tickers_list)} securities (not updated in {price_days_threshold} days)")
                results["prices"] = await self.update_security_prices(
                    tickers=price_tickers_list
                )
            else:
                logger.info(f"No stale prices found (older than {price_days_threshold} days)")
                results["prices"] = {"updated_count": 0, "message": "No stale prices found"}
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Create summary result
            summary = {
                "metrics_days_threshold": metrics_days_threshold,
                "price_days_threshold": price_days_threshold,
                "duration_seconds": duration,
                "metrics_count": len(metrics_tickers) if metrics_tickers else 0,
                "prices_count": len(price_tickers) if price_tickers else 0,
                "results": results
            }
            
            # Record completion
            await update_system_event(
                self.database,
                event_id,
                "completed",
                summary
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Error in stale update: {str(e)}")
            
            # Record failure
            if 'event_id' in locals() and event_id:
                await update_system_event(
                    self.database,
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
            
            raise
        finally:
            await self.disconnect()
            

# Standalone execution function
async def run_price_update(update_type: str = "prices", max_tickers: int = None, tickers_list: List[str] = None, days: int = 30):
    updater = PriceUpdaterV2()
    try:
        result = None
        
        if update_type == "prices":
            result = await updater.update_security_prices(tickers=tickers_list, max_tickers=max_tickers)
            print(f"Price update complete: {result}")
        elif update_type == "metrics":
            result = await updater.update_company_metrics(tickers=tickers_list, max_tickers=max_tickers)
            print(f"Metrics update complete: {result}")
        elif update_type == "history":
            result = await updater.update_historical_prices(tickers=tickers_list, max_tickers=max_tickers, days=days)
            print(f"Historical price update complete: {result}")
        elif update_type == "smart":
            result = await updater.smart_update(update_type="all", max_tickers=max_tickers)
            print(f"Smart update complete: {result}")
        elif update_type == "stale":  # Add this case
            metrics_days = 7  # Default value
            price_days = 1    # Default value
            result = await updater.update_stale_securities(
                metrics_days_threshold=metrics_days,
                price_days_threshold=price_days,
                max_metrics_tickers=max_tickers or 50,
                max_prices_tickers=max_tickers or 100
            )
            print(f"Stale update complete: {result}")
        else:
            print(f"Unknown update type: {update_type}")
            
    except Exception as e:
        print(f"Update failed: {str(e)}")

# Update argument parser
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="NestEgg Market Data Updater")
    parser.add_argument("--type", choices=["prices", "metrics", "history", "smart", "stale"], default="smart", help="Type of update to perform")
    parser.add_argument("--max", type=int, help="Maximum number of tickers to process")
    parser.add_argument("--tickers", type=str, help="Comma-separated list of tickers to update")
    parser.add_argument("--days", type=int, default=30, help="Number of days of history to fetch (for history updates)")
    parser.add_argument("--metrics-days", type=int, default=7, help="Days threshold for stale metrics")
    parser.add_argument("--price-days", type=int, default=1, help="Days threshold for stale prices")
    parser.add_argument("--batch-size", type=int, default=5, help="Batch size for API calls (for batched operations)")
    
    args = parser.parse_args()
    
    # Handle tickers argument
    tickers_list = None
    if args.tickers:
        tickers_list = [ticker.strip().upper() for ticker in args.tickers.split(',')]
    
    # Pass the days parameter when calling run_price_update
    if args.type == "history":
        asyncio.run(run_price_update(args.type, args.max, tickers_list, days=args.days))
    elif args.type == "stale":
        # Special case for stale updates
        updater = PriceUpdaterV2()
        asyncio.run(updater.update_stale_securities(
            metrics_days_threshold=args.metrics_days,
            price_days_threshold=args.price_days,
            max_metrics_tickers=args.max or 50,
            max_prices_tickers=args.max or 100
        ))
    else:
        asyncio.run(run_price_update(args.type, args.max, tickers_list))