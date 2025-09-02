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

from .models import (
    WirgilioReport, WirgilioEsame, WirgilioRisultato,
    ProcessedResult, ExamSummary, SottanalisiSummary, ChartDataPoint,
    AnomalyStatus, ExamListResponse, SottanalisiListResponse, ChartDataResponse
)
from .config import settings, DATA_CONSTRAINTS, CHART_COLORS, DIABETES_RELEVANT_CODES
from .exceptions import WirgilioAPIException, DataProcessingException

logger = logging.getLogger(__name__)

class WirgilioService:
    """Service for Wirgilio API integration"""
    
    def __init__(self):
        self.base_url = settings.WIRGILIO_API_BASE
        self.token = settings.WIRGILIO_TOKEN
        self.timeout = settings.ANALYTICS_TIMEOUT_SECONDS
    
    async def fetch_patient_data(self, codice_fiscale: str) -> List[Dict[str, Any]]:
        """Fetch laboratory data from Wirgilio API"""
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
                            data = response.json()
                            logger.info(f"Retrieved {len(data)} laboratory reports for {codice_fiscale}")
                            return data
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
                        await asyncio.sleep(settings.RETRY_DELAY_SECONDS)
                
                return []
                
        except Exception as e:
            logger.error(f"Wirgilio API error: {str(e)}")
            raise WirgilioAPIException(f"Failed to fetch data: {str(e)}")
    
    async def test_connection(self) -> bool:
        """Test Wirgilio API connection"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                headers = {"Authorization": f"Bearer {self.token}"}
                response = await client.get(f"{self.base_url}/health", headers=headers)
                return response.status_code == 200
        except:
            return False

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
        """Process raw Wirgilio data into structured format"""
        
        exam_data = defaultdict(list)  # exam_key -> [ProcessedResult]
        exam_anomaly_tracking = defaultdict(bool)  # exam_key -> has_anomaly
        sottanalisi_anomaly_tracking = defaultdict(bool)  # sottanalisi_key -> has_anomaly
        
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
                
                # Filter for diabetes-relevant exams only
                if codoffering not in DIABETES_RELEVANT_CODES:
                    continue
                
                exam_key = f"{desesame}_{codoffering}"
                
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
                        is_valid_value=valore_numerico is not None
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
    """Main analytics service orchestrating business logic"""
    
    def __init__(self, wirgilio_service: WirgilioService, data_service: DataProcessingService):
        self.wirgilio_service = wirgilio_service
        self.data_service = data_service
    
    async def get_exam_summaries(self, codice_fiscale: str) -> ExamListResponse:
        """Get exam list for first dropdown with anomaly coloring"""
        try:
            # Fetch raw data
            raw_data = await self.wirgilio_service.fetch_patient_data(codice_fiscale)
            if not raw_data:
                return ExamListResponse(
                    success=True,
                    codice_fiscale=codice_fiscale,
                    exam_summaries=[],
                    total_exams=0,
                    processing_summary={"no_data": True}
                )
            
            # Process data
            processed = self.data_service.process_raw_data(raw_data)
            exam_data = processed["exam_data"]
            exam_anomalies = processed["exam_anomaly_tracking"]
            
            # Build exam summaries
            exam_summaries = []
            for exam_key, results in exam_data.items():
                if not results:  # Skip empty exams
                    continue
                
                # Parse exam info
                desesame = results[0].dessottoanalisi
                parts = exam_key.split("_")
                if len(parts) >= 2:
                    desesame = "_".join(parts[:-1])
                    codoffering = parts[-1]
                else:
                    codoffering = exam_key
                
                # Calculate statistics
                has_anomaly = exam_anomalies.get(exam_key, False)
                anomaly_count = sum(1 for r in results if r.is_anomaly)
                unique_sottanalisi = set(r.dessottoanalisi for r in results)
                
                anomaly_status = AnomalyStatus.ANOMALY if has_anomaly else AnomalyStatus.NORMAL
                
                summary = ExamSummary(
                    exam_key=exam_key,
                    desesame=desesame,
                    codoffering=codoffering,
                    has_anomaly=has_anomaly,
                    anomaly_status=anomaly_status,
                    sottanalisi_count=len(unique_sottanalisi),
                    total_results=len(results),
                    anomaly_count=anomaly_count
                )
                exam_summaries.append(summary)
            
            # Sort by exam name
            exam_summaries.sort(key=lambda x: x.desesame)
            
            return ExamListResponse(
                success=True,
                codice_fiscale=codice_fiscale,
                exam_summaries=exam_summaries,
                total_exams=len(exam_summaries),
                processing_summary=processed["processing_stats"]
            )
            
        except Exception as e:
            logger.error(f"Error getting exam summaries: {str(e)}")
            raise DataProcessingException(f"Failed to process exam data: {str(e)}")
    
    async def get_sottanalisi_for_exam(self, codice_fiscale: str, exam_key: str) -> SottanalisiListResponse:
        """Get sottanalisi list for second dropdown with anomaly coloring"""
        try:
            # Fetch and process data
            raw_data = await self.wirgilio_service.fetch_patient_data(codice_fiscale)
            processed = self.data_service.process_raw_data(raw_data)
            
            exam_data = processed["exam_data"].get(exam_key, [])
            if not exam_data:
                parts = exam_key.split("_")
                desesame = "_".join(parts[:-1]) if len(parts) > 1 else exam_key
                codoffering = parts[-1] if len(parts) > 1 else ""
                
                return SottanalisiListResponse(
                    success=True,
                    exam_key=exam_key,
                    desesame=desesame,
                    codoffering=codoffering,
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
            
            # Parse exam info for response
            parts = exam_key.split("_")
            desesame = "_".join(parts[:-1]) if len(parts) > 1 else exam_key
            codoffering = parts[-1] if len(parts) > 1 else ""
            
            return SottanalisiListResponse(
                success=True,
                exam_key=exam_key,
                desesame=desesame,
                codoffering=codoffering,
                sottanalisi=sottanalisi_summaries,
                total_sottanalisi=len(sottanalisi_summaries)
            )
            
        except Exception as e:
            logger.error(f"Error getting sottanalisi: {str(e)}")
            raise DataProcessingException(f"Failed to process sottanalisi data: {str(e)}")
    
    async def get_chart_data(self, codice_fiscale: str, exam_key: str, dessottoanalisi: str) -> ChartDataResponse:
        """Get time-series chart data for specific parameter"""
        try:
            # Fetch and process data
            raw_data = await self.wirgilio_service.fetch_patient_data(codice_fiscale)
            processed = self.data_service.process_raw_data(raw_data)
            
            exam_data = processed["exam_data"].get(exam_key, [])
            
            # Filter for specific sottanalisi and valid numeric values
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
            chart_points = []
            for result in filtered_data:
                # Format date for display
                try:
                    date_obj = datetime.strptime(result.datareferto, "%d/%m/%Y")
                    formatted_date = result.datareferto
                except:
                    formatted_date = result.datareferto
                
                point = ChartDataPoint(
                    date=result.datareferto,
                    value=result.valore_numerico,
                    valore_originale=result.valore,
                    anomaly=result.is_anomaly,
                    flag=result.flaganomalia,
                    unit=result.unitadimisura,
                    range=result.rangevalori,
                    formatted_date=formatted_date
                )
                chart_points.append(point)
            
            # Sort by date
            chart_points.sort(key=lambda x: datetime.strptime(x.date, "%d/%m/%Y"))
            
            # Calculate statistics
            total_points = len(chart_points)
            anomaly_points = sum(1 for point in chart_points if point.anomaly)
            anomaly_percentage = (anomaly_points / total_points * 100) if total_points > 0 else 0.0
            
            # Determine chart color
            chart_color = CHART_COLORS["anomaly"] if anomaly_points > 0 else CHART_COLORS["normal"]
            
            return ChartDataResponse(
                success=True,
                exam_key=exam_key,
                dessottoanalisi=dessottoanalisi,
                chart_data=chart_points,
                total_points=total_points,
                anomaly_points=anomaly_points,
                anomaly_percentage=round(anomaly_percentage, 1),
                chart_color=chart_color
            )
            
        except Exception as e:
            logger.error(f"Error generating chart data: {str(e)}")
            raise DataProcessingException(f"Failed to generate chart data: {str(e)}")