# services/analytics-service/app/repositories.py
"""
Analytics Service Repositories
Data access layer for exam mapping queries
"""

from typing import List, Dict, Set, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

class ExamMappingRepository:
    """Repository for exam mapping data access"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.exam_mappings
    
    async def get_active_codoffering_codes(self, cronoscita_id: Optional[str] = None) -> Set[str]:
        """
        Get all active codoffering_wirgilio codes that should be displayed
        
        Args:
            cronoscita_id: Optional filter by specific Cronoscita
            
        Returns:
            Set of codoffering_wirgilio codes to show in analytics
        """
        try:
            # Build query filter
            query = {
                "is_active": True,
                "visualizza_nel_referto": "S"  # Only show exams marked for display
            }
            
            # Add Cronoscita filter if provided
            if cronoscita_id:
                query["cronoscita_id"] = cronoscita_id
            
            # Project only the codoffering_wirgilio field
            cursor = self.collection.find(
                query,
                {"codoffering_wirgilio": 1, "_id": 0}
            )
            
            results = await cursor.to_list(length=None)
            
            # Extract codes and convert to set for fast lookup
            codes = set()
            for result in results:
                if result.get("codoffering_wirgilio"):
                    codes.add(result["codoffering_wirgilio"].strip())
            
            logger.info(f"📋 Found {len(codes)} active codoffering codes for filtering")
            return codes
            
        except Exception as e:
            logger.error(f"❌ Error getting active codoffering codes: {e}")
            return set()  # Return empty set on error - will show no exams
    
    async def get_exam_mapping_info(self, codoffering_wirgilio: str) -> Optional[Dict[str, Any]]:
        """
        Get mapping information for a specific codoffering code
        
        Args:
            codoffering_wirgilio: The Wirgilio exam code
            
        Returns:
            Mapping info with catalog details or None
        """
        try:
            mapping = await self.collection.find_one({
                "codoffering_wirgilio": codoffering_wirgilio,
                "is_active": True,
                "visualizza_nel_referto": "S"
            })
            
            if mapping:
                return {
                    "codice_catalogo": mapping.get("codice_catalogo"),
                    "nome_esame_wirgilio": mapping.get("nome_esame_wirgilio"),
                    "struttura_nome": mapping.get("struttura_nome"),
                    "cronoscita_id": mapping.get("cronoscita_id")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting exam mapping info: {e}")
            return None
    
    async def get_mapping_statistics(self) -> Dict[str, Any]:
        """Get statistics about exam mappings for analytics"""
        try:
            total_mappings = await self.collection.count_documents({"is_active": True})
            visible_mappings = await self.collection.count_documents({
                "is_active": True,
                "visualizza_nel_referto": "S"
            })
            
            return {
                "total_active_mappings": total_mappings,
                "visible_mappings": visible_mappings,
                "filtered_percentage": round((visible_mappings / total_mappings * 100), 1) if total_mappings > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting mapping statistics: {e}")
            return {
                "total_active_mappings": 0,
                "visible_mappings": 0,
                "filtered_percentage": 0,
                "error": str(e)
            }