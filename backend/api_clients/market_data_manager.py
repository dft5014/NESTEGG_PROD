"""
Market Data Manager to coordinate between different data sources.
"""
import os
import logging
import random
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

# Import the data source interface
from backend.api_clients.data_source_interface import MarketDataSource
from backend.api_clients.yahoo_finance_client import YahooFinanceClient
from backend.api_clients.yahooquery_client import YahooQueryClient
from backend.api_clients.direct_yahoo_client import DirectYahooFinanceClient
from backend.api_clients.polygon_client import PolygonClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("market_data_manager")

class MarketDataManager:
    """
    Manages multiple market data sources and orchestrates data retrieval
    based on source availability and priority.
    """
    
    def __init__(self):
        """Initialize the market data manager with available data sources"""
        # Dictionary to store data sources
        self.sources = {}
        
        # Dictionary to track API usage
        self.usage_stats = {}
        
        # Dictionary to track reliability per ticker and source
        self.ticker_source_reliability = {}
        
        # Dictionary to store preferred sources for different data types
        self.preferred_sources = {
            "current_price": [],
            "batch_prices": [],
            "company_metrics": [],
            "historical_prices": []
        }
        
        # Load all available sources
        self._load_sources()
        
        # Set default source preferences
        self._set_default_preferences()
    
    def _load_sources(self):
        """Load all available data sources"""
        # Add DirectYahooFinanceClient as primary source
        try:
            direct_yahoo = DirectYahooFinanceClient()
            self.sources["direct_yahoo"] = direct_yahoo
            self.usage_stats["direct_yahoo"] = {
                "calls": 0,
                "last_reset": datetime.now(),
                "success_rate": 1.0,
            }
            logger.info("DirectYahooFinanceClient loaded successfully")
        except Exception as e:
            logger.info(f"DirectYahooFinanceClient not available: {str(e)}")
        
        # Add YahooQueryClient for company metrics
        try:
            yahooquery = YahooQueryClient()
            self.sources["yahooquery"] = yahooquery
            self.usage_stats["yahooquery"] = {
                "calls": 0,
                "last_reset": datetime.now(),
                "success_rate": 1.0,
            }
            logger.info("YahooQueryClient loaded successfully")
        except Exception as e:
            logger.info(f"YahooQueryClient not available: {str(e)}")
        
        # Add legacy YahooFinanceClient as backup
        yahoo = YahooFinanceClient()
        self.sources[yahoo.source_name] = yahoo
        self.usage_stats[yahoo.source_name] = {
            "calls": 0,
            "last_reset": datetime.now(),
            "success_rate": 1.0,
        }
        
        # Try to load Polygon if API key is available (lowest priority)
        try:
            polygon = PolygonClient()
            self.sources[polygon.source_name] = polygon
            self.usage_stats[polygon.source_name] = {
                "calls": 0,
                "last_reset": datetime.now(),
                "success_rate": 1.0,
                "daily_limit": polygon.daily_call_limit
            }
        except Exception as e:
            logger.info(f"Polygon.io not available: {str(e)}")
        
        logger.info(f"Loaded {len(self.sources)} data sources: {', '.join(self.sources.keys())}")

    def _set_default_preferences(self):
        """Set default source preferences for different data types based on performance testing"""
        available_sources = list(self.sources.keys())
        
        # Current price preference (direct_yahoo is faster)
        current_price_order = ["direct_yahoo", "yahooquery", "yahoo_finance", "polygon"]
        
        # Batch prices preference (yahooquery is slightly faster)
        batch_prices_order = ["yahooquery", "direct_yahoo", "yahoo_finance", "polygon"]
        
        # Company metrics preference (only yahooquery works reliably)
        metrics_order = ["yahooquery", "yahoo_finance", "direct_yahoo", "polygon"]
        
        # Historical prices preference (direct_yahoo is much faster)
        historical_order = ["direct_yahoo", "yahooquery", "yahoo_finance", "polygon"]
        
        # Filter to only use available sources
        self.preferred_sources["current_price"] = [s for s in current_price_order if s in available_sources]
        self.preferred_sources["batch_prices"] = [s for s in batch_prices_order if s in available_sources]
        self.preferred_sources["company_metrics"] = [s for s in metrics_order if s in available_sources]
        self.preferred_sources["historical_prices"] = [s for s in historical_order if s in available_sources]
        
        logger.info("Set optimized source preferences based on performance testing")
        
        logger.info("Set default source preferences based on performance testing")  
        
    def set_source_preference(self, data_type: str, sources: List[str]):
        """
        Set preferred sources for a data type
        
        Args:
            data_type: Type of data (current_price, batch_prices, company_metrics, historical_prices)
            sources: List of source names in order of preference
        """
        if data_type not in self.preferred_sources:
            raise ValueError(f"Unknown data type: {data_type}")
            
        # Validate that all sources exist
        for source in sources:
            if source not in self.sources:
                raise ValueError(f"Unknown source: {source}")
                
        self.preferred_sources[data_type] = sources
        logger.info(f"Updated preferences for {data_type}: {', '.join(sources)}")
    
    def _reset_usage_if_needed(self):
        """Reset usage counters if a day has passed"""
        now = datetime.now()
        
        for source, stats in self.usage_stats.items():
            if (now - stats["last_reset"]).days >= 1:
                logger.info(f"Resetting usage stats for {source}")
                stats["calls"] = 0
                stats["last_reset"] = now
    
    def _log_api_usage(self, source: str, success: bool = True):
        """
        Log usage of a data source and update success rate
        
        Args:
            source: Name of the data source
            success: Whether the API call was successful
        """
        if source not in self.usage_stats:
            return
            
        # Increment call counter
        self.usage_stats[source]["calls"] += 1
        
        # Update success rate (using exponential moving average)
        current_rate = self.usage_stats[source]["success_rate"]
        success_value = 1.0 if success else 0.0
        # Weight recent results more heavily (0.25 is the weight for new data)
        self.usage_stats[source]["success_rate"] = (0.75 * current_rate) + (0.25 * success_value)
    
    def _record_ticker_source_result(self, ticker: str, source: str, success: bool):
        """
        Record the success/failure of a source for a specific ticker
        
        Args:
            ticker: Ticker symbol
            source: Data source name
            success: Whether the lookup was successful
        """
        if ticker not in self.ticker_source_reliability:
            self.ticker_source_reliability[ticker] = {}
            
        # Initialize if this is the first time using this source for this ticker
        if source not in self.ticker_source_reliability[ticker]:
            self.ticker_source_reliability[ticker][source] = 1.0
            
        # Update success rate using exponential moving average
        current_rate = self.ticker_source_reliability[ticker][source]
        success_value = 1.0 if success else 0.0
        # Weight recent results more heavily
        self.ticker_source_reliability[ticker][source] = (0.7 * current_rate) + (0.3 * success_value)
    
    def _select_source_for_operation(self, data_type: str, ticker: str = None) -> List[str]:
        """
        Select the best sources for an operation in order of preference
        
        Args:
            data_type: Type of data being requested
            ticker: Optional ticker symbol for ticker-specific optimization
            
        Returns:
            List of source names in order of preference
        """
        self._reset_usage_if_needed()
        
        # Start with the preferred sources for this data type
        candidate_sources = self.preferred_sources.get(data_type, [])
        
        # If we have historical data for this ticker, adjust priorities based on reliability
        if ticker and ticker in self.ticker_source_reliability:
            ticker_stats = self.ticker_source_reliability[ticker]
            
            # Sort the preferred sources based on reliability for this ticker
            candidate_sources = sorted(
                [s for s in candidate_sources if s in ticker_stats],
                key=lambda s: ticker_stats[s],
                reverse=True
            ) + [s for s in candidate_sources if s not in ticker_stats]
        
        # Filter out sources that have reached their daily limit
        available_sources = []
        for source in candidate_sources:
            if source not in self.usage_stats:
                continue
                
            # Skip if source has a daily limit and has reached it
            stats = self.usage_stats[source]
            daily_limit = stats.get("daily_limit")
            if daily_limit and stats["calls"] >= daily_limit:
                logger.debug(f"Source {source} has reached its daily limit")
                continue
                
            available_sources.append(source)
        
        # If no sources are available (all at limit), include all sources anyway
        # as we prefer having data from a limited source than no data at all
        if not available_sources:
            available_sources = candidate_sources
            
        return available_sources
    
    async def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get current price for a ticker using the best available source
        
        Args:
            ticker: Ticker symbol
            
        Returns:
            Price data or None if all sources fail
        """
        sources_to_try = self._select_source_for_operation("current_price", ticker)
        
        for source_name in sources_to_try:
            source = self.sources.get(source_name)
            if not source:
                continue
                
            try:
                price_data = await source.get_current_price(ticker)
                
                # Log API usage and reliability
                success = price_data is not None
                self._log_api_usage(source_name, success)
                self._record_ticker_source_result(ticker, source_name, success)
                
                if price_data:
                    return price_data
                    
            except Exception as e:
                logger.warning(f"Error getting price for {ticker} from {source_name}: {str(e)}")
                self._log_api_usage(source_name, False)
                self._record_ticker_source_result(ticker, source_name, False)
        
        # If all sources fail, return None
        return None
    
    async def get_batch_prices(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers using the best available sources
        
        Args:
            tickers: List of ticker symbols
            
        Returns:
            Dictionary mapping tickers to their price data
        """
        if not tickers:
            return {}
            
        results = {}
        remaining_tickers = set(tickers)
        
        # Try the preferred source for batch lookups first
        sources_to_try = self._select_source_for_operation("batch_prices")
        
        for source_name in sources_to_try:
            source = self.sources.get(source_name)
            if not source or not remaining_tickers:
                continue
                
            try:
                # Convert remaining tickers to list
                batch_tickers = list(remaining_tickers)
                
                # Get batch prices from this source
                batch_results = await source.get_batch_prices(batch_tickers)
                
                # Log API usage (count as one call for batch)
                self._log_api_usage(source_name, success=len(batch_results) > 0)
                
                # Process results
                for ticker, data in batch_results.items():
                    results[ticker] = data
                    remaining_tickers.remove(ticker)
                    # Record success for this ticker
                    self._record_ticker_source_result(ticker, source_name, True)
                
                # Record failure for tickers that weren't found
                for ticker in list(remaining_tickers):
                    if ticker in batch_tickers:
                        self._record_ticker_source_result(ticker, source_name, False)
                
            except Exception as e:
                logger.warning(f"Error in batch lookup from {source_name}: {str(e)}")
                self._log_api_usage(source_name, False)
        
        # For any remaining tickers, try individual lookups
        if remaining_tickers:
            for ticker in list(remaining_tickers):
                price_data = await self.get_current_price(ticker)
                if price_data:
                    results[ticker] = price_data
                    remaining_tickers.remove(ticker)
        
        return results
    
    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get company metrics for a ticker using the best available source
        
        Args:
            ticker: Ticker symbol
            
        Returns:
            Dictionary with company metrics or None if all sources fail
        """
        sources_to_try = self._select_source_for_operation("company_metrics", ticker)
        
        for source_name in sources_to_try:
            source = self.sources.get(source_name)
            if not source:
                continue
                
            try:
                metrics_data = await source.get_company_metrics(ticker)
                
                # Check if this source explicitly reported ticker not found
                if metrics_data and metrics_data.get("not_found"):
                    logger.info(f"Ticker {ticker} not found on {source_name}")
                    
                    # We don't record this as a failure for reliability metrics
                    # since it's not a technical failure, just unavailability
                    continue
                
                # Log API usage and reliability
                success = metrics_data is not None
                self._log_api_usage(source_name, success)
                self._record_ticker_source_result(ticker, source_name, success)
                
                if metrics_data:
                    return metrics_data
                    
            except Exception as e:
                logger.warning(f"Error getting metrics for {ticker} from {source_name}: {str(e)}")
                self._log_api_usage(source_name, False)
                self._record_ticker_source_result(ticker, source_name, False)
        
        # If all sources fail, return None
        return None
    
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a ticker using the best available source
        
        Args:
            ticker: Ticker symbol
            start_date: Start date for historical data
            end_date: End date for historical data (defaults to today)
            
        Returns:
            List of historical price data or empty list if all sources fail
        """
        sources_to_try = self._select_source_for_operation("historical_prices", ticker)
        
        for source_name in sources_to_try:
            source = self.sources.get(source_name)
            if not source:
                continue
                
            try:
                historical_data = await source.get_historical_prices(ticker, start_date, end_date)
                
                # Log API usage and reliability
                success = len(historical_data) > 0
                self._log_api_usage(source_name, success)
                self._record_ticker_source_result(ticker, source_name, success)
                
                if historical_data:
                    return historical_data
                    
            except Exception as e:
                logger.warning(f"Error getting historical data for {ticker} from {source_name}: {str(e)}")
                self._log_api_usage(source_name, False)
                self._record_ticker_source_result(ticker, source_name, False)
        
        # If all sources fail, return empty list
        return []
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics for all sources"""
        self._reset_usage_if_needed()
        return self.usage_stats
    
    def get_available_sources(self) -> List[str]:
        """Get list of all available data sources"""
        return list(self.sources.keys())