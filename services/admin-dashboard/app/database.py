# services/admin-dashboard/app/database.py
"""
Admin Dashboard Database Connection - COMPLETE FIXED VERSION
MongoDB connection for admin authentication system with Cronoscita support
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Optional, Any
from datetime import datetime
from bson import ObjectId

from .models import generate_cronoscita_codice

logger = logging.getLogger(__name__)

# Global database client
mongodb_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

# ================================
# UTILITY FUNCTIONS
# ================================

def serialize_mongo_doc(doc):
    """Serialize single MongoDB document"""
    if doc is None:
        return None
    
    if '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    
    return doc

def serialize_mongo_list(docs):
    """Serialize list of MongoDB documents"""
    if not docs:
        return []
    
    result = []
    for doc in docs:
        result.append(serialize_mongo_doc(doc.copy()))
    
    return result

# ================================
# DATABASE CONNECTION FUNCTIONS
# ================================

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
    
    if mongodb_client is not None:
        mongodb_client.close()
        logger.info("🔌 MongoDB connection closed")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    global database
    
    if database is None:
        await connect_to_mongo()
    
    return database

async def create_admin_indexes():
    """Create necessary indexes for admin collections"""
    try:
        global database
        
        if database is None:
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
        
        # Cronoscita collection indexes  
        await database.cronoscita.create_index("nome", unique=True)
        await database.cronoscita.create_index("codice", unique=True)
        await database.cronoscita.create_index("is_active")
        await database.cronoscita.create_index("created_at")

        # Compound index for efficient verification queries
        await database.admin_verification_codes.create_index([
            ("email", 1),
            ("used", 1),
            ("expires_at", 1)
        ])
        
        logger.info("✅ Admin database indexes created")
        
    except Exception as e:
        logger.error(f"❌ Index creation failed: {str(e)}")

async def create_exam_catalog_indexes(db: AsyncIOMotorDatabase):
    """Create indexes for laboratory exam collections"""
    try:
        # Basic exam catalog indexes
        await db.exam_catalog.create_index("codice_catalogo")
        await db.exam_catalog.create_index("codice_branca")
        await db.exam_catalog.create_index("is_enabled")
        
        # Basic exam mapping indexes
        await db.exam_mappings.create_index([("codice_catalogo", 1), ("codoffering_wirgilio", 1)])
        await db.exam_mappings.create_index("struttura_nome")
        await db.exam_mappings.create_index("is_active")

        # Cronoscita-aware indexes for exam_catalog
        await db.exam_catalog.create_index([("cronoscita_id", 1), ("codice_catalogo", 1)], unique=True)
        await db.exam_catalog.create_index("cronoscita_id")
        
        # Cronoscita-aware indexes for exam_mappings  
        await db.exam_mappings.create_index([("cronoscita_id", 1), ("codice_catalogo", 1), ("codoffering_wirgilio", 1)])
        await db.exam_mappings.create_index("cronoscita_id")
        
        logger.info("✅ Laboratory exam indexes created")
    except Exception as e:
        logger.error(f"❌ Failed to create laboratory indexes: {e}")

# ================================
# LABORATORY REPOSITORY - COMPLETE FIXED VERSION
# ================================

class LaboratorioRepository:
    """Repository for laboratory exam operations - COMPLETE FIXED VERSION"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.database = db
        self.catalog_collection = db.exam_catalog
        self.mapping_collection = db.exam_mappings
    
    # ================================
    # EXAM CATALOG OPERATIONS
    # ================================
    
    async def create_exam_catalog(self, exam_data: Dict[str, Any]) -> str:
        """Create exam catalog entry for specific Cronoscita"""
        try:
            # Verify Cronoscita exists
            cronoscita_exists = await self.database.cronoscita.find_one({"_id": ObjectId(exam_data["cronoscita_id"])})
            if not cronoscita_exists:
                raise ValueError(f"Cronoscita {exam_data['cronoscita_id']} not found")
            
            # Check for duplicate within the same Cronoscita
            existing = await self.catalog_collection.find_one({
                "codice_catalogo": exam_data["codice_catalogo"],
                "cronoscita_id": exam_data["cronoscita_id"]
            })
            
            if existing:
                raise ValueError(f"Exam {exam_data['codice_catalogo']} already exists in this Cronoscita")
            
            exam_doc = {
                **exam_data,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            result = await self.catalog_collection.insert_one(exam_doc)
            logger.info(f"✅ Exam catalog entry created: {exam_data['codice_catalogo']} for Cronoscita {exam_data['cronoscita_id']}")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"❌ Error creating exam catalog: {e}")
            raise
    
    async def get_exam_catalog(self, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get exam catalog for specific Cronoscita"""
        try:
            # Simple query for specific Cronoscita
            cursor = self.catalog_collection.find({"cronoscita_id": cronoscita_id}).sort("created_at", -1)
            results = await cursor.to_list(length=None)
            
            # Add mappings count for each exam
            for result in results:
                mappings_count = await self.mapping_collection.count_documents({
                    "codice_catalogo": result["codice_catalogo"],
                    "cronoscita_id": cronoscita_id,
                    "is_active": True
                })
                result["mappings_count"] = mappings_count
            
            return serialize_mongo_list(results)
            
        except Exception as e:
            logger.error(f"❌ Error getting exam catalog for Cronoscita {cronoscita_id}: {e}")
            return []
    
    async def get_catalog_by_code(self, codice_catalogo: str, cronoscita_id: str) -> Optional[Dict[str, Any]]:
        """Get catalog entry by code for specific Cronoscita"""
        try:
            catalog_entry = await self.catalog_collection.find_one({
                "codice_catalogo": codice_catalogo,
                "cronoscita_id": cronoscita_id
            })
            
            if catalog_entry:
                catalog_entry["id"] = str(catalog_entry["_id"])
                del catalog_entry["_id"]
            
            return catalog_entry
        except Exception as e:
            logger.error(f"❌ Error getting catalog by code: {e}")
            return None

    async def get_catalog_for_mapping(self, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get catalog options for mapping dropdown for specific Cronoscita"""
        try:
            cursor = self.catalog_collection.find(
                {"cronoscita_id": cronoscita_id, "is_enabled": True},
                {"codice_catalogo": 1, "nome_esame": 1}
            ).sort("nome_esame", 1)
            
            results = await cursor.to_list(length=None)
            
            options = []
            for result in results:
                options.append({
                    "codice_catalogo": result["codice_catalogo"],
                    "nome_esame": result["nome_esame"],
                    "display": f"{result['codice_catalogo']} - {result['nome_esame']}"
                })
            
            return options
        except Exception as e:
            logger.error(f"❌ Error getting catalog options: {e}")
            return []
    
    async def update_exam_catalog(self, codice_catalogo: str, cronoscita_id: str, updates: dict) -> bool:
        """Update exam catalog entry for specific Cronoscita"""
        updates["updated_at"] = datetime.now()
        
        result = await self.catalog_collection.update_one(
            {"codice_catalogo": codice_catalogo, "cronoscita_id": cronoscita_id},
            {"$set": updates}
        )
        return result.modified_count > 0
    
    async def delete_exam_catalog(self, codice_catalogo: str, cronoscita_id: str) -> bool:
        """Delete exam catalog and related mappings for specific Cronoscita"""
        # First delete related mappings
        await self.mapping_collection.delete_many({
            "codice_catalogo": codice_catalogo,
            "cronoscita_id": cronoscita_id
        })
        
        # Then delete catalog entry
        result = await self.catalog_collection.delete_one({
            "codice_catalogo": codice_catalogo,
            "cronoscita_id": cronoscita_id
        })
        return result.deleted_count > 0

    # ================================
    # EXAM MAPPING OPERATIONS
    # ================================
    
    async def create_exam_mapping(self, mapping_data: Dict[str, Any]) -> str:
        """Create exam mapping for specific Cronoscita"""
        try:
            # Verify Cronoscita exists
            cronoscita_exists = await self.database.cronoscita.find_one({"_id": ObjectId(mapping_data["cronoscita_id"])})
            if not cronoscita_exists:
                raise ValueError(f"Cronoscita {mapping_data['cronoscita_id']} not found")
            
            # Check for duplicate within the same Cronoscita
            existing = await self.mapping_collection.find_one({
                "codice_catalogo": mapping_data["codice_catalogo"],
                "cronoscita_id": mapping_data["cronoscita_id"],
                "codoffering_wirgilio": mapping_data["codoffering_wirgilio"],
                "struttura_nome": mapping_data["struttura_nome"]
            })
            
            if existing:
                raise ValueError(f"Mapping already exists for this exam in this Cronoscita")
            
            mapping_doc = {
                **mapping_data,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            result = await self.mapping_collection.insert_one(mapping_doc)
            logger.info(f"✅ Exam mapping created: {mapping_data['codice_catalogo']} -> {mapping_data['codoffering_wirgilio']} for Cronoscita {mapping_data['cronoscita_id']}")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"❌ Error creating exam mapping: {e}")
            raise

    async def get_exam_mappings(self, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get exam mappings for specific Cronoscita"""
        try:
            # Find all mappings for this Cronoscita
            cursor = self.mapping_collection.find({"cronoscita_id": cronoscita_id}).sort("created_at", -1)
            mappings = await cursor.to_list(length=None)
            
            # Add catalog info to each mapping
            for mapping in mappings:
                catalog_entry = await self.catalog_collection.find_one({
                    "codice_catalogo": mapping["codice_catalogo"],
                    "cronoscita_id": cronoscita_id
                })
                mapping["nome_esame_catalogo"] = catalog_entry["nome_esame"] if catalog_entry else mapping["codice_catalogo"]
            
            return serialize_mongo_list(mappings)
        except Exception as e:
            logger.error(f"❌ Error getting mappings: {e}")
            return []
    
    async def get_exam_mappings_list(self, cronoscita_id: str = None, active_only: bool = False) -> List[Dict]:
        """Get exam mappings with catalog info (optionally filtered by Cronoscita)"""
        match_filter = {}
        if cronoscita_id:
            match_filter["cronoscita_id"] = cronoscita_id
        if active_only:
            match_filter["is_active"] = True
        
        cursor = self.mapping_collection.find(match_filter).sort([("codice_catalogo", 1), ("struttura_nome", 1)])
        results = await cursor.to_list(length=None)
        
        # Add catalog info
        for result in results:
            catalog_filter = {"codice_catalogo": result["codice_catalogo"]}
            if cronoscita_id:
                catalog_filter["cronoscita_id"] = cronoscita_id
                
            catalog_entry = await self.catalog_collection.find_one(catalog_filter)
            result["nome_esame_catalogo"] = catalog_entry["nome_esame"] if catalog_entry else result["codice_catalogo"]
        
        return results if results else []

    # ================================
    # STATISTICS AND OVERVIEW
    # ================================
    
    async def get_overview_stats(self, cronoscita_id: str) -> Dict[str, Any]:
        """Get overview statistics for specific Cronoscita"""
        try:
            total_catalog_entries = await self.catalog_collection.count_documents({"cronoscita_id": cronoscita_id})
            enabled_catalog_entries = await self.catalog_collection.count_documents({
                "cronoscita_id": cronoscita_id, 
                "is_enabled": True
            })
            total_mappings = await self.mapping_collection.count_documents({"cronoscita_id": cronoscita_id})
            active_mappings = await self.mapping_collection.count_documents({
                "cronoscita_id": cronoscita_id, 
                "is_active": True
            })
            
            return {
                "total_catalog_entries": total_catalog_entries,
                "enabled_catalog_entries": enabled_catalog_entries,
                "total_mappings": total_mappings,
                "active_mappings": active_mappings,
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
                "mapping_completion_rate": 0,
                "system_status": "error",
                "last_updated": datetime.now(),
                "error": str(e)
            }
    
    # ================================
    # LEGACY GLOBAL METHODS (for backward compatibility)
    # ================================
    
    async def get_enabled_mappings_for_analytics(self) -> Dict[str, Any]:
        """Get enabled mappings formatted for analytics service (GLOBAL - all Cronoscita)"""
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

# ================================
# CRONOSCITA REPOSITORY
# ================================

class CronoscitaRepository:
    """Repository for Cronoscita operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.database = db
        self.cronoscita_collection = db.cronoscita
    
    async def create_cronoscita(self, cronoscita_data: Dict[str, Any]) -> str:
        """Create new Cronoscita"""
        try:
            # Generate unique short code
            codice = generate_cronoscita_codice()
            
            # Ensure codice is unique
            while await self.cronoscita_collection.find_one({"codice": codice}):
                codice = generate_cronoscita_codice()
            
            cronoscita_doc = {
                "nome": cronoscita_data["nome"],
                "codice": codice,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_active": True
            }
            
            result = await self.cronoscita_collection.insert_one(cronoscita_doc)
            logger.info(f"✅ Cronoscita created: {cronoscita_data['nome']} ({codice})")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"❌ Error creating Cronoscita: {e}")
            raise
    
    async def get_cronoscita_by_id(self, cronoscita_id: str) -> Optional[Dict[str, Any]]:
        """Get Cronoscita by ID"""
        try:
            cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(cronoscita_id)})
            
            if cronoscita:
                cronoscita["id"] = str(cronoscita["_id"])
                del cronoscita["_id"]
            
            return cronoscita
            
        except Exception as e:
            logger.error(f"❌ Error getting Cronoscita: {e}")
            return None
    
    async def get_all_cronoscita(self) -> List[Dict[str, Any]]:
        """Get all Cronoscita with statistics"""
        try:
            # Get all cronoscita
            cronoscita_cursor = self.cronoscita_collection.find({"is_active": True}).sort("created_at", -1)
            cronoscita_list = await cronoscita_cursor.to_list(length=None)
            
            result = []
            for cronoscita in cronoscita_list:
                cronoscita_id = str(cronoscita["_id"])
                
                # Get statistics
                total_catalogo = await self.database.exam_catalog.count_documents({"cronoscita_id": cronoscita_id})
                total_mappings = await self.database.exam_mappings.count_documents({"cronoscita_id": cronoscita_id})
                active_mappings = await self.database.exam_mappings.count_documents({
                    "cronoscita_id": cronoscita_id,
                    "is_active": True
                })
                
                cronoscita_data = {
                    "id": cronoscita_id,
                    "nome": cronoscita["nome"],
                    "codice": cronoscita["codice"],
                    "created_at": cronoscita["created_at"],
                    "updated_at": cronoscita["updated_at"],
                    "total_catalogo_esami": total_catalogo,
                    "total_mappings": total_mappings,
                    "active_mappings": active_mappings,
                    "is_active": cronoscita.get("is_active", True)
                }
                
                result.append(cronoscita_data)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error getting Cronoscita list: {e}")
            return []
    
    async def check_cronoscita_exists(self, nome: str) -> bool:
        """Check if Cronoscita with this name already exists"""
        try:
            existing = await self.cronoscita_collection.find_one({
                "nome": nome.upper(),
                "is_active": True
            })
            return existing is not None
        except Exception as e:
            logger.error(f"❌ Error checking Cronoscita existence: {e}")
            return False

# ================================
# DATABASE HEALTH CHECK
# ================================

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