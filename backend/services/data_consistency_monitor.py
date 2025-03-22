"""
Data Consistency Monitor Service

This module periodically checks for inconsistencies between securities, positions,
and price history data. It helps ensure data integrity across the application.
"""
import os
import logging
import asyncio
import databases
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("data_consistency_monitor")

# Load environment variables
load_dotenv()

# Initialize Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL)

class DataConsistencyMonitor:
    """
    Service that checks for inconsistencies between securities, positions, and price history data.
    It runs various validation queries and generates reports of inconsistencies.
    """
    
    def __init__(self):
        """Initialize the data consistency monitor"""
        self.database = database
    
    async def connect(self):
        """Connect to the database"""
        if not self.database.is_connected:
            await self.database.connect()
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.database.is_connected:
            await self.database.disconnect()
    
    async def check_data_consistency(self) -> Dict[str, Any]:
        """
        Perform a full data consistency check across the system.
        
        Returns:
            Dictionary containing inconsistency reports
        """
        try:
            await self.connect()
            
            start_time = datetime.now()
            logger.info("Starting data consistency check")
            
            # Record the start of this operation in system_events
            event_id = await self._record_system_event(
                "data_consistency_check", 
                "started", 
                {}
            )
            
            # Initialize results dictionary
            results = {
                "securities_issues": [],
                "positions_issues": [],
                "price_history_issues": [],
                "orphaned_positions": [],
                "securities_without_prices": [],
                "issues_count": 0,
                "start_time": start_time.isoformat(),
                "end_time": None,
                "duration_seconds": None
            }
            
            # Run all consistency checks
            await self._check_securities_consistency(results)
            await self._check_positions_consistency(results)
            await self._check_price_history_consistency(results)
            await self._check_orphaned_positions(results)
            await self._check_securities_without_prices(results)
            
            # Calculate total issues
            results["issues_count"] = (
                len(results["securities_issues"]) +
                len(results["positions_issues"]) +
                len(results["price_history_issues"]) +
                len(results["orphaned_positions"]) +
                len(results["securities_without_prices"])
            )
            
            # Record end time and duration
            end_time = datetime.now()
            results["end_time"] = end_time.isoformat()
            results["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Update system event
            await self._update_system_event(
                event_id,
                "completed",
                {
                    "issues_count": results["issues_count"],
                    "checks_performed": 5,
                    "duration_seconds": results["duration_seconds"]
                }
            )
            
            logger.info(f"Data consistency check completed. Found {results['issues_count']} issues.")
            return results
            
        except Exception as e:
            logger.error(f"Error in data consistency check: {str(e)}")
            
            # Update system event with failure
            if 'event_id' in locals():
                await self._update_system_event(
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
                
            raise
        finally:
            await self.disconnect()
    
    async def _check_securities_consistency(self, results: Dict[str, Any]):
        """
        Check for inconsistencies in the securities table.
        
        This includes:
        - Securities with NULL or invalid prices
        - Invalid timestamps
        - Conflicting data sources
        """
        # Check for securities with NULL or invalid prices
        query = """
        SELECT 
            ticker, 
            current_price,
            last_updated
        FROM 
            securities
        WHERE 
            current_price IS NULL OR 
            current_price = 'NaN' OR 
            current_price <= 0 OR
            current_price > 1000000
        """
        invalid_prices = await self.database.fetch_all(query)
        
        for security in invalid_prices:
            results["securities_issues"].append({
                "ticker": security["ticker"],
                "issue_type": "invalid_price",
                "details": f"Invalid price: {security['current_price']}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for securities with future timestamps
        query = """
        SELECT 
            ticker, 
            last_updated 
        FROM 
            securities 
        WHERE 
            last_updated > NOW()
        """
        future_timestamps = await self.database.fetch_all(query)
        
        for security in future_timestamps:
            results["securities_issues"].append({
                "ticker": security["ticker"],
                "issue_type": "future_timestamp",
                "details": f"Last updated in the future: {security['last_updated']}",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _check_positions_consistency(self, results: Dict[str, Any]):
        """
        Check for inconsistencies in the positions table.
        
        This includes:
        - Positions with zero or negative shares
        - Positions with zero or negative prices
        - Positions with invalid dates
        """
        # Check for positions with zero or negative shares
        query = """
        SELECT 
            id, 
            account_id, 
            ticker, 
            shares 
        FROM 
            positions 
        WHERE 
            shares <= 0
        """
        invalid_shares = await self.database.fetch_all(query)
        
        for position in invalid_shares:
            results["positions_issues"].append({
                "position_id": position["id"],
                "account_id": position["account_id"],
                "ticker": position["ticker"],
                "issue_type": "invalid_shares",
                "details": f"Invalid shares: {position['shares']}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for positions with zero or negative prices
        query = """
        SELECT 
            id, 
            account_id, 
            ticker, 
            price 
        FROM 
            positions 
        WHERE 
            price <= 0
        """
        invalid_prices = await self.database.fetch_all(query)
        
        for position in invalid_prices:
            results["positions_issues"].append({
                "position_id": position["id"],
                "account_id": position["account_id"],
                "ticker": position["ticker"],
                "issue_type": "invalid_price",
                "details": f"Invalid price: {position['price']}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for positions with future dates
        query = """
        SELECT 
            id, 
            account_id, 
            ticker, 
            date 
        FROM 
            positions 
        WHERE 
            date > NOW()
        """
        future_dates = await self.database.fetch_all(query)
        
        for position in future_dates:
            results["positions_issues"].append({
                "position_id": position["id"],
                "account_id": position["account_id"],
                "ticker": position["ticker"],
                "issue_type": "future_date",
                "details": f"Future date: {position['date']}",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _check_price_history_consistency(self, results: Dict[str, Any]):
        """
        Check for inconsistencies in the price_history table.
        
        This includes:
        - Price entries with zero or negative prices
        - Duplicate date entries for the same ticker
        - Future dates in price history
        """
        # Check for price history with zero or negative prices
        query = """
        SELECT 
            id, 
            ticker, 
            date, 
            close_price,
            day_open,
            day_high,
            day_low 
        FROM 
            price_history 
        WHERE 
            close_price <= 0 OR day_open <= 0 OR day_high <= 0 OR day_low <= 0
        LIMIT 100
        """
        invalid_prices = await self.database.fetch_all(query)
        
        for price in invalid_prices:
            results["price_history_issues"].append({
                "price_id": price["id"],
                "ticker": price["ticker"],
                "date": price["date"].isoformat() if price["date"] else None,
                "issue_type": "invalid_price",
                "details": f"Invalid close price: {price['close_price']}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for duplicate date entries for the same ticker
        query = """
        SELECT 
            ticker, 
            date, 
            COUNT(*) as count 
        FROM 
            price_history 
        GROUP BY 
            ticker, date 
        HAVING 
            COUNT(*) > 1
        LIMIT 100
        """
        duplicates = await self.database.fetch_all(query)
        
        for dup in duplicates:
            results["price_history_issues"].append({
                "ticker": dup["ticker"],
                "date": dup["date"].isoformat() if dup["date"] else None,
                "issue_type": "duplicate_entry",
                "details": f"Duplicate entries: {dup['count']}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for future dates in price history
        query = """
        SELECT 
            id, 
            ticker, 
            date 
        FROM 
            price_history 
        WHERE 
            date > CURRENT_DATE
        LIMIT 100
        """
        future_dates = await self.database.fetch_all(query)
        
        for price in future_dates:
            results["price_history_issues"].append({
                "price_id": price["id"],
                "ticker": price["ticker"],
                "date": price["date"].isoformat() if price["date"] else None,
                "issue_type": "future_date",
                "details": f"Future date in price history",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _check_orphaned_positions(self, results: Dict[str, Any]):
        """
        Check for orphaned positions (positions with tickers that don't exist in securities table).
        """
        query = """
        SELECT 
            p.id, 
            p.account_id, 
            p.ticker 
        FROM 
            positions p 
        LEFT JOIN 
            securities s ON p.ticker = s.ticker 
        WHERE 
            s.ticker IS NULL
        LIMIT 100
        """
        orphaned = await self.database.fetch_all(query)
        
        for position in orphaned:
            results["orphaned_positions"].append({
                "position_id": position["id"],
                "account_id": position["account_id"],
                "ticker": position["ticker"],
                "issue_type": "orphaned_position",
                "details": f"Position references non-existent security",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _check_securities_without_prices(self, results: Dict[str, Any]):
        """
        Check for securities that don't have any price history entries.
        """
        query = """
        SELECT 
            s.ticker, 
            s.company_name
        FROM 
            securities s 
        LEFT JOIN (
            SELECT DISTINCT ticker FROM price_history
        ) ph ON s.ticker = ph.ticker 
        WHERE 
            ph.ticker IS NULL AND
            s.active = true
        """
        no_history = await self.database.fetch_all(query)
        
        for security in no_history:
            results["securities_without_prices"].append({
                "ticker": security["ticker"],
                "company_name": security["company_name"],
                "issue_type": "no_price_history",
                "details": f"Security has no price history entries",
                "timestamp": datetime.now().isoformat()
            })
    
    async def fix_common_issues(self) -> Dict[str, Any]:
        """
        Attempt to automatically fix common data consistency issues.
        
        Returns:
            Dictionary with results of fix operations
        """
        try:
            await self.connect()
            
            start_time = datetime.now()
            logger.info("Starting automatic fix of common data issues")
            
            # Record the start of this operation
            event_id = await self._record_system_event(
                "data_consistency_fix", 
                "started", 
                {}
            )
            
            # Initialize results
            results = {
                "fixed_issues": [],
                "unfixable_issues": [],
                "total_fixed": 0,
                "start_time": start_time.isoformat(),
                "end_time": None,
                "duration_seconds": None
            }
            
            # Fix securities with NULL or invalid prices
            await self._fix_invalid_security_prices(results)
            
            # Fix securities with future timestamps
            await self._fix_future_timestamps(results)
            
            # Fix duplicate price history entries
            await self._fix_duplicate_price_history(results)
            
            # Calculate end time and duration
            end_time = datetime.now()
            results["end_time"] = end_time.isoformat()
            results["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Update system event
            await self._update_system_event(
                event_id,
                "completed",
                {
                    "total_fixed": results["total_fixed"],
                    "unfixable": len(results["unfixable_issues"]),
                    "duration_seconds": results["duration_seconds"]
                }
            )
            
            logger.info(f"Data consistency fix completed. Fixed {results['total_fixed']} issues.")
            return results
            
        except Exception as e:
            logger.error(f"Error in fixing data consistency issues: {str(e)}")
            
            # Update system event with failure
            if 'event_id' in locals():
                await self._update_system_event(
                    event_id,
                    "failed",
                    {"error": str(e)},
                    str(e)
                )
                
            raise
        finally:
            await self.disconnect()
    
    async def _fix_invalid_security_prices(self, results: Dict[str, Any]):
        """
        Fix securities with NULL or invalid prices by fetching latest price
        """
        # Get securities with invalid prices
        query = """
        SELECT 
            ticker
        FROM 
            securities
        WHERE 
            current_price IS NULL OR 
            current_price = 'NaN' OR 
            current_price <= 0 OR
            current_price > 1000000
        """
        invalid_securities = await self.database.fetch_all(query)
        
        # Try to get the most recent price from price_history
        for security in invalid_securities:
            ticker = security["ticker"]
            try:
                # Get most recent price from price_history
                query = """
                SELECT 
                    close_price, 
                    date
                FROM 
                    price_history
                WHERE 
                    ticker = :ticker AND
                    close_price > 0
                ORDER BY 
                    date DESC
                LIMIT 1
                """
                recent_price = await self.database.fetch_one(query, {"ticker": ticker})
                
                if recent_price and recent_price["close_price"]:
                    # Update the security with the most recent valid price
                    update_query = """
                    UPDATE 
                        securities
                    SET 
                        current_price = :price,
                        last_updated = NOW()
                    WHERE 
                        ticker = :ticker
                    """
                    await self.database.execute(
                        update_query, 
                        {
                            "ticker": ticker, 
                            "price": recent_price["close_price"]
                        }
                    )
                    
                    results["fixed_issues"].append({
                        "ticker": ticker,
                        "issue_type": "invalid_price",
                        "solution": f"Updated with most recent price from history: {recent_price['close_price']}",
                        "date": recent_price["date"].isoformat() if recent_price["date"] else None,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    results["total_fixed"] += 1
                else:
                    # Can't fix automatically
                    results["unfixable_issues"].append({
                        "ticker": ticker,
                        "issue_type": "invalid_price",
                        "reason": "No valid price found in price history",
                        "timestamp": datetime.now().isoformat()
                    })
            except Exception as e:
                logger.error(f"Error fixing invalid price for {ticker}: {str(e)}")
                results["unfixable_issues"].append({
                    "ticker": ticker,
                    "issue_type": "invalid_price",
                    "reason": f"Error: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
    
    async def _fix_future_timestamps(self, results: Dict[str, Any]):
        """
        Fix securities with future timestamps by setting timestamp to current time
        """
        # Get securities with future timestamps
        query = """
        SELECT 
            ticker, 
            last_updated 
        FROM 
            securities 
        WHERE 
            last_updated > NOW()
        """
        future_timestamps = await self.database.fetch_all(query)
        
        for security in future_timestamps:
            ticker = security["ticker"]
            try:
                # Update timestamp to current time
                query = """
                UPDATE 
                    securities
                SET 
                    last_updated = NOW()
                WHERE 
                    ticker = :ticker
                """
                await self.database.execute(query, {"ticker": ticker})
                
                results["fixed_issues"].append({
                    "ticker": ticker,
                    "issue_type": "future_timestamp",
                    "solution": "Reset timestamp to current time",
                    "timestamp": datetime.now().isoformat()
                })
                
                results["total_fixed"] += 1
            except Exception as e:
                logger.error(f"Error fixing future timestamp for {ticker}: {str(e)}")
                results["unfixable_issues"].append({
                    "ticker": ticker,
                    "issue_type": "future_timestamp",
                    "reason": f"Error: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
    
    async def _fix_duplicate_price_history(self, results: Dict[str, Any]):
        """
        Fix duplicate price history entries by keeping the most recent record
        """
        # Get duplicates in price_history
        query = """
        SELECT 
            ticker, 
            date, 
            COUNT(*) as count 
        FROM 
            price_history 
        GROUP BY 
            ticker, date 
        HAVING 
            COUNT(*) > 1
        """
        duplicates = await self.database.fetch_all(query)
        
        for dup in duplicates:
            ticker = dup["ticker"]
            date = dup["date"]
            count = dup["count"]
            
            try:
                # Get all duplicate entries
                query = """
                SELECT 
                    id, 
                    close_price, 
                    timestamp
                FROM 
                    price_history
                WHERE 
                    ticker = :ticker AND
                    date = :date
                ORDER BY 
                    timestamp DESC
                """
                entries = await self.database.fetch_all(
                    query, 
                    {
                        "ticker": ticker, 
                        "date": date
                    }
                )
                
                if len(entries) > 1:
                    # Keep the first one (most recent by timestamp) and delete others
                    keep_id = entries[0]["id"]
                    
                    # Collect IDs to delete (all except the one to keep)
                    delete_ids = [entry["id"] for entry in entries[1:]]
                    
                    # Delete duplicates
                    if delete_ids:
                        placeholders = ', '.join([str(id) for id in delete_ids])
                        delete_query = f"""
                        DELETE FROM 
                            price_history
                        WHERE 
                            id IN ({placeholders})
                        """
                        await self.database.execute(delete_query)
                        
                        results["fixed_issues"].append({
                            "ticker": ticker,
                            "date": date.isoformat() if date else None,
                            "issue_type": "duplicate_price_history",
                            "solution": f"Kept most recent entry (ID: {keep_id}) and deleted {len(delete_ids)} duplicates",
                            "timestamp": datetime.now().isoformat()
                        })
                        
                        results["total_fixed"] += 1
            except Exception as e:
                logger.error(f"Error fixing duplicate price history for {ticker} on {date}: {str(e)}")
                results["unfixable_issues"].append({
                    "ticker": ticker,
                    "date": date.isoformat() if date else None,
                    "issue_type": "duplicate_price_history",
                    "reason": f"Error: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
    
    async def _record_system_event(self, event_type: str, status: str, details: Dict[str, Any]) -> int:
        """Record a system event"""
        try:
            # Convert details to JSON string if provided
            details_json = None
            if details:
                # Simple serialization here - for a more robust solution, use dedicated JSON serializer
                import json
                details_json = json.dumps(details)
            
            query = """
                INSERT INTO system_events
                (event_type, status, started_at, details)
                VALUES (:event_type, :status, :started_at, :details)
                RETURNING id
            """
            
            params = {
                "event_type": event_type,
                "status": status,
                "started_at": datetime.utcnow(),
                "details": details_json
            }
            
            event_id = await self.database.fetch_val(query, params)
            return event_id
        except Exception as e:
            logger.error(f"Failed to record system event: {str(e)}")
            return None
    
    async def _update_system_event(self, event_id: int, status: str, details: Dict[str, Any] = None, error_message: str = None):
        """Update a system event"""
        try:
            if not event_id:
                return False
            
            completed_at = datetime.utcnow() if status in ["completed", "failed"] else None
            
            # Convert details to JSON string if provided
            details_json = None
            if details:
                import json
                details_json = json.dumps(details)
            
            query = """
                UPDATE system_events
                SET 
                    status = :status,
                    completed_at = :completed_at,
                    details = :details,
                    error_message = :error_message
                WHERE id = :event_id
            """
            
            params = {
                "event_id": event_id,
                "status": status,
                "completed_at": completed_at,
                "details": details_json,
                "error_message": error_message
            }
            
            await self.database.execute(query, params)
            return True
        except Exception as e:
            logger.error(f"Failed to update system event: {str(e)}")
            return False


# Function to run the consistency check as a standalone script
async def run_consistency_check(fix_issues: bool = False):
    """
    Run data consistency check as a standalone script
    
    Args:
        fix_issues: Whether to automatically fix common issues
    """
    monitor = DataConsistencyMonitor()
    
    try:
        # Run consistency check
        print("Running data consistency check...")
        results = await monitor.check_data_consistency()
        
        print(f"Check completed in {results['duration_seconds']:.2f} seconds")
        print(f"Found {results['issues_count']} issues:")
        print(f"  - Securities issues: {len(results['securities_issues'])}")
        print(f"  - Positions issues: {len(results['positions_issues'])}")
        print(f"  - Price history issues: {len(results['price_history_issues'])}")
        print(f"  - Orphaned positions: {len(results['orphaned_positions'])}")
        print(f"  - Securities without prices: {len(results['securities_without_prices'])}")
        
        # Fix issues if requested
        if fix_issues and results['issues_count'] > 0:
            print("\nAttempting to fix common issues...")
            fix_results = await monitor.fix_common_issues()
            
            print(f"Fix completed in {fix_results['duration_seconds']:.2f} seconds")
            print(f"Fixed {fix_results['total_fixed']} issues")
            print(f"Unable to fix {len(fix_results['unfixable_issues'])} issues")
    except Exception as e:
        print(f"Error during consistency check: {str(e)}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="NestEgg Data Consistency Monitor")
    parser.add_argument("--fix", action="store_true", help="Automatically fix common issues")
    
    args = parser.parse_args()
    
    asyncio.run(run_consistency_check(fix_issues=args.fix))