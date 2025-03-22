import yfinance as yf
import asyncio
import logging
import pandas as pd
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yfinance_debug")

async def debug_price_update(ticker='AAPL'):
    try:
        logger.info(f"Debugging price update for ticker: {ticker}")
        
        # Check library version
        logger.info(f"YFinance Version: {yf.__version__}")
        
        # Get current price (same approach as in yahoo_finance_client.py get_current_price method)
        logger.info("Fetching current price data...")
        ticker_obj = yf.Ticker(ticker)
        
        # Get historical data for 1 day (same as in the client code)
        logger.info("Fetching 1-day history for current price...")
        history = ticker_obj.history(period="1d")
        
        logger.info("Raw history data:")
        print(history)
        
        logger.info("History data types:")
        print(history.dtypes)
        
        if not history.empty:
            latest = history.iloc[-1]
            logger.info("Latest price data (detailed):")
            for col_name, value in latest.items():
                print(f"{col_name}: {value} (type: {type(value)})")
            
            # Create the same result dictionary as in yahoo_finance_client.py
            result = {
                "price": float(latest['Close']),
                "volume": int(latest['Volume']),
                "timestamp": datetime.now(),
                "source": "yahoo_finance"
            }
            
            logger.info("Final price result dictionary (as used in the app):")
            print(json.dumps(result, default=str, indent=2))
        else:
            logger.warning("No price data available")
        
        # Now let's test the batch price functionality
        logger.info("\nTesting batch price functionality...")
        batch = [ticker, "MSFT", "GOOGL"]
        batch_str = " ".join(batch)
        
        logger.info(f"Downloading batch data for: {batch_str}")
        batch_data = yf.download(batch_str, period="1d", group_by="ticker")
        
        logger.info("Raw batch data structure:")
        print(type(batch_data))
        print(batch_data.shape)
        
        # Print the columns to understand the structure
        logger.info("Batch data columns:")
        print(batch_data.columns)
        
        logger.info("Batch data sample:")
        print(batch_data.head())
        
        # Process the batch data as in the yahoo_finance_client.py
        logger.info("Processing batch data:")
        batch_results = {}
        
        if len(batch) == 1:
            # Single ticker case
            logger.info("Processing as single ticker")
            if not batch_data.empty:
                latest = batch_data.iloc[-1]
                print(f"Latest single ticker data: {latest}")
        else:
            # Multi-ticker case
            logger.info("Processing as multiple tickers")
            for t in batch:
                logger.info(f"Processing ticker: {t}")
                if t in batch_data and not batch_data[t].empty:
                    ticker_data = batch_data[t]
                    logger.info(f"Data for {t}:")
                    print(ticker_data)
                    
                    if not ticker_data.empty:
                        latest = ticker_data.iloc[-1]
                        logger.info(f"Latest data for {t}:")
                        
                        # Check if Close is available and how to access it
                        if "Close" in latest:
                            close_price = latest["Close"]
                            logger.info(f"Close price type: {type(close_price)}")
                            logger.info(f"Close price value: {close_price}")
                            
                            # Handle the case where Close might be a Series
                            if hasattr(close_price, "iloc"):
                                logger.info("Close price is a Series, accessing first element")
                                close_price = close_price.iloc[0]
                                logger.info(f"Close price after iloc: {close_price}")
                            
                            batch_results[t] = {
                                "price": float(close_price),
                                "timestamp": datetime.now(),
                                "volume": int(latest["Volume"]) if "Volume" in latest else None,
                                "source": "yahoo_finance"
                            }
                else:
                    logger.warning(f"No data found for {t} in batch results")
        
        logger.info("Final batch processing results:")
        print(json.dumps(batch_results, default=str, indent=2))
        
    except Exception as e:
        logger.error(f"Error in yfinance price update debugging: {e}")
        import traceback
        traceback.print_exc()

# Option to run with command line arguments
async def main():
    import sys
    ticker = 'AAPL'  # Default
    
    if len(sys.argv) > 1:
        ticker = sys.argv[1]
        
    await debug_price_update(ticker)

if __name__ == "__main__":
    asyncio.run(main())