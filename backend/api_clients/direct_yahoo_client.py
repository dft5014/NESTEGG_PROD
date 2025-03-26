# Create a new file called direct_yahoo_client.py in your backend/api_clients directory

import logging
import json
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

# Set up logging
logger = logging.getLogger("direct_yahoo_client")

class DirectYahooFinanceClient:
    """
    Direct implementation of Yahoo Finance API client without relying on yfinance.
    This is more reliable in cloud environments like Render.
    """
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        }
    
    @property
    def source_name(self) -> str:
        """Return the name of this data source"""
        return "yahoo_finance_direct"
    
    def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get current price for a single ticker using direct Yahoo Finance API
        """
        try:
            # URL for Yahoo Finance API
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d"
            
            # Make the request
            response = requests.get(url, headers=self.headers, timeout=10)
            
            # Check if successful
            if response.status_code != 200:
                logger.warning(f"Failed to get data for {ticker}. Status code: {response.status_code}")
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
                if not timestamp or not quotes:
                    logger.warning(f"No price data available for {ticker}")
                    return None
                
                # Get the latest values
                latest_idx = -1
                close = quotes.get("close", [])[latest_idx] if quotes.get("close") and quotes.get("close")[latest_idx] is not None else None
                open_price = quotes.get("open", [])[latest_idx] if quotes.get("open") and quotes.get("open")[latest_idx] is not None else None
                high = quotes.get("high", [])[latest_idx] if quotes.get("high") and quotes.get("high")[latest_idx] is not None else None
                low = quotes.get("low", [])[latest_idx] if quotes.get("low") and quotes.get("low")[latest_idx] is not None else None
                volume = quotes.get("volume", [])[latest_idx] if quotes.get("volume") and quotes.get("volume")[latest_idx] is not None else None
                
                # Only return data if we have a valid close price
                if close is None:
                    logger.warning(f"No close price available for {ticker}")
                    return None
                
                # Convert timestamp to datetime
                price_timestamp = datetime.fromtimestamp(timestamp[latest_idx])
                
                # Return the data in the expected format
                return {
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
            else:
                logger.warning(f"Invalid response format for {ticker}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting price for {ticker}: {str(e)}")
            return None
    
    def get_batch_prices(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers
        Process each ticker individually for reliability
        """
        results = {}
        
        for ticker in tickers:
            try:
                price_data = self.get_current_price(ticker)
                if price_data:
                    results[ticker] = price_data
            except Exception as e:
                logger.error(f"Error processing {ticker} in batch: {str(e)}")
        
        return results