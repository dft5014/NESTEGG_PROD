"""
Unified Yahoo Finance client for NestEgg project

This module provides a comprehensive client for Yahoo Finance data with:
- Asynchronous implementation
- Efficient caching mechanism
- Robust error handling and retry logic
- Batch operations support for minimizing API calls
- Comprehensive type hints
- Complete field coverage for database requirements
"""
import os
import logging
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime, timedelta, date
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yahoo_finance_client")

class YahooFinanceClient:
    """
    Unified client for Yahoo Finance API access.
    Provides data for stocks, ETFs, mutual funds, options, cryptocurrencies, and FX.
    Combines the best features from DirectYahooFinanceClient, YahooQueryClient, and Yahoo_Data.
    """
    
    def __init__(self, cache_enabled: bool = True):
        """
        Initialize the Yahoo Finance client
        
        Args:
            cache_enabled: Whether to enable caching (default: True)
        """
        # Create HTTP session with appropriate headers
        self.session = aiohttp.ClientSession(headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        })
        
        # Set up cache with TTL values
        self.cache_enabled = cache_enabled
        if cache_enabled:
            self.cache = {}
            self.cache_ttl = {
                "current_price": 15 * 60,  # 15 minutes
                "company_metrics": 24 * 60 * 60,  # 24 hours
                "historical_prices": 6 * 60 * 60,  # 6 hours
                "fx_prices": 30 * 60,  # 30 minutes
            }
    
    async def close(self):
        """
        Close the client session when done.
        This method should be called explicitly if not using the client as a context manager.
        """
        if hasattr(self, 'session') and self.session is not None:
            try:
                # Allow underlying connections to close first
                await asyncio.sleep(0)
                # Then close the session
                await self.session.close()
                logger.debug("Client session closed successfully")
            except Exception as e:
                logger.error(f"Error closing client session: {str(e)}")
                # Don't re-raise the exception to prevent blocking
    
    def _get_from_cache(self, cache_key: str, cache_type: str) -> Optional[Any]:
        """
        Get data from cache if it exists and is not expired
        
        Args:
            cache_key: Unique key for cached item
            cache_type: Type of cache (determines TTL)
            
        Returns:
            Cached data or None if not in cache or expired
        """
        if not self.cache_enabled or not hasattr(self, 'cache'):
            return None
            
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            now = datetime.now()
            if (now - cached_data["timestamp"]).total_seconds() < self.cache_ttl[cache_type]:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_data["data"]
        return None

    def _set_in_cache(self, cache_key: str, cache_type: str, data: Any) -> None:
        """
        Store data in cache with current timestamp
        
        Args:
            cache_key: Unique key for cached item
            cache_type: Type of cache (determines TTL)
            data: Data to cache
        """
        if not self.cache_enabled or not hasattr(self, 'cache'):
            return
            
        self.cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now()
        }
        logger.debug(f"Cached data for {cache_key}")
    
    def _extract_raw_value(self, data_dict: Dict, key: str) -> Any:
        """
        Helper method to extract raw values from nested Yahoo Finance response structures
        
        Args:
            data_dict: Dictionary containing the value
            key: Key to extract
            
        Returns:
            Raw value or None if not found
        """
        if key in data_dict:
            item = data_dict[key]
            # Yahoo often wraps values in objects with 'raw' as the actual value
            if isinstance(item, dict) and 'raw' in item:
                return item['raw']
            return item
        return None
    
    async def _make_request(self, url: str, retries: int = 3, delay: int = 2) -> Optional[Dict[str, Any]]:
        """
        Make an HTTP request with retry logic
        
        Args:
            url: URL to request
            retries: Number of retry attempts
            delay: Base delay between retries (will use exponential backoff)
            
        Returns:
            JSON response or None if failed
        """
        for attempt in range(retries):
            try:
                logger.debug(f"Making request to {url} (attempt {attempt+1}/{retries})")
                async with self.session.get(url, timeout=15) as response:
                    if response.status != 200:
                        logger.warning(f"Request failed with status {response.status} (attempt {attempt+1}/{retries})")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                            continue
                        return None
                    
                    # Try to get response as JSON
                    try:
                        data = await response.json()
                        return data
                    except Exception as json_error:
                        # If JSON parsing fails, try to get text and log it
                        try:
                            text = await response.text()
                            logger.error(f"JSON parsing error: {str(json_error)}")
                            logger.debug(f"Response text: {text[:200]}...")  # Log first 200 chars
                        except:
                            pass
                        return None
                
            except Exception as e:
                logger.error(f"Request error (attempt {attempt+1}/{retries}): {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for URL: {url}")
                    return None
        
        return None
    
    async def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get current price data for a single ticker
        
        Args:
            ticker: Stock symbol
            
        Returns:
            Dictionary with current price data or None if unavailable
        """
        # Check cache first
        cache_key = f"price_{ticker}"
        cached_data = self._get_from_cache(cache_key, "current_price")
        if cached_data:
            return cached_data
        
        # URL for Yahoo Finance API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d"
        
        # Make the request
        data = await self._make_request(url)
        if not data:
            return None
        
        # Extract price data
        if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            timestamp = result.get("timestamp", [])
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            
            # Check if we have data
            if not timestamp or not quotes or "close" not in quotes:
                logger.warning(f"No price data available for {ticker}")
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
                return None
            
            # Convert timestamp to datetime
            price_timestamp = datetime.fromtimestamp(timestamp[latest_idx]) if timestamp and len(timestamp) > 0 else datetime.now()
            
            # Create the result
            result = {
                "ticker": ticker,
                "price": float(close),
                "day_open": float(open_price) if open_price is not None else None,
                "day_high": float(high) if high is not None else None,
                "day_low": float(low) if low is not None else None,
                "close_price": float(close),
                "volume": int(volume) if volume is not None else None,
                "timestamp": datetime.now(),
                "price_timestamp": price_timestamp,
                "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "source": "yahoo_finance"
            }
            
            # Cache the result
            self._set_in_cache(cache_key, "current_price", result)
            
            logger.info(f"Retrieved current price for {ticker}: {close}")
            return result
        else:
            logger.warning(f"Invalid response format for {ticker}")
            return None
    
    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 10) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers in batches.
        Uses a single API call for each batch of tickers to minimize API requests.
        
        Args:
            tickers: List of stock symbols
            max_batch_size: Maximum number of tickers per batch
            
        Returns:
            Dictionary mapping tickers to their price data
        """
        logger.info(f"Starting batch price request for {len(tickers)} tickers")
        if not tickers:
            return {}
            
        results = {}
        
        # Process in smaller batches to avoid any rate limiting
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            batch_str = ",".join(batch)
            logger.debug(f"Processing batch {i//max_batch_size + 1}/{(len(tickers) + max_batch_size - 1)//max_batch_size}: {batch}")
            
            # Try to get batch data in a single API call
            try:
                # Specifically format URL for quote data
                url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={batch_str}"
                data = await self._make_request(url)
                
                if data and "quoteResponse" in data and "result" in data["quoteResponse"]:
                    quotes = data["quoteResponse"]["result"]
                    
                    # Process each result
                    for quote in quotes:
                        symbol = quote.get("symbol")
                        
                        if not symbol:
                            continue
                        
                        # Only add data if we have a valid price
                        regular_market_price = quote.get("regularMarketPrice")
                        if regular_market_price is not None:
                            # Get timestamp
                            timestamp_val = quote.get("regularMarketTime", datetime.now().timestamp())
                            try:
                                price_timestamp = datetime.fromtimestamp(timestamp_val)
                            except:
                                price_timestamp = datetime.now()
                            
                            result_data = {
                                "ticker": symbol,
                                "price": float(regular_market_price),
                                "day_open": float(quote.get("regularMarketOpen")) if quote.get("regularMarketOpen") is not None else None,
                                "day_high": float(quote.get("regularMarketDayHigh")) if quote.get("regularMarketDayHigh") is not None else None,
                                "day_low": float(quote.get("regularMarketDayLow")) if quote.get("regularMarketDayLow") is not None else None,
                                "close_price": float(regular_market_price),
                                "volume": int(quote.get("regularMarketVolume")) if quote.get("regularMarketVolume") is not None else None,
                                "timestamp": datetime.now(),
                                "price_timestamp": price_timestamp,
                                "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                                "source": "yahoo_finance"
                            }
                            
                            # Cache individual result
                            self._set_in_cache(f"price_{symbol}", "current_price", result_data)
                            
                            results[symbol] = result_data
                else:
                    logger.warning(f"Invalid response format for batch {batch_str}")
                    
                    # Fall back to individual processing
                    for ticker in batch:
                        if ticker not in results:
                            try:
                                price_data = await self.get_current_price(ticker)
                                if price_data:
                                    results[ticker] = price_data
                            except Exception as ticker_error:
                                logger.error(f"Error processing {ticker} individually: {str(ticker_error)}")
            
            except Exception as e:
                logger.error(f"Error processing batch {batch}: {str(e)}")
                
                # Fall back to individual processing for any missing tickers
                for ticker in batch:
                    if ticker not in results:
                        try:
                            price_data = await self.get_current_price(ticker)
                            if price_data:
                                results[ticker] = price_data
                        except Exception as ticker_error:
                            logger.error(f"Error processing {ticker} individually: {str(ticker_error)}")
            
            # Add a small delay between batches to avoid rate limiting
            if i + max_batch_size < len(tickers):
                await asyncio.sleep(1)
        
        logger.info(f"Batch request complete, returning data for {len(results)}/{len(tickers)} tickers")
        return results
    
    async def get_company_metrics(self, ticker: str) -> Dict[str, Any]:
        """
        Get comprehensive company metrics and information for a ticker
        Following YahooQueryClient implementation to ensure all required fields are included
        
        Args:
            ticker: Stock symbol
            
        Returns:
            Dictionary with company metrics or empty dict with 'not_found' flag if unavailable
        """
        # Check cache first
        cache_key = f"metrics_{ticker}"
        cached_data = self._get_from_cache(cache_key, "company_metrics")
        if cached_data:
            return cached_data
            
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                logger.info(f"Fetching company info for {ticker} using direct API (attempt {attempt+1}/{retries})")
                
                # Request all necessary modules for complete metrics
                modules = "summaryProfile,summaryDetail,defaultKeyStatistics,price,financialData"
                url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules={modules}"
                data = await self._make_request(url)
                
                if not data or "quoteSummary" not in data or "result" not in data["quoteSummary"] or not data["quoteSummary"]["result"]:
                    logger.warning(f"Incomplete data for {ticker}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return {"not_found": True, "source": "yahoo_finance"}
                
                # Extract top-level result
                result = data["quoteSummary"]["result"][0]
                
                # Initialize metrics dictionary with all required fields preset to None
                metrics = {
                    "ticker": ticker,
                    "source": "yahoo_finance",
                    "company_name": None,
                    "sector": None,
                    "industry": None,
                    "current_price": None,
                    "previous_close": None,
                    "day_open": None,
                    "day_high": None,
                    "day_low": None,
                    "volume": None,
                    "market_cap": None,
                    "pe_ratio": None,
                    "forward_pe": None,
                    "eps": None,
                    "forward_eps": None,
                    "beta": None,
                    "dividend_rate": None,
                    "dividend_yield": None,
                    "fifty_two_week_low": None,
                    "fifty_two_week_high": None,
                    "fifty_two_week_range": None,
                    "average_volume": None,
                    "bid_price": None,
                    "ask_price": None,
                    "target_high_price": None,
                    "target_low_price": None,
                    "target_mean_price": None,
                    "target_median_price": None,
                    "exchange": None,
                    "quote_type": None
                }
                
                # Extract data from price module (most reliable)
                if "price" in result:
                    price_data = result["price"]
                    
                    # Company name
                    if "shortName" in price_data:
                        metrics["company_name"] = price_data["shortName"]
                    elif "longName" in price_data:
                        metrics["company_name"] = price_data["longName"]
                    
                    # Current price
                    if "regularMarketPrice" in price_data:
                        regular_price = price_data["regularMarketPrice"]
                        if isinstance(regular_price, dict) and "raw" in regular_price:
                            metrics["current_price"] = regular_price["raw"]
                        else:
                            metrics["current_price"] = regular_price
                    
                    # Previous close
                    if "regularMarketPreviousClose" in price_data:
                        prev_close = price_data["regularMarketPreviousClose"]
                        if isinstance(prev_close, dict) and "raw" in prev_close:
                            metrics["previous_close"] = prev_close["raw"]
                        else:
                            metrics["previous_close"] = prev_close
                    
                    # Day open
                    if "regularMarketOpen" in price_data:
                        day_open = price_data["regularMarketOpen"]
                        if isinstance(day_open, dict) and "raw" in day_open:
                            metrics["day_open"] = day_open["raw"]
                        else:
                            metrics["day_open"] = day_open
                    
                    # Day high
                    if "regularMarketDayHigh" in price_data:
                        day_high = price_data["regularMarketDayHigh"]
                        if isinstance(day_high, dict) and "raw" in day_high:
                            metrics["day_high"] = day_high["raw"]
                        else:
                            metrics["day_high"] = day_high
                    
                    # Day low
                    if "regularMarketDayLow" in price_data:
                        day_low = price_data["regularMarketDayLow"]
                        if isinstance(day_low, dict) and "raw" in day_low:
                            metrics["day_low"] = day_low["raw"]
                        else:
                            metrics["day_low"] = day_low
                    
                    # Volume
                    if "regularMarketVolume" in price_data:
                        volume = price_data["regularMarketVolume"]
                        if isinstance(volume, dict) and "raw" in volume:
                            metrics["volume"] = volume["raw"]
                        else:
                            metrics["volume"] = volume
                    
                    # Market Cap
                    if "marketCap" in price_data:
                        market_cap = price_data["marketCap"]
                        if isinstance(market_cap, dict) and "raw" in market_cap:
                            metrics["market_cap"] = market_cap["raw"]
                        else:
                            metrics["market_cap"] = market_cap
                    
                    # Exchange and quote type
                    if "exchangeName" in price_data:
                        metrics["exchange"] = price_data["exchangeName"]
                    if "quoteType" in price_data:
                        metrics["quote_type"] = price_data["quoteType"]
                
                # Extract data from summaryProfile module
                if "summaryProfile" in result:
                    profile = result["summaryProfile"]
                    
                    if "sector" in profile:
                        metrics["sector"] = profile["sector"]
                    if "industry" in profile:
                        metrics["industry"] = profile["industry"]
                
                # Extract data from summaryDetail module
                if "summaryDetail" in result:
                    details = result["summaryDetail"]
                    
                    # 52-week low
                    if "fiftyTwoWeekLow" in details:
                        low = details["fiftyTwoWeekLow"]
                        if isinstance(low, dict) and "raw" in low:
                            metrics["fifty_two_week_low"] = low["raw"]
                        else:
                            metrics["fifty_two_week_low"] = low
                    
                    # 52-week high
                    if "fiftyTwoWeekHigh" in details:
                        high = details["fiftyTwoWeekHigh"]
                        if isinstance(high, dict) and "raw" in high:
                            metrics["fifty_two_week_high"] = high["raw"]
                        else:
                            metrics["fifty_two_week_high"] = high
                    
                    # Average volume
                    if "averageVolume" in details:
                        avg_vol = details["averageVolume"]
                        if isinstance(avg_vol, dict) and "raw" in avg_vol:
                            metrics["average_volume"] = avg_vol["raw"]
                        else:
                            metrics["average_volume"] = avg_vol
                    
                    # Dividend rate
                    if "dividendRate" in details:
                        div_rate = details["dividendRate"]
                        if isinstance(div_rate, dict) and "raw" in div_rate:
                            metrics["dividend_rate"] = div_rate["raw"]
                        else:
                            metrics["dividend_rate"] = div_rate
                    
                    # Dividend yield
                    if "dividendYield" in details:
                        div_yield = details["dividendYield"]
                        if isinstance(div_yield, dict) and "raw" in div_yield:
                            metrics["dividend_yield"] = div_yield["raw"]
                        else:
                            metrics["dividend_yield"] = div_yield
                    
                    # P/E ratio
                    if "trailingPE" in details:
                        pe = details["trailingPE"]
                        if isinstance(pe, dict) and "raw" in pe:
                            metrics["pe_ratio"] = pe["raw"]
                        else:
                            metrics["pe_ratio"] = pe
                    
                    # Forward P/E
                    if "forwardPE" in details:
                        fwd_pe = details["forwardPE"]
                        if isinstance(fwd_pe, dict) and "raw" in fwd_pe:
                            metrics["forward_pe"] = fwd_pe["raw"]
                        else:
                            metrics["forward_pe"] = fwd_pe
                    
                    # Market cap (if not already set)
                    if "market_cap" not in metrics or metrics["market_cap"] is None:
                        if "marketCap" in details:
                            market_cap = details["marketCap"]
                            if isinstance(market_cap, dict) and "raw" in market_cap:
                                metrics["market_cap"] = market_cap["raw"]
                            else:
                                metrics["market_cap"] = market_cap
                    
                    # Bid and ask prices
                    if "bid" in details:
                        bid = details["bid"]
                        if isinstance(bid, dict) and "raw" in bid:
                            metrics["bid_price"] = bid["raw"]
                        else:
                            metrics["bid_price"] = bid
                    
                    if "ask" in details:
                        ask = details["ask"]
                        if isinstance(ask, dict) and "raw" in ask:
                            metrics["ask_price"] = ask["raw"]
                        else:
                            metrics["ask_price"] = ask
                
                # Extract data from defaultKeyStatistics module
                if "defaultKeyStatistics" in result:
                    stats = result["defaultKeyStatistics"]
                    
                    # Beta
                    if "beta" in stats:
                        beta = stats["beta"]
                        if isinstance(beta, dict) and "raw" in beta:
                            metrics["beta"] = beta["raw"]
                        else:
                            metrics["beta"] = beta
                    
                    # Trailing EPS
                    if "trailingEps" in stats:
                        eps = stats["trailingEps"]
                        if isinstance(eps, dict) and "raw" in eps:
                            metrics["eps"] = eps["raw"]
                        else:
                            metrics["eps"] = eps
                    
                    # Forward EPS
                    if "forwardEps" in stats:
                        fwd_eps = stats["forwardEps"]
                        if isinstance(fwd_eps, dict) and "raw" in fwd_eps:
                            metrics["forward_eps"] = fwd_eps["raw"]
                        else:
                            metrics["forward_eps"] = fwd_eps
                    
                    # Market cap (if not already set)
                    if "market_cap" not in metrics or metrics["market_cap"] is None:
                        if "marketCap" in stats:
                            market_cap = stats["marketCap"]
                            if isinstance(market_cap, dict) and "raw" in market_cap:
                                metrics["market_cap"] = market_cap["raw"]
                            else:
                                metrics["market_cap"] = market_cap
                
                # Extract target prices from financialData module
                if "financialData" in result:
                    financial = result["financialData"]
                    
                    if "targetHighPrice" in financial:
                        target_high = financial["targetHighPrice"]
                        if isinstance(target_high, dict) and "raw" in target_high:
                            metrics["target_high_price"] = target_high["raw"]
                        else:
                            metrics["target_high_price"] = target_high
                    
                    if "targetLowPrice" in financial:
                        target_low = financial["targetLowPrice"]
                        if isinstance(target_low, dict) and "raw" in target_low:
                            metrics["target_low_price"] = target_low["raw"]
                        else:
                            metrics["target_low_price"] = target_low
                    
                    if "targetMeanPrice" in financial:
                        target_mean = financial["targetMeanPrice"]
                        if isinstance(target_mean, dict) and "raw" in target_mean:
                            metrics["target_mean_price"] = target_mean["raw"]
                        else:
                            metrics["target_mean_price"] = target_mean
                    
                    if "targetMedianPrice" in financial:
                        target_median = financial["targetMedianPrice"]
                        if isinstance(target_median, dict) and "raw" in target_median:
                            metrics["target_median_price"] = target_median["raw"]
                        else:
                            metrics["target_median_price"] = target_median
                
                # Calculate 52-week range
                if metrics["fifty_two_week_low"] is not None and metrics["fifty_two_week_high"] is not None:
                    metrics["fifty_two_week_range"] = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
                
                # Filter out None values for cleaner output
                metrics = {k: v for k, v in metrics.items() if v is not None}
                
                # Check if we have at least the basic required data
                if "company_name" in metrics and "current_price" in metrics:
                    # Cache the metrics
                    self._set_in_cache(cache_key, "company_metrics", metrics)
                    
                    logger.info(f"Retrieved company metrics for {ticker} with {len(metrics)} fields")
                    return metrics
                    
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker} metrics: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker} metrics")
                    return {"not_found": True, "source": "yahoo_finance", "error": str(e)}
        
        # If we get here, all attempts failed
        return {"not_found": True, "source": "yahoo_finance"}
    
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a ticker
        
        Args:
            ticker: Stock symbol
            start_date: Start date for historical data
            end_date: End date for historical data (default: now)
            
        Returns:
            List of historical price data points or empty list if unavailable
        """
        if not end_date:
            end_date = datetime.now()
        
        # Create a cache key that includes the date range
        cache_key = f"history_{ticker}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        cached_data = self._get_from_cache(cache_key, "historical_prices")
        if cached_data:
            return cached_data
        
        # Convert dates to UNIX timestamps
        start_timestamp = int(start_date.timestamp())
        end_timestamp = int(end_date.timestamp())
        
        # URL for Yahoo Finance historical data
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={start_timestamp}&period2={end_timestamp}&interval=1d"
        
        # Make the request
        data = await self._make_request(url)
        if not data:
            return []
        
        # Extract price data
        if "chart" in data and "result" in data["chart"] and data["chart"]["result"]:
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            timestamps = result.get("timestamp", [])
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            
            # Check if we have data
            if not timestamps or not quotes:
                logger.warning(f"No historical data available for {ticker}")
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
                            "ticker": ticker,
                            "date": date.date(),
                            "timestamp": date,
                            "day_open": float(open_price) if open_price is not None else None,
                            "day_high": float(high) if high is not None else None,
                            "day_low": float(low) if low is not None else None,
                            "close_price": float(close),
                            "volume": int(volume) if volume is not None else None,
                            "source": "yahoo_finance"
                        })
                except Exception as point_error:
                    logger.warning(f"Error processing historical point for {ticker} at index {i}: {str(point_error)}")
            
            if results:
                # Cache the results
                self._set_in_cache(cache_key, "historical_prices", results)
                
                logger.info(f"Retrieved {len(results)} historical data points for {ticker}")
            return results
        else:
            logger.warning(f"Invalid response format for {ticker} historical data")
            return []
    
    async def get_batch_historical_prices(self, tickers: List[str], start_date: datetime, end_date: Optional[datetime] = None, max_batch_size: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get historical prices for multiple tickers in batches
        
        Args:
            tickers: List of stock symbols
            start_date: Start date for historical data
            end_date: End date for historical data (default: now)
            max_batch_size: Maximum number of tickers per batch
            
        Returns:
            Dictionary mapping tickers to their historical price data
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
        
        logger.info(f"Batch historical request complete for {len(results)}/{len(tickers)} tickers")
        return results
    
    async def get_fx_prices(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for FX pairs, cryptocurrencies, or metals
        Ensures all required fields are included in the response
        
        Args:
            symbols: List of symbols (e.g., 'EURUSD=X', 'BTC-USD', 'GC=F' for gold)
            
        Returns:
            Dictionary mapping symbols to their price data
        """
        logger.info(f"Fetching FX/crypto prices for {len(symbols)} symbols")
        
        if not symbols:
            return {}
        
        results = {}
        
        # Use the batch endpoint which works well for FX/crypto
        batch_str = ",".join(symbols)
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={batch_str}"
        
        try:
            # Make a single batch request
            data = await self._make_request(url)
            
            if data and "quoteResponse" in data and "result" in data["quoteResponse"]:
                quotes = data["quoteResponse"]["result"]
                
                # Process each result
                for quote in quotes:
                    symbol = quote.get("symbol")
                    
                    if not symbol or symbol not in symbols:
                        continue
                    
                    # Get price
                    price = quote.get("regularMarketPrice")
                    if price is None:
                        continue
                    
                    # Get full name
                    name = quote.get("shortName") or quote.get("longName") or symbol
                    
                    # Determine asset type and currency
                    asset_type = "unknown"
                    quote_currency = None
                    
                    if "-" in symbol:  # Crypto format (BTC-USD)
                        parts = symbol.split("-")
                        if len(parts) >= 2:
                            quote_currency = parts[1]
                        asset_type = "crypto"
                    elif "=X" in symbol:  # Forex format (EURUSD=X)
                        base_currency = symbol.replace("=X", "")
                        if len(base_currency) >= 3:
                            quote_currency = base_currency[-3:]
                        asset_type = "forex"
                    elif symbol.endswith("=F"):  # Futures/commodities
                        asset_type = "commodity"
                    
                    # Get timestamp
                    timestamp_val = quote.get("regularMarketTime")
                    if timestamp_val:
                        try:
                            price_timestamp = datetime.fromtimestamp(timestamp_val)
                        except:
                            price_timestamp = datetime.now()
                    else:
                        price_timestamp = datetime.now()
                    
                    # Extract additional required fields
                    market_cap = quote.get("marketCap")
                    volume_24h = quote.get("regularMarketVolume")
                    high_24h = quote.get("regularMarketDayHigh")
                    low_24h = quote.get("regularMarketDayLow")
                    
                    # Calculate price change if available
                    price_change_24h = quote.get("regularMarketChange")
                    price_change_percentage_24h = quote.get("regularMarketChangePercent")
                    
                    # Create result object with all required fields
                    result_data = {
                        "symbol": symbol,
                        "asset_type": asset_type,
                        "name": name,
                        "current_price": str(price),  # Convert to string to match example format
                        "price_updated_at": datetime.now().isoformat(),
                        "price_as_of_date": price_timestamp.isoformat(),
                        "source": "yahoo_finance",
                        "quote_currency": quote_currency,
                        
                        # Basic price data
                        "ticker": symbol,  # For backward compatibility
                        "price": float(price),  # For backward compatibility
                        "day_open": float(quote.get("regularMarketOpen")) if quote.get("regularMarketOpen") is not None else None,
                        "day_high": float(quote.get("regularMarketDayHigh")) if quote.get("regularMarketDayHigh") is not None else None,
                        "day_low": float(quote.get("regularMarketDayLow")) if quote.get("regularMarketDayLow") is not None else None,
                        "close_price": float(price),  # For backward compatibility
                        "volume": int(volume_24h) if volume_24h is not None else None,  # For backward compatibility
                        "timestamp": datetime.now().isoformat(),  # For backward compatibility
                        "price_timestamp": price_timestamp,  # For backward compatibility
                        "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),  # For backward compatibility
                        
                        # Additional required fields
                        "market_cap": str(market_cap) if market_cap is not None else None,
                        "volume_24h": str(volume_24h) if volume_24h is not None else None,
                        "high_24h": str(high_24h) if high_24h is not None else None,
                        "low_24h": str(low_24h) if low_24h is not None else None,
                        "price_change_24h": str(price_change_24h) if price_change_24h is not None else None,
                        "price_change_percentage_24h": str(price_change_percentage_24h) if price_change_percentage_24h is not None else None,
                        "metadata": {}  # Empty metadata object as per example
                    }
                    
                    # Add to results
                    results[symbol] = result_data
            
            # If we're missing any symbols, try individual requests
            missing_symbols = [s for s in symbols if s not in results]
            if missing_symbols:
                logger.info(f"Fetching {len(missing_symbols)} missing symbols individually")
                for symbol in missing_symbols:
                    try:
                        # Use individual quote endpoint
                        ind_url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}"
                        ind_data = await self._make_request(ind_url)
                        
                        if ind_data and "quoteResponse" in ind_data and "result" in ind_data["quoteResponse"] and ind_data["quoteResponse"]["result"]:
                            quote = ind_data["quoteResponse"]["result"][0]
                            
                            # Get price
                            price = quote.get("regularMarketPrice")
                            if price is None:
                                continue
                            
                            # Get full name
                            name = quote.get("shortName") or quote.get("longName") or symbol
                            
                            # Determine asset type and currency
                            asset_type = "unknown"
                            quote_currency = None
                            
                            if "-" in symbol:  # Crypto format (BTC-USD)
                                parts = symbol.split("-")
                                if len(parts) >= 2:
                                    quote_currency = parts[1]
                                asset_type = "crypto"
                            elif "=X" in symbol:  # Forex format (EURUSD=X)
                                base_currency = symbol.replace("=X", "")
                                if len(base_currency) >= 3:
                                    quote_currency = base_currency[-3:]
                                asset_type = "forex"
                            elif symbol.endswith("=F"):  # Futures/commodities
                                asset_type = "commodity"
                            
                            # Get timestamp
                            timestamp_val = quote.get("regularMarketTime")
                            if timestamp_val:
                                try:
                                    price_timestamp = datetime.fromtimestamp(timestamp_val)
                                except:
                                    price_timestamp = datetime.now()
                            else:
                                price_timestamp = datetime.now()
                            
                            # Extract additional required fields
                            market_cap = quote.get("marketCap")
                            volume_24h = quote.get("regularMarketVolume")
                            high_24h = quote.get("regularMarketDayHigh")
                            low_24h = quote.get("regularMarketDayLow")
                            
                            # Calculate price change if available
                            price_change_24h = quote.get("regularMarketChange")
                            price_change_percentage_24h = quote.get("regularMarketChangePercent")
                            
                            # Create result object with all required fields
                            result_data = {
                                "symbol": symbol,
                                "asset_type": asset_type,
                                "name": name,
                                "current_price": str(price),  # Convert to string to match example format
                                "price_updated_at": datetime.now().isoformat(),
                                "price_as_of_date": price_timestamp.isoformat(),
                                "source": "yahoo_finance",
                                "quote_currency": quote_currency,
                                
                                # Basic price data
                                "ticker": symbol,  # For backward compatibility
                                "price": float(price),  # For backward compatibility
                                "day_open": float(quote.get("regularMarketOpen")) if quote.get("regularMarketOpen") is not None else None,
                                "day_high": float(quote.get("regularMarketDayHigh")) if quote.get("regularMarketDayHigh") is not None else None,
                                "day_low": float(quote.get("regularMarketDayLow")) if quote.get("regularMarketDayLow") is not None else None,
                                "close_price": float(price),  # For backward compatibility
                                "volume": int(volume_24h) if volume_24h is not None else None,  # For backward compatibility
                                "timestamp": datetime.now().isoformat(),  # For backward compatibility
                                "price_timestamp": price_timestamp,  # For backward compatibility
                                "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),  # For backward compatibility
                                
                                # Additional required fields
                                "market_cap": str(market_cap) if market_cap is not None else None,
                                "volume_24h": str(volume_24h) if volume_24h is not None else None,
                                "high_24h": str(high_24h) if high_24h is not None else None,
                                "low_24h": str(low_24h) if low_24h is not None else None,
                                "price_change_24h": str(price_change_24h) if price_change_24h is not None else None,
                                "price_change_percentage_24h": str(price_change_percentage_24h) if price_change_percentage_24h is not None else None,
                                "metadata": {}  # Empty metadata object as per example
                            }
                            
                            # Add to results
                            results[symbol] = result_data
                    except Exception as e:
                        logger.error(f"Error fetching individual data for {symbol}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error in FX/crypto batch request: {str(e)}")
        
        logger.info(f"FX/crypto request complete, returning data for {len(results)}/{len(symbols)} symbols")
        return results