# services/analytics-service/app/filtering.py
"""
Analytics Service Data Filtering
Filters Wirgilio data based on admin-configured exam mappings
"""

from typing import List, Dict, Set, Any, Optional
import logging

from .repositories import ExamMappingRepository

logger = logging.getLogger(__name__)

class ExamFilteringService:
    """Service for filtering Wirgilio data based on exam mappings"""
    
    def __init__(self, mapping_repo: ExamMappingRepository):
        self.mapping_repo = mapping_repo
        self._cached_codes: Optional[Set[str]] = None
        self._cache_cronoscita_id: Optional[str] = None
    
    async def get_allowed_codoffering_codes(self, cronoscita_id: Optional[str] = None) -> Set[str]:
        """
        Get set of allowed codoffering codes with caching
        
        Args:
            cronoscita_id: Optional Cronoscita filter
            
        Returns:
            Set of allowed codoffering_wirgilio codes
        """
        # Simple cache check (in production, consider Redis caching)
        if (self._cached_codes is not None and 
            self._cache_cronoscita_id == cronoscita_id):
            return self._cached_codes
        
        # Fetch from database
        codes = await self.mapping_repo.get_active_codoffering_codes(cronoscita_id)
        
        # Cache the result
        self._cached_codes = codes
        self._cache_cronoscita_id = cronoscita_id
        
        logger.info(f"Allowed codoffering codes: {sorted(codes)}")
        return codes
    
    def filter_wirgilio_data(self, raw_data: List[Dict[str, Any]], allowed_codes: Set[str]) -> List[Dict[str, Any]]:
        """
        Filter raw Wirgilio data to only include mapped exams
        
        Args:
            raw_data: Raw data from Wirgilio API
            allowed_codes: Set of allowed codoffering codes
            
        Returns:
            Filtered data containing only mapped exams
        """
        if not allowed_codes:
            logger.warning("No allowed codes found - returning empty dataset")
            return []
        
        filtered_data = []
        total_reports = len(raw_data)
        filtered_reports = 0
        total_exams_before = 0
        total_exams_after = 0
        
        for report in raw_data:
            # Get exams from this report
            exams = report.get("esami", [])
            total_exams_before += len(exams)
            
            # Filter exams by allowed codes
            filtered_exams = []
            for esame in exams:
                codoffering = esame.get("codoffering", "").strip()
                
                if codoffering in allowed_codes:
                    filtered_exams.append(esame)
                    total_exams_after += 1
                else:
                    logger.debug(f"Filtered out exam with codoffering: {codoffering}")
            
            # Only include report if it has filtered exams
            if filtered_exams:
                filtered_report = report.copy()
                filtered_report["esami"] = filtered_exams
                filtered_data.append(filtered_report)
                filtered_reports += 1
        
        logger.info(f"Filtering results:")
        logger.info(f"   Reports: {filtered_reports}/{total_reports}")
        logger.info(f"   Exams: {total_exams_after}/{total_exams_before}")
        logger.info(f"   Allowed codes: {len(allowed_codes)}")
        
        return filtered_data
    
    async def get_filtering_statistics(self, cronoscita_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about current filtering configuration"""
        try:
            allowed_codes = await self.get_allowed_codoffering_codes(cronoscita_id)
            mapping_stats = await self.mapping_repo.get_mapping_statistics()
            
            return {
                "filtering_active": len(allowed_codes) > 0,
                "allowed_codes_count": len(allowed_codes),
                "allowed_codes": sorted(allowed_codes),
                "mapping_statistics": mapping_stats,
                "cronoscita_filter": cronoscita_id
            }
            
        except Exception as e:
            logger.error(f"Error getting filtering statistics: {e}")
            return {
                "filtering_active": False,
                "error": str(e)
            }