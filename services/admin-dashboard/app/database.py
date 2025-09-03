# services/admin-dashboard/app/database.py
"""
Admin Dashboard Database Connection
MongoDB connection for admin authentication system - FIXED VERSION
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Optional, Any
from datetime import datetime

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

# ================================
# LABORATORY EXAM DATABASE OPERATIONS
# ================================

async def create_exam_catalog_indexes(db: AsyncIOMotorDatabase):
    """Create indexes for laboratory exam collections"""
    try:
        # Exam catalog indexes
        await db.exam_catalog.create_index("codice_catalogo", unique=True)
        await db.exam_catalog.create_index("codice_branca")
        await db.exam_catalog.create_index("is_enabled")
        
        # Exam mapping indexes
        await db.exam_mappings.create_index([("codice_catalogo", 1), ("codoffering_wirgilio", 1)])
        await db.exam_mappings.create_index("struttura_nome")
        await db.exam_mappings.create_index("is_active")
        
        logger.info("✅ Laboratory exam indexes created")
    except Exception as e:
        logger.error(f"❌ Failed to create laboratory indexes: {e}")

# services/admin-dashboard/app/database.py - FIXED LaboratorioRepository

class LaboratorioRepository:
    """Repository for laboratory exam operations - FIXED VERSION"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.catalog_collection = db.exam_catalog
        self.mapping_collection = db.exam_mappings
    
    async def create_exam_catalog(self, exam_data: dict) -> str:
        """Create new exam catalog entry"""
        exam_data["created_at"] = datetime.now()
        exam_data["updated_at"] = datetime.now()
        
        result = await self.catalog_collection.insert_one(exam_data)
        return str(result.inserted_id)
    
    async def get_exam_catalog_list(self, enabled_only: bool = False) -> List[Dict]:
        """Get exam catalog list with mapping counts"""
        match_filter = {"is_enabled": True} if enabled_only else {}
        
        pipeline = [
            {"$match": match_filter},
            {
                "$lookup": {
                    "from": "exam_mappings",
                    "localField": "codice_catalogo", 
                    "foreignField": "codice_catalogo",
                    "as": "mappings"
                }
            },
            {
                "$addFields": {
                    "mappings_count": {"$size": "$mappings"}
                }
            },
            {"$sort": {"nome_esame": 1}}
        ]
        
        cursor = self.catalog_collection.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        return result if result else []
    
    async def update_exam_catalog(self, codice_catalogo: str, updates: dict) -> bool:
        """Update exam catalog entry"""
        updates["updated_at"] = datetime.now()
        
        result = await self.catalog_collection.update_one(
            {"codice_catalogo": codice_catalogo},
            {"$set": updates}
        )
        return result.modified_count > 0
    
    async def delete_exam_catalog(self, codice_catalogo: str) -> bool:
        """Delete exam catalog and related mappings"""
        # First delete related mappings
        await self.mapping_collection.delete_many({"codice_catalogo": codice_catalogo})
        
        # Then delete catalog entry
        result = await self.catalog_collection.delete_one({"codice_catalogo": codice_catalogo})
        return result.deleted_count > 0
    
    async def create_exam_mapping(self, mapping_data: dict) -> str:
        """Create new exam mapping"""
        mapping_data["created_at"] = datetime.now()
        mapping_data["updated_at"] = datetime.now()
        
        result = await self.mapping_collection.insert_one(mapping_data)
        return str(result.inserted_id)
    
    async def get_exam_mappings_list(self, active_only: bool = False) -> List[Dict]:
        """Get exam mappings with catalog info"""
        match_filter = {"is_active": True} if active_only else {}
        
        pipeline = [
            {"$match": match_filter},
            {
                "$lookup": {
                    "from": "exam_catalog",
                    "localField": "codice_catalogo",
                    "foreignField": "codice_catalogo", 
                    "as": "catalog_info"
                }
            },
            {
                "$addFields": {
                    "nome_esame_catalogo": {"$arrayElemAt": ["$catalog_info.nome_esame", 0]}
                }
            },
            {"$sort": {"codice_catalogo": 1, "struttura_nome": 1}}
        ]
        
        cursor = self.mapping_collection.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        return result if result else []
    
    async def get_enabled_mappings_for_analytics(self) -> Dict[str, Any]:
        """Get enabled mappings formatted for analytics service"""
        pipeline = [
            {
                "$match": {
                    "is_active": True
                }
            },
            {
                "$lookup": {
                    "from": "exam_catalog",
                    "localField": "codice_catalogo",
                    "foreignField": "codice_catalogo",
                    "as": "catalog_info"
                }
            },
            {
                "$match": {
                    "catalog_info.is_enabled": True
                }
            },
            {
                "$group": {
                    "_id": "$codoffering_wirgilio",
                    "catalog_codes": {"$push": "$codice_catalogo"},
                    "exam_name": {"$first": "$nome_esame_wirgilio"}
                }
            }
        ]
        
        cursor = self.mapping_collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        # Format results as dict
        formatted_mappings = {}
        for result in results:
            formatted_mappings[result["_id"]] = {
                "catalog_codes": result["catalog_codes"],
                "exam_name": result["exam_name"]
            }
        
        return formatted_mappings
    
    async def get_overview_stats(self) -> Dict[str, Any]:
        """Get overview statistics for laboratory management"""
        try:
            # Count totals
            total_catalog_entries = await self.catalog_collection.count_documents({})
            enabled_catalog_entries = await self.catalog_collection.count_documents({"is_enabled": True})
            total_mappings = await self.mapping_collection.count_documents({})
            active_mappings = await self.mapping_collection.count_documents({"is_active": True})
            
            # Get branch breakdown
            branch_pipeline = [
                {"$group": {"_id": "$codice_branca", "count": {"$sum": 1}}}
            ]
            branch_cursor = self.catalog_collection.aggregate(branch_pipeline)
            branch_results = await branch_cursor.to_list(length=None)
            
            branch_breakdown = {}
            for result in branch_results:
                branch_breakdown[result["_id"]] = result["count"]
            
            # Get structure breakdown from mappings
            structure_pipeline = [
                {"$group": {"_id": "$struttura_nome", "count": {"$sum": 1}}}
            ]
            structure_cursor = self.mapping_collection.aggregate(structure_pipeline)
            structure_results = await structure_cursor.to_list(length=None)
            
            structure_breakdown = {}
            for result in structure_results:
                structure_breakdown[result["_id"]] = result["count"]
            
            return {
                "total_catalog_entries": total_catalog_entries,
                "enabled_catalog_entries": enabled_catalog_entries,
                "total_mappings": total_mappings,
                "active_mappings": active_mappings,
                "branch_breakdown": branch_breakdown,
                "structure_breakdown": structure_breakdown,
                "mapping_completion_rate": round((active_mappings / total_catalog_entries * 100), 1) if total_catalog_entries > 0 else 0,
                "system_status": "operational",
                "last_updated": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting overview stats: {e}")
            return {
                "total_catalog_entries": 0,
                "enabled_catalog_entries": 0,
                "total_mappings": 0,
                "active_mappings": 0,
                "branch_breakdown": {},
                "structure_breakdown": {},
                "mapping_completion_rate": 0,
                "system_status": "error",
                "last_updated": datetime.now(),
                "error": str(e)
            }

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

