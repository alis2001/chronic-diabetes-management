# services/analytics-service/app/routers.py
"""
Analytics Service Routers
Clean organization of routes with proper dependency injection
API endpoints for Wirgilio integration and medical data analytics
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import HTMLResponse
from datetime import datetime
from typing import Optional
import logging

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

async def get_analytics_service(
    wirgilio_service: WirgilioService = Depends(get_wirgilio_service),
    data_service: DataProcessingService = Depends(get_data_processing_service)
) -> AnalyticsService:
    """Get main analytics service instance"""
    return AnalyticsService(wirgilio_service, data_service)

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
async def get_laboratory_exams(
    codice_fiscale: str,
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get laboratory exam list for first dropdown (desesame)
    
    Returns exam types with anomaly coloring:
    - Red color if exam contains ANY P or AP flags in history
    - Normal color if exam has only N flags
    """
    try:
        logger.info(f"Fetching laboratory exams for CF: {codice_fiscale}")
        return await analytics_service.get_exam_summaries(codice_fiscale)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting exams: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@analytics_router.get("/sottanalisi/{codice_fiscale}", response_model=SottanalisiListResponse)
async def get_sottanalisi_for_exam(
    codice_fiscale: str,
    exam_key: str = Query(..., description="Exam key (desesame_codoffering)"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get sottanalisi list for second dropdown for selected exam
    
    Returns specific parameters with anomaly coloring:
    - Red color if parameter has ANY P or AP flags in history
    - Normal color if parameter has only N flags
    """
    try:
        logger.info(f"Fetching sottanalisi for CF: {codice_fiscale}, exam: {exam_key}")
        return await analytics_service.get_sottanalisi_for_exam(codice_fiscale, exam_key)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error getting sottanalisi: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@analytics_router.get("/chart-data/{codice_fiscale}", response_model=ChartDataResponse)
async def get_chart_data(
    codice_fiscale: str,
    exam_key: str = Query(..., description="Exam key (desesame_codoffering)"),
    dessottoanalisi: str = Query(..., description="Parameter to chart"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get time-series chart data for specific parameter
    
    Returns chart data points with:
    - Date from datareferto
    - Numeric values only (invalid values filtered out)
    - Anomaly flags for point coloring
    - Chart color determination (red if ANY anomalies, green if all normal)
    """
    try:
        logger.info(f"Generating chart data for CF: {codice_fiscale}, {exam_key}, {dessottoanalisi}")
        return await analytics_service.get_chart_data(codice_fiscale, exam_key, dessottoanalisi)
    except AnalyticsServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"Unexpected error generating chart: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ================================
# ROUTER COLLECTION FUNCTION
# ================================

def get_all_routers():
    """Get all routers for main application"""
    return [main_router, analytics_router]