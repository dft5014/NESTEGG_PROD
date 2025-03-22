"""
Common utility functions used across the application.
"""
import os
import logging
import time
import asyncio
import json
from typing import Dict, List, Any, Callable, Coroutine, Optional
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("utils.common")

class RateLimiter:
    """Utility for handling API rate limits"""
    
    def __init__(self, requests_per_period: int, period_seconds: int):
        self.requests_per_period = requests_per_period
        self.period_seconds = period_seconds
        self.request_timestamps = []
    
    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded"""
        now = time.time()
        
        # Remove timestamps older than the period
        self.request_timestamps = [ts for ts in self.request_timestamps 
                                  if now - ts < self.period_seconds]
        
        # If at the limit, wait until the oldest request expires
        if len(self.request_timestamps) >= self.requests_per_period:
            oldest = min(self.request_timestamps)
            wait_time = self.period_seconds - (now - oldest) + 0.1  # Add a small buffer
            
            if wait_time > 0:
                logger.info(f"Rate limit reached. Waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
        
        # Add current time to timestamps
        self.request_timestamps.append(time.time())

async def retry_async(
    func: Callable[..., Coroutine],
    retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_factor: float = 2.0,
    exceptions_to_retry: tuple = (Exception,),
    **kwargs
) -> Any:
    """
    Retry an async function with exponential backoff
    
    Args:
        func: Async function to retry
        retries: Maximum number of retries
        base_delay: Initial delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
        backoff_factor: Multiplier applied to delay on each retry
        exceptions_to_retry: Exception types that trigger a retry
        **kwargs: Additional arguments to pass to the function
        
    Returns:
        The result of the function call
    """
    last_exception = None
    delay = base_delay
    
    for attempt in range(retries + 1):
        try:
            return await func(**kwargs)
        except exceptions_to_retry as e:
            last_exception = e
            
            if attempt < retries:
                logger.warning(f"Attempt {attempt + 1}/{retries + 1} failed: {str(e)}. Retrying in {delay:.2f}s")
                await asyncio.sleep(delay)
                delay = min(delay * backoff_factor, max_delay)
            else:
                logger.error(f"All {retries + 1} attempts failed")
                raise last_exception

def json_serializer(obj):
    """
    JSON serializer for objects not serializable by default json code
    Used for database operations with JSON/JSONB fields
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    # Handle PostgreSQL UUID type
    if hasattr(obj, '__str__'):  # UUIDs can be converted to strings
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

async def record_system_event(
    database,
    event_type: str, 
    status: str = "started", 
    details: Dict[str, Any] = None
) -> Optional[int]:
    """
    Record a system event in the database
    
    Args:
        database: Database connection
        event_type: Type of event (e.g., price_update, portfolio_calculation)
        status: Status of the event (started, completed, failed)
        details: Additional details about the event
        
    Returns:
        ID of the created event record or None if recording failed
    """
    try:
        # Convert details to JSON string if provided
        json_details = None
        if details:
            json_details = json.dumps(details, default=json_serializer)
        
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
            "details": json_details
        }
        
        event_id = await database.fetch_val(query, params)
        return event_id
    except Exception as e:
        logger.error(f"Failed to record system event: {str(e)}")
        # Don't raise the exception - we don't want event recording to break main functionality
        return None

async def update_system_event(
    database,
    event_id: int, 
    status: str, 
    details: Dict[str, Any] = None,
    error_message: str = None
) -> bool:
    """
    Update a system event record
    
    Args:
        database: Database connection
        event_id: ID of the event to update
        status: New status for the event
        details: Additional details to add/update
        error_message: Error message if the event failed
        
    Returns:
        True if the update was successful, False otherwise
    """
    try:
        if not event_id:
            return False
            
        if status == "completed" or status == "failed":
            completed_at = datetime.utcnow()
        else:
            completed_at = None
        
        # Convert details to JSON string if provided
        json_details = None
        if details:
            json_details = json.dumps(details, default=json_serializer)
            
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
            "details": json_details,
            "error_message": error_message
        }
        
        await database.execute(query, params)
        return True
    except Exception as e:
        logger.error(f"Failed to update system event: {str(e)}")
        return False