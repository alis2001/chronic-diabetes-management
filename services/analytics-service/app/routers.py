# services/analytics-service/app/routers.py
"""
Analytics Service Routers
Clean organization of routes with proper dependency injection
API endpoints for Wirgilio integration and medical data analytics
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import HTMLResponse
from datetime import datetime
from typing import Optional, Dict, Any
import logging
from .database import get_database
from .repositories import ExamMappingRepository
from .filtering import ExamFilteringService
from .services import WirgilioService, DataProcessingService, AnalyticsService
from .models import (
    HealthResponse, ExamListResponse, SottanalisiListResponse, ChartDataResponse
)
from .exceptions import map_to_http_exception, AnalyticsServiceException
from .config import settings

logger = logging.getLogger(__name__)

# ================================
# DEPENDENCY INJECTION
# ================================

async def get_wirgilio_service() -> WirgilioService:
    """Get Wirgilio service instance"""
    return WirgilioService()

async def get_data_processing_service() -> DataProcessingService:
    """Get data processing service instance"""
    return DataProcessingService()

async def get_exam_mapping_repository(db = Depends(get_database)) -> ExamMappingRepository:
    """Get exam mapping repository instance"""
    return ExamMappingRepository(db)

async def get_filtering_service(
    mapping_repo: ExamMappingRepository = Depends(get_exam_mapping_repository)
) -> ExamFilteringService:
    """Get filtering service instance"""
    return ExamFilteringService(mapping_repo)

async def get_analytics_service(
    wirgilio_service: WirgilioService = Depends(get_wirgilio_service),
    data_service: DataProcessingService = Depends(get_data_processing_service),
    filtering_service: ExamFilteringService = Depends(get_filtering_service)
) -> AnalyticsService:
    """Get main analytics service instance with filtering support"""
    return AnalyticsService(wirgilio_service, data_service, filtering_service)

# ================================
# MAIN API ROUTER
# ================================

main_router = APIRouter()

@main_router.get("/")
async def read_root():
    """Root endpoint with service information"""
    return {
        "service": "Servizio Analytics ASL",
        "version": settings.SERVICE_VERSION,
        "status": "operativo",
        "integration": "wirgilio-api",
        "endpoints": {
            "exam_list": "GET /analytics/laboratory-exams/{codice_fiscale}",
            "sottanalisi_list": "GET /analytics/sottanalisi/{codice_fiscale}",
            "chart_data": "GET /analytics/chart-data/{codice_fiscale}",
            "frontend_app": "GET /analytics-app"
        }
    }

@main_router.get("/health", response_model=HealthResponse)
async def health_check(wirgilio_service: WirgilioService = Depends(get_wirgilio_service)):
    """Complete system health check including Wirgilio connection"""
    wirgilio_status = "checking..."
    
    try:
        wirgilio_connected = await wirgilio_service.test_connection()
        wirgilio_status = "connected" if wirgilio_connected else "disconnected"
    except Exception as e:
        wirgilio_status = f"error: {str(e)}"
        logger.error(f"Wirgilio connection check failed: {e}")
    
    return HealthResponse(
        service="analytics-service",
        status="healthy",
        timestamp=datetime.now(),
        port=settings.SERVICE_PORT,
        wirgilio_status=wirgilio_status
    )

# ================================
# ANALYTICS API ROUTES
# ================================

analytics_router = APIRouter(prefix="/analytics", tags=["Medical Analytics"])

@analytics_router.get("/laboratory-exams/{codice_fiscale}", response_model=ExamListResponse)
async def get_exam_list(
    codice_fiscale: str,
    cronoscita_id: Optional[str] = Query(None, description="Optional Cronoscita filter"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get laboratory exam list for first dropdown - WITH FILTERING
    
    Now filters results based on exam mappings configured in admin dashboard.
    Only shows exams that have been mapped and marked as 'visualizza_nel_referto'='S'
    """
    try:
        logger.info(f"Getting filtered exam list for CF: {codice_fiscale}, Cronoscita: {cronoscita_id}")
        return await analytics_service.get_exam_summaries(codice_fiscale, cronoscita_id)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting exam list: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@analytics_router.get("/sottanalisi/{codice_fiscale}", response_model=SottanalisiListResponse)
async def get_sottanalisi_list(
    codice_fiscale: str,
    exam_key: str = Query(..., description="Exam key (desesame)"),
    cronoscita_id: Optional[str] = Query(None, description="Optional Cronoscita filter"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get sottanalisi list for second dropdown - WITH FILTERING
    
    Only shows sottanalisi for exams that passed the mapping filter
    """
    try:
        logger.info(f"Getting filtered sottanalisi for CF: {codice_fiscale}, exam: {exam_key}, Cronoscita: {cronoscita_id}")
        return await analytics_service.get_sottanalisi_for_exam(codice_fiscale, exam_key, cronoscita_id)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting sottanalisi: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@analytics_router.get("/chart-data/{codice_fiscale}", response_model=ChartDataResponse)
async def get_chart_data(
    codice_fiscale: str,
    exam_key: str = Query(..., description="Exam key (desesame)"),
    dessottoanalisi: str = Query(..., description="Parameter to chart"),
    cronoscita_id: Optional[str] = Query(None, description="Optional Cronoscita filter"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get time-series chart data for specific parameter - WITH FILTERING
    
    Only shows chart data for exams that passed the mapping filter
    """
    try:
        logger.info(f"Generating filtered chart data for CF: {codice_fiscale}, {exam_key}, {dessottoanalisi}, Cronoscita: {cronoscita_id}")
        return await analytics_service.get_chart_data(codice_fiscale, exam_key, dessottoanalisi, cronoscita_id)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error generating chart: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@analytics_router.get("/filtering-info", response_model=Dict[str, Any])
async def get_filtering_info(
    cronoscita_id: Optional[str] = Query(None, description="Optional Cronoscita filter"),
    filtering_service: ExamFilteringService = Depends(get_filtering_service)
):
    """
    Get information about current filtering configuration
    
    Useful for debugging and admin monitoring
    """
    try:
        logger.info(f"Getting filtering info for Cronoscita: {cronoscita_id}")
        return await filtering_service.get_filtering_statistics(cronoscita_id)
    except Exception as e:
        logger.error(f"Error getting filtering info: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting filtering information")
# ================================
# ROUTER COLLECTION FUNCTION
# ================================

def get_all_routers():
    """Get all routers for main application"""
    return [main_router, analytics_router]