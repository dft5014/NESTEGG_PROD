"""
Redis Cache Service for NestEgg

This module provides caching functionality for frequent database queries
and API responses to improve performance.
"""

import os
import json
import pickle
import logging
import redis
from typing import Any, Optional, Dict, List, Callable
from functools import wraps
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("redis_cache")

# Redis connection settings from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() == "true"

class RedisCache:
    """Redis cache implementation for NestEgg"""
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Singleton pattern to reuse Redis connection"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize Redis connection if enabled"""
        self.enabled = REDIS_ENABLED
        self.client = None
        
        if self.enabled:
            try:
                self.client = redis.Redis(
                    host=REDIS_HOST,
                    port=REDIS_PORT,
                    db=REDIS_DB,
                    password=REDIS_PASSWORD,
                    decode_responses=False,  # We'll handle decoding ourselves
                    socket_timeout=2,  # Reduce timeout for faster failure detection
                    socket_connect_timeout=2,
                    retry_on_timeout=False  # Don't retry if connection times out
                )
                logger.info(f"Redis cache initialized: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")
                
                # Test connection immediately but don't fail if it doesn't work
                try:
                    self.client.ping()
                except Exception as e:
                    logger.warning(f"Redis connectivity test failed on init: {str(e)}")
                    logger.info("Continuing without Redis - cache operations will be no-ops")
                    # Keep the object but disable it
                    self.enabled = False
            except Exception as e:
                logger.warning(f"Failed to initialize Redis cache: {str(e)}")
                logger.info("Continuing without Redis - cache operations will be no-ops")
                self.enabled = False
    
    def is_available(self) -> bool:
        """Check if Redis is available and connected"""
        if not self.enabled or self.client is None:
            return False
        
        try:
            self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis connectivity check failed: {str(e)}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            # Prefix key with 'nestegg:' to avoid collisions
            prefixed_key = f"nestegg:{key}"
            value = self.client.get(prefixed_key)
            
            if value:
                try:
                    # First try to unpickle complex objects
                    return pickle.loads(value)
                except:
                    # Fall back to JSON for simpler objects
                    try:
                        return json.loads(value)
                    except:
                        # Return raw value if neither works
                        return value
            return None
        except Exception as e:
            logger.error(f"Error getting from cache ({key}): {str(e)}")
            return None
    
    def set(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        """
        Set a value in the cache
        
        Args:
            key: Cache key
            value: Value to cache
            expire_seconds: Time-to-live in seconds (default: 5 minutes)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Prefix key with 'nestegg:' to avoid collisions
            prefixed_key = f"nestegg:{key}"
            
            # Choose serialization method based on type
            if isinstance(value, (dict, list, tuple, set, bool, int, float, str)) or value is None:
                # Simple JSON-serializable types
                serialized = json.dumps(value).encode('utf-8')
            else:
                # Complex objects
                serialized = pickle.dumps(value)
            
            # Store in Redis with expiration
            self.client.set(prefixed_key, serialized, ex=expire_seconds)
            return True
        except Exception as e:
            logger.error(f"Error setting cache ({key}): {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a value from the cache
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Prefix key with 'nestegg:' to avoid collisions
            prefixed_key = f"nestegg:{key}"
            self.client.delete(prefixed_key)
            return True
        except Exception as e:
            logger.error(f"Error deleting from cache ({key}): {str(e)}")
            return False
    
    def delete_pattern(self, pattern: str) -> bool:
        """
        Delete all keys matching a pattern
        
        Args:
            pattern: Pattern to match (e.g., "user:*")
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Prefix pattern with 'nestegg:' to avoid collisions
            prefixed_pattern = f"nestegg:{pattern}"
            keys = self.client.keys(prefixed_pattern)
            
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Error deleting pattern from cache ({pattern}): {str(e)}")
            return False
    
    def clear_all(self) -> bool:
        """
        Clear all NestEgg-related keys from cache
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Only clear keys with our prefix
            keys = self.client.keys("nestegg:*")
            
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            return False


# Decorator for caching function results
def cache_result(key_prefix: str, expire_seconds: int = 300):
    """
    Decorator to cache function results in Redis
    
    Args:
        key_prefix: Prefix for cache key
        expire_seconds: Time-to-live in seconds (default: 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name, args, and kwargs
            key_parts = [key_prefix, func.__name__]
            
            # Add args to key
            for arg in args:
                if hasattr(arg, '__dict__'):
                    # For objects, use their string representation
                    key_parts.append(str(arg))
                else:
                    key_parts.append(str(arg))
            
            # Add kwargs to key (sorted for consistency)
            for k in sorted(kwargs.keys()):
                v = kwargs[k]
                if hasattr(v, '__dict__'):
                    # For objects, use their string representation
                    key_parts.append(f"{k}={str(v)}")
                else:
                    key_parts.append(f"{k}={str(v)}")
            
            # Join parts with colon
            cache_key = ":".join(key_parts)
            
            # Get cache instance
            cache = RedisCache.get_instance()
            
            # Try to get from cache first
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_result
            
            # If not in cache, call the function
            logger.debug(f"Cache miss: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Cache the result
            cache.set(cache_key, result, expire_seconds)
            
            return result
        return wrapper
    return decorator


# Fast cache interface for simple key-value operations
class FastCache:
    """Simple interface for most common Redis cache operations"""
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        return RedisCache.get_instance().get(key)
    
    @staticmethod
    def set(key: str, value: Any, expire_seconds: int = 300) -> bool:
        """Set value in cache"""
        return RedisCache.get_instance().set(key, value, expire_seconds)
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete value from cache"""
        return RedisCache.get_instance().delete(key)
    
    @staticmethod
    def is_available() -> bool:
        """Check if cache is available"""
        return RedisCache.get_instance().is_available()