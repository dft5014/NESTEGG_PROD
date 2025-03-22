"""
Yahoo Finance market data source implementation.
Uses the yfinance library for data access.
"""
import os
import logging
import asyncio
import aiohttp
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pytz
import yfinance as yf

from .data_source_interface import MarketDataSource

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yahoo_finance_client")

class YahooFinanceClient(MarketDataSource):
    """
    Client for interacting with Yahoo Finance API.
    Uses the yfinance library for data access.
    """
    
    def __init__(self):
        """Initialize the Yahoo Finance client"""
        # No API key needed
        pass
    
    @property
    def source_name(self) -> str:
        """Return the name of this data source"""
        return "yahoo_finance"
        
    @property
    def daily_call_limit(self) -> Optional[int]:
        """Return the daily API call limit (None if unlimited)"""
        return None  # Yahoo Finance has no formal API limits
    
    async def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get current price for a single ticker
        """
        try:
            # Fetch ticker data
            ticker_obj = yf.Ticker(ticker)
            
            # Get historical data
            history = ticker_obj.history(period="1d")
            
            # Add detailed logging
           # logger.info(f"Raw data from yfinance for single ticker {ticker}:")
           # logger.info(f"Data shape: {history.shape}")
           # logger.info(f"Data columns: {history.columns}")
           # logger.info(f"Data types: {history.dtypes}")
            
            if history.empty:
                logger.warning(f"No price data available for {ticker}")
                return None
            
            # Get the latest price
            latest = history.iloc[-1]
            
            # Log all values from the latest row
           # logger.info(f"Latest data row for {ticker}: {latest}")
           # logger.info(f"Close: {latest.get('Close', 'N/A') if 'Close' in latest else 'Column not found'}")
           # logger.info(f"Open: {latest.get('Open', 'N/A') if 'Open' in latest else 'Column not found'}")
           # logger.info(f"High: {latest.get('High', 'N/A') if 'High' in latest else 'Column not found'}")
           # logger.info(f"Low: {latest.get('Low', 'N/A') if 'Low' in latest else 'Column not found'}")
           # logger.info(f"Volume: {latest.get('Volume', 'N/A') if 'Volume' in latest else 'Column not found'}")
            
            # Extract the actual date from the index
            price_date = history.index[-1]
            logger.info(f"Price date from index: {price_date}")
            
            # Create the return data
            result = {
                "price": float(latest['Close']),
                "day_open": float(latest['Open']) if 'Open' in latest else None,
                "day_high": float(latest['High']) if 'High' in latest else None,
                "day_low": float(latest['Low']) if 'Low' in latest else None,
                "close_price": float(latest['Close']),
                "volume": int(latest['Volume']) if 'Volume' in latest else None,
                "timestamp": datetime.now(),
                "price_timestamp": price_date,
                "price_timestamp_str": price_date.strftime("%Y-%m-%d %H:%M:%S"),
                "source": self.source_name
            }
            
            # Log the final result dict being returned
            logger.info(f"Returning data for {ticker}: {result}")
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting price for {ticker}: {str(e)}")
            return None
    
    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 100) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers
        
        Args:
            tickers: List of ticker symbols
            max_batch_size: Maximum batch size for a single request
            
        Returns:
            Dictionary mapping tickers to their price data
        """
        logger.info(f"Starting batch request for: {tickers}")

        if not tickers:
            return {}
            
        results = {}
        
        # Process in batches to avoid overloading
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i+max_batch_size]
            batch_str = " ".join(batch)
            
            try:
                # Use a separate thread for the yfinance API call
                loop = asyncio.get_event_loop()
                
                # Download data for the batch
                logger.info(f"Requesting data for: {batch_str}")
                data = await loop.run_in_executor(
                    None,
                    lambda: yf.download(batch_str, period="1d", group_by="ticker")
                )
                
              #  logger.info(f"Received data type: {type(data)}")
              #  logger.info(f"Data is empty: {data.empty if hasattr(data, 'empty') else 'N/A'}")
              #  logger.info(f"Data shape: {data.shape if hasattr(data, 'shape') else 'No shape'}")
              #  logger.info(f"Data columns: {list(data.columns) if hasattr(data, 'columns') else 'No columns'}")
                
                # Process results
                if len(batch) == 1:
                    # Handle single ticker case where data is not grouped
                    ticker = batch[0]
                    logger.info(f"Processing single ticker: {ticker}")
                    
                    if not data.empty:
                        try:
                            latest = data.iloc[-1]
                            price_date = data.index[-1]  # Get the actual date from Yahoo
                            
                            # Debug info
                           # logger.info(f"Latest row for {ticker}: {latest}")
                           # logger.info(f"Price date: {price_date}")
                           # logger.info(f"Data columns: {data.columns}")
                           # logger.info(f"Data types: {data.dtypes}")
                            
                            # Check if we have a multi-index DataFrame
                            is_multi_index = isinstance(data.columns, pd.MultiIndex)
                            
                            # Log each OHLCV value specifically based on structure
                            if is_multi_index:
                                # Multi-index case - access with (ticker, field) pattern
                                open_value = latest.get((ticker, 'Open'), 0)
                                high_value = latest.get((ticker, 'High'), 0)
                                low_value = latest.get((ticker, 'Low'), 0)
                                close_price = latest.get((ticker, 'Close'), None)
                                volume_value = latest.get((ticker, 'Volume'), 0)
                                
                               # logger.info(f"Multi-index Open value: {open_value}")
                               # logger.info(f"Multi-index High value: {high_value}")
                               # logger.info(f"Multi-index Low value: {low_value}")
                               # logger.info(f"Multi-index Close value: {close_price}")
                               # logger.info(f"Multi-index Volume value: {volume_value}")
                            else:
                                # Single-index case - direct access
                                open_value = latest.get('Open', 0) if 'Open' in latest else 0
                                high_value = latest.get('High', 0) if 'High' in latest else 0
                                low_value = latest.get('Low', 0) if 'Low' in latest else 0
                                close_price = latest.get('Close', None) if 'Close' in latest else None
                                volume_value = latest.get('Volume', 0) if 'Volume' in latest else 0
                                
                              #  logger.info(f"Open value: {open_value}")
                              #  logger.info(f"High value: {high_value}")
                              #  logger.info(f"Low value: {low_value}")
                              #  logger.info(f"Close value: {close_price}")
                              #  logger.info(f"Volume value: {volume_value}")
                            
                            if close_price is not None:
                                logger.info(f"Extracted values: Open={open_value}, High={high_value}, Low={low_value}, Close={close_price}, Volume={volume_value}")
                                
                                # Create result dictionary
                                result_dict = {
                                    "price": float(close_price),
                                    "day_open": float(open_value),
                                    "day_high": float(high_value),
                                    "day_low": float(low_value),
                                    "close_price": float(close_price),
                                    "volume": int(volume_value) if volume_value else 0,
                                    "timestamp": datetime.now(),
                                    "price_timestamp": price_date,
                                    "price_timestamp_str": price_date.strftime("%Y-%m-%d %H:%M:%S"),
                                    "source": self.source_name
                                }
                                
                                logger.info(f"Result dictionary for {ticker}: {result_dict}")
                                results[ticker] = result_dict
                        except Exception as e:
                            logger.error(f"Error processing batch data for {ticker}: {str(e)}")
                            import traceback
                            logger.error(traceback.format_exc())
                else:
                    # Handle multi-ticker case where data is grouped by ticker
                    logger.info(f"Processing multi-ticker batch: {batch}")
                    
                    # Log the structure of the multi-index dataframe
                  #  logger.info(f"Column index levels: {data.columns.nlevels}")
                  #  logger.info(f"Column index values: {[idx for idx in data.columns]}")
                    
                    for ticker in batch:
                        if ticker in data and not data[ticker].empty:
                            logger.info(f"Processing ticker in batch: {ticker}")
                            
                            ticker_data = data[ticker]
                            latest = ticker_data.iloc[-1]
                            price_date = ticker_data.index[-1]
                            
                            logger.info(f"Latest row for {ticker}: {latest}")
                            logger.info(f"Data columns for {ticker}: {ticker_data.columns}")
                            
                            # Ensure Close is available
                            if "Close" in latest:
                                close_price = latest["Close"]
                                logger.info(f"{ticker} Close: {close_price} (type: {type(close_price)})")
                                
                                # Handle the case where Close might be a Series
                                if hasattr(close_price, "iloc"):
                                    logger.info(f"{ticker} Close is a Series, accessing first element")
                                    close_price = close_price.iloc[0]
                                    logger.info(f"{ticker} Close after iloc: {close_price}")
                                
                                # Handle other price columns that might be Series
                                open_price = latest["Open"]
                                logger.info(f"{ticker} Open: {open_price} (type: {type(open_price)})")
                                if hasattr(open_price, "iloc"):
                                    open_price = open_price.iloc[0]
                                    
                                high_price = latest["High"]
                                logger.info(f"{ticker} High: {high_price} (type: {type(high_price)})")
                                if hasattr(high_price, "iloc"):
                                    high_price = high_price.iloc[0]
                                    
                                low_price = latest["Low"]
                                logger.info(f"{ticker} Low: {low_price} (type: {type(low_price)})")
                                if hasattr(low_price, "iloc"):
                                    low_price = low_price.iloc[0]
                                    
                                volume = latest["Volume"] if "Volume" in latest else None
                                logger.info(f"{ticker} Volume: {volume} (type: {type(volume) if volume is not None else 'None'})")
                                if hasattr(volume, "iloc"):
                                    volume = volume.iloc[0]
                                
                                result_dict = {
                                    "price": float(close_price),
                                    "day_open": float(open_price),     
                                    "day_high": float(high_price),      
                                    "day_low": float(low_price),        
                                    "close_price": float(close_price),
                                    "volume": int(volume) if volume is not None else None,
                                    "price_timestamp": price_date,
                                    "price_timestamp_str": price_date.strftime("%Y-%m-%d %H:%M:%S"),
                                    "source": self.source_name
                                }
                                
                                logger.info(f"Result dictionary for {ticker}: {result_dict}")
                                results[ticker] = result_dict
                            else:
                                logger.error(f"No Close column found for {ticker}")
                
                # Add a short delay to avoid rate limiting
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error in batch lookup for {len(batch)} tickers: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                
                logger.info(f"Data structure: {type(data) if 'data' in locals() else 'No data'}")
                if 'data' in locals() and hasattr(data, 'shape'):
                    logger.info(f"Data shape: {data.shape}")
                if 'data' in locals() and hasattr(data, 'columns'):
                    logger.info(f"Data columns: {list(data.columns)}")
                
                # If batch lookup fails, try individual lookups
                for ticker in batch:
                    try:
                        logger.info(f"Attempting individual lookup for {ticker}")
                        price_data = await self.get_current_price(ticker)
                        if price_data:
                            logger.info(f"Individual lookup successful for {ticker}: {price_data}")
                            results[ticker] = price_data
                        else:
                            logger.warning(f"Individual lookup returned no data for {ticker}")
                    except Exception as individual_error:
                        logger.error(f"Error getting data for {ticker}: {str(individual_error)}")
                        logger.error(traceback.format_exc())
                    
                    # Add a short delay between individual requests
                    await asyncio.sleep(0.2)
        
        logger.info(f"Batch request complete, returning data for {len(results)} tickers")
        return results
    
    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get company metrics for a ticker using the successful debugging approach
        """
        try:
            # Fetch ticker data directly (synchronously)
            ticker_obj = yf.Ticker(ticker)
            
            # Get company info
            info = ticker_obj.info
            
            # Check if info is empty or minimal
            if not info or len(info) <= 1:
                logger.warning(f"Ticker {ticker} not found on Yahoo Finance")
                return {"not_found": True, "source": self.source_name}
            
            # Comprehensive metrics extraction
            metrics = {
                # Core information
                "company_name": info.get("shortName") or info.get("longName"),
                "ticker": ticker,
                "source": self.source_name,
                
                # Basic company details
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                
                # Price and valuation metrics
                "current_price": info.get("currentPrice"),
                "previous_close": info.get("regularMarketPreviousClose"),
                "market_cap": info.get("marketCap"),
                
                # Price range metrics
                "day_open": info.get("regularMarketOpen"),
                "day_low": info.get("regularMarketDayLow"),
                "day_high": info.get("regularMarketDayHigh"),
                
                # Volume metrics
                "volume": info.get("volume"),
                "average_volume": info.get("averageVolume"),
                
                # Pricing metrics
                "pe_ratio": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                
                # Dividend metrics
                "dividend_rate": info.get("dividendRate"),
                "dividend_yield": info.get("dividendYield"),
                
                # EPS metrics
                "eps": info.get("trailingEPS"),
                "forward_eps": info.get("forwardEPS"),
                
                # Price targets
                "target_high_price": info.get("targetHighPrice"),
                "target_low_price": info.get("targetLowPrice"),
                "target_mean_price": info.get("targetMeanPrice"),
                
                # Additional metrics
                "beta": info.get("beta"),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
                "eps": info.get("trailingEPS"),
                "forward_eps": info.get("forwardEPS"),
                "fifty_two_week_range": info.get("fiftyTwoWeekRange"),
                "target_median_price": info.get("targetMedianPrice"),
                "bid_price": info.get("bid"),
                "ask_price": info.get("ask"),
            }
            
            # Remove None values to prevent database insertion issues
            metrics = {k: v for k, v in metrics.items() if v is not None}
            
            logger.info(f"Metrics for {ticker}: {metrics}")
            return metrics
        
        except Exception as e:
            logger.error(f"Comprehensive error getting metrics for {ticker}: {str(e)}")
            return None
        
    async def get_batch_historical_prices(self, tickers: List[str], start_date: datetime, end_date: Optional[datetime] = None, max_batch_size: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get historical prices for multiple tickers in batches
        
        Args:
            tickers: List of ticker symbols
            start_date: Start date for historical data
            end_date: End date for historical data (defaults to today)
            max_batch_size: Maximum number of tickers per batch (smaller is safer)
            
        Returns:
            Dictionary mapping tickers to their historical price data lists
        """
        if not tickers:
            return {}
            
        # Use current date if end_date not provided
        if not end_date:
            end_date = datetime.now()
            
        # Convert dates to strings in the format required by yfinance
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        results = {}
        
        # Process in smaller batches to avoid overloading
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i+max_batch_size]
            batch_str = " ".join(batch)
            
            
            try:
                logger.info(f"Fetching historical data for batch: {batch_str}")
                
                # Use a separate thread for the yfinance API call
                loop = asyncio.get_event_loop()
                history = await loop.run_in_executor(
                    None,
                    lambda: yf.download(batch_str, start=start_str, end=end_str, group_by="ticker")
                )
                
                # Check if we got any data
                if hasattr(history, 'empty') and history.empty:
                    logger.warning(f"No historical data available for batch: {batch_str}")
                    continue
                    
                # If only one ticker, the data structure is different
                if len(batch) == 1:
                    ticker = batch[0]
                    ticker_results = []
                    
                    # Process the data for this single ticker
                    try:
                        for date, row in history.iterrows():
                            try:
                                # Extract values safely using loc and handle potential Series objects
                                # For Open column
                                if 'Open' in row.index:
                                    value = row.loc['Open']
                                    # Handle if value is still a Series
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_open = float(value) if not pd.isna(value) else None
                                else:
                                    day_open = None
                                
                                # For High column
                                if 'High' in row.index:
                                    value = row.loc['High']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_high = float(value) if not pd.isna(value) else None
                                else:
                                    day_high = None
                                
                                # For Low column
                                if 'Low' in row.index:
                                    value = row.loc['Low']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_low = float(value) if not pd.isna(value) else None
                                else:
                                    day_low = None
                                
                                # For Close column
                                if 'Close' in row.index:
                                    value = row.loc['Close']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    close_price = float(value) if not pd.isna(value) else None
                                else:
                                    close_price = None
                                
                                # For Volume column
                                if 'Volume' in row.index:
                                    value = row.loc['Volume']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    volume = int(value) if not pd.isna(value) else None
                                else:
                                    volume = None
                                
                                if close_price is not None:
                                    ticker_results.append({
                                        "date": date.date(),
                                        "timestamp": date.to_pydatetime(),
                                        "day_open": day_open,
                                        "day_high": day_high,
                                        "day_low": day_low,
                                        "close_price": close_price,
                                        "volume": volume,
                                        "source": self.source_name
                                    })
                            except Exception as row_error:
                                logger.warning(f"Error processing row for {ticker} on {date}: {str(row_error)}")
                        
                        results[ticker] = ticker_results
                        logger.info(f"Processed {len(ticker_results)} historical points for {ticker}")
                    except Exception as ticker_error:
                        logger.error(f"Error processing historical data for {ticker}: {str(ticker_error)}")
                else:
                    # Multi-ticker case - data is grouped by ticker
                    for ticker in batch:
                        # Check if ticker data exists in the DataFrame
                        if ticker in history.columns.levels[0]:
                            ticker_data = history[ticker]
                            ticker_results = []
                            
                            try:
                                for date, row in ticker_data.iterrows():
                                    try:
                                        # Extract values safely
                                        close_value = row['Close'] if 'Close' in row else None
                                        # Handle if close_value is a Series
                                        if hasattr(close_value, 'iloc') or hasattr(close_value, 'values'):
                                            try:
                                                close_value = close_value.iloc[0] if hasattr(close_value, 'iloc') else close_value.values[0]
                                            except:
                                                close_value = None
                                        
                                        # Only proceed if we have a valid close price
                                        if close_value is not None and not pd.isna(close_value):
                                            close_price = float(close_value)
                                            
                                            # Extract other values with the same approach
                                            open_value = row['Open'] if 'Open' in row else None
                                            if hasattr(open_value, 'iloc') or hasattr(open_value, 'values'):
                                                open_value = open_value.iloc[0] if hasattr(open_value, 'iloc') else open_value.values[0]
                                            day_open = float(open_value) if open_value is not None and not pd.isna(open_value) else None
                                            
                                            high_value = row['High'] if 'High' in row else None
                                            if hasattr(high_value, 'iloc') or hasattr(high_value, 'values'):
                                                high_value = high_value.iloc[0] if hasattr(high_value, 'iloc') else high_value.values[0]
                                            day_high = float(high_value) if high_value is not None and not pd.isna(high_value) else None
                                            
                                            low_value = row['Low'] if 'Low' in row else None
                                            if hasattr(low_value, 'iloc') or hasattr(low_value, 'values'):
                                                low_value = low_value.iloc[0] if hasattr(low_value, 'iloc') else low_value.values[0]
                                            day_low = float(low_value) if low_value is not None and not pd.isna(low_value) else None
                                            
                                            volume_value = row['Volume'] if 'Volume' in row else None
                                            if hasattr(volume_value, 'iloc') or hasattr(volume_value, 'values'):
                                                volume_value = volume_value.iloc[0] if hasattr(volume_value, 'iloc') else volume_value.values[0]
                                            volume = int(volume_value) if volume_value is not None and not pd.isna(volume_value) else None
                                            
                                            ticker_results.append({
                                                "date": date.date(),
                                                "timestamp": date.to_pydatetime(),
                                                "day_open": day_open,
                                                "day_high": day_high,
                                                "day_low": day_low,
                                                "close_price": close_price,
                                                "volume": volume,
                                                "source": self.source_name
                                            })
                                    except Exception as row_error:
                                        logger.warning(f"Error processing row for {ticker} on {date}: {str(row_error)}")
                                
                                if ticker_results:
                                    results[ticker] = ticker_results
                                    logger.info(f"Processed {len(ticker_results)} historical points for {ticker}")
                                else:
                                    logger.warning(f"No valid price data extracted for {ticker}")
                            except Exception as ticker_error:
                                logger.error(f"Error processing historical data for {ticker}: {str(ticker_error)}")
                        else:
                            logger.warning(f"No data returned for {ticker} in batch")
                
                # Add a short delay between batches
                await asyncio.sleep(1)
                
            except Exception as batch_error:
                logger.error(f"Error processing historical batch {batch_str}: {str(batch_error)}")
                # Continue to the next batch
        
        return results
        
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        try:
            # Use current date if end_date not provided
            if not end_date:
                end_date = datetime.now()
                
            # Convert dates to strings in the format required by yfinance
            start_str = start_date.strftime("%Y-%m-%d")
            end_str = end_date.strftime("%Y-%m-%d")
            
            # Use a separate thread for the yfinance API call
            loop = asyncio.get_event_loop()
            history = await loop.run_in_executor(
                None,
                lambda: yf.download(ticker, start=start_str, end=end_str)
            )
            
            # Explicitly check if the DataFrame is empty using the .empty attribute
            if hasattr(history, 'empty') and history.empty:
                logger.warning(f"No historical data available for {ticker} from {start_str} to {end_str}")
                return []
            
            # Convert to list of dictionaries
            results = []
            
            # Use a safer iterrows approach which avoids Series ambiguity issues
            for date, row in history.iterrows():
                try:
                    # Process each column individually to avoid Series ambiguity
                    # Extract scalar values directly
                    
                    # For Open column
                    if 'Open' in row.index:
                        value = row.loc['Open']
                        # Handle if value is still a Series (unlikely with iterrows but being safe)
                        if hasattr(value, 'iloc'):
                            value = value.iloc[0]
                        day_open = float(value) if not pd.isna(value) else None
                    else:
                        day_open = None
                    
                    # For High column
                    if 'High' in row.index:
                        value = row.loc['High']
                        if hasattr(value, 'iloc'):
                            value = value.iloc[0]
                        day_high = float(value) if not pd.isna(value) else None
                    else:
                        day_high = None
                    
                    # For Low column
                    if 'Low' in row.index:
                        value = row.loc['Low']
                        if hasattr(value, 'iloc'):
                            value = value.iloc[0]
                        day_low = float(value) if not pd.isna(value) else None
                    else:
                        day_low = None
                    
                    # For Close column
                    if 'Close' in row.index:
                        value = row.loc['Close']
                        if hasattr(value, 'iloc'):
                            value = value.iloc[0]
                        close_price = float(value) if not pd.isna(value) else None
                    else:
                        close_price = None
                    
                    # For Volume column
                    if 'Volume' in row.index:
                        value = row.loc['Volume']
                        if hasattr(value, 'iloc'):
                            value = value.iloc[0]
                        volume = int(value) if not pd.isna(value) else None
                    else:
                        volume = None
                    
                    # Only add data points with valid prices
                    if close_price is not None:
                        results.append({
                            "date": date.date(),
                            "timestamp": date.to_pydatetime(),
                            "day_open": day_open,
                            "day_high": day_high,
                            "day_low": day_low,
                            "close_price": close_price,
                            "volume": volume,
                            "source": self.source_name
                        })
                except Exception as row_error:
                    logger.warning(f"Error processing row for date {date} for {ticker}: {str(row_error)}")
                    # Continue to next row
            
            if results:
                logger.info(f"Successfully processed {len(results)} historical data points for {ticker}")
            return results
        except Exception as e:
            logger.error(f"Error getting historical data for {ticker}: {str(e)}")
            return []