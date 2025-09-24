# services/timeline-service/app/routers.py
from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from .web_routes import session_router
from typing import List, Optional, Dict, Any
import logging

from .database import get_database
from .repositories import PatientRepository, AppointmentRepository, RefertoRepository
from .services import (
    PatientService, AppointmentService, TimelineService,
    WirgilioService, SchedulerClientService,
    MelodyIntegrationService, DoctorService, RefertoService
)
from .models import (
    PatientLookupRequest, PatientLookupResponse,
    PatientRegistrationRequest, PatientRegistrationResponse,
    PatientRegistrationWithContactsRequest,
    DoctorAppointmentDecision, AppointmentSchedulingResponse,
    AppointmentCompletionRequest, TimelineResponse, HealthResponse,
    RefertoSaveRequest, RefertoSaveResponse
)
from .exceptions import map_to_http_exception, TimelineServiceException
from .config import settings

logger = logging.getLogger(__name__)

# ================================
# DEPENDENCY INJECTION
# ================================

async def get_patient_repository(db: AsyncIOMotorDatabase = Depends(get_database)) -> PatientRepository:
    """Ottieni istanza repository paziente"""
    return PatientRepository(db)

async def get_appointment_repository(db: AsyncIOMotorDatabase = Depends(get_database)) -> AppointmentRepository:
    """Ottieni istanza repository appuntamento"""
    return AppointmentRepository(db)

async def get_wirgilio_service() -> WirgilioService:
    """Ottieni istanza servizio Wirgilio"""
    return WirgilioService()

async def get_scheduler_client() -> SchedulerClientService:
    """Ottieni istanza client servizio scheduler"""
    return SchedulerClientService()

async def get_patient_service(
    patient_repo: PatientRepository = Depends(get_patient_repository),
    wirgilio_service: WirgilioService = Depends(get_wirgilio_service)
) -> PatientService:
    """Ottieni istanza servizio paziente"""
    return PatientService(patient_repo, wirgilio_service)

