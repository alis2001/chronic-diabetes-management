# services/scheduler-service/app/routers.py
"""
Scheduler Service API Routes
RESTful endpoints for appointment scheduling with density visualization
"""

from fastapi import APIRouter, Depends, Query, HTTPException, Path
from fastapi.responses import JSONResponse
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from .database import get_database
from .services import (
    SchedulerService, AppointmentSchedulingService, 
    DoctorDensityService, ExamSelectionService,
    TimelineIntegrationService
)
from .models import (
    ScheduleAppointmentRequest, ScheduleAppointmentResponse,
    GetDoctorDensityRequest, DoctorDensityResponse,
    GetExamsForSchedulingRequest, GetExamsResponse,
    HealthResponse
)
from .exceptions import map_to_http_exception, SchedulerServiceException
from .config import settings

logger = logging.getLogger(__name__)

# ================================
# DEPENDENCY INJECTION
# ================================

async def get_scheduler_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> SchedulerService:
    """Get main scheduler service instance"""
    return SchedulerService(db)

async def get_appointment_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AppointmentSchedulingService:
    """Get appointment scheduling service instance"""
    return AppointmentSchedulingService(db)

async def get_density_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> DoctorDensityService:
    """Get doctor density service instance"""
    return DoctorDensityService(db)

async def get_exam_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ExamSelectionService:
    """Get exam selection service instance"""
    return ExamSelectionService(db)

async def get_timeline_integration() -> TimelineIntegrationService:
    """Get timeline integration service instance"""
    return TimelineIntegrationService()

# ================================
# MAIN ROUTER
# ================================

main_router = APIRouter()

@main_router.get("/")
async def read_root():
    """Root endpoint with service information"""
    return {
        "service": "Scheduler Service ASL",
        "version": settings.SERVICE_VERSION,
        "status": "operativo",
        "description": "Servizio programmazione appuntamenti con visualizzazione densità",
        "features": [
            "Date-based appointment scheduling",
            "Doctor density visualization with color gradients", 
            "Admin-configured exam integration",
            "Duplicate appointment prevention",
            "Timeline service integration"
        ],
        "endpoints": {
            "validate_scheduling": "POST /validate-scheduling",
            "get_scheduling_data": "GET /scheduling-data/{cf_paziente}",
            "schedule_appointment": "POST /schedule",
            "doctor_density": "GET /doctor-density/{id_medico}",
            "available_exams": "GET /exams/{cronoscita_id}",
            "health_check": "GET /health"
        }
    }

