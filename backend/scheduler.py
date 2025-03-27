import asyncio
import schedule
import time
import logging
from datetime import datetime, time as dt_time, timedelta
import sys
import os
import pytz

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import your services
from backend.services.price_updater_v2 import PriceUpdaterV2
from backend.utils.common import record_system_event, update_system_event
from backend.services.portfolio_calculator import PortfolioCalculator

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("scheduler")

# Read environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL is not set. Scheduler cannot run.")
    sys.exit(1)

SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"
logger.info(f"Scheduler enabled: {SCHEDULER_ENABLED}")

# Read frequency configuration from environment variables
PRICE_UPDATE_FREQUENCY = int(os.getenv("PRICE_UPDATE_FREQUENCY", "15"))  # In minutes, default 15
METRICS_UPDATE_TIME = os.getenv("METRICS_UPDATE_TIME", "02:00")  # Time in HH:MM format, default 2 AM
HISTORY_UPDATE_TIME = os.getenv("HISTORY_UPDATE_TIME", "03:00")  # Time in HH:MM format, default 3 AM
PORTFOLIO_SNAPSHOT_TIME = os.getenv("PORTFOLIO_SNAPSHOT_TIME", "04:00")  # Time in HH:MM format, default 4 AM

# Log frequency settings
logger.info(f"Price updates configured for every {PRICE_UPDATE_FREQUENCY} minutes")
logger.info(f"Company metrics updates configured for daily at {METRICS_UPDATE_TIME}")
logger.info(f"Historical price updates configured for daily at {HISTORY_UPDATE_TIME}")
logger.info(f"Portfolio snapshots configured for daily at {PORTFOLIO_SNAPSHOT_TIME}")

# Create a database connection
import databases
database = databases.Database(
    DATABASE_URL,
    statement_cache_size=0  # Disable statement caching for PgBouncer compatibility
)

# Define US market hours (Eastern Time)
eastern = pytz.timezone('US/Eastern')
MARKET_OPEN = dt_time(9, 30)  # 9:30 AM ET
MARKET_CLOSE = dt_time(16, 0)  # 4:00 PM ET

def is_market_open():
    """Check if the US stock market is currently open"""
    now = datetime.now(eastern)
    
    # Check for weekends
    if now.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
        return False
    
    # Check time
    current_time = now.time()
    if current_time < MARKET_OPEN or current_time > MARKET_CLOSE:
        return False
    
    # TODO: Add holiday check if needed
    
    return True

async def update_current_prices():
    """Update current prices for all active securities"""
    try:
        # Only update during market hours or within 30 minutes after close
        now = datetime.now(eastern)
        after_hours = now.time() > MARKET_CLOSE and now.time() < dt_time(16, 30)  # Within 30 min after close
        
        if not is_market_open() and not after_hours:
            logger.info("Skipping price update - market is closed")
            return {"status": "skipped", "reason": "market_closed"}
        
        event_id = await record_system_event(
            database,
            "scheduled_price_update",
            "started",
            {"source": "scheduler"}
        )
        
        updater = PriceUpdaterV2()
        result = await updater.update_security_prices()
        
        # Also update portfolio values
        calculator = PortfolioCalculator()
        portfolio_result = await calculator.calculate_all_portfolios()
        
        await update_system_event(
            database,
            event_id,
            "completed",
            {"result": result, "portfolio_result": portfolio_result}
        )
        
        logger.info(f"Scheduled price update completed at {datetime.now()} with {len(result.get('updated', []))} securities updated")
        return result
    except Exception as e:
        logger.error(f"Error in scheduled price update: {str(e)}")
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": str(e)}
            )
        return {"status": "error", "error": str(e)}

async def update_company_metrics():
    """Update company metrics for all securities"""
    try:
        event_id = await record_system_event(
            database,
            "scheduled_metrics_update",
            "started",
            {"source": "scheduler"}
        )
        
        updater = PriceUpdaterV2()
        result = await updater.update_company_metrics()
        
        await update_system_event(
            database,
            event_id,
            "completed",
            {"result": result}
        )
        
        logger.info(f"Scheduled metrics update completed at {datetime.now()} with {len(result.get('updated', []))} securities updated")
        return result
    except Exception as e:
        logger.error(f"Error in scheduled metrics update: {str(e)}")
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": str(e)}
            )
        return {"status": "error", "error": str(e)}

