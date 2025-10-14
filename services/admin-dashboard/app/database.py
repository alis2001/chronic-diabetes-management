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


#### MAster REPO

class MasterCatalogRepository:
    """Repository for master prestazioni catalog"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.database = db
        self.master_collection = db.master_prestazioni
    
    async def validate_prestazione(self, exam_data: Dict[str, str]) -> Dict[str, Any]:
        """Validate manual entry against master catalog"""
        try:
            # Find exact match in master catalog
            master_entry = await self.master_collection.find_one({
                "codice_catalogo": exam_data["codice_catalogo"],
                "is_active": True
            })
            
            if not master_entry:
                return {
                    "valid": False,
                    "error": f"Codice catalogo '{exam_data['codice_catalogo']}' non trovato nel catalogo master"
                }
            
            # Validate all fields match exactly
            errors = []
            if master_entry["codicereg"] != exam_data["codicereg"]:
                errors.append(f"CODICEREG non corrisponde. Atteso: '{master_entry['codicereg']}', Inserito: '{exam_data['codicereg']}'")
            
            if master_entry["nome_esame"].upper() != exam_data["nome_esame"].upper():
                errors.append(f"Nome esame non corrisponde. Atteso: '{master_entry['nome_esame']}'")
            
            if master_entry["codice_branca"] != exam_data["codice_branca"]:
                errors.append(f"Codice branca non corrisponde. Atteso: '{master_entry['codice_branca']}', Inserito: '{exam_data['codice_branca']}'")
            
            if errors:
                return {
                    "valid": False,
                    "error": "Dati non corrispondono al catalogo master:\n" + "\n".join(errors),
                    "master_data": master_entry
                }
            
            return {
                "valid": True,
                "master_data": master_entry
            }
            
        except Exception as e:
            logger.error(f"❌ Error validating prestazione: {e}")
            return {
                "valid": False,
                "error": f"Errore durante validazione: {str(e)}"
            }
    
    async def search_prestazioni(self, query: str, limit: int = 20) -> List[Dict]:
        """Search prestazioni in master catalog"""
        try:
            search_filter = {
                "is_active": True,
                "$or": [
                    {"nome_esame": {"$regex": query.upper(), "$options": "i"}},
                    {"codice_catalogo": {"$regex": query, "$options": "i"}}
                ]
            }
            
            cursor = self.master_collection.find(search_filter).limit(limit)
            results = await cursor.to_list(length=limit)
            
            return serialize_mongo_list(results)
            
        except Exception as e:
            logger.error(f"❌ Error searching prestazioni: {e}")
            return []



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
        

    async def delete_exam_mapping(self, mapping_id: str) -> bool:
        """Delete exam mapping by ID"""
        try:
            from bson import ObjectId
            result = await self.mapping_collection.delete_one({"_id": ObjectId(mapping_id)})
            
            if result.deleted_count > 0:
                logger.info(f"✅ Exam mapping deleted: {mapping_id}")
                return True
            else:
                logger.warning(f"❌ Mapping not found for deletion: {mapping_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting exam mapping {mapping_id}: {e}")
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

    async def get_exam_mappings_for_catalog(self, codice_catalogo: str, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get all mappings for a specific exam catalog entry"""
        try:
            cursor = self.mapping_collection.find({
                "codice_catalogo": codice_catalogo,
                "cronoscita_id": cronoscita_id
            })
            results = await cursor.to_list(length=None)
            return serialize_mongo_list(results) if results else []
        except Exception as e:
            logger.error(f"❌ Error getting mappings for catalog {codice_catalogo}: {e}")
            return []

    async def delete_exam_catalog_with_mappings(self, codice_catalogo: str, cronoscita_id: str) -> bool:
        """Delete exam catalog entry and cascade delete all related mappings"""
        try:
            # Start with deleting related mappings first
            mappings_result = await self.mapping_collection.delete_many({
                "codice_catalogo": codice_catalogo,
                "cronoscita_id": cronoscita_id
            })
            
            logger.info(f"🗑️ Deleted {mappings_result.deleted_count} mappings for exam {codice_catalogo}")
            
            # Then delete the catalog entry
            catalog_result = await self.catalog_collection.delete_one({
                "codice_catalogo": codice_catalogo,
                "cronoscita_id": cronoscita_id
            })
            
            if catalog_result.deleted_count > 0:
                logger.info(f"🗑️ Deleted catalog entry: {codice_catalogo}")
                return True
            else:
                logger.warning(f"⚠️ Catalog entry not found: {codice_catalogo}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error during cascade deletion: {e}")
            return False

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

    async def get_mapping_by_id(self, mapping_id: str) -> Optional[Dict[str, Any]]:
        """Get mapping by ID"""
        try:
            mapping = await self.mapping_collection.find_one({"_id": ObjectId(mapping_id)})
            return serialize_mongo_doc(mapping) if mapping else None
        except Exception as e:
            logger.error(f"❌ Error getting mapping by ID: {e}")
            return None

    async def check_wirgilio_code_conflict(
        self, 
        cronoscita_id: str,
        struttura_nome: str,
        codoffering_wirgilio: str,
        exclude_mapping_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Check if Wirgilio code is already used in this structure"""
        try:
            query = {
                "cronoscita_id": cronoscita_id,
                "struttura_nome": struttura_nome,
                "codoffering_wirgilio": codoffering_wirgilio
            }
            
            # Exclude current mapping if editing
            if exclude_mapping_id:
                query["_id"] = {"$ne": ObjectId(exclude_mapping_id)}
            
            existing = await self.mapping_collection.find_one(query)
            return serialize_mongo_doc(existing) if existing else None
            
        except Exception as e:
            logger.error(f"❌ Error checking Wirgilio code conflict: {e}")
            return None

    async def check_exam_already_mapped(
        self, 
        cronoscita_id: str,
        struttura_nome: str,
        codice_catalogo: str,
        exclude_mapping_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Check if exam is already mapped in this structure"""
        try:
            query = {
                "cronoscita_id": cronoscita_id,
                "struttura_nome": struttura_nome,
                "codice_catalogo": codice_catalogo
            }
            
            # Exclude current mapping if editing
            if exclude_mapping_id:
                query["_id"] = {"$ne": ObjectId(exclude_mapping_id)}
            
            existing = await self.mapping_collection.find_one(query)
            return serialize_mongo_doc(existing) if existing else None
            
        except Exception as e:
            logger.error(f"❌ Error checking exam mapping conflict: {e}")
            return None

    async def validate_mapping_business_rules(
        self, 
        cronoscita_id: str,
        struttura_nome: str,
        codice_catalogo: str,
        codoffering_wirgilio: str,
        exclude_mapping_id: str = None
    ) -> Dict[str, Any]:
        """Comprehensive validation of mapping business rules"""
        try:
            validation_result = {
                "valid": True,
                "errors": []
            }
            
            # Check 1: Wirgilio code conflict
            wirgilio_conflict = await self.check_wirgilio_code_conflict(
                cronoscita_id, struttura_nome, codoffering_wirgilio, exclude_mapping_id
            )
            
            if wirgilio_conflict:
                validation_result["valid"] = False
                validation_result["errors"].append({
                    "type": "wirgilio_code_conflict",
                    "message": f"Codice Wirgilio '{codoffering_wirgilio}' già utilizzato nella struttura '{struttura_nome}' per l'esame '{wirgilio_conflict.get('nome_esame_wirgilio', 'N/A')}'",
                    "conflicting_mapping": wirgilio_conflict
                })
            
            # Check 2: Exam already mapped
            exam_conflict = await self.check_exam_already_mapped(
                cronoscita_id, struttura_nome, codice_catalogo, exclude_mapping_id
            )
            
            if exam_conflict:
                validation_result["valid"] = False
                validation_result["errors"].append({
                    "type": "exam_already_mapped",
                    "message": f"Esame '{codice_catalogo}' già mappato nella struttura '{struttura_nome}' con codice Wirgilio '{exam_conflict.get('codoffering_wirgilio', 'N/A')}'",
                    "conflicting_mapping": exam_conflict
                })
            
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ Error in mapping validation: {e}")
            return {
                "valid": False,
                "errors": [{
                    "type": "validation_error",
                    "message": f"Errore durante validazione: {str(e)}"
                }]
            }

    async def check_duplicate_mapping_exclude_id(
        self, 
        codice_catalogo: str, 
        cronoscita_id: str,
        codoffering_wirgilio: str,
        struttura_nome: str,
        exclude_mapping_id: str
    ) -> bool:
        """Check for duplicate mapping excluding the current mapping being edited"""
        try:
            existing = await self.mapping_collection.find_one({
                "codice_catalogo": codice_catalogo,
                "cronoscita_id": cronoscita_id,
                "codoffering_wirgilio": codoffering_wirgilio,
                "struttura_nome": struttura_nome,
                "_id": {"$ne": ObjectId(exclude_mapping_id)}
            })
            return existing is not None
        except Exception as e:
            logger.error(f"❌ Error checking duplicate mapping: {e}")
            return False

    async def update_exam_mapping(self, mapping_id: str, mapping_data: Dict[str, Any]) -> bool:
        """Update exam mapping"""
        try:
            # Add updated timestamp
            mapping_data["updated_at"] = datetime.now()
            
            result = await self.mapping_collection.update_one(
                {"_id": ObjectId(mapping_id)},
                {"$set": mapping_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"✅ Exam mapping updated: {mapping_id}")
                return True
            else:
                logger.warning(f"⚠️ No changes made to mapping: {mapping_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error updating exam mapping: {e}")
            return False
        
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
                "nome_presentante": cronoscita_data.get("nome_presentante", cronoscita_data["nome"]),
                "codice": codice,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_active": True
            }
            
            result = await self.cronoscita_collection.insert_one(cronoscita_doc)
            logger.info(f"✅ Cronoscita created: {cronoscita_data['nome']} ({codice}) - Display: {cronoscita_doc['nome_presentante']}")
            
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
                    "nome_presentante": cronoscita.get("nome_presentante", cronoscita["nome"]),  # Fallback to nome for old records
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
# REFERTO SECTIONS REPOSITORY
# ================================

class RefertoSectionRepository:
    """Repository for Referto Sections operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.database = db
        self.section_collection = db.referto_sections
        self.cronoscita_collection = db.cronoscita
    
    async def create_section(self, section_data: Dict[str, Any]) -> str:
        """Create new referto section"""
        try:
            # Verify owning cronoscita exists
            cronoscita_id = section_data.get("cronoscita_id")
            cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(cronoscita_id)})
            
            if not cronoscita:
                raise ValueError(f"Cronoscita with ID {cronoscita_id} not found")
            
            # Verify linked cronoscita exists
            linked_cronoscita_id = section_data.get("linked_cronoscita_id")
            linked_cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(linked_cronoscita_id)})
            
            if not linked_cronoscita:
                raise ValueError(f"Linked Cronoscita with ID {linked_cronoscita_id} not found")
            
            # Check for duplicate linked_cronoscita_id within same owning cronoscita
            existing = await self.section_collection.find_one({
                "cronoscita_id": cronoscita_id,
                "linked_cronoscita_id": linked_cronoscita_id
            })
            
            if existing:
                raise ValueError(f"Sezione per '{linked_cronoscita['nome']}' esiste già per questa Cronoscita")
            
            section_doc = {
                "cronoscita_id": cronoscita_id,
                "linked_cronoscita_id": linked_cronoscita_id,
                "section_name": section_data["section_name"],
                "section_code": section_data["section_code"],
                "description": section_data.get("description", ""),
                "display_order": section_data.get("display_order", 0),
                "is_required": section_data.get("is_required", False),
                "is_active": section_data.get("is_active", True),
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            result = await self.section_collection.insert_one(section_doc)
            logger.info(f"✅ Referto section created: {section_data['section_name']} (links to {linked_cronoscita['nome']}) for Cronoscita {cronoscita['nome']}")
            
            return str(result.inserted_id)
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating referto section: {e}")
            raise
    
    async def get_section_by_id(self, section_id: str) -> Optional[Dict[str, Any]]:
        """Get referto section by ID"""
        try:
            section = await self.section_collection.find_one({"_id": ObjectId(section_id)})
            
            if section:
                # Get owning cronoscita name
                cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(section["cronoscita_id"])})
                
                # Get linked cronoscita name
                linked_cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(section["linked_cronoscita_id"])})
                
                section["id"] = str(section["_id"])
                del section["_id"]
                
                if cronoscita:
                    section["cronoscita_nome"] = cronoscita["nome"]
                
                if linked_cronoscita:
                    section["linked_cronoscita_nome"] = linked_cronoscita["nome"]
            
            return section
            
        except Exception as e:
            logger.error(f"❌ Error getting referto section: {e}")
            return None
    
    async def get_sections_by_cronoscita(self, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get all referto sections for a cronoscita"""
        try:
            # Get cronoscita info
            cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(cronoscita_id)})
            
            if not cronoscita:
                logger.warning(f"⚠️ Cronoscita {cronoscita_id} not found")
                return []
            
            # Get sections ordered by display_order
            sections_cursor = self.section_collection.find({
                "cronoscita_id": cronoscita_id
            }).sort("display_order", 1)
            
            sections = await sections_cursor.to_list(length=None)
            
            result = []
            for section in sections:
                # Handle old sections without linked_cronoscita_id (migration support)
                linked_cronoscita_id = section.get("linked_cronoscita_id")
                linked_cronoscita_nome = "N/A"
                
                if linked_cronoscita_id:
                    # Get linked cronoscita name
                    linked_cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(linked_cronoscita_id)})
                    linked_cronoscita_nome = linked_cronoscita["nome"] if linked_cronoscita else "N/A"
                else:
                    # Old section without link - use same cronoscita as default
                    linked_cronoscita_id = cronoscita_id
                    linked_cronoscita_nome = cronoscita["nome"]
                
                section_data = {
                    "id": str(section["_id"]),
                    "cronoscita_id": cronoscita_id,
                    "cronoscita_nome": cronoscita["nome"],
                    "linked_cronoscita_id": linked_cronoscita_id,
                    "linked_cronoscita_nome": linked_cronoscita_nome,
                    "section_name": section["section_name"],
                    "section_code": section["section_code"],
                    "description": section.get("description", ""),
                    "display_order": section.get("display_order", 0),
                    "is_required": section.get("is_required", False),
                    "is_active": section.get("is_active", True),
                    "created_at": section["created_at"],
                    "updated_at": section["updated_at"]
                }
                result.append(section_data)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error getting referto sections: {e}")
            return []
    
    async def get_active_sections_by_cronoscita(self, cronoscita_id: str) -> List[Dict[str, Any]]:
        """Get only active referto sections for a cronoscita"""
        try:
            sections_cursor = self.section_collection.find({
                "cronoscita_id": cronoscita_id,
                "is_active": True
            }).sort("display_order", 1)
            
            sections = await sections_cursor.to_list(length=None)
            
            result = []
            for section in sections:
                # Handle old sections without linked_cronoscita_id (migration support)
                linked_cronoscita_id = section.get("linked_cronoscita_id")
                
                if linked_cronoscita_id:
                    # Get linked cronoscita name
                    linked_cronoscita = await self.cronoscita_collection.find_one({"_id": ObjectId(linked_cronoscita_id)})
                    linked_cronoscita_nome = linked_cronoscita["nome"] if linked_cronoscita else "N/A"
                else:
                    # Old section - use same cronoscita as default
                    linked_cronoscita_id = cronoscita_id
                    linked_cronoscita_nome = "SAME"
                
                section_data = {
                    "id": str(section["_id"]),
                    "cronoscita_id": cronoscita_id,
                    "linked_cronoscita_id": linked_cronoscita_id,
                    "linked_cronoscita_nome": linked_cronoscita_nome,
                    "section_name": section["section_name"],
                    "section_code": section["section_code"],
                    "description": section.get("description", ""),
                    "display_order": section.get("display_order", 0),
                    "is_required": section.get("is_required", False),
                    "created_at": section["created_at"],
                    "updated_at": section["updated_at"]
                }
                result.append(section_data)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error getting active referto sections: {e}")
            return []
    
    async def update_section(self, section_id: str, update_data: Dict[str, Any]) -> bool:
        """Update referto section"""
        try:
            # Get existing section
            existing = await self.section_collection.find_one({"_id": ObjectId(section_id)})
            
            if not existing:
                raise ValueError(f"Sezione con ID {section_id} non trovata")
            
            # If updating section_code, check for duplicates
            if "section_code" in update_data and update_data["section_code"] != existing["section_code"]:
                duplicate = await self.section_collection.find_one({
                    "cronoscita_id": existing["cronoscita_id"],
                    "section_code": update_data["section_code"],
                    "_id": {"$ne": ObjectId(section_id)}
                })
                
                if duplicate:
                    raise ValueError(f"Sezione con codice '{update_data['section_code']}' esiste già per questa Cronoscita")
            
            # Update fields
            update_fields = {k: v for k, v in update_data.items() if v is not None}
            update_fields["updated_at"] = datetime.now()
            
            result = await self.section_collection.update_one(
                {"_id": ObjectId(section_id)},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                logger.info(f"✅ Referto section updated: {section_id}")
                return True
            
            return False
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"❌ Error updating referto section: {e}")
            raise
    
    async def delete_section(self, section_id: str) -> bool:
        """Delete referto section (soft delete by setting is_active=False)"""
        try:
            result = await self.section_collection.update_one(
                {"_id": ObjectId(section_id)},
                {"$set": {
                    "is_active": False,
                    "updated_at": datetime.now()
                }}
            )
            
            if result.modified_count > 0:
                logger.info(f"✅ Referto section deleted (soft): {section_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error deleting referto section: {e}")
            return False
    
    async def hard_delete_section(self, section_id: str) -> bool:
        """Permanently delete referto section"""
        try:
            result = await self.section_collection.delete_one({"_id": ObjectId(section_id)})
            
            if result.deleted_count > 0:
                logger.info(f"✅ Referto section permanently deleted: {section_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error permanently deleting referto section: {e}")
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