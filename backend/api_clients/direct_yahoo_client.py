"""
Direct Yahoo Finance market data source implementation.
Uses direct API calls without yfinance for Render compatibility.
"""
import os
import logging
import asyncio
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from backend.api_clients.data_source_interface import MarketDataSource

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("direct_yahoo_client")

class DirectYahooFinanceClient(MarketDataSource):
    """
    Client for interacting with Yahoo Finance API directly.
    Bypasses yfinance library for better cloud compatibility.
    """
    
    def __init__(self):
        """Initialize the Yahoo Finance client with a custom HTTP session"""
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
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
                logger.info(f"Fetching data for {ticker} from direct Yahoo API (attempt {attempt+1}/{retries})")
                
                # URL for Yahoo Finance API
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d"
                
                # Make the request
                response = self.session.get(url, timeout=10)
                
                # Check if successful
                if response.status_code != 200:
                    logger.warning(f"Failed to get data for {ticker}. Status code: {response.status_code}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                        continue
                    return None
                
                # Parse the JSON response
                data = response.json()
                
                # Extract price data
                if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
                    result = data["chart"]["result"][0]
                    meta = result.get("meta", {})
                    timestamp = result.get("timestamp", [])
                    quotes = result.get("indicators", {}).get("quote", [{}])[0]
                    
                    # Check if we have data
                    if not timestamp or not quotes or "close" not in quotes:
                        logger.warning(f"No price data available for {ticker}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return None
                    
                    # Get the latest values
                    latest_idx = -1
                    close = quotes.get("close", [])[latest_idx] if quotes.get("close") and len(quotes.get("close", [])) > 0 else None
                    open_price = quotes.get("open", [])[latest_idx] if quotes.get("open") and len(quotes.get("open", [])) > 0 else None
                    high = quotes.get("high", [])[latest_idx] if quotes.get("high") and len(quotes.get("high", [])) > 0 else None
                    low = quotes.get("low", [])[latest_idx] if quotes.get("low") and len(quotes.get("low", [])) > 0 else None
                    volume = quotes.get("volume", [])[latest_idx] if quotes.get("volume") and len(quotes.get("volume", [])) > 0 else None
                    
                    # Only return data if we have a valid close price
                    if close is None:
                        logger.warning(f"No close price available for {ticker}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return None
                    
                    # Convert timestamp to datetime
                    price_timestamp = datetime.fromtimestamp(timestamp[latest_idx]) if timestamp and len(timestamp) > 0 else datetime.now()
                    
                    # Create the result
                    result = {
                        "price": float(close),
                        "day_open": float(open_price) if open_price is not None else None,
                        "day_high": float(high) if high is not None else None,
                        "day_low": float(low) if low is not None else None,
                        "close_price": float(close),
                        "volume": int(volume) if volume is not None else None,
                        "timestamp": datetime.now(),
                        "price_timestamp": price_timestamp,
                        "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "source": self.source_name
                    }
                    
                    logger.info(f"Returning data for {ticker}: {result}")
                    return result
                else:
                    logger.warning(f"Invalid response format for {ticker}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return None
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker}")
                    return None
    
    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 10) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers by processing them in smaller batches
        """
        logger.info(f"Starting batch request for: {tickers}")
        if not tickers:
            return {}
            
        results = {}
        
        # Process in smaller batches to avoid any rate limiting
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            logger.info(f"Processing batch {i//max_batch_size + 1}/{(len(tickers) + max_batch_size - 1)//max_batch_size}: {batch}")
            
            # Process each ticker in the batch
            for ticker in batch:
                try:
                    price_data = await self.get_current_price(ticker)
                    if price_data:
                        results[ticker] = price_data
                except Exception as e:
                    logger.error(f"Error processing {ticker} in batch: {str(e)}")
            
            # Add a small delay between batches to avoid rate limiting
            if i + max_batch_size < len(tickers):
                await asyncio.sleep(1)
        
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
                logger.info(f"Fetching company info for {ticker} from direct Yahoo API (attempt {attempt+1}/{retries})")
                
                # URL for Yahoo Finance quote API
                url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={ticker}"
                
                # Make the request
                response = self.session.get(url, timeout=10)
                
                # Check if successful
                if response.status_code != 200:
                    logger.warning(f"Failed to get info for {ticker}. Status code: {response.status_code}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return {"not_found": True, "source": self.source_name}
                
                # Parse the JSON response
                data = response.json()
                
                # Extract quote data
                if "quoteResponse" in data and "result" in data["quoteResponse"]:
                    quotes = data["quoteResponse"]["result"]
                    
                    if not quotes:
                        logger.warning(f"No quote data found for {ticker}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return {"not_found": True, "source": self.source_name}
                    
                    # Get the first result
                    quote = quotes[0]
                    
                    # Map Yahoo fields to our metrics format
                    metrics = {
                        "ticker": ticker,
                        "company_name": quote.get("shortName") or quote.get("longName"),
                        "sector": quote.get("sector", ""),
                        "industry": quote.get("industry", ""),
                        "source": self.source_name,
                        
                        # Price and market data
                        "current_price": quote.get("regularMarketPrice"),
                        "previous_close": quote.get("regularMarketPreviousClose"),
                        "market_cap": quote.get("marketCap"),
                        "day_open": quote.get("regularMarketOpen"),
                        "day_low": quote.get("regularMarketDayLow"),
                        "day_high": quote.get("regularMarketDayHigh"),
                        "volume": quote.get("regularMarketVolume"),
                        "average_volume": quote.get("averageDailyVolume3Month"),
                        
                        # Financial metrics
                        "pe_ratio": quote.get("trailingPE"),
                        "forward_pe": quote.get("forwardPE"),
                        "beta": quote.get("beta"),
                        "fifty_two_week_low": quote.get("fiftyTwoWeekLow"),
                        "fifty_two_week_high": quote.get("fiftyTwoWeekHigh"),
                        "dividend_rate": quote.get("dividendRate"),
                        "dividend_yield": quote.get("dividendYield"),
                        "eps": quote.get("trailingEps"),
                        "forward_eps": quote.get("forwardEps"),
                        "fifty_two_week_range": f"{quote.get('fiftyTwoWeekLow', 0)}-{quote.get('fiftyTwoWeekHigh', 0)}",
                        "target_high_price": quote.get("targetHighPrice"),
                        "target_low_price": quote.get("targetLowPrice"),
                        "target_mean_price": quote.get("targetMeanPrice"),
                        "target_median_price": quote.get("targetMedianPrice"),
                        "bid_price": quote.get("bid"),
                        "ask_price": quote.get("ask"),
                    }
                    
                    # Filter out None values
                    metrics = {k: v for k, v in metrics.items() if v is not None}
                    
                    logger.info(f"Metrics for {ticker}: {metrics}")
                    return metrics
                else:
                    logger.warning(f"Invalid response format for {ticker} info")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return {"not_found": True, "source": self.source_name}
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker} metrics: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker} metrics")
                    return {"not_found": True, "source": self.source_name, "error": str(e)}
    
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a single ticker with retry logic
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                logger.info(f"Fetching historical data for {ticker} (attempt {attempt+1}/{retries})")
                
                if not end_date:
                    end_date = datetime.now()
                
                # Convert dates to UNIX timestamps
                start_timestamp = int(start_date.timestamp())
                end_timestamp = int(end_date.timestamp())
                
                # URL for Yahoo Finance historical data
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={start_timestamp}&period2={end_timestamp}&interval=1d"
                
                # Make the request
                response = self.session.get(url, timeout=10)
                
                # Check if successful
                if response.status_code != 200:
                    logger.warning(f"Failed to get historical data for {ticker}. Status code: {response.status_code}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return []
                
                # Parse the JSON response
                data = response.json()
                
                # Extract price data
                if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
                    result = data["chart"]["result"][0]
                    meta = result.get("meta", {})
                    timestamps = result.get("timestamp", [])
                    quotes = result.get("indicators", {}).get("quote", [{}])[0]
                    
                    # Check if we have data
                    if not timestamps or not quotes:
                        logger.warning(f"No historical data available for {ticker}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return []
                    
                    # Process each data point
                    results = []
                    for i, ts in enumerate(timestamps):
                        try:
                            # Get values for this timestamp
                            close = quotes.get("close", [])[i] if "close" in quotes and i < len(quotes["close"]) else None
                            open_price = quotes.get("open", [])[i] if "open" in quotes and i < len(quotes["open"]) else None
                            high = quotes.get("high", [])[i] if "high" in quotes and i < len(quotes["high"]) else None
                            low = quotes.get("low", [])[i] if "low" in quotes and i < len(quotes["low"]) else None
                            volume = quotes.get("volume", [])[i] if "volume" in quotes and i < len(quotes["volume"]) else None
                            
                            # Only include points with valid close price
                            if close is not None:
                                # Convert timestamp to datetime
                                date = datetime.fromtimestamp(ts)
                                
                                results.append({
                                    "date": date.date(),
                                    "timestamp": date,
                                    "day_open": float(open_price) if open_price is not None else None,
                                    "day_high": float(high) if high is not None else None,
                                    "day_low": float(low) if low is not None else None,
                                    "close_price": float(close),
                                    "volume": int(volume) if volume is not None else None,
                                    "source": self.source_name
                                })
                        except Exception as point_error:
                            logger.warning(f"Error processing historical point for {ticker} at index {i}: {str(point_error)}")
                    
                    if results:
                        logger.info(f"Successfully processed {len(results)} historical data points for {ticker}")
                    return results
                else:
                    logger.warning(f"Invalid response format for {ticker} historical data")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return []
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker} historical data: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker} historical data")
                    return []
    
    async def get_batch_historical_prices(self, tickers: List[str], start_date: datetime, end_date: Optional[datetime] = None, max_batch_size: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get historical prices for multiple tickers in batches
        """
        if not tickers:
            return {}
            
        if not end_date:
            end_date = datetime.now()
            
        results = {}
        
        # Process tickers in smaller batches
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            batch_str = ", ".join(batch)
            logger.info(f"Processing historical batch {i//max_batch_size + 1}/{(len(tickers) + max_batch_size - 1)//max_batch_size}: {batch_str}")
            
            # Process each ticker in the batch
            for ticker in batch:
                try:
                    ticker_data = await self.get_historical_prices(ticker, start_date, end_date)
                    if ticker_data:
                        results[ticker] = ticker_data
                        logger.info(f"Added {len(ticker_data)} historical points for {ticker}")
                    else:
                        logger.warning(f"No historical data available for {ticker}")
                except Exception as e:
                    logger.error(f"Error fetching historical data for {ticker}: {str(e)}")
            
            # Add a small delay between batches to avoid rate limiting
            if i + max_batch_size < len(tickers):
                await asyncio.sleep(1)
        
        return results