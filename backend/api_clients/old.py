"""
Yahoo Finance market data source implementation.
Uses the yfinance library for data access, enhanced for Render compatibility.
"""
import os
import logging
import asyncio
import aiohttp
import pandas as pd
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pytz
import yfinance as yf

from backend.api_clients.data_source_interface import MarketDataSource

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yahoo_finance_client")

class YahooFinanceClient(MarketDataSource):
    """
    Client for interacting with Yahoo Finance API.
    Uses the yfinance library with enhancements for cloud deployment.
    """
    
    def __init__(self):
        """Initialize the Yahoo Finance client with a custom HTTP session"""
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        })
    
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
        Get current price for a single ticker with retry logic
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                ticker_obj = yf.Ticker(ticker, session=self.session)
                history = ticker_obj.history(period="1d")
                
                if history.empty:
                    logger.warning(f"No price data available for {ticker}")
                    return None
                
                latest = history.iloc[-1]
                price_date = history.index[-1]
                logger.info(f"Price date from index: {price_date}")
                
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
                
                logger.info(f"Returning data for {ticker}: {result}")
                return result
            
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                else:
                    logger.error(f"All retries exhausted for {ticker}")
                    return None
    
    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 100) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers with retry logic
        """
        logger.info(f"Starting batch request for: {tickers}")
        if not tickers:
            return {}
            
        results = {}
        retries = 3
        delay = 2
        
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            batch_str = " ".join(batch)
            
            for attempt in range(retries):
                try:
                    loop = asyncio.get_event_loop()
                    logger.info(f"Requesting data for: {batch_str}")
                    data = await loop.run_in_executor(
                        None,
                        lambda: yf.download(batch_str, period="1d", group_by="ticker", session=self.session)
                    )
                    
                    if len(batch) == 1:
                        ticker = batch[0]
                        logger.info(f"Processing single ticker: {ticker}")
                        if not data.empty:
                            latest = data.iloc[-1]
                            price_date = data.index[-1]
                            is_multi_index = isinstance(data.columns, pd.MultiIndex)
                            
                            if is_multi_index:
                                open_value = latest.get((ticker, 'Open'), 0)
                                high_value = latest.get((ticker, 'High'), 0)
                                low_value = latest.get((ticker, 'Low'), 0)
                                close_price = latest.get((ticker, 'Close'), None)
                                volume_value = latest.get((ticker, 'Volume'), 0)
                            else:
                                open_value = latest.get('Open', 0) if 'Open' in latest else 0
                                high_value = latest.get('High', 0) if 'High' in latest else 0
                                low_value = latest.get('Low', 0) if 'Low' in latest else 0
                                close_price = latest.get('Close', None) if 'Close' in latest else None
                                volume_value = latest.get('Volume', 0) if 'Volume' in latest else 0
                            
                            if close_price is not None:
                                logger.info(f"Extracted values: Open={open_value}, High={high_value}, Low={low_value}, Close={close_price}, Volume={volume_value}")
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
                    else:
                        logger.info(f"Processing multi-ticker batch: {batch}")
                        for ticker in batch:
                            if ticker in data and not data[ticker].empty:
                                logger.info(f"Processing ticker in batch: {ticker}")
                                ticker_data = data[ticker]
                                latest = ticker_data.iloc[-1]
                                price_date = ticker_data.index[-1]
                                
                                if "Close" in latest:
                                    close_price = latest["Close"]
                                    if hasattr(close_price, "iloc"):
                                        close_price = close_price.iloc[0]
                                    
                                    open_price = latest["Open"]
                                    if hasattr(open_price, "iloc"):
                                        open_price = open_price.iloc[0]
                                    
                                    high_price = latest["High"]
                                    if hasattr(high_price, "iloc"):
                                        high_price = high_price.iloc[0]
                                    
                                    low_price = latest["Low"]
                                    if hasattr(low_price, "iloc"):
                                        low_price = low_price.iloc[0]
                                    
                                    volume = latest["Volume"] if "Volume" in latest else None
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
                    break  # Exit retry loop on success
                
                except Exception as e:
                    logger.error(f"Attempt {attempt + 1}/{retries} failed for batch {batch_str}: {str(e)}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                    else:
                        logger.error(f"All retries exhausted for batch {batch_str}")
                        for ticker in batch:
                            price_data = await self.get_current_price(ticker)
                            if price_data:
                                logger.info(f"Individual lookup successful for {ticker}: {price_data}")
                                results[ticker] = price_data
                            else:
                                logger.warning(f"Individual lookup returned no data for {ticker}")
                            await asyncio.sleep(0.2)
                
                await asyncio.sleep(0.5)  # Delay between batches
        
        logger.info(f"Batch request complete, returning data for {len(results)} tickers")
        return results
    
    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get company metrics for a ticker with retry logic
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                ticker_obj = yf.Ticker(ticker, session=self.session)
                info = ticker_obj.info
                
                if not info or len(info) <= 1:
                    logger.warning(f"Ticker {ticker} not found on Yahoo Finance")
                    return {"not_found": True, "source": self.source_name}
                
                metrics = {
                    "company_name": info.get("shortName") or info.get("longName"),
                    "ticker": ticker,
                    "source": self.source_name,
                    "sector": info.get("sector"),
                    "industry": info.get("industry"),
                    "current_price": info.get("currentPrice"),
                    "previous_close": info.get("regularMarketPreviousClose"),
                    "market_cap": info.get("marketCap"),
                    "day_open": info.get("regularMarketOpen"),
                    "day_low": info.get("regularMarketDayLow"),
                    "day_high": info.get("regularMarketDayHigh"),
                    "volume": info.get("volume"),
                    "average_volume": info.get("averageVolume"),
                    "pe_ratio": info.get("trailingPE"),
                    "forward_pe": info.get("forwardPE"),
                    "dividend_rate": info.get("dividendRate"),
                    "dividend_yield": info.get("dividendYield"),
                    "eps": info.get("trailingEPS"),
                    "forward_eps": info.get("forwardEPS"),
                    "target_high_price": info.get("targetHighPrice"),
                    "target_low_price": info.get("targetLowPrice"),
                    "target_mean_price": info.get("targetMeanPrice"),
                    "beta": info.get("beta"),
                    "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
                    "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
                    "fifty_two_week_range": info.get("fiftyTwoWeekRange"),
                    "target_median_price": info.get("targetMedianPrice"),
                    "bid_price": info.get("bid"),
                    "ask_price": info.get("ask"),
                }
                
                metrics = {k: v for k, v in metrics.items() if v is not None}
                logger.info(f"Metrics for {ticker}: {metrics}")
                return metrics
            
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker}")
                    return None
    
    async def get_batch_historical_prices(self, tickers: List[str], start_date: datetime, end_date: Optional[datetime] = None, max_batch_size: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get historical prices for multiple tickers in batches with retry logic
        """
        if not tickers:
            return {}
            
        if not end_date:
            end_date = datetime.now()
            
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        results = {}
        retries = 3
        delay = 2
        
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            batch_str = " ".join(batch)
            
            for attempt in range(retries):
                try:
                    logger.info(f"Fetching historical data for batch: {batch_str}")
                    loop = asyncio.get_event_loop()
                    history = await loop.run_in_executor(
                        None,
                        lambda: yf.download(batch_str, start=start_str, end=end_str, group_by="ticker", session=self.session)
                    )
                    
                    if hasattr(history, 'empty') and history.empty:
                        logger.warning(f"No historical data available for batch: {batch_str}")
                        break
                    
                    if len(batch) == 1:
                        ticker = batch[0]
                        ticker_results = []
                        for date, row in history.iterrows():
                            try:
                                if 'Open' in row.index:
                                    value = row.loc['Open']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_open = float(value) if not pd.isna(value) else None
                                else:
                                    day_open = None
                                
                                if 'High' in row.index:
                                    value = row.loc['High']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_high = float(value) if not pd.isna(value) else None
                                else:
                                    day_high = None
                                
                                if 'Low' in row.index:
                                    value = row.loc['Low']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    day_low = float(value) if not pd.isna(value) else None
                                else:
                                    day_low = None
                                
                                if 'Close' in row.index:
                                    value = row.loc['Close']
                                    if hasattr(value, 'iloc'):
                                        value = value.iloc[0]
                                    close_price = float(value) if not pd.isna(value) else None
                                else:
                                    close_price = None
                                
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
                        if ticker_results:
                            results[ticker] = ticker_results
                            logger.info(f"Processed {len(ticker_results)} historical points for {ticker}")
                    else:
                        for ticker in batch:
                            if ticker in history.columns.levels[0]:
                                ticker_data = history[ticker]
                                ticker_results = []
                                for date, row in ticker_data.iterrows():
                                    try:
                                        close_value = row['Close'] if 'Close' in row else None
                                        if hasattr(close_value, 'iloc') or hasattr(close_value, 'values'):
                                            close_value = close_value.iloc[0] if hasattr(close_value, 'iloc') else close_value.values[0]
                                        if close_value is not None and not pd.isna(close_value):
                                            close_price = float(close_value)
                                            
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
                            else:
                                logger.warning(f"No data returned for {ticker} in batch")
                    break  # Exit retry loop on success
                
                except Exception as batch_error:
                    logger.error(f"Attempt {attempt + 1}/{retries} failed for batch {batch_str}: {str(batch_error)}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                    else:
                        logger.error(f"All retries exhausted for batch {batch_str}")
                
                await asyncio.sleep(1)  # Delay between batches
        
        return results
    
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a single ticker with retry logic
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                if not end_date:
                    end_date = datetime.now()
                
                start_str = start_date.strftime("%Y-%m-%d")
                end_str = end_date.strftime("%Y-%m-%d")
                
                loop = asyncio.get_event_loop()
                history = await loop.run_in_executor(
                    None,
                    lambda: yf.download(ticker, start=start_str, end=end_str, session=self.session)
                )
                
                if hasattr(history, 'empty') and history.empty:
                    logger.warning(f"No historical data available for {ticker} from {start_str} to {end_str}")
                    return []
                
                results = []
                for date, row in history.iterrows():
                    try:
                        if 'Open' in row.index:
                            value = row.loc['Open']
                            if hasattr(value, 'iloc'):
                                value = value.iloc[0]
                            day_open = float(value) if not pd.isna(value) else None
                        else:
                            day_open = None
                        
                        if 'High' in row.index:
                            value = row.loc['High']
                            if hasattr(value, 'iloc'):
                                value = value.iloc[0]
                            day_high = float(value) if not pd.isna(value) else None
                        else:
                            day_high = None
                        
                        if 'Low' in row.index:
                            value = row.loc['Low']
                            if hasattr(value, 'iloc'):
                                value = value.iloc[0]
                            day_low = float(value) if not pd.isna(value) else None
                        else:
                            day_low = None
                        
                        if 'Close' in row.index:
                            value = row.loc['Close']
                            if hasattr(value, 'iloc'):
                                value = value.iloc[0]
                            close_price = float(value) if not pd.isna(value) else None
                        else:
                            close_price = None
                        
                        if 'Volume' in row.index:
                            value = row.loc['Volume']
                            if hasattr(value, 'iloc'):
                                value = value.iloc[0]
                            volume = int(value) if not pd.isna(value) else None
                        else:
                            volume = None
                        
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
                
                if results:
                    logger.info(f"Successfully processed {len(results)} historical data points for {ticker}")
                return results
            
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker}")
                    return []