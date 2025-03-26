"""
YahooQuery market data source implementation.
Uses the yahooquery library for data access.
"""
import os
import logging
import asyncio
import pandas as pd  # Added pandas import for pd.notna() functions
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import yahooquery as yq

from backend.api_clients.data_source_interface import MarketDataSource

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yahooquery_client")

class YahooQueryClient(MarketDataSource):
    """
    Client for interacting with Yahoo Finance API.
    Uses the yahooquery library for better Render compatibility.
    """
    
    def __init__(self):
        """Initialize the YahooQuery client"""
        pass
    
    @property
    def source_name(self) -> str:
        """Return the name of this data source"""
        return "yahoo_query"
        
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
                logger.info(f"Fetching data for {ticker} using yahooquery (attempt {attempt+1}/{retries})")
                
                # Use yahooquery to get price data
                loop = asyncio.get_event_loop()
                ticker_obj = await loop.run_in_executor(None, lambda: yq.Ticker(ticker))
                price_data = await loop.run_in_executor(None, lambda: ticker_obj.price[ticker])
                
                if not price_data or "regularMarketPrice" not in price_data:
                    logger.warning(f"No price data available for {ticker}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return None
                
                # Convert to our standard format
                result = {
                    "price": float(price_data["regularMarketPrice"]),
                    "day_open": float(price_data["regularMarketOpen"]) if "regularMarketOpen" in price_data else None,
                    "day_high": float(price_data["regularMarketDayHigh"]) if "regularMarketDayHigh" in price_data else None,
                    "day_low": float(price_data["regularMarketDayLow"]) if "regularMarketDayLow" in price_data else None,
                    "close_price": float(price_data["regularMarketPrice"]),
                    "volume": int(price_data["regularMarketVolume"]) if "regularMarketVolume" in price_data else None,
                    "timestamp": datetime.now(),
                    "price_timestamp": datetime.now(),  # YahooQuery doesn't provide exact timestamp
                    "price_timestamp_str": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "source": self.source_name
                }
                
                logger.info(f"Returning data for {ticker}: {result}")
                return result
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker}")
                    return None
    
    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 10) -> Dict[str, Dict[str, Any]]:
        """
        Get current prices for multiple tickers
        """
        logger.info(f"Starting batch request for: {tickers}")
        if not tickers:
            return {}
            
        results = {}
        
        # Process in smaller batches to avoid any rate limiting
        for i in range(0, len(tickers), max_batch_size):
            batch = tickers[i:i + max_batch_size]
            logger.info(f"Processing batch {i//max_batch_size + 1}/{(len(tickers) + max_batch_size - 1)//max_batch_size}: {batch}")
            
            try:
                # Use yahooquery to get price data for the batch
                loop = asyncio.get_event_loop()
                ticker_obj = await loop.run_in_executor(None, lambda: yq.Ticker(batch))
                price_data = await loop.run_in_executor(None, lambda: ticker_obj.price)
                
                # Process each ticker in the batch
                for ticker in batch:
                    if ticker in price_data and "regularMarketPrice" in price_data[ticker]:
                        ticker_price = price_data[ticker]
                        
                        results[ticker] = {
                            "price": float(ticker_price["regularMarketPrice"]),
                            "day_open": float(ticker_price["regularMarketOpen"]) if "regularMarketOpen" in ticker_price else None,
                            "day_high": float(ticker_price["regularMarketDayHigh"]) if "regularMarketDayHigh" in ticker_price else None,
                            "day_low": float(ticker_price["regularMarketDayLow"]) if "regularMarketDayLow" in ticker_price else None,
                            "close_price": float(ticker_price["regularMarketPrice"]),
                            "volume": int(ticker_price["regularMarketVolume"]) if "regularMarketVolume" in ticker_price else None,
                            "timestamp": datetime.now(),
                            "price_timestamp": datetime.now(),
                            "price_timestamp_str": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "source": self.source_name
                        }
            except Exception as e:
                logger.error(f"Error processing batch {batch}: {str(e)}")
                
                # Fall back to individual processing
                for ticker in batch:
                    try:
                        price_data = await self.get_current_price(ticker)
                        if price_data:
                            results[ticker] = price_data
                    except Exception as ticker_error:
                        logger.error(f"Error processing {ticker} individually: {str(ticker_error)}")
            
            # Add a small delay between batches
            if i + max_batch_size < len(tickers):
                await asyncio.sleep(1)
        
        logger.info(f"Batch request complete, returning data for {len(results)} tickers")
        return results
    
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
            
            try:
                # Convert dates to format required by yahooquery
                start_str = start_date.strftime("%Y-%m-%d")
                end_str = end_date.strftime("%Y-%m-%d")
                
                # Use yahooquery to get historical data for the batch
                loop = asyncio.get_event_loop()
                ticker_obj = await loop.run_in_executor(None, lambda: yq.Ticker(batch))
                history = await loop.run_in_executor(
                    None, 
                    lambda: ticker_obj.history(start=start_str, end=end_str)
                )
                
                # Check if we got valid data
                if history.empty:
                    logger.warning(f"No historical data available for batch: {batch_str}")
                    continue
                
                # Process each ticker in the batch
                for ticker in batch:
                    try:
                        # Filter to only get the data for this ticker
                        ticker_history = history.reset_index()
                        if 'symbol' in ticker_history.columns:
                            ticker_history = ticker_history[ticker_history['symbol'] == ticker]
                        else:
                            logger.warning(f"Symbol column not found in historical data for {ticker}")
                            continue
                        
                        if ticker_history.empty:
                            logger.warning(f"No historical data found for {ticker} in batch response")
                            continue
                        
                        ticker_results = []
                        for _, row in ticker_history.iterrows():
                            date_val = row.get('date')
                            if date_val is None:
                                continue
                                
                            # Convert date to appropriate format
                            if isinstance(date_val, str):
                                try:
                                    date_val = datetime.strptime(date_val, "%Y-%m-%d")
                                except ValueError:
                                    continue
                            
                            # Extract price data and handle potential errors
                            try:
                                close_val = row.get('close')
                                open_val = row.get('open')
                                high_val = row.get('high')
                                low_val = row.get('low')
                                volume_val = row.get('volume')
                                
                                # Handle NaN values
                                close_price = float(close_val) if pd.notna(close_val) else None
                                if close_price is None:
                                    continue
                                    
                                ticker_results.append({
                                    "date": date_val.date() if hasattr(date_val, 'date') else date_val,
                                    "timestamp": date_val if isinstance(date_val, datetime) else datetime.combine(date_val, datetime.min.time()),
                                    "day_open": float(open_val) if pd.notna(open_val) else None,
                                    "day_high": float(high_val) if pd.notna(high_val) else None,
                                    "day_low": float(low_val) if pd.notna(low_val) else None,
                                    "close_price": close_price,
                                    "volume": int(volume_val) if pd.notna(volume_val) else None,
                                    "source": self.source_name
                                })
                            except Exception as row_err:
                                logger.warning(f"Error processing row for {ticker}: {str(row_err)}")
                        
                        if ticker_results:
                            results[ticker] = ticker_results
                            logger.info(f"Added {len(ticker_results)} historical points for {ticker}")
                        else:
                            logger.warning(f"No valid historical data points extracted for {ticker}")
                    except Exception as ticker_error:
                        logger.error(f"Error processing historical data for {ticker}: {str(ticker_error)}")
                        
                        # Try to get data for this ticker individually
                        try:
                            ticker_data = await self.get_historical_prices(ticker, start_date, end_date)
                            if ticker_data:
                                results[ticker] = ticker_data
                                logger.info(f"Individual lookup successful for {ticker}: {len(ticker_data)} points")
                        except Exception as e:
                            logger.error(f"Individual historical data retrieval failed for {ticker}: {str(e)}")
            except Exception as batch_error:
                logger.error(f"Error processing batch historical data for {batch_str}: {str(batch_error)}")
                
                # Try each ticker individually
                for ticker in batch:
                    try:
                        ticker_data = await self.get_historical_prices(ticker, start_date, end_date)
                        if ticker_data:
                            results[ticker] = ticker_data
                            logger.info(f"Individual lookup successful for {ticker}: {len(ticker_data)} points")
                    except Exception as e:
                        logger.error(f"Individual historical data retrieval failed for {ticker}: {str(e)}")
            
            # Add a small delay between batches to avoid rate limiting
            if i + max_batch_size < len(tickers):
                await asyncio.sleep(1)
        
        logger.info(f"Batch historical data request complete, returning data for {len(results)} tickers")
        return results
    
    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get company metrics for a ticker
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                logger.info(f"Fetching company info for {ticker} using yahooquery (attempt {attempt+1}/{retries})")
                
                # Use yahooquery to get company information
                loop = asyncio.get_event_loop()
                ticker_obj = await loop.run_in_executor(None, lambda: yq.Ticker(ticker))
                
                # Get summary and financial data
                asset_profile = await loop.run_in_executor(None, lambda: ticker_obj.asset_profile)
                financial_data = await loop.run_in_executor(None, lambda: ticker_obj.financial_data)
                key_stats = await loop.run_in_executor(None, lambda: ticker_obj.key_stats)
                summary_detail = await loop.run_in_executor(None, lambda: ticker_obj.summary_detail)
                price_data = await loop.run_in_executor(None, lambda: ticker_obj.price)
                
                # Check if we got valid data
                if (ticker not in asset_profile or 
                    ticker not in financial_data or 
                    ticker not in key_stats or 
                    ticker not in summary_detail or
                    ticker not in price_data):
                    logger.warning(f"Incomplete data for {ticker}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return {"not_found": True, "source": self.source_name}
                
                # Extract asset profile data
                profile = asset_profile[ticker]
                finance = financial_data[ticker]
                stats = key_stats[ticker]
                details = summary_detail[ticker]
                price = price_data[ticker]
                
                # Construct metrics dictionary
                metrics = {
                    "ticker": ticker,
                    "company_name": profile.get("shortName") or profile.get("longName"),
                    "sector": profile.get("sector", ""),
                    "industry": profile.get("industry", ""),
                    "source": self.source_name,
                    
                    # Price data
                    "current_price": price.get("regularMarketPrice"),
                    "previous_close": price.get("regularMarketPreviousClose"),
                    "day_open": price.get("regularMarketOpen"),
                    "day_high": price.get("regularMarketDayHigh"),
                    "day_low": price.get("regularMarketDayLow"),
                    "volume": price.get("regularMarketVolume"),
                    
                    # Financial metrics
                    "market_cap": stats.get("marketCap"),
                    "pe_ratio": details.get("trailingPE"),
                    "forward_pe": details.get("forwardPE"),
                    "dividend_rate": details.get("dividendRate"),
                    "dividend_yield": details.get("dividendYield"),
                    "beta": details.get("beta"),
                    "fifty_two_week_low": details.get("fiftyTwoWeekLow"),
                    "fifty_two_week_high": details.get("fiftyTwoWeekHigh"),
                    "eps": stats.get("trailingEps"),
                    "forward_eps": stats.get("forwardEps"),
                    "average_volume": details.get("averageVolume"),
                    # Additional fields to match other clients
                    "target_high_price": stats.get("targetHighPrice"),
                    "target_low_price": stats.get("targetLowPrice"),
                    "target_mean_price": stats.get("targetMeanPrice"),
                    "target_median_price": stats.get("targetMedianPrice"),
                    "bid_price": details.get("bid"),
                    "ask_price": details.get("ask"),
                }
                
                # Calculate fifty_two_week_range
                if metrics.get("fifty_two_week_low") is not None and metrics.get("fifty_two_week_high") is not None:
                    metrics["fifty_two_week_range"] = f"{metrics['fifty_two_week_low']}-{metrics['fifty_two_week_high']}"
                
                # Filter out None values
                metrics = {k: v for k, v in metrics.items() if v is not None}
                
                logger.info(f"Metrics for {ticker}: {metrics}")
                return metrics
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker} metrics: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker} metrics")
                    return {"not_found": True, "source": self.source_name, "error": str(e)}
    
    async def get_historical_prices(self, ticker: str, start_date: datetime, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Get historical prices for a single ticker
        """
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                if not end_date:
                    end_date = datetime.now()
                
                logger.info(f"Fetching historical data for {ticker} (attempt {attempt+1}/{retries})")
                
                # Convert dates to format required by yahooquery
                start_str = start_date.strftime("%Y-%m-%d")
                end_str = end_date.strftime("%Y-%m-%d")
                
                # Use yahooquery to get historical data
                loop = asyncio.get_event_loop()
                ticker_obj = await loop.run_in_executor(None, lambda: yq.Ticker(ticker))
                history = await loop.run_in_executor(
                    None, 
                    lambda: ticker_obj.history(start=start_str, end=end_str)
                )
                
                # Check if we got valid data
                if history.empty:
                    logger.warning(f"No historical data available for {ticker}")
                    if attempt < retries - 1:
                        await asyncio.sleep(delay * (2 ** attempt))
                        continue
                    return []
                
                # Process the data
                results = []
                
                # Filter to only get the data for this ticker
                ticker_history = history.reset_index()
                if 'symbol' in ticker_history.columns:
                    ticker_history = ticker_history[ticker_history['symbol'] == ticker]
                
                for _, row in ticker_history.iterrows():
                    date_val = row.get('date')
                    if date_val is None:
                        continue
                        
                    # Make sure we can handle various date formats
                    if isinstance(date_val, str):
                        try:
                            date_val = datetime.strptime(date_val, "%Y-%m-%d")
                        except ValueError:
                            continue
                    
                    # Extract and convert values safely
                    try:
                        day_open = float(row['open']) if pd.notna(row['open']) else None
                        day_high = float(row['high']) if pd.notna(row['high']) else None
                        day_low = float(row['low']) if pd.notna(row['low']) else None
                        close_price = float(row['close']) if pd.notna(row['close']) else None
                        volume = int(row['volume']) if pd.notna(row['volume']) else None
                        
                        # Only add points with valid close price
                        if close_price is not None:
                            results.append({
                                "date": date_val.date() if hasattr(date_val, 'date') else date_val,
                                "timestamp": date_val if isinstance(date_val, datetime) else datetime.combine(date_val, datetime.min.time()),
                                "day_open": day_open,
                                "day_high": day_high,
                                "day_low": day_low,
                                "close_price": close_price,
                                "volume": volume,
                                "source": self.source_name
                            })
                    except Exception as row_error:
                        logger.warning(f"Error processing historical data row for {ticker}: {str(row_error)}")
                
                logger.info(f"Successfully processed {len(results)} historical data points for {ticker}")
                return results
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1}/{retries} failed for {ticker} historical data: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    logger.error(f"All retries exhausted for {ticker} historical data")
                    return []