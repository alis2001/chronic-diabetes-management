# services/scheduler-service/app/services.py
"""
Scheduler Service Business Logic
Complete appointment scheduling with density visualization and exam integration
"""

from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
import httpx
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from .database import (
    AppointmentDensityCalculator, ExamRepository, 
    AppointmentRepository, SchedulerValidationService
)
from .models import (
    ScheduleAppointmentRequest, ScheduleAppointmentResponse,
    GetDoctorDensityRequest, DoctorDensityResponse, 
    GetExamsForSchedulingRequest, GetExamsResponse,
    AppointmentDocument, DateDensity, ExamForScheduling
)
from .exceptions import (
    DuplicateAppointmentException, PatientNotFoundException,
    CronoscitaNotFoundException, DoctorNotFoundException,
    NoExamsAvailableException, InvalidExamSelectionException,
    PastDateException, DatabaseOperationException,
    validate_codice_fiscale, validate_object_id
)
from .config import settings

logger = logging.getLogger(__name__)

# ================================
# CORE SCHEDULING SERVICE
# ================================

class AppointmentSchedulingService:
    """Main service for appointment scheduling operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointment_repo = AppointmentRepository(db)
        self.validation_service = SchedulerValidationService(db)
        self.exam_repo = ExamRepository(db)
        self.density_calculator = AppointmentDensityCalculator(db)
    
    async def validate_scheduling_permission(
        self, 
        cf_paziente: str, 
        cronoscita_id: str
    ) -> Dict[str, Any]:
        """
        FIRST STEP: Validate if patient can schedule appointment
        Called when opening scheduler interface - prevents UI if not allowed
        """
        try:
            # Normalize CF
            cf_clean = validate_codice_fiscale(cf_paziente)
            
            # Validate ObjectId format
            validate_object_id(cronoscita_id, "Cronoscita ID")
            
            # Perform comprehensive validation
            result = await self.validation_service.validate_can_schedule(
                cf_clean, cronoscita_id
            )
            
            logger.info(f"📋 Scheduling validation for {cf_clean}: {result['can_schedule']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error validating scheduling permission: {e}")
            return {
                "can_schedule": False,
                "error_type": "VALIDATION_ERROR",
                "message": f"Errore durante validazione: {str(e)}",
                "existing_appointment": None
            }
    
    async def schedule_appointment(
        self, 
        request: ScheduleAppointmentRequest,
        created_by_doctor: str
    ) -> ScheduleAppointmentResponse:
        """
        MAIN SCHEDULING: Create new appointment with full validation
        """
        try:
            # Validate basic data
            cf_clean = validate_codice_fiscale(request.cf_paziente)
            validate_object_id(request.cronoscita_id, "Cronoscita ID")
            
            # Validate appointment date is not in past
            today = date.today()
            if request.appointment_date < today:
                raise PastDateException(request.appointment_date.strftime('%d/%m/%Y'))
            
            # CRITICAL: Double-check no duplicate appointment exists
            validation_result = await self.validation_service.validate_can_schedule(
                cf_clean, request.cronoscita_id
            )
            
            if not validation_result["can_schedule"]:
                if validation_result["error_type"] == "DUPLICATE_FUTURE_APPOINTMENT":
                    existing = validation_result["existing_appointment"]
                    raise DuplicateAppointmentException(
                        cf_clean,
                        existing["cronoscita_name"],
                        existing["appointment_date"],
                        existing["appointment_id"]
                    )
                else:
                    raise Exception(validation_result["message"])
            
            # Validate selected exams exist and belong to this Cronoscita
            exam_details = []
            if request.selected_exam_mappings:
                exam_details = await self._validate_and_get_exam_details(
                    request.selected_exam_mappings,
                    request.cronoscita_id
                )
            
            # Create appointment document
            appointment_doc = AppointmentDocument(
                cf_paziente=cf_clean,
                id_medico=request.id_medico,
                cronoscita_id=request.cronoscita_id,
                appointment_date=request.appointment_date,
                required_exam_mappings=request.selected_exam_mappings,
                exam_details=[exam.dict() for exam in exam_details],
                notes=request.notes,
                created_by=created_by_doctor
            )
            
            # Save to database
            appointment_id = await self.appointment_repo.create_appointment(appointment_doc)
            
            logger.info(f"✅ Appointment scheduled: {appointment_id} for {cf_clean} on {request.appointment_date}")
            
            return ScheduleAppointmentResponse(
                success=True,
                message=f"Appuntamento programmato con successo per {request.appointment_date.strftime('%d/%m/%Y')}",
                appointment_id=appointment_id,
                appointment_date=request.appointment_date,
                selected_exams_count=len(exam_details),
                exam_details=exam_details
            )
            
        except (DuplicateAppointmentException, PastDateException, 
                PatientNotFoundException, CronoscitaNotFoundException) as e:
            # Re-raise known exceptions
            raise e
        except Exception as e:
            logger.error(f"❌ Error scheduling appointment: {e}")
            raise DatabaseOperationException("scheduling appointment", str(e))
    
    async def _validate_and_get_exam_details(
        self, 
        exam_mapping_ids: List[str], 
        cronoscita_id: str
    ) -> List[ExamForScheduling]:
        """Validate selected exam mappings and return details"""
        
        # Get all available exams for this Cronoscita
        available_exams = await self.exam_repo.get_available_exams_for_scheduling(cronoscita_id)
        available_mapping_ids = [exam.mapping_id for exam in available_exams]
        
        # Check if all selected mappings are valid
        invalid_mappings = [
            mapping_id for mapping_id in exam_mapping_ids 
            if mapping_id not in available_mapping_ids
        ]
        
        if invalid_mappings:
            raise InvalidExamSelectionException(invalid_mappings, cronoscita_id)
        
        # Return details for selected exams
        selected_exams = [
            exam for exam in available_exams 
            if exam.mapping_id in exam_mapping_ids
        ]
        
        return selected_exams

# ================================
# DENSITY VISUALIZATION SERVICE
# ================================

class DoctorDensityService:
    """Service for calculating and visualizing doctor appointment density"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.density_calculator = AppointmentDensityCalculator(db)
        self.doctors_collection = db.doctors if hasattr(db, 'doctors') else None
    
    async def get_doctor_density_visualization(
        self, 
        request: GetDoctorDensityRequest
    ) -> DoctorDensityResponse:
        """
        Get doctor's appointment density with visual color gradients
        Shows busy vs free dates with colors approaching red for density
        """
        try:
            # Get doctor information
            doctor_info = await self._get_doctor_info(request.id_medico)
            
            # Calculate date-by-date density
            date_densities = await self.density_calculator.calculate_doctor_density(
                request.id_medico,
                request.start_date,
                request.end_date
            )
            
            # Get statistical summary
            stats = await self.density_calculator.get_density_statistics(
                request.id_medico,
                request.start_date,
                request.end_date
            )
            
            # Find recommended dates (lowest density)
            recommended_dates = [
                dd.date for dd in date_densities 
                if dd.appointment_count <= 2  # Consider dates with 2 or fewer appointments as recommended
            ][:10]  # Top 10 recommendations
            
            return DoctorDensityResponse(
                success=True,
                id_medico=request.id_medico,
                doctor_name=doctor_info.get("nome_completo", f"Medico {request.id_medico}"),
                specialization=doctor_info.get("specializzazione", ""),
                period_start=request.start_date,
                period_end=request.end_date,
                date_densities=date_densities,
                total_future_appointments=stats.get("total_appointments", 0),
                busiest_date=stats.get("busiest_date"),
                busiest_date_count=stats.get("busiest_count", 0),
                freest_dates=stats.get("freest_dates", []),
                average_appointments_per_day=stats.get("average_per_day", 0.0),
                recommended_dates=recommended_dates
            )
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor density: {e}")
            raise DatabaseOperationException("calculating doctor density", str(e))
    
    async def _get_doctor_info(self, id_medico: str) -> Dict[str, Any]:
        """Get doctor information from database or hardcoded credentials"""
        try:
            # Try to get from database first
            if self.doctors_collection:
                doctor = await self.doctors_collection.find_one({"id_medico": id_medico})
                if doctor:
                    return doctor
            
            # Fallback to hardcoded credentials from timeline service
            from .config import settings
            
            # For now, return basic info - this should be replaced with proper doctor management
            return {
                "id_medico": id_medico,
                "nome_completo": f"Dr. {id_medico}",
                "specializzazione": "Diabetologia"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor info: {e}")
            return {
                "id_medico": id_medico,
                "nome_completo": f"Medico {id_medico}",
                "specializzazione": ""
            }

# ================================
# EXAM SELECTION SERVICE
# ================================

class ExamSelectionService:
    """Service for handling exam selection for appointments"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.exam_repo = ExamRepository(db)
    
    async def get_available_exams(
        self, 
        request: GetExamsForSchedulingRequest
    ) -> GetExamsResponse:
        """
        Get exams available for scheduling from admin configuration
        Only returns exams with visualizza_nel_referto = "S" and is_active = true
        """
        try:
            validate_object_id(request.cronoscita_id, "Cronoscita ID")
            
            # Get available exams from database
            available_exams = await self.exam_repo.get_available_exams_for_scheduling(
                request.cronoscita_id
            )
            
            # Get cronoscita name
            cronoscita_name = await self.exam_repo.get_cronoscita_name(request.cronoscita_id)
            
            if not available_exams:
                raise NoExamsAvailableException(request.cronoscita_id, cronoscita_name)
            
            logger.info(f"📋 Found {len(available_exams)} available exams for {cronoscita_name}")
            
            return GetExamsResponse(
                success=True,
                cronoscita_id=request.cronoscita_id,
                cronoscita_name=cronoscita_name,
                available_exams=available_exams,
                total_exams=len(available_exams)
            )
            
        except NoExamsAvailableException as e:
            # Re-raise known exception
            raise e
        except Exception as e:
            logger.error(f"❌ Error getting available exams: {e}")
            raise DatabaseOperationException("getting available exams", str(e))

# ================================
# INTEGRATION SERVICES
# ================================

class TimelineIntegrationService:
    """Service for integrating with Timeline Service"""
    
    def __init__(self):
        self.timeline_service_url = settings.TIMELINE_SERVICE_URL
        self.timeout = 10.0
    
    async def notify_appointment_scheduled(
        self, 
        appointment_data: Dict[str, Any]
    ) -> bool:
        """Notify timeline service of new scheduled appointment"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.timeline_service_url}/api/appointments/external-notification",
                    json={
                        "event_type": "appointment_scheduled",
                        "appointment_data": appointment_data,
                        "source": "scheduler-service"
                    }
                )
                
                if response.status_code == 200:
                    logger.info("✅ Timeline service notified of new appointment")
                    return True
                else:
                    logger.warning(f"⚠️ Timeline notification failed: {response.status_code}")
                    return False
                    
        except httpx.TimeoutException:
            logger.warning("⚠️ Timeline service notification timeout")
            return False
        except Exception as e:
            logger.error(f"❌ Error notifying timeline service: {e}")
            return False

