# services/analytics-service/app/services.py
"""
Analytics Service Business Logic
Clean separation of business logic for Wirgilio integration and data processing
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict
import httpx
import logging
import asyncio
from .database import get_database
from .repositories import ExamMappingRepository
from .filtering import ExamFilteringService
from .models import (
    WirgilioReport, WirgilioEsame, WirgilioRisultato,
    ProcessedResult, ExamSummary, SottanalisiSummary, ChartDataPoint,
    AnomalyStatus, ExamListResponse, SottanalisiListResponse, ChartDataResponse
)
from .config import settings, DATA_CONSTRAINTS, CHART_COLORS, DIABETES_RELEVANT_CODES
from .exceptions import WirgilioAPIException, DataProcessingException

logger = logging.getLogger(__name__)

class WirgilioService:
    """Service for Wirgilio API integration with filtering support"""
    
    def __init__(self):
        self.base_url = settings.WIRGILIO_API_BASE
        self.token = settings.WIRGILIO_TOKEN
        self.timeout = settings.ANALYTICS_TIMEOUT_SECONDS
    
    async def test_connection(self) -> bool:
        """Test connection to Wirgilio API"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                }
                
                # Test with a simple endpoint
                response = await client.get(f"{self.base_url}/health", headers=headers)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Wirgilio connection test failed: {e}")
            return False

    async def fetch_patient_data(
        self, 
        codice_fiscale: str, 
        filtering_service: Optional[ExamFilteringService] = None,
        cronoscita_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch laboratory data from Wirgilio API with optional filtering"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                }
                
                url = f"{self.base_url}{settings.WIRGILIO_ENDPOINT}"
                params = {"codicefiscale": codice_fiscale}
                
                logger.info(f"Fetching Wirgilio data for CF: {codice_fiscale}")
                
                for attempt in range(settings.MAX_RETRIES):
                    try:
                        response = await client.get(url, headers=headers, params=params)
                        
                        if response.status_code == 200:
                            raw_data = response.json()
                            logger.info(f"Retrieved {len(raw_data)} laboratory reports for {codice_fiscale}")
                            
                            # APPLY FILTERING HERE
                            if filtering_service:
                                allowed_codes = await filtering_service.get_allowed_codoffering_codes(cronoscita_id)
                                filtered_data = filtering_service.filter_wirgilio_data(raw_data, allowed_codes)
                                logger.info(f"🔍 Filtered to {len(filtered_data)} reports with mapped exams")
                                return filtered_data
                            else:
                                logger.warning("⚠️ No filtering applied - showing all exams")
                                return raw_data
                                
                        elif response.status_code == 404:
                            logger.warning(f"No data found for CF: {codice_fiscale}")
                            return []
                        else:
                            logger.warning(f"Wirgilio API returned {response.status_code} (attempt {attempt + 1})")
                            if attempt == settings.MAX_RETRIES - 1:
                                raise WirgilioAPIException(f"API error: {response.status_code}")
                    
                    except httpx.TimeoutException:
                        logger.warning(f"Timeout on attempt {attempt + 1}")
                        if attempt == settings.MAX_RETRIES - 1:
                            raise WirgilioAPIException("API timeout after retries")
                    
                    except Exception as e:
                        logger.error(f"Request error on attempt {attempt + 1}: {e}")
                        if attempt == settings.MAX_RETRIES - 1:
                            raise WirgilioAPIException(f"Request failed: {str(e)}")
                    
                    # Wait before retry
                    if attempt < settings.MAX_RETRIES - 1:
                        await asyncio.sleep(settings.RETRY_DELAY_SECONDS)
                        
        except WirgilioAPIException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching Wirgilio data: {e}")
            raise WirgilioAPIException(f"Fetch failed: {str(e)}")

class DataProcessingService:
    """Service for data cleaning, validation and anomaly detection"""
    
    @staticmethod
    def is_valid_value(valore: str) -> bool:
        """Check if value is valid for processing"""
        if not valore or not valore.strip():
            return False
        
        valore_clean = valore.strip().lower()
        return valore_clean not in DATA_CONSTRAINTS["INVALID_VALUES"]
    
    @staticmethod
    def parse_numeric_value(valore: str) -> Optional[float]:
        """Extract numeric value from string"""
        if not DataProcessingService.is_valid_value(valore):
            return None
        
        try:
            # Handle Italian decimal format (comma)
            numeric_str = valore.strip().replace(",", ".")
            # Remove any non-numeric characters except decimal point and minus
            import re
            clean_value = re.sub(r'[^\d\.-]', '', numeric_str)
            return float(clean_value) if clean_value else None
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def normalize_anomaly_flag(flag: Optional[str]) -> str:
        """Normalize anomaly flag to standard format"""
        if not flag or flag.strip() == "":
            return "N"  # Default to normal
        
        flag_clean = flag.strip().upper()
        if flag_clean in DATA_CONSTRAINTS["VALID_ANOMALY_FLAGS"]:
            return flag_clean
        
        return "N"  # Default unknown flags to normal
    
    @staticmethod
    def is_anomaly(flag: str) -> bool:
        """Check if normalized flag indicates anomaly"""
        return flag in DATA_CONSTRAINTS["ANOMALY_FLAGS"]
    
    @staticmethod
    def process_raw_data(raw_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process raw Wirgilio data into merged exam structure"""
        
        exam_data = defaultdict(list)  # desesame -> [ProcessedResult]
        exam_anomaly_tracking = defaultdict(bool)  # desesame -> has_anomaly
        sottanalisi_anomaly_tracking = defaultdict(bool)  # desesame_dessottoanalisi -> has_anomaly
        
        total_reports = len(raw_data)
        processed_results = 0
        skipped_results = 0
        
        for report in raw_data:
            datareferto = report.get("datareferto", "")
            if not datareferto:
                continue
            
            for esame in report.get("esami", []):
                desesame = esame.get("desesame", "").strip()
                codoffering = esame.get("codoffering", "").strip()
                
                if not desesame or not codoffering:
                    continue
                
                # Use desesame as exam_key (this merges 301 and 301U under same exam)
                exam_key = desesame
                
                for risultato in esame.get("risultati", []):
                    dessottoanalisi = risultato.get("dessottoanalisi", "").strip()
                    valore = risultato.get("valore", "").strip()
                    
                    if not dessottoanalisi or not DataProcessingService.is_valid_value(valore):
                        skipped_results += 1
                        continue
                    
                    # Process the result
                    flag_raw = risultato.get("flaganomalia", "")
                    flag_normalized = DataProcessingService.normalize_anomaly_flag(flag_raw)
                    is_anomaly = DataProcessingService.is_anomaly(flag_normalized)
                    valore_numerico = DataProcessingService.parse_numeric_value(valore)
                    
                    processed_result = ProcessedResult(
                        dessottoanalisi=dessottoanalisi,
                        valore=valore,
                        valore_numerico=valore_numerico,
                        unitadimisura=risultato.get("unitadimisura", "").strip(),
                        rangevalori=risultato.get("rangevalori", "").strip(),
                        flaganomalia=flag_normalized,
                        datareferto=datareferto,
                        is_anomaly=is_anomaly,
                        is_valid_value=valore_numerico is not None,
                        codoffering_original=codoffering
                    )
                    
                    exam_data[exam_key].append(processed_result)
                    
                    # Track anomalies
                    if is_anomaly:
                        exam_anomaly_tracking[exam_key] = True
                        sottanalisi_key = f"{exam_key}_{dessottoanalisi}"
                        sottanalisi_anomaly_tracking[sottanalisi_key] = True
                    
                    processed_results += 1
        
        return {
            "exam_data": dict(exam_data),
            "exam_anomaly_tracking": dict(exam_anomaly_tracking),
            "sottanalisi_anomaly_tracking": dict(sottanalisi_anomaly_tracking),
            "processing_stats": {
                "total_reports": total_reports,
                "processed_results": processed_results,
                "skipped_results": skipped_results,
                "unique_exams": len(exam_data)
            }
        }

class AnalyticsService:
    """Main analytics service with filtering support"""
    
    def __init__(
        self, 
        wirgilio_service: WirgilioService, 
        data_service: DataProcessingService,
        filtering_service: Optional[ExamFilteringService] = None
    ):
        self.wirgilio_service = wirgilio_service
        self.data_service = data_service
        self.filtering_service = filtering_service
    
    async def get_exam_summaries(
        self, 
        codice_fiscale: str, 
        cronoscita_id: Optional[str] = None
    ) -> ExamListResponse:
        """Get exam list for first dropdown with filtering applied"""
        try:
            # Fetch data with filtering
            raw_data = await self.wirgilio_service.fetch_patient_data(
                codice_fiscale, 
                self.filtering_service, 
                cronoscita_id
            )
            
            processed = self.data_service.process_raw_data(raw_data)
            
            exam_data = processed["exam_data"]
            exam_anomaly_tracking = processed["exam_anomaly_tracking"]
            
            # Create exam summaries (exam_key is now just desesame)
            exam_summaries = []
            for exam_key, results in exam_data.items():
                total_results = len(results)
                anomaly_count = sum(1 for result in results if result.is_anomaly)
                has_anomaly = exam_anomaly_tracking.get(exam_key, False)
                
                # Get unique codofferings for this exam
                unique_codofferings = list(set(result.codoffering_original for result in results))
                
                summary = ExamSummary(
                    exam_key=exam_key,  # Just the desesame
                    desesame=exam_key,  # Same as exam_key now
                    codoffering=",".join(sorted(unique_codofferings)),
                    has_anomaly=has_anomaly,
                    anomaly_status=AnomalyStatus.ANOMALY if has_anomaly else AnomalyStatus.NORMAL,
                    sottanalisi_count=len(set(result.dessottoanalisi for result in results)),
                    total_results=total_results,
                    anomaly_count=anomaly_count
                )
                exam_summaries.append(summary)
            
            # Sort by exam name
            exam_summaries.sort(key=lambda x: x.desesame)
            
            # Add filtering info to processing summary
            processing_stats = processed["processing_stats"]
            if self.filtering_service:
                filter_stats = await self.filtering_service.get_filtering_statistics(cronoscita_id)
                processing_stats["filtering"] = filter_stats
            
            return ExamListResponse(
                success=True,
                codice_fiscale=codice_fiscale,
                exam_summaries=exam_summaries,
                total_exams=len(exam_summaries),
                processing_summary=processing_stats
            )
            
        except Exception as e:
            logger.error(f"Error getting exam summaries: {str(e)}")
            raise DataProcessingException(f"Failed to process exam data: {str(e)}")
    
    async def get_sottanalisi_for_exam(
        self, 
        codice_fiscale: str, 
        exam_key: str, 
        cronoscita_id: Optional[str] = None
    ) -> SottanalisiListResponse:
        """Get sottanalisi list for second dropdown with filtering applied"""
        try:
            # Fetch data with filtering
            raw_data = await self.wirgilio_service.fetch_patient_data(
                codice_fiscale, 
                self.filtering_service, 
                cronoscita_id
            )
            
            processed = self.data_service.process_raw_data(raw_data)
            
            # exam_key is now just the desesame
            exam_data = processed["exam_data"].get(exam_key, [])
            if not exam_data:
                return SottanalisiListResponse(
                    success=True,
                    exam_key=exam_key,
                    desesame=exam_key,  # Same as exam_key
                    codoffering="",
                    sottanalisi=[],
                    total_sottanalisi=0
                )
            
            # Group by sottanalisi
            sottanalisi_groups = defaultdict(list)
            for result in exam_data:
                sottanalisi_groups[result.dessottoanalisi].append(result)
            
            # Build sottanalisi summaries
            sottanalisi_summaries = []
            for dessottoanalisi, results in sottanalisi_groups.items():
                has_anomaly = any(r.is_anomaly for r in results)
                anomaly_count = sum(1 for r in results if r.is_anomaly)
                
                # Get latest result
                sorted_results = sorted(results, key=lambda x: x.datareferto, reverse=True)
                latest_result = sorted_results[0]
                
                anomaly_status = AnomalyStatus.ANOMALY if has_anomaly else AnomalyStatus.NORMAL
                
                summary = SottanalisiSummary(
                    dessottoanalisi=dessottoanalisi,
                    has_anomaly=has_anomaly,
                    anomaly_status=anomaly_status,
                    total_values=len(results),
                    anomaly_count=anomaly_count,
                    latest_value=latest_result.valore,
                    latest_date=latest_result.datareferto,
                    unit=latest_result.unitadimisura
                )
                sottanalisi_summaries.append(summary)
            
            # Sort by name
            sottanalisi_summaries.sort(key=lambda x: x.dessottoanalisi)
            
            # Get unique codofferings for display
            unique_codofferings = list(set(result.codoffering_original for result in exam_data))
            
            return SottanalisiListResponse(
                success=True,
                exam_key=exam_key,
                desesame=exam_key,  # Same as exam_key now
                codoffering=",".join(sorted(unique_codofferings)),
                sottanalisi=sottanalisi_summaries,
                total_sottanalisi=len(sottanalisi_summaries)
            )
            
        except Exception as e:
            logger.error(f"Error getting sottanalisi: {str(e)}")
            raise DataProcessingException(f"Failed to process sottanalisi data: {str(e)}")
    
    async def get_chart_data(
        self, 
        codice_fiscale: str, 
        exam_key: str, 
        dessottoanalisi: str, 
        cronoscita_id: Optional[str] = None
    ) -> ChartDataResponse:
        """Get time-series chart data for specific parameter with filtering applied"""
        try:
            # Fetch data with filtering
            raw_data = await self.wirgilio_service.fetch_patient_data(
                codice_fiscale, 
                self.filtering_service, 
                cronoscita_id
            )
            
            processed = self.data_service.process_raw_data(raw_data)
            
            # exam_key is now just the desesame, get all results for this exam
            exam_data = processed["exam_data"].get(exam_key, [])
            
            # Filter for specific dessottoanalisi and valid numeric values
            filtered_data = [
                result for result in exam_data
                if result.dessottoanalisi == dessottoanalisi and result.is_valid_value
            ]
            
            if not filtered_data:
                return ChartDataResponse(
                    success=True,
                    exam_key=exam_key,
                    dessottoanalisi=dessottoanalisi,
                    chart_data=[],
                    total_points=0,
                    anomaly_points=0,
                    anomaly_percentage=0.0,
                    chart_color=CHART_COLORS["neutral"]
                )
            
            # Build chart data points
            chart_data = []
            anomaly_count = 0
            
            for result in filtered_data:
                if result.is_anomaly:
                    anomaly_count += 1
                
                point = ChartDataPoint(
                    date=result.datareferto,
                    value=result.valore_numerico,
                    valore_originale=result.valore,
                    anomaly=result.is_anomaly,
                    flag=result.flaganomalia,
                    unit=result.unitadimisura,
                    range=result.rangevalori,
                    formatted_date=result.datareferto,  # Could format this differently
                    struttura="", # Could be populated from mapping info
                    codoffering=result.codoffering_original
                )
                chart_data.append(point)
            
            # Sort by date
            chart_data.sort(key=lambda x: x.date)
            
            # Determine chart color
            anomaly_percentage = (anomaly_count / len(chart_data)) * 100
            chart_color = CHART_COLORS["anomaly"] if anomaly_count > 0 else CHART_COLORS["normal"]
            
            return ChartDataResponse(
                success=True,
                exam_key=exam_key,
                dessottoanalisi=dessottoanalisi,
                chart_data=chart_data,
                total_points=len(chart_data),
                anomaly_points=anomaly_count,
                anomaly_percentage=round(anomaly_percentage, 1),
                chart_color=chart_color
            )
            
        except Exception as e:
            logger.error(f"Error getting chart data: {str(e)}")
            raise DataProcessingException(f"Failed to generate chart data: {str(e)}")