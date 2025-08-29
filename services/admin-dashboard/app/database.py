# services/admin-dashboard/app/database.py
"""
Admin Dashboard Database Layer
MongoDB connection and operations for admin users
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict, Any, List
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """Database connection manager for Admin Dashboard"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        
    async def connect_to_mongo(self):
        """Establish connection to MongoDB"""
        try:
            # Get MongoDB URL from environment
            mongodb_url = os.getenv("MONGODB_URL", "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin")
            
            # Create MongoDB client
            self.client = AsyncIOMotorClient(mongodb_url)
            
            # Get database - same as other services
            database_name = "diabetes_db"
            self.database = self.client[database_name]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info(f"Admin Dashboard connected to MongoDB: {database_name}")
            
            # Create indexes for optimal performance
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def close_mongo_connection(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("Admin MongoDB connection closed")
    
    async def create_indexes(self):
        """Create database indexes for admin users"""
        try:
            # Admin users collection indexes
            await self.database.admin_users.create_index(
                "email", 
                unique=True, 
                name="idx_admin_email_unique"
            )
            await self.database.admin_users.create_index(
                "username", 
                unique=True, 
                name="idx_admin_username_unique"
            )
            await self.database.admin_users.create_index(
                [("status", 1), ("role", 1)], 
                name="idx_admin_status_role"
            )
            
            # Verification codes collection indexes
            await self.database.admin_verification_codes.create_index(
                "email", 
                name="idx_verification_email"
            )
            await self.database.admin_verification_codes.create_index(
                "expires_at", 
                expireAfterSeconds=0,  # TTL index
                name="idx_verification_ttl"
            )
            
            # Admin sessions collection indexes
            await self.database.admin_sessions.create_index(
                "user_id", 
                name="idx_session_user"
            )
            await self.database.admin_sessions.create_index(
                "expires_at", 
                expireAfterSeconds=0,  # TTL index
                name="idx_session_ttl"
            )
            
            logger.info("Admin database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create admin indexes: {e}")

# Global database instance
database = Database()

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection"""
    if database.database is None:
        await database.connect_to_mongo()
    return database.database

# Database connection lifecycle functions
async def connect_to_mongo():
    """Connect to MongoDB on application startup"""
    await database.connect_to_mongo()

async def close_mongo_connection():
    """Close MongoDB connection on application shutdown"""
    await database.close_mongo_connection()

# Collection helpers
async def get_admin_users_collection():
    """Get admin users collection"""
    db = await get_database()
    return db.admin_users

async def get_verification_codes_collection():
    """Get verification codes collection"""
    db = await get_database()
    return db.admin_verification_codes

async def get_admin_sessions_collection():
    """Get admin sessions collection"""
    db = await get_database()
    return db.admin_sessions