# ================================
# MAIN SCHEDULER SERVICE
# ================================

class SchedulerService:
    """Main orchestrating service for all scheduler operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointment_service = AppointmentSchedulingService(db)
        self.density_service = DoctorDensityService(db)
        self.exam_service = ExamSelectionService(db)
        self.timeline_integration = TimelineIntegrationService()
    
    async def get_scheduling_data(
        self, 
        cf_paziente: str, 
        cronoscita_id: str,
        id_medico: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get complete data needed for scheduling interface
        Called when scheduler opens - returns validation, exams, and density
        """
        try:
            # Validate scheduling permission (most important check)
            validation_result = await self.appointment_service.validate_scheduling_permission(
                cf_paziente, cronoscita_id
            )
            
            if not validation_result["can_schedule"]:
                return {
                    "can_schedule": False,
                    "validation_result": validation_result,
                    "available_exams": [],
                    "doctor_density": None
                }
            
            # Get available exams
            exam_request = GetExamsForSchedulingRequest(cronoscita_id=cronoscita_id)
            exams_response = await self.exam_service.get_available_exams(exam_request)
            
            # Get doctor density visualization
            density_request = GetDoctorDensityRequest(
                id_medico=id_medico,
                start_date=start_date,
                end_date=end_date
            )
            density_response = await self.density_service.get_doctor_density_visualization(density_request)
            
            return {
                "can_schedule": True,
                "validation_result": validation_result,
                "available_exams": exams_response.available_exams,
                "doctor_density": density_response,
                "total_exams": exams_response.total_exams,
                "cronoscita_name": exams_response.cronoscita_name
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting scheduling data: {e}")
            return {
                "can_schedule": False,
                "validation_result": {
                    "can_schedule": False,
                    "error_type": "SYSTEM_ERROR",
                    "message": f"Errore sistema: {str(e)}",
                    "existing_appointment": None
                },
                "available_exams": [],
                "doctor_density": None
            }