@main_router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Comprehensive health check"""
    try:
        # Test database connection
        await db.command("ping")
        database_connected = True
        
        # Test timeline integration
        timeline_integration = TimelineIntegrationService()
        integration_status = {
            "timeline_service": "available",  # Would test actual connection in production
            "database": "connected"
        }
        
        return HealthResponse(
            service="scheduler-service",
            status="healthy",
            timestamp=datetime.now(),
            database_connected=database_connected
        )
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return HealthResponse(
            service="scheduler-service",
            status="unhealthy",
            timestamp=datetime.now(),
            database_connected=False
        )

# ================================
# SCHEDULING VALIDATION ENDPOINTS
# ================================

validation_router = APIRouter(prefix="/validation", tags=["Scheduling Validation"])

@validation_router.post("/check-scheduling-permission")
async def check_scheduling_permission(
    cf_paziente: str = Query(..., description="Codice fiscale paziente"),
    cronoscita_id: str = Query(..., description="ID Cronoscita"),
    appointment_service: AppointmentSchedulingService = Depends(get_appointment_service)
):
    """
    CRITICAL ENDPOINT: Check if patient can schedule appointment
    Called BEFORE opening scheduler UI - prevents interface if not allowed
    
    Returns:
    - can_schedule: bool
    - error details if duplicate appointment exists
    - patient and cronoscita information
    """
    try:
        result = await appointment_service.validate_scheduling_permission(
            cf_paziente, cronoscita_id
        )
        
        status_code = 200 if result["can_schedule"] else 409
        
        return JSONResponse(
            content=result,
            status_code=status_code
        )
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error in scheduling permission check: {e}")
        raise HTTPException(status_code=500, detail=f"Errore sistema: {str(e)}")

# ================================
# COMPLETE SCHEDULING DATA ENDPOINT
# ================================

@main_router.get("/scheduling-data/{cf_paziente}")
async def get_complete_scheduling_data(
    cf_paziente: str = Path(..., description="Codice fiscale paziente"),
    cronoscita_id: str = Query(..., description="ID Cronoscita"),
    id_medico: str = Query(..., description="ID Medico"),
    days_ahead: int = Query(default=30, ge=7, le=90, description="Giorni da visualizzare"),
    scheduler_service: SchedulerService = Depends(get_scheduler_service)
):
    """
    Get complete data needed for scheduler interface
    
    Returns:
    - Scheduling permission validation
    - Available exams for selection
    - Doctor density visualization with colors
    - Recommended dates
    
    This is the MAIN endpoint called when opening scheduler
    """
    try:
        start_date = date.today()
        end_date = start_date + timedelta(days=days_ahead)
        
        result = await scheduler_service.get_scheduling_data(
            cf_paziente=cf_paziente,
            cronoscita_id=cronoscita_id,
            id_medico=id_medico,
            start_date=start_date,
            end_date=end_date
        )
        
        if not result["can_schedule"]:
            return JSONResponse(
                content=result,
                status_code=409  # Conflict - duplicate appointment exists
            )
        
        return result
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error getting scheduling data: {e}")
        raise HTTPException(status_code=500, detail=f"Errore sistema: {str(e)}")

# ================================
# APPOINTMENT SCHEDULING ENDPOINTS
# ================================

appointment_router = APIRouter(prefix="/appointments", tags=["Appointment Scheduling"])

@appointment_router.post("/schedule", response_model=ScheduleAppointmentResponse)
async def schedule_appointment(
    request: ScheduleAppointmentRequest,
    created_by_doctor: str = Query(..., description="ID medico che crea l'appuntamento"),
    appointment_service: AppointmentSchedulingService = Depends(get_appointment_service),
    timeline_integration: TimelineIntegrationService = Depends(get_timeline_integration)
):
    """
    Schedule new appointment with full validation
    
    Validates:
    - No duplicate future appointments for same CF + Cronoscita
    - Valid patient, doctor, and cronoscita
    - Selected exams exist and are active
    - Appointment date is not in past
    """
    try:
        # Create appointment
        response = await appointment_service.schedule_appointment(
            request, created_by_doctor
        )
        
        # Notify timeline service (non-blocking)
        try:
            await timeline_integration.notify_appointment_scheduled({
                "appointment_id": response.appointment_id,
                "cf_paziente": request.cf_paziente,
                "id_medico": request.id_medico,
                "appointment_date": request.appointment_date.isoformat(),
                "exam_count": response.selected_exams_count
            })
        except Exception as e:
            logger.warning(f"⚠️ Timeline notification failed: {e}")
            # Continue - don't fail appointment creation due to notification failure
        
        logger.info(f"✅ Appointment scheduled successfully: {response.appointment_id}")
        return response
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error scheduling appointment: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante programmazione: {str(e)}")

# ================================
# DOCTOR DENSITY VISUALIZATION ENDPOINTS
# ================================

# ADD THIS TO services/scheduler-service/app/routers.py
# Replace the truncated @density_ro line with this complete implementation:

density_router = APIRouter(prefix="/density", tags=["Doctor Density Visualization"])

@density_router.get("/doctor/{id_medico}", response_model=DoctorDensityResponse)
async def get_doctor_density_visualization(
    id_medico: str = Path(..., description="ID Medico"),
    start_date: date = Query(default=None, description="Data inizio (default: oggi)"),
    end_date: date = Query(default=None, description="Data fine (default: +30 giorni)"),
    density_service: DoctorDensityService = Depends(get_density_service)
):
    """
    Get doctor appointment density with visual color gradients
    
    Returns dates with:
    - Green: Very low density (0-1 appointments)
    - Yellow: Low density (2-3 appointments)  
    - Orange: Medium density (4-6 appointments)
    - Red: High density (7+ appointments)
    
    Used for visual calendar in scheduler UI
    """
    try:
        # Set default date range if not provided
        if start_date is None:
            start_date = date.today()
        if end_date is None:
            end_date = start_date + timedelta(days=30)
        
        request = GetDoctorDensityRequest(
            id_medico=id_medico,
            start_date=start_date,
            end_date=end_date
        )
        
        result = await density_service.get_doctor_density(request)
        
        logger.info(f"📊 Generated density visualization for Dr. {id_medico}: {result.total_future_appointments} appointments")
        return result
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error getting doctor density: {e}")
        raise HTTPException(status_code=500, detail=f"Errore densità medico: {str(e)}")

@density_router.get("/doctor/{id_medico}/quick")
async def get_quick_density_overview(
    id_medico: str = Path(..., description="ID Medico"),
    days_ahead: int = Query(default=14, ge=7, le=90, description="Giorni da analizzare"),
    density_service: DoctorDensityService = Depends(get_density_service)
):
    """
    Get simplified density overview for quick UI display
    Returns summary statistics and next 7 days only
    """
    try:
        start_date = date.today()
        end_date = start_date + timedelta(days=days_ahead)
        
        request = GetDoctorDensityRequest(
            id_medico=id_medico,
            start_date=start_date,
            end_date=end_date
        )
        
        full_result = await density_service.get_doctor_density(request)
        
        # Return simplified response
        return {
            "success": True,
            "id_medico": id_medico,
            "doctor_name": full_result.doctor_name,
            "period_days": days_ahead,
            "total_appointments": full_result.total_future_appointments,
            "average_per_day": full_result.average_per_day,
            "busiest_date": full_result.busiest_date,
            "busiest_count": getattr(full_result, 'busiest_count', 0),
            "recommended_dates": getattr(full_result, 'recommended_dates', [])[:5],
            "density_summary": [
                {
                    "date": dd.date,
                    "count": dd.appointment_count,
                    "level": dd.density_level,
                    "color": dd.background_color
                }
                for dd in full_result.dates[:7]  # Next 7 days only
            ]
        }
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error getting quick density: {e}")
        raise HTTPException(status_code=500, detail=f"Errore overview densità: {str(e)}")

# ================================
# EXAM SELECTION ENDPOINTS
# ================================

exam_router = APIRouter(prefix="/exams", tags=["Exam Selection"])

@exam_router.get("/{cronoscita_id}", response_model=GetExamsResponse)
async def get_available_exams_for_scheduling(
    cronoscita_id: str = Path(..., description="ID Cronoscita"),
    exam_service: ExamSelectionService = Depends(get_exam_service)
):
    """
    Get exams available for scheduling from admin configuration
    
    Only returns exams where:
    - visualizza_nel_referto = "S" (show in timeline)
    - is_active = true (active mapping)
    - cronoscita_id matches
    
    Used to populate exam selection UI
    """
    try:
        request = GetExamsForSchedulingRequest(cronoscita_id=cronoscita_id)
        
        result = await exam_service.get_available_exams(request)
        
        logger.info(f"📋 Found {result.total_exams} available exams for Cronoscita {cronoscita_id}")
        return result
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error getting available exams: {e}")
        raise HTTPException(status_code=500, detail=f"Errore recupero esami: {str(e)}")

@exam_router.get("/{cronoscita_id}/summary")
async def get_exam_selection_summary(
    cronoscita_id: str = Path(..., description="ID Cronoscita"),
    exam_service: ExamSelectionService = Depends(get_exam_service)
):
    """
    Get simplified exam summary for UI
    Returns counts and basic info without full exam details
    """
    try:
        request = GetExamsForSchedulingRequest(cronoscita_id=cronoscita_id)
        result = await exam_service.get_available_exams(request)
        
        # Group exams by structure for summary
        structures = {}
        for exam in result.available_exams:
            if exam.struttura_nome not in structures:
                structures[exam.struttura_nome] = 0
            structures[exam.struttura_nome] += 1
        
        return {
            "success": True,
            "cronoscita_id": cronoscita_id,
            "cronoscita_name": result.cronoscita_name,
            "total_available_exams": result.total_exams,
            "structures_involved": len(structures),
            "exam_by_structure": structures,
            "has_exams_available": result.total_exams > 0
        }
        
    except SchedulerServiceException as e:
        raise map_to_http_exception(e)
    except Exception as e:
        logger.error(f"❌ Error getting exam summary: {e}")
        raise HTTPException(status_code=500, detail=f"Errore sommario esami: {str(e)}")

# ================================
# INTEGRATION ENDPOINTS
# ================================

integration_router = APIRouter(prefix="/integration", tags=["Service Integration"])

@integration_router.get("/timeline-status")
async def check_timeline_integration_status(
    timeline_integration: TimelineIntegrationService = Depends(get_timeline_integration)
):
    """Check status of timeline service integration"""
    try:
        # Test connection to timeline service
        is_available = await timeline_integration.notify_appointment_scheduled({
            "test": True,
            "appointment_id": "health_check"
        })
        
        return {
            "timeline_service_available": is_available,
            "integration_status": "healthy" if is_available else "degraded",
            "message": "Timeline integration operativo" if is_available else "Timeline service non raggiungibile"
        }
        
    except Exception as e:
        logger.error(f"❌ Timeline integration check failed: {e}")
        return {
            "timeline_service_available": False,
            "integration_status": "failed",
            "message": f"Errore integrazione: {str(e)}"
        }