async def update_historical_prices():
    """Update historical prices for all securities"""
    try:
        event_id = await record_system_event(
            database,
            "scheduled_history_update",
            "started",
            {"source": "scheduler"}
        )
        
        updater = PriceUpdaterV2()
        # Update last 30 days by default
        result = await updater.update_historical_prices(days=30)
        
        await update_system_event(
            database,
            event_id,
            "completed",
            {"result": result}
        )
        
        logger.info(f"Scheduled historical price update completed at {datetime.now()} with {len(result.get('updated', []))} securities updated")
        return result
    except Exception as e:
        logger.error(f"Error in scheduled historical price update: {str(e)}")
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": str(e)}
            )
        return {"status": "error", "error": str(e)}

async def snapshot_portfolio_values():
    """Take a daily snapshot of portfolio values for tracking"""
    try:
        event_id = await record_system_event(
            database,
            "scheduled_portfolio_snapshot",
            "started",
            {"source": "scheduler"}
        )
        
        calculator = PortfolioCalculator()
        result = await calculator.snapshot_portfolio_values()
        
        await update_system_event(
            database,
            event_id,
            "completed",
            {"result": result}
        )
        
        logger.info(f"Scheduled portfolio snapshot completed at {datetime.now()} with {len(result.get('portfolios', []))} portfolios processed")
        return result
    except Exception as e:
        logger.error(f"Error in scheduled portfolio snapshot: {str(e)}")
        if 'event_id' in locals():
            await update_system_event(
                database,
                event_id,
                "failed",
                {"error": str(e)}
            )
        return {"status": "error", "error": str(e)}

# Run an async task in the sync scheduler
def run_async_task(coroutine):
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coroutine)
    except Exception as e:
        logger.error(f"Error running async task: {str(e)}")
        return {"status": "error", "error": str(e)}

def setup_schedules():
    """Set up all scheduled tasks"""
    if not SCHEDULER_ENABLED:
        logger.info("Scheduler is disabled. No tasks scheduled.")
        return
    
    # Price updates based on configured frequency
    schedule.every(PRICE_UPDATE_FREQUENCY).minutes.do(
        lambda: run_async_task(update_current_prices())
    )
    
    # Company metrics at configured time
    schedule.every().day.at(METRICS_UPDATE_TIME).do(
        lambda: run_async_task(update_company_metrics())
    )
    
    # Historical prices at configured time
    schedule.every().day.at(HISTORY_UPDATE_TIME).do(
        lambda: run_async_task(update_historical_prices())
    )
    
    # Portfolio value snapshot at configured time
    schedule.every().day.at(PORTFOLIO_SNAPSHOT_TIME).do(
        lambda: run_async_task(snapshot_portfolio_values())
    )
    
    logger.info("All scheduled tasks have been set up successfully")

async def main():
    """Main entry point for the scheduler"""
    # Connect to the database
    try:
        await database.connect()
        logger.info("Scheduler started, connected to database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        return
    
    try:
        # Set up schedules
        setup_schedules()
        
        if SCHEDULER_ENABLED:
            # Also run initial updates when the scheduler starts
            logger.info("Running initial price update...")
            await update_current_prices()
        
        # Run the scheduler loop
        while True:
            schedule.run_pending()
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Scheduler shutdown requested (KeyboardInterrupt)")
    except Exception as e:
        logger.error(f"Unexpected error in scheduler: {str(e)}")
    finally:
        # Disconnect from the database when exiting
        try:
            await database.disconnect()
            logger.info("Scheduler stopped, disconnected from database")
        except Exception as e:
            logger.error(f"Error disconnecting from database: {str(e)}")

if __name__ == "__main__":
    # Run the async main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Scheduler exited by user")
    except Exception as e:
        print(f"Fatal error in scheduler: {str(e)}")