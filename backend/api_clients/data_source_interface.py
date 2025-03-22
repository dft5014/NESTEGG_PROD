"""
Interface definition for market data sources.
All data source clients should implement this interface.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

class MarketDataSource(ABC):
    """Abstract base class defining the interface for all market data sources"""
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        """Return the name of this data source"""
        pass
        
    @property
    @abstractmethod
    def daily_call_limit(self) -> Optional[int]:
        """Return the daily API call limit (None if unlimited)"""
        pass
    
    @abstractmethod
    async def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get current price for a single ticker
        
        Args:
            ticker: Ticker symbol
            
        Returns:
            Dictionary with price data or None if unavailable
        """
        pass
    
    @abstractmethod
    async def get_batch_prices(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers
        
        Args:
            tickers: List of ticker symbols
            
        Returns:
            Dictionary mapping tickers to their price data
        """
        pass
    
    @abstractmethod
    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get company metrics for a ticker (PE ratio, market cap, etc.)
        
        Args:
            ticker: Ticker symbol
            
        Returns:
            Dictionary with company metrics or None if unavailable
        """
        pass
    
    @abstractmethod
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a ticker
        
        Args:
            ticker: Ticker symbol
            start_date: Start date for historical data
            end_date: End date for historical data (defaults to today)
            
        Returns:
            List of historical price data points
        """
        pass