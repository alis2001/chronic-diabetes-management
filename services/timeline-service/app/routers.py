# services/timeline-service/app/routers.py
"""
Timeline Service Routers - Versione Italiana
Organizzazione pulita dei route con separazione corretta delle responsabilità
Aggiornato: Endpoint registrazione con contatti modificabili, messaggi in italiano
"""

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from .web_routes import session_router

import logging

from .database import get_database
from .repositories import PatientRepository, AppointmentRepository
from .services import (
    PatientService, AppointmentService, TimelineService,
    WirgilioService, SchedulerClientService
)
from .models import (
    PatientLookupRequest, PatientLookupResponse,
    PatientRegistrationRequest, PatientRegistrationResponse,
    PatientRegistrationWithContactsRequest,
    DoctorAppointmentDecision, AppointmentSchedulingResponse,
    AppointmentCompletionRequest, TimelineResponse, HealthResponse
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
    Fase 1: Medico cerca paziente per codice fiscale
    
    - Controlla se paziente esiste nel sistema
    - Se non presente, cerca demografici in Wirgilio
    - Restituisce informazioni paziente e stato registrazione
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

# ================================
# ROUTES GESTIONE TIMELINE
# ================================

timeline_router = APIRouter(prefix="/timeline", tags=["Gestione Timeline"])

@timeline_router.get("/{cf_paziente}", response_model=TimelineResponse)
async def get_patient_timeline(
    cf_paziente: str,
    id_medico: str = Query(..., description="ID Medico per autorizzazione"),
    timeline_service: TimelineService = Depends(get_timeline_service)
):
    """
    Fase 3: Medico visualizza timeline completa paziente
    
    - Mostra appuntamenti passati, presenti e futuri
    - Categorizza per data (precedenti, oggi, successivo)
    - Include dettagli appuntamento e stato
    """
    try:
        return await timeline_service.get_patient_timeline(cf_paziente, id_medico)
    except TimelineServiceException as e:
        raise map_to_http_exception(e)

# ================================
# ROUTES GESTIONE APPUNTAMENTI
# ================================

appointment_router = APIRouter(prefix="/appointments", tags=["Gestione Appuntamenti"])

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
# RACCOLTA TUTTI I ROUTER
# ================================

def get_all_routers():
    """
    Return all routers including session management routes
    """
    routers = [
        main_router,
        patient_router,
        appointment_router,
        timeline_router,
        session_router  # ADD THIS LINE - Session management routes for React frontend
    ]
    
    return routers