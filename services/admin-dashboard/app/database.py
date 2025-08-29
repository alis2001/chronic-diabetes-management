# services/admin-dashboard/app/database.py
"""
Admin Dashboard Database Connection
MongoDB connection for admin authentication system - FIXED VERSION
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Global database client
mongodb_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    """Create database connection"""
    global mongodb_client, database
    
    try:
        mongodb_url = os.getenv(
            "MONGODB_URL", 
            "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
        )
        
        logger.info(f"🔗 Connecting to MongoDB: {mongodb_url.split('@')[1] if '@' in mongodb_url else mongodb_url}")
        
        mongodb_client = AsyncIOMotorClient(
            mongodb_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=10
        )
        
        # Get database
        database = mongodb_client.diabetes_db
        
        # Test connection
        await database.command("ping")
        
        # Create indexes for admin collections
        await create_admin_indexes()
        
        logger.info("✅ MongoDB connected successfully")
        
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {str(e)}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    global mongodb_client
    
    if mongodb_client is not None:  # FIXED: was just 'if mongodb_client'
        mongodb_client.close()
        logger.info("🔌 MongoDB connection closed")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    global database
    
    if database is None:  # FIXED: was just 'if not database'
        await connect_to_mongo()
    
    return database

async def create_admin_indexes():
    """Create necessary indexes for admin collections"""
    try:
        global database
        
        if database is None:  # FIXED: was just 'if not database'
            return
        
        # Admin users collection indexes
        await database.admin_users.create_index("email", unique=True)
        await database.admin_users.create_index("username", unique=True)
        await database.admin_users.create_index("user_id", unique=True)
        await database.admin_users.create_index("status")
        await database.admin_users.create_index("role")
        await database.admin_users.create_index("created_at")
        
        # Verification codes collection indexes
        await database.admin_verification_codes.create_index("email")
        await database.admin_verification_codes.create_index("expires_at")
        await database.admin_verification_codes.create_index("used")
        await database.admin_verification_codes.create_index("purpose")
        await database.admin_verification_codes.create_index("created_at")
        
        # Compound index for efficient verification queries
        await database.admin_verification_codes.create_index([
            ("email", 1),
            ("used", 1),
            ("expires_at", 1)
        ])
        
        logger.info("✅ Admin database indexes created")
        
    except Exception as e:
        logger.error(f"❌ Index creation failed: {str(e)}")

# Database health check
async def check_database_health() -> dict:
    """Check database connection health"""
    try:
        db = await get_database()
        
        # Test basic operations
        await db.command("ping")
        
        # Check collections
        collections = await db.list_collection_names()
        
        # Count admin users
        admin_users_count = await db.admin_users.count_documents({})
        
        return {
            "status": "healthy",
            "collections": collections,
            "admin_users_count": admin_users_count,
            "connection": "active"
        }
        
    except Exception as e:
        logger.error(f"❌ Database health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "connection": "failed"
        }