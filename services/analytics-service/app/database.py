# services/analytics-service/app/database.py
"""
Analytics Service Database Connection
MongoDB connection for exam mapping queries
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

# Global database client
mongodb_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    """Create database connection to same diabetes_db as other services"""
    global mongodb_client, database
    
    try:
        mongodb_url = os.getenv(
            "MONGODB_URL", 
            "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
        )
        
        logger.info(f"🔗 Analytics connecting to MongoDB: {mongodb_url.split('@')[1] if '@' in mongodb_url else mongodb_url}")
        
        mongodb_client = AsyncIOMotorClient(
            mongodb_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=10
        )
        
        # Use same database as admin dashboard and timeline service
        database = mongodb_client.diabetes_db
        
        # Test connection
        await database.command("ping")
        
        logger.info("✅ Analytics MongoDB connected successfully")
        
    except Exception as e:
        logger.error(f"❌ Analytics MongoDB connection failed: {str(e)}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    global mongodb_client
    
    if mongodb_client is not None:
        mongodb_client.close()
        logger.info("🔌 Analytics MongoDB connection closed")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    global database
    
    if database is None:
        await connect_to_mongo()
    
    return database