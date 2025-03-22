"""
Portfolio calculator module with caching.
Handles calculation of portfolio values based on current security prices.
This is decoupled from the price updating process.
"""
import os
import logging
import asyncio
import databases
import sqlalchemy
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from backend.utils.common import record_system_event, update_system_event
from backend.utils.redis_cache import cache_result, FastCache

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("portfolio_calculator")

# Initialize database connection
DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL)

class PortfolioCalculator:
    """
    Handles portfolio calculations based on current security prices.
    This is decoupled from the price updating process.
    """
    
    def __init__(self):
        self.database = database
    
    async def connect(self):
        """Connect to the database"""
        if not self.database.is_connected:
            await self.database.connect()
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.database.is_connected:
            await self.database.disconnect()
    
    async def calculate_all_portfolios(self) -> Dict[str, Any]:
        """
        Calculate values for all user portfolios based on current security prices.
        
        Returns:
            Summary of updates made
        """
        try:
            await self.connect()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "portfolio_calculation", 
                "started", 
                {}
            )
            
            # Start timing
            start_time = datetime.now()
            logger.info("Starting portfolio recalculation for all users")
            
            # 1. Get all positions with latest prices
            positions_query = """
                SELECT 
                    p.id, 
                    p.account_id, 
                    p.ticker, 
                    p.shares, 
                    COALESCE(p.cost_basis, p.price) as cost_basis,
                    COALESCE(s.current_price, p.price) as price
                FROM positions p
                LEFT JOIN securities s ON p.ticker = s.ticker
            """
            
            positions_data = await self.database.fetch_all(positions_query)
            logger.info(f"Found {len(positions_data)} positions to calculate")
            
            # 2. Group positions by account for efficient updates
            account_updates = {}
            account_cost_basis = {}
            account_positions_count = {}
            
            for position in positions_data:
                account_id = position['account_id']
                
                # Initialize account data if needed
                if account_id not in account_updates:
                    account_updates[account_id] = 0
                    account_cost_basis[account_id] = 0
                    account_positions_count[account_id] = 0
                
                # Calculate position value
                shares = float(position['shares'])
                current_price = float(position['price'])
                cost_basis = float(position['cost_basis'])
                
                position_value = shares * current_price
                position_cost = shares * cost_basis
                
                # Add to account totals
                account_updates[account_id] += position_value
                account_cost_basis[account_id] += position_cost
                account_positions_count[account_id] += 1
            
            # 3. Update account balances and performance metrics
            updated_accounts = 0
            total_portfolio_value = 0
            
            for account_id, new_balance in account_updates.items():
                # Calculate gain/loss data
                cost_basis = account_cost_basis[account_id]
                gain_loss = new_balance - cost_basis
                gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
                
                # Update account
                await self.database.execute(
                    """
                    UPDATE accounts 
                    SET 
                        balance = :balance, 
                        cost_basis = :cost_basis,
                        gain_loss = :gain_loss,
                        gain_loss_pct = :gain_loss_pct,
                        positions_count = :positions_count,
                        updated_at = NOW()
                    WHERE id = :account_id
                    """,
                    {
                        "balance": new_balance, 
                        "cost_basis": cost_basis,
                        "gain_loss": gain_loss,
                        "gain_loss_pct": gain_loss_pct,
                        "positions_count": account_positions_count[account_id],
                        "account_id": account_id
                    }
                )
                
                updated_accounts += 1
                total_portfolio_value += new_balance
            
            # 4. Record this calculation event
            await self.database.execute(
                """
                INSERT INTO portfolio_calculations 
                (timestamp, accounts_updated, total_value, duration_ms)
                VALUES (:timestamp, :accounts_updated, :total_value, :duration_ms)
                """,
                {
                    "timestamp": datetime.utcnow(),
                    "accounts_updated": updated_accounts,
                    "total_value": total_portfolio_value,
                    "duration_ms": int((datetime.now() - start_time).total_seconds() * 1000)
                }
            )
            
            # 5. Record completion
            duration = (datetime.now() - start_time).total_seconds()
            
            result = {
                "accounts_updated": updated_accounts,
                "positions_calculated": len(positions_data),
                "total_portfolio_value": total_portfolio_value,
                "duration_seconds": duration
            }
            
            await update_system_event(
                self.database,
                event_id,
                "completed",
                result
            )
            
            # Invalidate cached user portfolio calculations
            if FastCache.is_available():
                FastCache.delete_pattern("portfolio:user:*")
                logger.info("Invalidated cached user portfolio calculations")
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating portfolios: {str(e)}")
            
            # Record failure
            if event_id:
                await update_system_event(
                    self.database,
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
            
            raise
        finally:
            await self.disconnect()
    
    async def calculate_user_portfolio(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate portfolio values for a specific user with caching
        
        Args:
            user_id: User ID to calculate portfolio for
                
        Returns:
            Summary of updates made
        """
        # Generate cache key
        cache_key = f"portfolio:user:{user_id}"
        
        # Check cache first
        if FastCache.is_available():
            cached_result = FastCache.get(cache_key)
            if cached_result:
                logger.info(f"Using cached portfolio calculation for user {user_id}")
                return cached_result
        
        try:
            await self.connect()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "portfolio_calculation", 
                "started", 
                {"user_id": user_id}
            )
            
            # Start timing
            start_time = datetime.now()
            logger.info(f"Starting portfolio recalculation for user {user_id}")
            
            # 1. Get all user's accounts
            accounts_query = """
                SELECT id 
                FROM accounts 
                WHERE user_id = :user_id
            """
            
            user_accounts = await self.database.fetch_all(accounts_query, {"user_id": user_id})
            account_ids = [account['id'] for account in user_accounts]
            
            if not account_ids:
                logger.info(f"No accounts found for user {user_id}")
                
                # Record completion with zero results
                result = {
                    "user_id": user_id,
                    "accounts_updated": 0,
                    "positions_calculated": 0,
                    "total_portfolio_value": 0,
                    "duration_seconds": (datetime.now() - start_time).total_seconds()
                }
                
                await update_system_event(
                    self.database,
                    event_id,
                    "completed",
                    result
                )
                
                # Cache the empty result for 15 minutes
                if FastCache.is_available():
                    FastCache.set(cache_key, result, expire_seconds=900)  # 15 minutes
                
                return result
            
            # 2. Get all positions with latest prices for this user's accounts
            positions_query = """
                SELECT 
                    p.id, 
                    p.account_id, 
                    p.ticker, 
                    p.shares, 
                    COALESCE(p.cost_basis, p.price) as cost_basis,
                    COALESCE(s.current_price, p.price) as price
                FROM positions p
                LEFT JOIN securities s ON p.ticker = s.ticker
                WHERE p.account_id = ANY(:account_ids)
            """
            
            positions_data = await self.database.fetch_all(
                positions_query, 
                {"account_ids": account_ids}
            )
            
            logger.info(f"Found {len(positions_data)} positions for user {user_id}")
            
            # 3. Group positions by account for efficient updates
            account_updates = {}
            account_cost_basis = {}
            account_positions_count = {}
            
            for position in positions_data:
                account_id = position['account_id']
                
                # Initialize account data if needed
                if account_id not in account_updates:
                    account_updates[account_id] = 0
                    account_cost_basis[account_id] = 0
                    account_positions_count[account_id] = 0
                
                # Calculate position value
                shares = float(position['shares'])
                current_price = float(position['price'])
                cost_basis = float(position['cost_basis'])
                
                position_value = shares * current_price
                position_cost = shares * cost_basis
                
                # Add to account totals
                account_updates[account_id] += position_value
                account_cost_basis[account_id] += position_cost
                account_positions_count[account_id] += 1
            
            # 4. Update account balances and performance metrics
            updated_accounts = 0
            total_portfolio_value = 0
            
            for account_id, new_balance in account_updates.items():
                # Calculate gain/loss data
                cost_basis = account_cost_basis[account_id]
                gain_loss = new_balance - cost_basis
                gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
                
                # Update account
                await self.database.execute(
                    """
                    UPDATE accounts 
                    SET 
                        balance = :balance, 
                        cost_basis = :cost_basis,
                        gain_loss = :gain_loss,
                        gain_loss_pct = :gain_loss_pct,
                        positions_count = :positions_count,
                        updated_at = NOW()
                    WHERE id = :account_id
                    """,
                    {
                        "balance": new_balance, 
                        "cost_basis": cost_basis,
                        "gain_loss": gain_loss,
                        "gain_loss_pct": gain_loss_pct,
                        "positions_count": account_positions_count[account_id],
                        "account_id": account_id
                    }
                )
                
                updated_accounts += 1
                total_portfolio_value += new_balance
            
            # 5. Record completion
            duration = (datetime.now() - start_time).total_seconds()
            
            result = {
                "user_id": user_id,
                "accounts_updated": updated_accounts,
                "positions_calculated": len(positions_data),
                "total_portfolio_value": total_portfolio_value,
                "duration_seconds": duration
            }
            
            await update_system_event(
                self.database,
                event_id,
                "completed",
                result
            )
            
            # Cache the result for 15 minutes
            if FastCache.is_available():
                FastCache.set(cache_key, result, expire_seconds=900)  # 15 minutes
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating portfolio for user {user_id}: {str(e)}")
            
            # Record failure
            if event_id:
                await update_system_event(
                    self.database,
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
            
            raise
        finally:
            await self.disconnect()
    
    @cache_result(key_prefix="portfolio", expire_seconds=3600)  # Cache for 1 hour
    async def snapshot_portfolio_values(self) -> Dict[str, Any]:
        """
        Take a snapshot of all portfolio values for historical tracking
        
        Returns:
            Summary of snapshot operation
        """
        try:
            await self.connect()
            
            # Record the start of this operation
            event_id = await record_system_event(
                self.database, 
                "portfolio_snapshot", 
                "started", 
                {}
            )
            
            # Start timing
            start_time = datetime.now()
            current_date = datetime.now().date()
            logger.info(f"Taking portfolio snapshot for {current_date}")
            
            # 1. Get all user account balances
            accounts_query = """
                SELECT 
                    a.id,
                    a.user_id,
                    a.balance, 
                    a.cost_basis
                FROM accounts a
            """
            
            accounts_data = await self.database.fetch_all(accounts_query)
            
            # 2. Group by user to calculate portfolio totals
            user_portfolios = {}
            
            for account in accounts_data:
                user_id = account['user_id']
                
                # Initialize user data if needed
                if user_id not in user_portfolios:
                    user_portfolios[user_id] = {
                        "total_value": 0,
                        "total_cost": 0,
                        "accounts": 0
                    }
                
                # Add account data to user totals
                user_portfolios[user_id]["total_value"] += account['balance']
                user_portfolios[user_id]["total_cost"] += account['cost_basis'] if account['cost_basis'] else 0
                user_portfolios[user_id]["accounts"] += 1
            
            # 3. Insert portfolio history records
            inserted_count = 0
            
            for user_id, portfolio in user_portfolios.items():
                # Calculate gain/loss
                total_cost = portfolio["total_cost"]
                total_value = portfolio["total_value"]
                gain_loss = total_value - total_cost
                gain_loss_pct = (gain_loss / total_cost * 100) if total_cost > 0 else 0
                
                # Insert history record
                await self.database.execute(
                    """
                    INSERT INTO portfolio_history
                    (user_id, date, value, cost_basis, gain_loss, gain_loss_pct, accounts_count)
                    VALUES (:user_id, :date, :value, :cost_basis, :gain_loss, :gain_loss_pct, :accounts_count)
                    ON CONFLICT (user_id, date) DO UPDATE
                    SET 
                        value = :value,
                        cost_basis = :cost_basis,
                        gain_loss = :gain_loss,
                        gain_loss_pct = :gain_loss_pct,
                        accounts_count = :accounts_count
                    """,
                    {
                        "user_id": user_id,
                        "date": current_date,
                        "value": total_value,
                        "cost_basis": total_cost,
                        "gain_loss": gain_loss,
                        "gain_loss_pct": gain_loss_pct,
                        "accounts_count": portfolio["accounts"]
                    }
                )
                
                inserted_count += 1
            
            # 4. Record completion
            duration = (datetime.now() - start_time).total_seconds()
            
            result = {
                "snapshot_date": current_date.isoformat(),
                "users_processed": inserted_count,
                "total_accounts": len(accounts_data),
                "duration_seconds": duration
            }
            
            await update_system_event(
                self.database,
                event_id,
                "completed",
                result
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error taking portfolio snapshot: {str(e)}")
            
            # Record failure
            if event_id:
                await update_system_event(
                    self.database,
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
            
            raise
        finally:
            await self.disconnect()
            
    async def calculate_portfolio_performance(self, user_id: str, period: str = "1m") -> Dict[str, Any]:
        """
        Calculate portfolio performance over a specific time period
        
        Args:
            user_id: User ID to calculate performance for
            period: Time period (1w, 1m, 3m, 6m, 1y, ytd, max)
            
        Returns:
            Performance metrics
        """
        # Generate cache key
        cache_key = f"portfolio:performance:{user_id}:{period}"
        
        # Check cache first
        if FastCache.is_available():
            cached_result = FastCache.get(cache_key)
            if cached_result:
                logger.info(f"Using cached performance data for user {user_id}, period {period}")
                return cached_result
                
        try:
            await self.connect()
            
            # Calculate date range based on period
            end_date = datetime.now().date()
            
            if period == "1w":
                start_date = end_date - timedelta(days=7)
            elif period == "1m":
                start_date = end_date - timedelta(days=30)
            elif period == "3m":
                start_date = end_date - timedelta(days=90)
            elif period == "6m":
                start_date = end_date - timedelta(days=180)
            elif period == "1y":
                start_date = end_date - timedelta(days=365)
            elif period == "ytd":
                start_date = datetime(end_date.year, 1, 1).date()
            else:  # max
                # Get the earliest data point
                earliest_query = """
                SELECT MIN(date) as earliest_date
                FROM portfolio_history
                WHERE user_id = :user_id
                """
                earliest_result = await self.database.fetch_one(earliest_query, {"user_id": user_id})
                start_date = earliest_result["earliest_date"] if earliest_result and earliest_result["earliest_date"] else end_date - timedelta(days=365)
            
            # Get historical portfolio values
            history_query = """
            SELECT 
                date,
                value,
                cost_basis,
                gain_loss,
                gain_loss_pct
            FROM portfolio_history
            WHERE 
                user_id = :user_id AND 
                date BETWEEN :start_date AND :end_date
            ORDER BY date ASC
            """
            
            history = await self.database.fetch_all(
                history_query, 
                {
                    "user_id": user_id,
                    "start_date": start_date,
                    "end_date": end_date
                }
            )
            
            # Get current portfolio value
            current_value_query = """
            SELECT 
                SUM(balance) as current_value,
                SUM(cost_basis) as current_cost
            FROM accounts
            WHERE user_id = :user_id
            """
            
            current_value_result = await self.database.fetch_one(current_value_query, {"user_id": user_id})
            
            current_value = float(current_value_result["current_value"]) if current_value_result and current_value_result["current_value"] else 0
            current_cost = float(current_value_result["current_cost"]) if current_value_result and current_value_result["current_cost"] else 0
            
            # Calculate performance metrics
            history_points = []
            for point in history:
                history_points.append({
                    "date": point["date"].isoformat(),
                    "value": float(point["value"]),
                    "cost_basis": float(point["cost_basis"]) if point["cost_basis"] else 0,
                    "gain_loss": float(point["gain_loss"]) if point["gain_loss"] else 0,
                    "gain_loss_pct": float(point["gain_loss_pct"]) if point["gain_loss_pct"] else 0
                })
            
            # Calculate period performance
            start_value = history_points[0]["value"] if history_points else 0
            change_value = current_value - start_value
            change_pct = (change_value / start_value * 100) if start_value > 0 else 0
            
            result = {
                "user_id": user_id,
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "start_value": start_value,
                "current_value": current_value,
                "change_value": change_value,
                "change_percentage": change_pct,
                "current_cost_basis": current_cost,
                "current_gain_loss": current_value - current_cost,
                "current_gain_loss_pct": ((current_value - current_cost) / current_cost * 100) if current_cost > 0 else 0,
                "history": history_points
            }
            
            # Cache the result for 30 minutes
            if FastCache.is_available():
                FastCache.set(cache_key, result, expire_seconds=1800)  # 30 minutes
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating portfolio performance for user {user_id}: {str(e)}")
            raise
        finally:
            await self.disconnect()