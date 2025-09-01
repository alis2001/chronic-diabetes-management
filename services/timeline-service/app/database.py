# services/timeline-service/app/database.py
"""
Timeline Service Database Layer
FIXED: Now uses the main diabetes_db database like all other services
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """Database connection manager for Timeline Service"""
    
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
            
            # FIXED: Use main database like all other services
            database_name = "diabetes_db"  # Same as admin dashboard and other services
            self.database = self.client[database_name]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {database_name}")
            
            # Create indexes for optimal performance
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def close_mongo_connection(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    async def create_indexes(self):
        """Create database indexes for optimal query performance"""
        try:
            # Patient collection indexes
            await self.database.patients.create_index(
                "cf_paziente", 
                unique=True, 
                name="idx_cf_paziente_unique"
            )
            await self.database.patients.create_index(
                "id_medico", 
                name="idx_id_medico"
            )
            await self.database.patients.create_index(
                [("patologia", 1), ("status", 1)], 
                name="idx_patologia_status"
            )
            
            # Appointment collection indexes
            await self.database.appointments.create_index(
                [("cf_paziente", 1), ("scheduled_date", 1)], 
                name="idx_patient_date"
            )
            await self.database.appointments.create_index(
                "scheduled_date", 
                name="idx_scheduled_date"
            )
            await self.database.appointments.create_index(
                [("status", 1), ("scheduled_date", 1)], 
                name="idx_status_date"
            )
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")

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
async def get_patients_collection():
    """Get patients collection"""
    db = await get_database()
    return db.patients

async def get_appointments_collection():
    """Get appointments collection"""
    db = await get_database()
    return db.appointments