"""
Unified Yahoo Finance client for NestEgg project

This module provides a comprehensive client for Yahoo Finance data with:
- Asynchronous implementation
- Efficient caching mechanism
- Robust error handling and retry logic
- Batch operations support for minimizing API calls
- Comprehensive type hints
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
                # Specifically format URL for chart data
                url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={batch_str}"
                data = await self._make_request(url)
                
                if data and "quoteResponse" in data and "result" in data["quoteResponse"]:
                    quotes = data["quoteResponse"]["result"]
                    
                    # Process each result
                    for quote in quotes:
                        symbol = quote.get("symbol")
                        
                        if not symbol:
                            continue
                        
                        # Only add data if we have a valid close price
                        regular_market_price = quote.get("regularMarketPrice")
                        if regular_market_price is not None:
                            # Get timestamp
                            timestamp_str = quote.get("regularMarketTime", datetime.now().timestamp())
                            try:
                                price_timestamp = datetime.fromtimestamp(timestamp_str)
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
        Get company metrics and information for a ticker
        Adapted from YahooQueryClient logic for better reliability
        
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
        
        # URL for Yahoo Finance API - using quoteSummary endpoint
        modules = "summaryProfile,summaryDetail,defaultKeyStatistics,assetProfile,price"
        url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules={modules}"
        
        # Make the request
        data = await self._make_request(url)
        if not data:
            logger.error(f"No data returned from API for {ticker}")
            return {"not_found": True, "source": "yahoo_finance"}
        
        # Extract quote data
        if "quoteSummary" in data and "result" in data["quoteSummary"] and data["quoteSummary"]["result"]:
            result = data["quoteSummary"]["result"][0]
            
            # Initialize metrics dictionary
            metrics = {
                "ticker": ticker,
                "source": "yahoo_finance"
            }
            
            # Process each module separately with error handling
            try:
                # Extract data from price module (most reliable)
                if "price" in result:
                    price_data = result["price"]
                    metrics.update({
                        "company_name": self._extract_raw_value(price_data, "shortName") or self._extract_raw_value(price_data, "longName") or ticker,
                        "current_price": self._extract_raw_value(price_data, "regularMarketPrice"),
                        "previous_close": self._extract_raw_value(price_data, "regularMarketPreviousClose"),
                        "day_open": self._extract_raw_value(price_data, "regularMarketOpen"),
                        "day_high": self._extract_raw_value(price_data, "regularMarketDayHigh"),
                        "day_low": self._extract_raw_value(price_data, "regularMarketDayLow"),
                        "volume": self._extract_raw_value(price_data, "regularMarketVolume"),
                        "exchange": self._extract_raw_value(price_data, "exchangeName"),
                        "quote_type": self._extract_raw_value(price_data, "quoteType"),
                    })
                    
                    # Try to get market cap from price data
                    market_cap = self._extract_raw_value(price_data, "marketCap")
                    if market_cap is not None:
                        metrics["market_cap"] = market_cap
            except Exception as e:
                logger.error(f"Error extracting price data for {ticker}: {str(e)}")
            
            try:
                # Extract data from summaryProfile module
                if "summaryProfile" in result:
                    profile = result["summaryProfile"]
                    metrics.update({
                        "sector": profile.get("sector", ""),
                        "industry": profile.get("industry", ""),
                        "website": profile.get("website"),
                        "description": profile.get("longBusinessSummary")
                    })
            except Exception as e:
                logger.error(f"Error extracting profile data for {ticker}: {str(e)}")
            
            try:
                # Extract data from summaryDetail module
                if "summaryDetail" in result:
                    details = result["summaryDetail"]
                    metrics.update({
                        "fifty_two_week_low": self._extract_raw_value(details, "fiftyTwoWeekLow"),
                        "fifty_two_week_high": self._extract_raw_value(details, "fiftyTwoWeekHigh"),
                        "average_volume": self._extract_raw_value(details, "averageVolume"),
                        "dividend_rate": self._extract_raw_value(details, "dividendRate"),
                        "dividend_yield": self._extract_raw_value(details, "dividendYield"),
                        "pe_ratio": self._extract_raw_value(details, "trailingPE"),
                        "forward_pe": self._extract_raw_value(details, "forwardPE"),
                    })
                    
                    # Get market cap if not already set
                    if "market_cap" not in metrics:
                        market_cap = self._extract_raw_value(details, "marketCap")
                        if market_cap is not None:
                            metrics["market_cap"] = market_cap
            except Exception as e:
                logger.error(f"Error extracting summary details for {ticker}: {str(e)}")
            
            try:
                # Extract data from defaultKeyStatistics module
                if "defaultKeyStatistics" in result:
                    stats = result["defaultKeyStatistics"]
                    metrics.update({
                        "beta": self._extract_raw_value(stats, "beta"),
                        "eps": self._extract_raw_value(stats, "trailingEps"),
                        "forward_eps": self._extract_raw_value(stats, "forwardEps"),
                    })
                    
                    # Get market cap if not already set
                    if "market_cap" not in metrics:
                        market_cap = self._extract_raw_value(stats, "marketCap")
                        if market_cap is not None:
                            metrics["market_cap"] = market_cap
            except Exception as e:
                logger.error(f"Error extracting key stats for {ticker}: {str(e)}")
            
            # Calculate fifty_two_week_range if both values are available
            if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                metrics["fifty_two_week_range"] = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
            
            # Filter out None values
            metrics = {k: v for k, v in metrics.items() if v is not None}
            
            # Check if we got meaningful data (more than just ticker and source)
            if "current_price" in metrics:  # As long as we have a price, consider it valid
                # Cache the metrics
                self._set_in_cache(cache_key, "company_metrics", metrics)
                
                logger.info(f"Retrieved company metrics for {ticker} with {len(metrics)} fields")
                return metrics
            else:
                logger.warning(f"Missing price data for {ticker}")
                return {"not_found": True, "source": "yahoo_finance"}
        else:
            logger.warning(f"Invalid response format for {ticker} info")
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
        Adapted from Yahoo_Data implementation for improved FX handling
        
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
        # Using the same approach as Yahoo_Data but with our client
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
                    
                    # Create result object
                    result_data = {
                        "ticker": symbol,
                        "price": float(price),
                        "day_open": float(quote.get("regularMarketOpen")) if quote.get("regularMarketOpen") is not None else None,
                        "day_high": float(quote.get("regularMarketDayHigh")) if quote.get("regularMarketDayHigh") is not None else None,
                        "day_low": float(quote.get("regularMarketDayLow")) if quote.get("regularMarketDayLow") is not None else None,
                        "close_price": float(price),
                        "volume": int(quote.get("regularMarketVolume")) if quote.get("regularMarketVolume") is not None else None,
                        "timestamp": datetime.now(),
                        "price_timestamp": price_timestamp,
                        "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "source": "yahoo_finance",
                        "quote_currency": quote_currency,
                        "asset_type": asset_type
                    }
                    
                    # Add to results
                    results[symbol] = result_data
            
            # If we're missing any symbols, try individual requests
            missing_symbols = [s for s in symbols if s not in results]
            if missing_symbols:
                logger.info(f"Fetching {len(missing_symbols)} missing symbols individually")
                for symbol in missing_symbols:
                    try:
                        price_data = await self.get_current_price(symbol)
                        if price_data:
                            # Add FX-specific fields
                            asset_type = "unknown"
                            quote_currency = None
                            
                            if "-" in symbol:
                                parts = symbol.split("-")
                                if len(parts) >= 2:
                                    quote_currency = parts[1]
                                asset_type = "crypto"
                            elif "=X" in symbol:
                                base_currency = symbol.replace("=X", "")
                                if len(base_currency) >= 3:
                                    quote_currency = base_currency[-3:]
                                asset_type = "forex"
                            elif symbol.endswith("=F"):
                                asset_type = "commodity"
                            
                            price_data["quote_currency"] = quote_currency
                            price_data["asset_type"] = asset_type
                            
                            results[symbol] = price_data
                    except Exception as e:
                        logger.error(f"Error fetching individual data for {symbol}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error in FX/crypto batch request: {str(e)}")
            
            # Fall back to individual processing
            for symbol in symbols:
                try:
                    price_data = await self.get_current_price(symbol)
                    if price_data:
                        # Add FX-specific fields
                        asset_type = "unknown"
                        quote_currency = None
                        
                        if "-" in symbol:
                            parts = symbol.split("-")
                            if len(parts) >= 2:
                                quote_currency = parts[1]
                            asset_type = "crypto"
                        elif "=X" in symbol:
                            base_currency = symbol.replace("=X", "")
                            if len(base_currency) >= 3:
                                quote_currency = base_currency[-3:]
                            asset_type = "forex"
                        elif symbol.endswith("=F"):
                            asset_type = "commodity"
                        
                        price_data["quote_currency"] = quote_currency
                        price_data["asset_type"] = asset_type
                        
                        results[symbol] = price_data
                except Exception as symbol_error:
                    logger.error(f"Error processing {symbol} individually: {str(symbol_error)}")
        
        logger.info(f"FX/crypto request complete, returning data for {len(results)}/{len(symbols)} symbols")
        return results