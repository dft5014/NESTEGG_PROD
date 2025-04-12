"""
Yahoo_Data - Unified client for all Yahoo Finance data
"""
import os
import logging
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime, timedelta
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yahoo_data")

class Yahoo_Data:
    """
    Unified client for Yahoo Finance data access.
    Supports securities, cryptocurrencies, metals, and other assets.
    Prioritizes batch processing for efficiency.
    """
    
    def __init__(self):
        """Initialize the Yahoo Data client"""
        self.session = aiohttp.ClientSession(headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        })
        
        # Add a cache dictionary with TTL values
        self.cache = {}
        self.cache_ttl = {
            "current_price": 15 * 60,  # 15 minutes
            "asset_details": 24 * 60 * 60,  # 24 hours
        }
    
    async def close(self):
        """Close the client session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _get_from_cache(self, cache_key: str, cache_type: str) -> Optional[Any]:
        """Get data from cache if it exists and is not expired"""
        if not hasattr(self, 'cache'):
            return None
            
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            now = datetime.now()
            if (now - cached_data["timestamp"]).total_seconds() < self.cache_ttl[cache_type]:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_data["data"]
        return None

    def _set_in_cache(self, cache_key: str, cache_type: str, data: Any) -> None:
        """Store data in cache with current timestamp"""
        if not hasattr(self, 'cache'):
            return
            
        self.cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now()
        }
        logger.debug(f"Cached data for {cache_key}")
    
    def _extract_raw_value(self, data_dict: Dict, key: str) -> Any:
        """Helper method to extract raw values from nested Yahoo Finance response structures"""
        if key in data_dict:
            item = data_dict[key]
            # Yahoo often wraps values in objects with 'raw' as the actual value
            if isinstance(item, dict) and 'raw' in item:
                return item['raw']
            return item
        return None
    
    async def get_chart_data(self, symbols: Union[str, List[str]], interval: str = "1d") -> Dict[str, Any]:
        """
        Get chart data for one or multiple symbols
        
        Args:
            symbols: Single symbol string or list of symbols
            interval: Data interval ("1d", "1h", etc.)
            
        Returns:
            Dictionary with chart data for each symbol
        """
        # Convert single symbol to list for consistent handling
        if isinstance(symbols, str):
            symbols_str = symbols
            symbols_list = [symbols]
        else:
            symbols_str = ",".join(symbols)
            symbols_list = symbols
        
        # Check cache
        cache_key = f"chart_{symbols_str}_{interval}"
        cached_data = self._get_from_cache(cache_key, "current_price")
        if cached_data:
            return cached_data
        
        # Define URL
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbols_str}?interval={interval}"
        
        retries = 3
        delay = 2
        
        for attempt in range(retries):
            try:
                logger.debug(f"Fetching chart data for {symbols_str} (attempt {attempt+1}/{retries})")
                
                async with self.session.get(url, timeout=15) as response:
                    if response.status != 200:
                        logger.warning(f"Failed to get chart data for {symbols_str}. Status: {response.status}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return {}
                    
                    data = await response.json()
                    
                    # Cache results
                    self._set_in_cache(cache_key, "current_price", data)
                    
                    return data
            except Exception as e:
                logger.error(f"Error fetching chart data (attempt {attempt+1}): {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {symbols_str}")
                    return {}
        
        return {}
    
    async def get_quote_summary(self, symbol: str, modules: List[str] = None) -> Dict[str, Any]:
        """
        Get quote summary data for a symbol
        
        Args:
            symbol: The symbol to look up
            modules: List of data modules to request (defaults to common ones)
            
        Returns:
            Dictionary with quote summary data
        """
        if modules is None:
            modules = ["price", "summaryDetail", "summaryProfile", "assetProfile"]
        
        modules_str = ",".join(modules)
        
        # Check cache
        cache_key = f"summary_{symbol}_{modules_str}"
        cached_data = self._get_from_cache(cache_key, "asset_details")
        if cached_data:
            return cached_data
        
        # Define URL
        url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules={modules_str}"
        
        retries = 3
        delay = 2
        
        for attempt in range(retries):
            try:
                logger.debug(f"Fetching quote summary for {symbol} (attempt {attempt+1}/{retries})")
                
                async with self.session.get(url, timeout=15) as response:
                    if response.status != 200:
                        logger.warning(f"Failed to get quote summary for {symbol}. Status: {response.status}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return {}
                    
                    data = await response.json()
                    
                    # Check if we have valid data
                    if "quoteSummary" in data and "result" in data["quoteSummary"] and data["quoteSummary"]["result"]:
                        # Cache results
                        self._set_in_cache(cache_key, "asset_details", data)
                        return data
                    else:
                        logger.warning(f"Invalid response for {symbol}: {data}")
                        if attempt < retries - 1:
                            await asyncio.sleep(delay * (2 ** attempt))
                            continue
                        return {}
            except Exception as e:
                logger.error(f"Error fetching quote summary (attempt {attempt+1}): {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {symbol}")
                    return {}
        
        return {}
    
    async def process_chart_result(self, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single chart result into standardized price data"""
        if not result:
            return None
            
        # Get symbol and metadata
        meta = result.get("meta", {})
        symbol = meta.get("symbol")
        
        if not symbol:
            logger.warning("Chart result missing symbol")
            return None
            
        # Get timestamps and quotes
        timestamp = result.get("timestamp", [])
        quotes = result.get("indicators", {}).get("quote", [{}])[0]
        
        # Check if we have data
        if not timestamp or not quotes or "close" not in quotes:
            logger.warning(f"No price data available for {symbol}")
            return None
        
        # Get the latest values
        latest_idx = -1
        
        # Extract price values
        close = quotes.get("close", [])[latest_idx] if quotes.get("close") and len(quotes.get("close", [])) > 0 else None
        open_price = quotes.get("open", [])[latest_idx] if quotes.get("open") and len(quotes.get("open", [])) > 0 else None
        high = quotes.get("high", [])[latest_idx] if quotes.get("high") and len(quotes.get("high", [])) > 0 else None
        low = quotes.get("low", [])[latest_idx] if quotes.get("low") and len(quotes.get("low", [])) > 0 else None
        volume = quotes.get("volume", [])[latest_idx] if quotes.get("volume") and len(quotes.get("volume", [])) > 0 else None
        
        # Calculate price change if we have enough data
        if len(quotes.get("close", [])) > 1:
            prev_close = quotes.get("close", [])[-2]
            price_change = close - prev_close if close is not None and prev_close is not None else None
            price_change_pct = (price_change / prev_close) * 100 if price_change is not None and prev_close is not None and prev_close != 0 else None
        else:
            price_change = None
            price_change_pct = None
        
        # Convert timestamp to datetime
        price_timestamp = datetime.fromtimestamp(timestamp[latest_idx]) if timestamp and len(timestamp) > 0 else datetime.now()
        
        # Create the result
        return {
            "symbol": symbol,
            "current_price": float(close) if close is not None else None,
            "price_updated_at": datetime.now(),
            "price_as_of_date": price_timestamp,
            "source": "yahoo_finance",
            "name": meta.get("instrumentName", symbol),
            
            # Additional price data
            "open_price": float(open_price) if open_price is not None else None,
            "high_24h": float(high) if high is not None else None,
            "low_24h": float(low) if low is not None else None,
            "volume_24h": int(volume) if volume is not None else None,
            "price_change_24h": float(price_change) if price_change is not None else None,
            "price_change_percentage_24h": float(price_change_pct) if price_change_pct is not None else None,
            
            # Additional metadata
            "price_timestamp": price_timestamp,
            "price_timestamp_str": price_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "exchange": meta.get("exchangeName"),
            "currency": meta.get("currency")
        }
    
    async def get_price_batch(self, symbols: List[str], max_batch_size: int = 50) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple assets in efficient batches
        
        Args:
            symbols: List of symbols to fetch
            max_batch_size: Maximum symbols per batch (Yahoo supports up to ~50)
            
        Returns:
            Dictionary mapping symbols to their price data
        """
        results = {}
        
        # Process in batches
        for i in range(0, len(symbols), max_batch_size):
            batch = symbols[i:i + max_batch_size]
            logger.info(f"Processing batch {i//max_batch_size + 1}/{(len(symbols) + max_batch_size - 1)//max_batch_size}: {len(batch)} symbols")
            
            # Fetch chart data for this batch
            chart_data = await self.get_chart_data(batch)
            
            # Check if we got valid data
            if "chart" in chart_data and "result" in chart_data["chart"]:
                # Process each result
                for result in chart_data["chart"]["result"]:
                    try:
                        price_data = await self.process_chart_result(result)
                        if price_data:
                            symbol = price_data["symbol"]
                            results[symbol] = price_data
                    except Exception as e:
                        symbol = result.get("meta", {}).get("symbol", "unknown")
                        logger.error(f"Error processing data for {symbol}: {str(e)}")
            
            # Add a small delay between batches to avoid rate limiting
            if i + max_batch_size < len(symbols):
                await asyncio.sleep(1)
        
        logger.info(f"Batch request complete, returning data for {len(results)} symbols out of {len(symbols)} requested")
        return results
    
    async def get_asset_details(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about an asset
        
        Args:
            symbol: Asset symbol
            
        Returns:
            Dictionary with asset details or None if unavailable
        """
        # Get quote summary data
        summary_data = await self.get_quote_summary(
            symbol, 
            modules=["summaryProfile", "summaryDetail", "price", "defaultKeyStatistics"]
        )
        
        # Check if we got valid data
        if not summary_data or "quoteSummary" not in summary_data or "result" not in summary_data["quoteSummary"] or not summary_data["quoteSummary"]["result"]:
            return None
        
        # Extract the result
        result = summary_data["quoteSummary"]["result"][0]
        
        # Extract data from different modules
        price_data = result.get("price", {})
        summary_detail = result.get("summaryDetail", {})
        profile = result.get("summaryProfile", {})
        key_stats = result.get("defaultKeyStatistics", {})
        
        # Build the result dictionary
        details = {
            "symbol": symbol,
            "name": self._extract_raw_value(price_data, "shortName") or self._extract_raw_value(price_data, "longName") or symbol,
            "currency": self._extract_raw_value(price_data, "currency"),
            
            # Market data
            "market_cap": self._extract_raw_value(price_data, "marketCap"),
            "current_price": self._extract_raw_value(price_data, "regularMarketPrice"),
            "volume_24h": self._extract_raw_value(price_data, "regularMarketVolume"),
            "day_high": self._extract_raw_value(price_data, "regularMarketDayHigh"),
            "day_low": self._extract_raw_value(price_data, "regularMarketDayLow"),
            
            # Additional details
            "fifty_two_week_high": self._extract_raw_value(summary_detail, "fiftyTwoWeekHigh"),
            "fifty_two_week_low": self._extract_raw_value(summary_detail, "fiftyTwoWeekLow"),
            "average_volume": self._extract_raw_value(summary_detail, "averageVolume"),
            "beta": self._extract_raw_value(summary_detail, "beta"),
            
            # Stats
            "pe_ratio": self._extract_raw_value(summary_detail, "trailingPE"),
            "forward_pe": self._extract_raw_value(summary_detail, "forwardPE"),
            "dividend_yield": self._extract_raw_value(summary_detail, "dividendYield"),
            "dividend_rate": self._extract_raw_value(summary_detail, "dividendRate"),
            "eps": self._extract_raw_value(key_stats, "trailingEps"),
            
            # Source info
            "exchange": self._extract_raw_value(price_data, "exchangeName"),
            "quote_type": self._extract_raw_value(price_data, "quoteType"),
            "source": "yahoo_finance",
            "retrieved_at": datetime.now().isoformat()
        }
        
        # Add profile info if available
        if profile:
            details["description"] = profile.get("longBusinessSummary")
            details["website"] = profile.get("website")
            details["sector"] = profile.get("sector")
            details["industry"] = profile.get("industry")
        
        return details