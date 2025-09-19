# services/timeline-service/app/cronoscita_repository.py
"""
Timeline Service - Cronoscita Data Repository
MICROSERVICES ARCHITECTURE: Direct database access for pathology data
No HTTP dependencies on Admin Service - true microservice independence
"""

from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class CronoscitaRepository:
    """
    Direct database access for Cronoscita pathology data
    Microservices pattern: Each service accesses shared database independently
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.cronoscita
    
    async def get_active_pathologie_options(self) -> List[Dict[str, str]]:
        """
        Get active Cronoscita pathology options for Timeline service
        Returns formatted options for patient registration dropdown
        """
        try:
            cursor = self.collection.find(
                {"is_active": True},
                {
                    "_id": 0,  # Exclude MongoDB _id
                    "nome": 1,
                    "codice": 1,
                    "created_at": 1
                }
            ).sort("nome", 1)  # Sort alphabetically by name
            
            cronoscita_list = await cursor.to_list(length=None)
            
            # Format for Timeline frontend compatibility
            pathologie_options = []
            for cronoscita in cronoscita_list:
                pathologie_options.append({
                    "code": cronoscita["nome"],      # Used as value in dropdown
                    "display": cronoscita["nome"],   # Used as display text
                    "cronoscita_code": cronoscita["codice"]  # Internal reference
                })
            
            logger.info(f"✅ Retrieved {len(pathologie_options)} active pathologie from database")
            return pathologie_options
            
        except Exception as e:
            logger.error(f"❌ Error reading pathologie from database: {str(e)}")
            return []
    
    async def get_pathologie_display_name(self, cronoscita_name: str) -> str:
        """
        Get display name for Cronoscita pathology
        Direct database lookup - no HTTP calls
        """
        try:
            cronoscita = await self.collection.find_one(
                {"nome": cronoscita_name, "is_active": True},
                {"nome": 1, "_id": 0}
            )
            
            if cronoscita:
                return cronoscita["nome"]
            else:
                logger.warning(f"⚠️ Cronoscita not found: {cronoscita_name}")
                return cronoscita_name  # Fallback to input
                
        except Exception as e:
            logger.error(f"❌ Error getting pathologie display name: {str(e)}")
            return cronoscita_name  # Fallback to input
    
    async def validate_pathologie(self, cronoscita_name: str) -> bool:
        """
        Validate that a Cronoscita pathology exists and is active
        Used during patient registration validation
        """
        try:
            count = await self.collection.count_documents({
                "nome": cronoscita_name,
                "is_active": True
            })
            
            is_valid = count > 0
            
            if not is_valid:
                logger.warning(f"⚠️ Invalid pathologie selected: {cronoscita_name}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Error validating pathologie: {str(e)}")
            return False
    
    async def get_pathologie_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about available pathologies
        Useful for health checks and monitoring
        """
        try:
            total = await self.collection.count_documents({"is_active": True})
            all_count = await self.collection.count_documents({})
            
            # Get most recently created
            recent_cursor = self.collection.find(
                {"is_active": True}
            ).sort("created_at", -1).limit(5)
            
            recent_pathologie = []
            async for cronoscita in recent_cursor:
                recent_pathologie.append({
                    "nome": cronoscita["nome"],
                    "codice": cronoscita["codice"],
                    "created_at": cronoscita["created_at"].isoformat()
                })
            
            return {
                "total_active": total,
                "total_all": all_count,
                "recent": recent_pathologie,
                "status": "healthy"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting pathologie statistics: {str(e)}")
            return {
                "total_active": 0,
                "total_all": 0,
                "recent": [],
                "status": "error",
                "error": str(e)
            }

# ================================
# MICROSERVICES HELPER FUNCTIONS
# ================================

async def get_cronoscita_repository(db: AsyncIOMotorDatabase) -> CronoscitaRepository:
    """
    Dependency injection helper for Timeline Service
    Returns initialized Cronoscita repository
    """
    return CronoscitaRepository(db)

async def get_available_pathologie_from_db(db: AsyncIOMotorDatabase) -> List[Dict[str, str]]:
    """
    Direct database function for pathology options
    Replaces HTTP calls to Admin Service
    """
    cronoscita_repo = CronoscitaRepository(db)
    return await cronoscita_repo.get_active_pathologie_options()

async def get_pathologie_display_from_db(db: AsyncIOMotorDatabase, cronoscita_name: str) -> str:
    """
    Direct database function for pathology display name
    Replaces HTTP calls to Admin Service
    """
    cronoscita_repo = CronoscitaRepository(db)
    return await cronoscita_repo.get_pathologie_display_name(cronoscita_name)