async def get_appointment_service(
    appointment_repo: AppointmentRepository = Depends(get_appointment_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    scheduler_client: SchedulerClientService = Depends(get_scheduler_client)
) -> AppointmentService:
    """Ottieni istanza servizio appuntamento"""
    return AppointmentService(appointment_repo, patient_repo, scheduler_client)

async def get_timeline_service(
    appointment_repo: AppointmentRepository = Depends(get_appointment_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository)
) -> TimelineService:
    """Ottieni istanza servizio timeline"""
    return TimelineService(appointment_repo, patient_repo)

async def get_melody_integration_service() -> MelodyIntegrationService:
    """Ottieni istanza servizio integrazione Melody"""
    return MelodyIntegrationService()

async def get_referto_repository(db: AsyncIOMotorDatabase = Depends(get_database)) -> RefertoRepository:
    """Ottieni istanza repository referto"""
    return RefertoRepository(db)

async def get_referto_service(
    referto_repo: RefertoRepository = Depends(get_referto_repository),
    patient_repo: PatientRepository = Depends(get_patient_repository),
    appointment_repo: AppointmentRepository = Depends(get_appointment_repository)
) -> RefertoService:
    """Ottieni istanza servizio referto"""
    return RefertoService(referto_repo, patient_repo, appointment_repo)

# ================================
# ROUTER PRINCIPALE
# ================================

main_router = APIRouter()

@main_router.get("/")
async def read_root():
    """Endpoint root con informazioni servizio"""
    return {
        "service": "Servizio Timeline ASL",
        "version": settings.SERVICE_VERSION,
        "status": "operativo",
        "workflow": "medico-driven",
        "sistema": "italiano",
        "endpoints": {
            "ricerca_paziente": "POST /patients/lookup",
            "registrazione_paziente": "POST /patients/register",
            "registrazione_con_contatti": "POST /patients/register-with-contacts",
            "timeline": "GET /timeline/{cf_paziente}",
            "programma_appuntamento": "POST /appointments/schedule",
            "completa_appuntamento": "POST /appointments/complete",
            "tipi_disponibili": "GET /appointments/available-types/{cf_paziente}"
        }
    }

@main_router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Controllo stato completo sistema"""
    database_status = "healthy"
    try:
        await db.command("ping")
    except Exception as e:
        database_status = f"errore: {str(e)}"
        logger.error(f"Controllo stato database fallito: {e}")
    
    return HealthResponse(
        service="timeline-service",
        status="healthy",
        timestamp=datetime.now(),
        database_status=database_status,
        port=settings.SERVICE_PORT
    )

# ================================
# ROUTES GESTIONE PAZIENTI
# ================================

patient_router = APIRouter(prefix="/patients", tags=["Gestione Pazienti"])

@patient_router.post("/lookup", response_model=PatientLookupResponse)
async def lookup_patient(
    request: PatientLookupRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Fase 1: Medico cerca paziente per codice fiscale in Cronoscita specifica
    
    - Controlla se paziente esiste in Cronoscita selezionata
    - Se non presente in questa Cronoscita, verifica altre registrazioni
    - Se trovato altrove, abilita riutilizzo demografici
    - Se completamente nuovo, cerca demografici in Wirgilio
    - Restituisce informazioni paziente e stato registrazione per Cronoscita
    """
    try:
        return await patient_service.lookup_patient(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@patient_router.post("/register", response_model=PatientRegistrationResponse)
async def register_patient(
    request: PatientRegistrationRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Fase 2: Medico registra paziente per gestione timeline
    
    - Valida credenziali medico
    - Controlla paziente non esista già
    - Ottiene demografici da Wirgilio
    - Crea record paziente nel sistema
    """
    try:
        return await patient_service.register_patient(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@patient_router.post("/register-with-contacts", response_model=PatientRegistrationResponse)
async def register_patient_with_contacts(
    request: PatientRegistrationWithContactsRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Fase 2 Alternativa: Registrazione paziente con contatti modificabili
    
    - Valida credenziali medico
    - Ottiene demografici da Wirgilio
    - Permette al medico di inserire/modificare telefono e email
    - Crea record paziente con contatti aggiornati
    """
    try:
        return await patient_service.register_patient_with_contacts(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@patient_router.get("/enrollments/{cf_paziente}")
async def get_patient_enrollments(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Ottieni tutte le registrazioni Cronoscita di un paziente
    
    - Mostra tutte le Cronoscita in cui il paziente è registrato
    - Utile per switching tra Cronoscita nel frontend
    - Autorizzazione medico richiesta
    """
    try:
        # Validate doctor
        from ..services import DoctorService
        if not DoctorService.validate_doctor(id_medico):
            raise HTTPException(status_code=401, detail="Credenziali medico non valide")
        
        # Get patient repository
        from ..database import get_database
        from ..repositories import PatientRepository
        
        db = await get_database()
        patient_repo = PatientRepository(db)
        
        # Get all enrollments
        enrollments = await patient_repo.get_all_enrollments_by_cf(cf_paziente)
        
        if not enrollments:
            raise HTTPException(status_code=404, detail=f"Nessuna registrazione trovata per {cf_paziente}")
        
        # Format response
        formatted_enrollments = []
        for enrollment in enrollments:
            formatted_enrollments.append({
                "cronoscita_id": enrollment.get("cronoscita_id"),
                "patologia": enrollment.get("patologia"),
                "id_medico": enrollment.get("id_medico"),
                "enrollment_date": enrollment.get("enrollment_date").strftime("%d/%m/%Y") if enrollment.get("enrollment_date") else "",
                "status": enrollment.get("status", "active")
            })
        
        return {
            "success": True,
            "cf_paziente": cf_paziente,
            "total_enrollments": len(formatted_enrollments),
            "enrollments": formatted_enrollments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient enrollments: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno del server")
    
# ================================
# ROUTES GESTIONE TIMELINE
# ================================

timeline_router = APIRouter(prefix="/timeline", tags=["Gestione Timeline"])

@timeline_router.get("/{cf_paziente}", response_model=TimelineResponse)
async def get_patient_timeline(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    patologia: str = Query(None, description="Cronoscita specifica (opzionale per compatibilità)"),
    timeline_service: TimelineService = Depends(get_timeline_service)
):
    """
    Fase 3: Medico visualizza timeline completa paziente per Cronoscita specifica
    
    - Mostra appuntamenti passati, presenti e futuri per Cronoscita selezionata
    - Integra con servizio scheduler per programmazione
    - Autorizzazione medico richiesta
    - Se patologia non specificata, usa prima registrazione trovata (compatibilità)
    """
    try:
        return await timeline_service.get_patient_timeline(cf_paziente, id_medico, patologia)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

# ================================
# ROUTES GESTIONE APPUNTAMENTI
# ================================

appointment_router = APIRouter(prefix="/appointments", tags=["Gestione Appuntamenti"])
referto_router = APIRouter(prefix="/referti", tags=["Gestione Referti"])

@appointment_router.post("/external-notification")
async def handle_external_appointment_notification(
    notification_data: Dict[str, Any],
    appointment_repo: AppointmentRepository = Depends(get_appointment_repository)
):
    """
    Handle external appointment notifications from Scheduler Service
    Called when Scheduler Service creates a new appointment
    """
    try:
        event_type = notification_data.get("event_type")
        appointment_data = notification_data.get("appointment_data", {})
        source = notification_data.get("source", "unknown")
        
        logger.info(f"📨 Received external notification: {event_type} from {source}")
        
        if event_type == "appointment_scheduled":
            # Log the appointment creation for timeline refresh
            appointment_id = appointment_data.get("appointment_id")
            cf_paziente = appointment_data.get("cf_paziente")
            
            logger.info(f"✅ Appointment {appointment_id} scheduled for patient {cf_paziente}")
            
            # Timeline will automatically pick up this appointment from database
            # No additional processing needed - just acknowledge receipt
            
            return {
                "success": True,
                "message": "Notification received successfully",
                "event_type": event_type,
                "appointment_id": appointment_id
            }
        
        else:
            logger.warning(f"⚠️ Unknown event type: {event_type}")
            return {
                "success": False,
                "message": f"Unknown event type: {event_type}"
            }
            
    except Exception as e:
        logger.error(f"❌ Error processing external notification: {e}")
        return {
            "success": False,
            "message": f"Error processing notification: {str(e)}"
        }
    
@appointment_router.post("/schedule", response_model=AppointmentSchedulingResponse)
async def schedule_appointment(
    decision: DoctorAppointmentDecision,
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """
    Fase 4: Medico programma prossimo appuntamento
    
    - Valida credenziali medico e esistenza paziente
    - Controlla tipo appuntamento valido per patologia
    - Ottiene slot disponibili dal servizio scheduler
    - Crea record appuntamento
    """
    try:
        return await appointment_service.schedule_appointment(decision)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@appointment_router.post("/complete")
async def complete_appointment(
    completion: AppointmentCompletionRequest,
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """
    Fase 5: Medico completa appuntamento
    
    - Segna appuntamento come completato con note
    - Opzionalmente programma prossimo appuntamento se medico decide
    - Restituisce stato completamento e info prossimo appuntamento
    """
    try:
        return await appointment_service.complete_appointment(completion)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@appointment_router.get("/available-types/{cf_paziente}")
async def get_available_appointment_types(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """
    Helper: Ottieni tipi appuntamento disponibili per patologia paziente
    
    - Restituisce tipi appuntamento validi per condizione paziente
    - Include descrizioni per ogni tipo
    - Usato da frontend per mostrare opzioni al medico
    """
    try:
        return await appointment_service.get_available_appointment_types(cf_paziente, id_medico)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@referto_router.post("/save", response_model=RefertoSaveResponse)
async def save_referto(
    request: RefertoSaveRequest,
    referto_service: RefertoService = Depends(get_referto_service)
):
    """
    Salva referto medico
    
    - Valida medico e paziente
    - Controlla lunghezza minima testo (10 caratteri)
    - Salva referto come 'completato'
    - Abilita programmazione prossimo appuntamento
    """
    try:
        return await referto_service.save_referto(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@referto_router.get("/patient/{cf_paziente}")
async def get_patient_referti(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    referto_service: RefertoService = Depends(get_referto_service)
):
    """
    Ottieni tutti i referti di un paziente
    
    - Lista referti ordinati per data (più recenti prima)
    - Solo medici autorizzati possono accedere
    """
    try:
        referti = await referto_service.get_patient_referti(cf_paziente, id_medico)
        return {
            "success": True,
            "cf_paziente": cf_paziente,
            "referti": referti,
            "total_count": len(referti)
        }
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@referto_router.get("/can-schedule/{cf_paziente}")
async def check_can_schedule_next(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    referto_service: RefertoService = Depends(get_referto_service)
):
    """
    Controlla se medico può programmare prossimo appuntamento
    
    - Restituisce true se referto è stato salvato per oggi
    - Utilizzato dal frontend per abilitare/disabilitare bottone 'Successivo'
    """
    try:
        can_schedule = await referto_service.check_can_schedule_next_appointment(cf_paziente, id_medico)
        return {
            "success": True,
            "can_schedule_next": can_schedule,
            "message": "Referto completato, prossimo appuntamento disponibile" if can_schedule else "Completare referto prima di programmare prossimo appuntamento"
        }
    except TimelineServiceException as e:
        raise map_to_http_exception(e)
# ================================
# ROUTES COMPATIBILITÀ LEGACY
# ================================

legacy_router = APIRouter(tags=["Compatibilità Legacy"])

# Mantieni nomi endpoint vecchi per compatibilità all'indietro
@legacy_router.post("/lookup-patient", response_model=PatientLookupResponse)
async def lookup_patient_legacy(
    request: PatientLookupRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """Endpoint legacy - usa /patients/lookup invece"""
    try:
        return await patient_service.lookup_patient(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@legacy_router.post("/register-patient", response_model=PatientRegistrationResponse) 
async def register_patient_legacy(
    request: PatientRegistrationRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """Endpoint legacy - usa /patients/register invece"""
    try:
        return await patient_service.register_patient(request)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@legacy_router.post("/schedule-appointment", response_model=AppointmentSchedulingResponse)
async def schedule_appointment_legacy(
    decision: DoctorAppointmentDecision,
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """Endpoint legacy - usa /appointments/schedule invece"""
    try:
        return await appointment_service.schedule_appointment(decision)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@legacy_router.post("/complete-appointment")
async def complete_appointment_legacy(
    completion: AppointmentCompletionRequest,
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """Endpoint legacy - usa /appointments/complete invece"""
    try:
        return await appointment_service.complete_appointment(completion)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

@legacy_router.get("/available-appointment-types/{cf_paziente}")
async def get_available_appointment_types_legacy(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    appointment_service: AppointmentService = Depends(get_appointment_service)
):
    """Endpoint legacy - usa /appointments/available-types/{cf_paziente} invece"""
    try:
        return await appointment_service.get_available_appointment_types(cf_paziente, id_medico)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)


# ================================
# MELODY INTEGRATION ENDPOINTS
# ================================

@main_router.get("/melody/health")
async def check_melody_service_health(
    melody_service: MelodyIntegrationService = Depends(get_melody_integration_service)
):
    """Check if Melody service is available"""
    try:
        is_healthy = await melody_service.check_melody_health()
        return {
            "melody_available": is_healthy,
            "status": "healthy" if is_healthy else "unreachable",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Melody health check error: {e}")
        return {
            "melody_available": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@main_router.post("/melody/create-voice-workflow")
async def create_voice_workflow_url(
    request: Dict[str, str],
    melody_service: MelodyIntegrationService = Depends(get_melody_integration_service)
):
    """Create voice workflow URL for Melody integration"""
    try:
        doctor_id = request.get("doctor_id")
        patient_cf = request.get("patient_cf") 
        return_url = request.get("return_url")
        
        if not all([doctor_id, patient_cf, return_url]):
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Validate doctor exists
        if not DoctorService.validate_doctor(doctor_id):
            raise HTTPException(status_code=400, detail="Invalid doctor ID")
        
        # Check if Melody service is available
        melody_healthy = await melody_service.check_melody_health()
        if not melody_healthy:
            raise HTTPException(status_code=503, detail="Melody service unavailable")
        
        # Create workflow URL
        workflow_url = melody_service.create_voice_workflow_url(doctor_id, patient_cf, return_url)
        
        return {
            "success": True,
            "workflow_url": workflow_url,
            "melody_status": "available",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating voice workflow URL: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@referto_router.get("/today/{cf_paziente}")
async def get_todays_referto(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    referto_service: RefertoService = Depends(get_referto_service)
):
    """
    Ottieni referto di oggi per paziente e medico
    
    - Restituisce referto esistente se già salvato oggi
    - Usato dal frontend per mostrare referto salvato e disabilitare editing
    """
    try:
        referto = await referto_service.get_todays_referto(cf_paziente, id_medico)
        return {
            "success": True,
            "cf_paziente": cf_paziente,
            "has_referto_today": referto is not None,
            "referto": referto
        }
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

# ================================
# RACCOLTA TUTTI I ROUTER
# ================================

def get_all_routers():
    """
    Return all routers including session management and referto routes
    """
    routers = [
        main_router,
        patient_router,
        appointment_router,
        timeline_router,
        referto_router,       
        session_router,       
        legacy_router
    ]
    
    return routers