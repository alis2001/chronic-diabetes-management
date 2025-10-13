# services/timeline-service/app/services.py
"""
Timeline Service Business Logic - Versione Italiana
Separazione pulita della logica di business da routing e accesso dati
Aggiornato: Connessione database Wirgilio reale, registrazione con contatti modificabili
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date
import uuid
import httpx
import logging
import motor.motor_asyncio
from bson import ObjectId

from .models import (
    PatientLookupRequest, PatientLookupResponse,
    PatientRegistrationRequest, PatientRegistrationResponse,
    PatientRegistrationWithContactsRequest,
    DoctorAppointmentDecision, AppointmentSchedulingResponse,
    AppointmentCompletionRequest, TimelineResponse, AppointmentSummary,
    Patient, Appointment, PatientDemographics, PatientStatus, AppointmentStatus
)
from .cronoscita_repository import CronoscitaRepository
from .repositories import PatientRepository, AppointmentRepository
from .config import (
    settings, HARDCODED_DOCTOR_CREDENTIALS,
    APPOINTMENT_TYPE_DESCRIPTIONS, APPOINTMENT_LOCATIONS
)
from .exceptions import (
    DoctorValidationException, PatientNotFoundException, PatientAlreadyExistsException,
    InvalidAppointmentTypeException, ExternalServiceException
)

logger = logging.getLogger(__name__)

# ================================
# MISSING HELPER FUNCTIONS - CRITICAL FIX
# ================================

def _normalize_appointment_date(appointment_datetime: Any) -> date:
    """
    Convert various date formats to Python date object
    CRITICAL FIX: This function was missing and causing categorization failure
    """
    try:
        if isinstance(appointment_datetime, date) and not isinstance(appointment_datetime, datetime):
            return appointment_datetime
        elif isinstance(appointment_datetime, datetime):
            return appointment_datetime.date()
        elif isinstance(appointment_datetime, str):
            if 'T' in appointment_datetime:
                return datetime.fromisoformat(appointment_datetime.replace('Z', '+00:00')).date()
            else:
                return datetime.strptime(appointment_datetime, '%Y-%m-%d').date()
        else:
            logger.warning(f"⚠️ Unknown date format: {appointment_datetime}")
            return date.today()
    except Exception as e:
        logger.error(f"❌ Error normalizing appointment date {appointment_datetime}: {e}")
        return date.today()

def _format_appointment_for_timeline(apt: Dict[str, Any]) -> AppointmentSummary:
    """
    Format appointment data for timeline display
    CRITICAL FIX: This function was missing and causing display issues
    """
    try:
        appointment_datetime = (
            apt.get("appointment_date") or 
            apt.get("scheduled_date") or 
            apt.get("data_appuntamento")
        )
        
        normalized_date = _normalize_appointment_date(appointment_datetime)
        formatted_date = normalized_date.strftime("%Y-%m-%d")
        
        scheduled_time = apt.get("scheduled_time", "09:00")
        appointment_type = apt.get("appointment_type", apt.get("type", "Visita"))
        status = apt.get("status", "scheduled")
        priority = apt.get("priority", "normal")
        
        return AppointmentSummary(
            appointment_id=str(apt.get("appointment_id", apt.get("_id", ""))),
            date=formatted_date,
            time=scheduled_time,
            type=appointment_type,
            status=status,
            priority=priority,
            location=apt.get("location"),
            notes=apt.get("notes", apt.get("doctor_notes"))
        )
        
    except Exception as e:
        logger.error(f"❌ Error formatting appointment for timeline: {e}")
        return AppointmentSummary(
            appointment_id="error",
            date=date.today().strftime("%d/%m/%Y"),
            time="09:00",
            type="Visita",
            status="error",
            priority="normal"
        )

class DoctorService:
    """Servizio per operazioni relative ai medici"""
    
    @staticmethod
    def validate_doctor(doctor_id: str) -> bool:
        """Valida credenziali medico"""
        return doctor_id in HARDCODED_DOCTOR_CREDENTIALS
    
    @staticmethod
    def get_doctor_info(doctor_id: str) -> Optional[Dict[str, Any]]:
        """Ottieni informazioni medico"""
        if doctor_id in HARDCODED_DOCTOR_CREDENTIALS:
            return HARDCODED_DOCTOR_CREDENTIALS[doctor_id].dict()
        return None

class WirgilioService:
    """Servizio per integrazione sistema demografico Wirgilio esterno"""
    
    def __init__(self):
        self.wirgilio_client = None
        self.wirgilio_db = None
    
    async def _get_wirgilio_connection(self):
        """Connessione al database Wirgilio"""
        if not self.wirgilio_client:
            try:
                self.wirgilio_client = motor.motor_asyncio.AsyncIOMotorClient(
                    host="192.168.125.193",
                    port=27017,
                    username="sysdba",
                    password="mederos",
                    authSource="admin",
                    serverSelectionTimeoutMS=5000
                )
                self.wirgilio_db = self.wirgilio_client["wirgilio"]
                
                # Test connessione
                await self.wirgilio_client.admin.command('ping')
                logger.info("Connessione Wirgilio stabilita con successo")
                
            except Exception as e:
                logger.error(f"Errore connessione Wirgilio: {e}")
                self.wirgilio_client = None
                self.wirgilio_db = None
                raise
        
        return self.wirgilio_db
    
    async def lookup_patient_demographics(self, cf_paziente: str) -> Optional[PatientDemographics]:
        """Ricerca demografica paziente nel sistema Wirgilio"""
        try:
            logger.info(f"Inizio ricerca per CF: {cf_paziente}")
            
            db = await self._get_wirgilio_connection()
            
            if db is None:  # ✅ CORREZIONE: era "if not db:"
                logger.warning("Database Wirgilio non disponibile, uso dati mock")
                return self._get_mock_demographics(cf_paziente)
            
            logger.info(f"Connessione DB stabilita, cerco in visitediabetologichedue")
            
            # Query con logging dettagliato
            query = {"codicefiscale": {"$regex": f"^{cf_paziente}$", "$options": "i"}}
            logger.info(f"Query MongoDB: {query}")
            
            patient_doc = await db.visitediabetologichedue.find_one(query)
            
            logger.info(f"Risultato query: {patient_doc is not None}")
            if patient_doc:
                logger.info(f"Documento trovato: nome={patient_doc.get('nome')}, cognome={patient_doc.get('cognome')}")
            
            if not patient_doc:
                logger.warning(f"Paziente {cf_paziente} non trovato in visitediabetologichedue")
                return self._get_mock_demographics(cf_paziente)
            
            logger.info(f"Paziente trovato in Wirgilio: {patient_doc.get('nome', 'N/A')} {patient_doc.get('cognome', 'N/A')}")
            
            # Converti i dati dal formato Wirgilio al nostro modello
            return PatientDemographics(
                nome=patient_doc.get("nome", f"Nome-{cf_paziente[:3]}"),
                cognome=patient_doc.get("cognome", f"Cognome-{cf_paziente[3:6]}"),
                data_nascita=self._parse_birth_date(patient_doc.get("dataattivita")),
                telefono=patient_doc.get("telefono"),
                email=patient_doc.get("email"),
                indirizzo=self._parse_address(patient_doc.get("indirizzo"))
            )
            
        except Exception as e:
            logger.error(f"Errore connessione Wirgilio per {cf_paziente}: {e}")
            logger.info("Uso dati demografici mock a causa dell'errore Wirgilio")
            return self._get_mock_demographics(cf_paziente)
    
    def _get_mock_demographics(self, cf_paziente: str) -> PatientDemographics:
        """Dati demografici mock quando Wirgilio non è disponibile"""
        return PatientDemographics(
            nome=f"Nome-{cf_paziente[:3]}",
            cognome=f"Cognome-{cf_paziente[3:6]}",
            data_nascita=date(1980, 1, 15),
            telefono=None,
            email=None,
            indirizzo={
                "via": "Via Roma 123",
                "città": "Roma",
                "cap": "00100"
            }
        )
    
    def _parse_birth_date(self, birth_data) -> date:
        """Parsing data nascita da vari formati"""
        if not birth_data:
            # Calcola età approssimativa dal codice fiscale
            return date(1980, 1, 15)
            
        if isinstance(birth_data, datetime):
            return birth_data.date()
        elif isinstance(birth_data, date):
            return birth_data
        elif isinstance(birth_data, str):
            try:
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"]:
                    try:
                        return datetime.strptime(birth_data, fmt).date()
                    except ValueError:
                        continue
            except:
                pass
        
        return date(1980, 1, 15)
    
    def _parse_address(self, address_data) -> Optional[Dict[str, str]]:
        """Parsing indirizzo da vari formati"""
        if not address_data:
            return None
            
        if isinstance(address_data, dict):
            return {
                "via": address_data.get("via", address_data.get("street", "")),
                "città": address_data.get("città", address_data.get("city", address_data.get("citta", ""))),
                "cap": address_data.get("cap", address_data.get("zip", ""))
            }
        elif isinstance(address_data, str):
            return {"via": address_data, "città": "", "cap": ""}
        
        return None
    
    async def close_connection(self):
        """Chiudi connessione Wirgilio"""
        if self.wirgilio_client:
            self.wirgilio_client.close()
            logger.info("Connessione Wirgilio chiusa")

class SchedulerClientService:
    """Servizio per integrazione servizio scheduler"""
    
    async def get_available_slots(self, appointment_type: str, suggested_date: date) -> List[Dict[str, Any]]:
        """Ottieni slot appuntamento disponibili dal servizio scheduler"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.SCHEDULER_SERVICE_URL}/available-slots",
                    params={
                        "date": suggested_date.isoformat(),
                        "appointment_type": appointment_type
                    },
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    return response.json().get("available_slots", [])
                else:
                    logger.warning(f"Servizio scheduler ha restituito {response.status_code}")
                    
        except httpx.TimeoutException:
            logger.error("Timeout servizio scheduler")
        except Exception as e:
            logger.error(f"Errore chiamata servizio scheduler: {e}")
        
        # Fallback a slot predefiniti
        return [
            {"slot_id": "slot_1", "time": "09:00", "available": True},
            {"slot_id": "slot_2", "time": "10:30", "available": True}, 
            {"slot_id": "slot_3", "time": "14:00", "available": True},
            {"slot_id": "slot_4", "time": "15:30", "available": True}
        ]

class PatientService:
    """Servizio per logica di business relativa ai pazienti"""
    
    def __init__(self, patient_repo: PatientRepository, wirgilio_service: WirgilioService):
        self.patient_repo = patient_repo
        self.wirgilio_service = wirgilio_service
    
    async def lookup_patient(self, request: PatientLookupRequest) -> PatientLookupResponse:
        """Ricerca paziente per codice fiscale in Cronoscita specifica"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        if not await self._validate_pathology(request.patologia):
            raise ValueError("Patologia non valida")
        
        # ✅ STEP 1: Check if patient exists in THIS specific Cronoscita
        existing_in_cronoscita = await self.patient_repo.find_by_cf_and_patologia(
            request.cf_paziente, 
            request.patologia
        )
        
        if existing_in_cronoscita:
            logger.info(f"📋 Patient {request.cf_paziente} found in Cronoscita {request.patologia}")
            return PatientLookupResponse(
                exists=True,
                message=f"Paziente già registrato per {request.patologia}",
                patient_data={
                    "cf_paziente": existing_in_cronoscita["cf_paziente"],
                    "patologia": existing_in_cronoscita["patologia"],
                    "enrollment_date": existing_in_cronoscita["enrollment_date"].isoformat(),
                    "status": existing_in_cronoscita["status"],
                    "cronoscita_id": existing_in_cronoscita.get("cronoscita_id"),
                    "patologia_id": existing_in_cronoscita.get("cronoscita_id")  # Alias
                }
            )
        
        # ✅ STEP 2: Check if patient exists in ANY other Cronoscita (for demographics reuse)
        any_existing = await self.patient_repo.find_any_enrollment_by_cf(request.cf_paziente)
        
        if any_existing:
            logger.info(f"📋 Patient {request.cf_paziente} exists in other Cronoscita, enabling demographics reuse")
            return PatientLookupResponse(
                exists=False,
                message=f"Paziente trovato in altra Cronoscita ({any_existing['patologia']}) - registrazione semplificata disponibile",
                patient_data={
                    "cf_paziente": request.cf_paziente,
                    "demographics": any_existing.get("demographics"),
                    "suggested_pathology": request.patologia,
                    "can_reuse_contacts": True,
                    "existing_enrollments": [any_existing["patologia"]]
                }
            )
        
        # ✅ STEP 3: Completely new patient - lookup demographics from Wirgilio
        demographics = await self.wirgilio_service.lookup_patient_demographics(request.cf_paziente)
        
        if not demographics:
            return PatientLookupResponse(
                exists=False,
                message="Paziente non trovato nel registro demografico"
            )
        
        return PatientLookupResponse(
            exists=False,
            message="Paziente trovato nel registro demografico ma non ancora registrato",
            patient_data={
                "cf_paziente": request.cf_paziente,
                "demographics": demographics.dict(),
                "suggested_pathology": request.patologia,
                "can_reuse_contacts": False
            }
        )
    
    async def _validate_pathology(self, pathology_name: str) -> bool:
        """Validate pathology against active Cronoscita in database"""
        try:
            from .database import get_database
            from .cronoscita_repository import CronoscitaRepository
            
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            is_valid = await cronoscita_repo.validate_pathologie(pathology_name)
            
            if not is_valid:
                logger.warning(f"⚠️ Invalid pathology attempted: {pathology_name}")
            
            return is_valid
        except Exception as e:
            logger.error(f"❌ Error validating pathology: {str(e)}")
            return False

    async def register_patient(self, request: PatientRegistrationRequest) -> PatientRegistrationResponse:
        """Registra nuovo paziente per gestione timeline in Cronoscita specifica"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        if not await self._validate_pathology(request.patologia):
            raise ValueError("Patologia non valida")
        
        # ✅ CRITICAL: Check if patient exists in THIS specific Cronoscita only
        existing_in_cronoscita = await self.patient_repo.find_by_cf_and_patologia(
            request.cf_paziente, 
            request.patologia
        )
        if existing_in_cronoscita:
            raise PatientAlreadyExistsException(f"Paziente già registrato per {request.patologia}")
        
        # ✅ Try to reuse demographics from any existing enrollment
        demographics = None
        existing_any = await self.patient_repo.find_any_enrollment_by_cf(request.cf_paziente)
        
        if existing_any and existing_any.get("demographics"):
            logger.info(f"📋 Reusing demographics from existing enrollment for {request.cf_paziente}")
            demographics = existing_any["demographics"]
        else:
            # Ottieni demografici da Wirgilio per paziente completamente nuovo
            logger.info(f"📋 Fetching new demographics from Wirgilio for {request.cf_paziente}")
            demographics = await self.wirgilio_service.lookup_patient_demographics(request.cf_paziente)
        
        # Crea record paziente per questa specifica Cronoscita
        now = datetime.now()
        patient_data = Patient(
            cf_paziente=request.cf_paziente,
            id_medico=request.id_medico,
            patologia=request.patologia,  # This IS the Cronoscita
            demographics=demographics,
            status=PatientStatus.ACTIVE,
            enrollment_date=now,
            created_at=now,
            updated_at=now
        )
        
        # Salva nel database
        await self.patient_repo.create_patient(patient_data)
        
        logger.info(f"✅ Patient registered: {request.cf_paziente} in Cronoscita {request.patologia} by doctor {request.id_medico}")
        
        return PatientRegistrationResponse(
            success=True,
            message=f"Paziente {request.cf_paziente} registrato con successo per {request.patologia}",
            patient_id=request.cf_paziente,
            enrollment_date=now
        )
    
    async def register_patient_with_contacts(self, request: PatientRegistrationWithContactsRequest) -> PatientRegistrationResponse:
        """Registra paziente con contatti modificabili dal medico"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # ✅ CRITICAL: Check if patient exists in THIS specific Cronoscita only
        existing_in_cronoscita = await self.patient_repo.find_by_cf_and_patologia(
            request.cf_paziente, 
            request.patologia
        )
        if existing_in_cronoscita:
            raise PatientAlreadyExistsException(f"Paziente già registrato per {request.patologia}")
        
        # Ottieni demografici da Wirgilio
        demographics = await self.wirgilio_service.lookup_patient_demographics(request.cf_paziente)
        
        if not demographics:
            raise PatientNotFoundException("Paziente non trovato nel sistema demografico")
        
        # Sovrascrivi contatti con quelli forniti dal medico
        if request.telefono and request.telefono.strip():
            demographics.telefono = request.telefono.strip()
        if request.email and request.email.strip():
            demographics.email = request.email.strip()
        
        # Crea record paziente
        now = datetime.now()
        patient_data = Patient(
            cf_paziente=request.cf_paziente,
            id_medico=request.id_medico,
            patologia=request.patologia,
            demographics=demographics,
            status=PatientStatus.ACTIVE,
            enrollment_date=now,
            created_at=now,
            updated_at=now
        )
        
        # Salva nel database
        await self.patient_repo.create_patient(patient_data)
        
        logger.info(f"Paziente registrato con contatti: {request.cf_paziente} dal medico {request.id_medico}")
        
        return PatientRegistrationResponse(
            success=True,
            message=f"Paziente {request.cf_paziente} registrato con successo",
            patient_id=request.cf_paziente,
            enrollment_date=now
        )

class AppointmentService:
    """Servizio per logica di business relativa agli appuntamenti"""
    
    def __init__(
        self, 
        appointment_repo: AppointmentRepository,
        patient_repo: PatientRepository,
        scheduler_client: SchedulerClientService
    ):
        self.appointment_repo = appointment_repo
        self.patient_repo = patient_repo
        self.scheduler_client = scheduler_client
    
    async def schedule_appointment(self, decision: DoctorAppointmentDecision) -> AppointmentSchedulingResponse:
        """Programma nuovo appuntamento basato sulla decisione del medico"""
        # Valida medico
        if not DoctorService.validate_doctor(decision.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Valida paziente esiste
        patient = await self.patient_repo.find_by_cf(decision.cf_paziente)
        if not patient:
            raise PatientNotFoundException("Paziente non trovato")
        
        logger.info(f"Scheduling appointment type {decision.appointment_type} for pathology {patient['patologia']}")

        
        # Ottieni slot disponibili da scheduler
        available_slots = await self.scheduler_client.get_available_slots(
            decision.appointment_type.value,
            decision.suggested_date
        )
        
        # Crea appuntamento (assegna automaticamente primo slot per demo)
        appointment_id = str(uuid.uuid4())
        selected_slot = available_slots[0] if available_slots else {"time": "09:00"}
        appointment_datetime = datetime.combine(
            decision.suggested_date,
            datetime.strptime(selected_slot["time"], "%H:%M").time()
        )
        
        now = datetime.now()
        appointment_data = Appointment(
            appointment_id=appointment_id,
            cf_paziente=decision.cf_paziente,
            id_medico=decision.id_medico,
            appointment_type=decision.appointment_type,
            scheduled_date=appointment_datetime,
            status=AppointmentStatus.SCHEDULED,
            priority=decision.priority,
            doctor_notes=decision.notes,
            location=APPOINTMENT_LOCATIONS.get(decision.appointment_type, "ASL Roma 1"),
            created_at=now,
            updated_at=now
        )
        
        # Salva nel database
        await self.appointment_repo.create_appointment(appointment_data)
        
        logger.info(f"Appuntamento programmato: {appointment_id} per paziente {decision.cf_paziente}")
        
        return AppointmentSchedulingResponse(
            success=True,
            message=f"Appuntamento programmato per {decision.suggested_date}",
            appointment_id=appointment_id,
            suggested_slots=available_slots
        )
    
    async def complete_appointment(self, completion: AppointmentCompletionRequest) -> Dict[str, Any]:
        """Completa appuntamento e opzionalmente programma il prossimo"""
        # Valida medico
        if not DoctorService.validate_doctor(completion.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Completa l'appuntamento
        await self.appointment_repo.complete_appointment(
            completion.appointment_id,
            completion.completion_notes
        )
        
        response = {
            "success": True,
            "message": "Appuntamento completato con successo"
        }
        
        # Programma prossimo appuntamento se medico ha deciso
        if completion.next_appointment_decision:
            next_appointment = await self.schedule_appointment(completion.next_appointment_decision)
            response["next_appointment"] = next_appointment.dict()
        
        return response
    
    async def get_available_appointment_types(self, cf_paziente: str, id_medico: str) -> Dict[str, Any]:
        """Ottieni tipi appuntamento disponibili per patologia paziente"""
        # Valida medico
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Ottieni paziente
        patient = await self.patient_repo.find_by_cf(cf_paziente)
        if not patient:
            raise PatientNotFoundException("Paziente non trovato")
        
        from .models import AppointmentType
        all_appointment_types = list(AppointmentType)

        return {
            "patient_id": cf_paziente,
            "patologia": patient["patologia"],
            "available_appointment_types": [
                {
                    "type": apt_type.value,
                    "description": APPOINTMENT_TYPE_DESCRIPTIONS.get(apt_type, apt_type.value)
                }
                for apt_type in all_appointment_types
            ]
        }

# melody integration
class MelodyIntegrationService:
    """Service for integrating with Melody voice transcription system"""
    
    def __init__(self):
        self.melody_base_url = "http://192.168.125.193:5002"
    
    async def check_melody_health(self) -> bool:
        """Check if Melody service is available"""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{self.melody_base_url}/refertazione/heartbeat")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Melody health check failed: {e}")
            return False
    
    def create_voice_workflow_url(self, doctor_id: str, patient_cf: str, return_url: str) -> str:
        """Create URL for Melody voice workflow with Chronic context"""
        params = {
            "doctor_id": doctor_id,
            "patient_cf": patient_cf,
            "return_url": return_url,
            "platform": "chronic",
            "timestamp": datetime.now().isoformat()
        }
        
        param_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.melody_base_url}/refertazione/voice_workflow?{param_string}"
    
    def convert_doctor_id_to_matricola(self, doctor_id: str) -> Optional[str]:
        """Convert Chronic doctor ID to Melody matricola format"""
        mapping = {
            'DOC001': '12345',  # Dr. Mario Rossi
            'DOC002': '12346',  # Dr.ssa Laura Bianchi  
            'DOC003': '12347',  # Dr. Giuseppe Verdi
            'DOC004': '12348'   # Dr.ssa Anna Ferrari
        }
        return mapping.get(doctor_id)




class TimelineService:
    """Servizio per gestione timeline"""
    
    def __init__(self, appointment_repo: AppointmentRepository, patient_repo: PatientRepository):
        self.appointment_repo = appointment_repo
        self.patient_repo = patient_repo
    
    async def get_patient_timeline(self, cf_paziente: str, id_medico: str, patologia: str = None) -> TimelineResponse:
        """Ottieni timeline completa paziente per Cronoscita specifica - FIXED VERSION"""
        # Validazioni
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # ✅ CRITICAL FIX: Initialize patient variable
        patient = None
        
        # ✅ CRITICAL: REQUIRE cronoscita parameter - NO FALLBACKS ALLOWED
        if not patologia or not patologia.strip():
            raise ValueError(
                "❌ CRONOSCITA PARAMETER REQUIRED:\n\n"
                "Il parametro cronoscita è obbligatorio per evitare mismatches.\n"
                "Ricaricare la pagina e selezionare la cronoscita corretta."
            )
        
        logger.info(f"🔍 STRICT cronoscita timeline request: {cf_paziente} → '{patologia}'")
        
        # ✅ STRICT: Get patient ONLY for specified cronoscita
        patient = await self.patient_repo.find_by_cf_and_patologia(cf_paziente, patologia)
        
        if not patient:
            # Check if patient exists in OTHER cronoscita for better error message
            any_patient = await self.patient_repo.find_any_enrollment_by_cf(cf_paziente)
            if any_patient:
                existing_cronoscita = any_patient.get("patologia", "Sconosciuta")
                raise PatientNotFoundException(
                    f"❌ PAZIENTE NON REGISTRATO PER QUESTA CRONOSCITA:\n\n"
                    f"Paziente: {cf_paziente}\n"
                    f"Cronoscita richiesta: '{patologia}'\n"
                    f"Cronoscita registrata: '{existing_cronoscita}'\n\n"
                    f"🔄 Selezionare '{existing_cronoscita}' per visualizzare la timeline corretta."
                )
            else:
                raise PatientNotFoundException(
                    f"❌ PAZIENTE NON TROVATO:\n\n"
                    f"Paziente {cf_paziente} non risulta registrato nel sistema.\n"
                    f"Verificare il codice fiscale o registrare il paziente."
                )
        
        # ✅ CRITICAL FIX: Validate cronoscita consistency BEFORE proceeding
        if not patient:
            raise PatientNotFoundException(f"CRITICAL: Patient variable is None after cronoscita lookup")

        # ✅ VALIDATE: Patient data matches requested cronoscita
        stored_patologia = patient.get("patologia", "").strip()
        if stored_patologia.upper() != patologia.upper():
            logger.error(f"🚨 CRONOSCITA MISMATCH DETECTED:")
            logger.error(f"   Requested: '{patologia}'")
            logger.error(f"   Found in DB: '{stored_patologia}'")
            logger.error(f"   Patient CF: {cf_paziente}")
            
            raise ValueError(
                f"❌ CRONOSCITA MISMATCH:\n"
                f"Richiesta: '{patologia}'\n"
                f"Database: '{stored_patologia}'\n"
                f"🔄 Selezionare cronoscita corretta"
            )

        logger.info(f"✅ CRONOSCITA VALIDATION PASSED: '{stored_patologia}' for {cf_paziente}")

        from .database import get_database
        db = await get_database()
        cronoscita_repo = CronoscitaRepository(db)
        patient = await cronoscita_repo.ensure_patient_has_cronoscita_id(patient)
        cronoscita_id = patient.get("cronoscita_id")

        appointments = []
        all_appointments = await self.appointment_repo.get_patient_appointments(cf_paziente)
        target_cronoscita_id = patient.get("cronoscita_id")
        stored_patologia = patient.get("patologia", "").strip()
        
        logger.info(f"🔍 RAW APPOINTMENTS: {len(all_appointments)}, cronoscita_id: '{target_cronoscita_id}'")
        
        filtered_appointments = []
        for i, apt in enumerate(all_appointments):
            apt_cronoscita = apt.get("cronoscita_id")
            apt_patologia = apt.get("patologia", "").strip()
            
            # ✅ FIXED: ObjectId string comparison
            cronoscita_match = str(apt_cronoscita) == str(target_cronoscita_id) if apt_cronoscita and target_cronoscita_id else False
            patologia_match = apt_patologia.upper() == stored_patologia.upper() if apt_patologia and stored_patologia else False
            
            logger.info(f"🔍 APT#{i+1}: {apt.get('appointment_id')} - {apt.get('appointment_date')} - cronoscita_match:{cronoscita_match} patologia_match:{patologia_match}")
            
            if cronoscita_match or patologia_match:
                filtered_appointments.append(apt)
                logger.info(f"   ✅ MATCHED")
            else:
                logger.info(f"   ❌ EXCLUDED")
        
        appointments = filtered_appointments
        logger.info(f"📋 FILTERED RESULT: {len(appointments)} appointments")

        
        today = date.today()
        precedenti = []
        oggi = []
        successivo = []

        logger.info(f"🔍 CATEGORIZING {len(appointments)} appointments (today: {today})")

        for i, apt in enumerate(appointments):
            appointment_datetime = apt.get("appointment_date")
            logger.info(f"🔍 APT#{i+1}: {apt.get('appointment_id')} - raw_date: {appointment_datetime} ({type(appointment_datetime)})")
            
            if appointment_datetime:
                appointment_date = _normalize_appointment_date(appointment_datetime)
                logger.info(f"   normalized_date: {appointment_date}, is_future: {appointment_date > today}")
                
                if appointment_date < today:
                    precedenti.append(_format_appointment_for_timeline(apt))
                    logger.info(f"   ✅ Added to PRECEDENTI")
                elif appointment_date == today:
                    oggi.append(_format_appointment_for_timeline(apt))
                    logger.info(f"   ✅ Added to OGGI")
                else:
                    successivo.append(_format_appointment_for_timeline(apt))
                    logger.info(f"   ✅ Added to SUCCESSIVO: {appointment_date}")
            else:
                logger.warning(f"   ❌ Missing appointment_date")

        logger.info(f"📊 FINAL: precedenti:{len(precedenti)}, oggi:{len(oggi)}, successivo:{len(successivo)}")
        if successivo:
            for i, s in enumerate(successivo):
                logger.info(f"   successivo[{i}]: {s.date} - {s.type}")

        
        # Sort appointments - FIXED: Use attribute access, not dictionary access
        precedenti.sort(key=lambda x: x.date, reverse=True)
        oggi.sort(key=lambda x: x.time, reverse=False)
        successivo.sort(key=lambda x: x.date)
        
        # Extract patient name
        demographics = patient.get("demographics", {})
        nome = demographics.get("nome", "")
        cognome = demographics.get("cognome", "")
        patient_name = f"{nome} {cognome}".strip()
        if not patient_name:
            patient_name = nome
        
        patologia_name = patient.get("patologia", patologia or "Sconosciuta")
        
        # ✅ Fetch nome_presentante (display name) for frontend
        patologia_display = await cronoscita_repo.get_pathologie_display_name(patologia_name)
        patologia_display_uppercase = patologia_display.upper() if patologia_display else patologia_name.upper()
        
        logger.info(f"✅ Timeline loaded for {cf_paziente} in SPECIFIC Cronoscita {patologia_name} (Display: {patologia_display_uppercase}): {len(precedenti)} precedenti, {len(oggi)} oggi, {len(successivo)} futuri")
        
        return TimelineResponse(
            patient_id=cf_paziente,
            patient_name=patient_name,
            patologia=patologia_name.upper(),  # ✅ Technical name in UPPERCASE
            patologia_display=patologia_display_uppercase,  # ✅ Display name in UPPERCASE
            cronoscita_id=cronoscita_id,  # CRITICAL for scheduler
            patologia_id=cronoscita_id,   # Alias for compatibility
            enrollment_date=patient["enrollment_date"].strftime("%d/%m/%Y"),
            precedenti=precedenti,
            oggi=oggi,
            successivo=successivo,
            total_appointments=len(appointments),
            can_schedule_next=len([
                apt for apt in appointments 
                if apt.get("cronoscita_id") == cronoscita_id and 
                _normalize_appointment_date(apt.get("appointment_date") or apt.get("scheduled_date")) >= today and
                apt.get("status") != "CANCELLED"
            ]) == 0,
            last_referto_date=None,
            scheduler_available=True if cronoscita_id else False,
            scheduler_error=None if cronoscita_id else "Cronoscita non configurata"
        )

class RefertoService:
    """Servizio per logica di business referto medico"""
    
    def __init__(
        self, 
        referto_repo,  # RefertoRepository
        patient_repo: PatientRepository,
        appointment_repo: AppointmentRepository
    ):
        self.referto_repo = referto_repo
        self.patient_repo = patient_repo
        self.appointment_repo = appointment_repo
    
    async def save_referto(self, request) -> Dict[str, Any]:  # RefertoSaveRequest -> RefertoSaveResponse
        """Salva referto medico con validazioni complete e isolamento Cronoscita"""
        
        # Validazione medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # ✅ CRITICAL: Validate cronoscita parameter
        if not request.patologia or not request.patologia.strip():
            raise ValueError("❌ Cronoscita parameter required per salvare referto")
        
        # ✅ CRONOSCITA-SPECIFIC: Validate patient exists in THIS specific cronoscita
        patient = await self.patient_repo.find_by_cf_and_patologia(request.cf_paziente, request.patologia)
        if not patient:
            raise PatientNotFoundException(
                f"❌ REFERTO SAVE ERROR:\n\n"
                f"Paziente {request.cf_paziente} non registrato per cronoscita '{request.patologia}'.\n"
                f"Il referto può essere salvato solo per la cronoscita corretta."
            )
        
        # 🔥 MIN LENGTH VALIDATION REMOVED - Allow empty referti
        # Original validation commented out:
        # if len(request.testo_referto.strip()) < 10:
        #     raise ValueError("Il referto deve contenere almeno 10 caratteri")
        
        # NEW: Allow any length including 0 characters
        # No minimum validation - referto can be empty
        
        # ✅ Get cronoscita_id if available
        from .database import get_database
        from .cronoscita_repository import CronoscitaRepository
        
        db = await get_database()
        cronoscita_repo = CronoscitaRepository(db)
        cronoscita_id = await cronoscita_repo.find_cronoscita_id_by_name(request.patologia)
        
        # Crea oggetto referto dal modello con cronoscita context
        from .models import Referto, RefertoStatus
        
        now = datetime.now()
        
        # ✅ Use existing referto_id if provided (for updates), otherwise create new
        is_update = bool(request.referto_id)
        
        referto_data = Referto(
            referto_id=request.referto_id,  # ✅ Use existing ID for updates, None for new
            cf_paziente=request.cf_paziente.upper(),
            id_medico=request.id_medico,
            appointment_id=request.appointment_id,
            
            # ✅ CRONOSCITA FIELDS - CRITICAL FOR ISOLATION
            patologia=request.patologia,
            cronoscita_id=cronoscita_id,
            
            testo_referto=request.testo_referto.strip(),
            diagnosi=request.diagnosi.strip() if request.diagnosi else None,
            terapia_prescritta=request.terapia_prescritta.strip() if request.terapia_prescritta else None,
            note_medico=request.note_medico.strip() if request.note_medico else None,
            status=RefertoStatus.COMPLETED,  # Automaticamente completato quando salvato
            data_visita=request.data_visita,
            data_compilazione=now,
            created_at=now,
            updated_at=now
        )
        
        # Salva nel database
        referto_id = await self.referto_repo.save_referto(referto_data)
        
        action = "aggiornato" if is_update else "creato"
        logger.info(f"✅ Referto {action}: {referto_id} per paziente {request.cf_paziente} in cronoscita '{request.patologia}' dal medico {request.id_medico}")
        
        # Restituisci risposta
        from .models import RefertoSaveResponse
        return RefertoSaveResponse(
            success=True,
            message=f"Referto salvato con successo per cronoscita {request.patologia}",
            referto_id=referto_id,
            status="completato",
            can_schedule_next=True,  # Ora può programmare prossimo appuntamento
            saved_at=now
        )
    
    async def get_todays_referto(self, cf_paziente: str, id_medico: str) -> Optional[Dict[str, Any]]:
        """Ottieni referto di oggi per paziente e medico"""
        
        # Validazione medico
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Validazione paziente esiste
        patient = await self.patient_repo.find_by_cf(cf_paziente)
        if not patient:
            raise PatientNotFoundException(f"Paziente {cf_paziente} non trovato")
        
        # Cerca referto di oggi
        from datetime import date, datetime
        today = date.today()
        
        # Create datetime range for today (start and end of day)
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        try:
            referto = await self.referto_repo.collection.find_one({
                "cf_paziente": cf_paziente.upper(),
                "id_medico": id_medico,
                "data_visita": {
                    "$gte": start_of_day,
                    "$lte": end_of_day
                }
            })
            
            if referto:
                # Serializza MongoDB ObjectId
                referto["id"] = str(referto["_id"])
                del referto["_id"]
            
            return referto
            
        except Exception as e:
            logger.error(f"Errore ricerca referto oggi: {e}")
            return None

    async def get_todays_referto_with_cronoscita(self, cf_paziente: str, id_medico: str, patologia: str) -> Optional[Dict[str, Any]]:
        """Ottieni referto di oggi per paziente, medico E cronoscita specifica"""
        
        # Validazione medico
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        if not patologia or not patologia.strip():
            raise ValueError("Cronoscita parameter required per ricerca referto oggi")
        
        patient = await self.patient_repo.find_by_cf_and_patologia(cf_paziente, patologia)
        if not patient:
            raise PatientNotFoundException(
                f"Paziente {cf_paziente} non registrato per cronoscita '{patologia}'"
            )
        
        from datetime import date, datetime
        today = date.today()
        
        # Create datetime range for today
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        try:
            # ✅ CRONOSCITA-ISOLATED QUERY: Filter by CF, doctor, cronoscita AND today's date
            referto = await self.referto_repo.collection.find_one({
                "cf_paziente": cf_paziente.upper(),
                "id_medico": id_medico,
                "patologia": patologia,  # ✅ CRITICAL: Cronoscita isolation
                "data_compilazione": {
                    "$gte": start_of_day,
                    "$lte": end_of_day
                }
            })
            
            if referto:
                logger.info(f"✅ Found today's referto for cronoscita '{patologia}': {referto.get('referto_id')}")
                # Convert ObjectId to string for JSON serialization
                if '_id' in referto:
                    referto["id"] = str(referto["_id"])
                    del referto["_id"]
                return referto
            else:
                logger.info(f"ℹ️ No referto found today for cronoscita '{patologia}'")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting today's referto for cronoscita: {e}")
            raise DatabaseException(f"Errore ricerca referto oggi: {str(e)}")

    async def get_patient_referti(self, cf_paziente: str, id_medico: str, patologia: str) -> List[Dict[str, Any]]:
        """Ottieni referti di un paziente per cronoscita specifica - CRONOSCITA ISOLATED"""
        
        # Validazione medico
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # ✅ CRONOSCITA VALIDATION
        if not patologia or not patologia.strip():
            raise ValueError("❌ Cronoscita parameter required per recuperare referti")
        
        # ✅ CRONOSCITA-SPECIFIC: Validate patient exists in THIS specific cronoscita
        patient = await self.patient_repo.find_by_cf_and_patologia(cf_paziente, patologia)
        if not patient:
            raise PatientNotFoundException(
                f"❌ REFERTI ACCESS DENIED:\n\n"
                f"Paziente {cf_paziente} non registrato per cronoscita '{patologia}'.\n"
                f"Accesso ai referti consentito solo per la cronoscita corretta."
            )
        
        # ✅ Get cronoscita-specific referti only
        referti = await self.referto_repo.find_by_patient_and_cronoscita(cf_paziente, patologia)
        
        logger.info(f"✅ Retrieved {len(referti)} referti for CF:{cf_paziente} in cronoscita:'{patologia}'")
        return referti
    
    async def check_can_schedule_next_appointment(
        self, 
        cf_paziente: str, 
        id_medico: str, 
        patologia: str = None,
        cronoscita_id: str = None
    ) -> bool:
        """
        Check if doctor can schedule next appointment - COMPLETE VALIDATION
        
        Must satisfy BOTH conditions:
        1. ✅ Referto completed for today  
        2. ✅ NO future appointments exist for this cronoscita
        
        Args:
            cf_paziente: Patient fiscal code
            id_medico: Doctor ID
            patologia: Cronoscita name (optional)
            cronoscita_id: Cronoscita ID (optional)
            
        Returns:
            bool: True if can schedule next appointment
        """
        try:
            logger.info(f"🔍 Checking scheduling permission: {cf_paziente} + cronoscita:{patologia}")
            
            has_referto_today = await self.referto_repo.check_referto_exists_for_patient_today_cronoscita(
                cf_paziente, id_medico, patologia
            )
            
            if not has_referto_today:
                logger.info(f"🚫 Cannot schedule: No referto completed today for {cf_paziente}")
                return False
            
            # ✅ CRITICAL FIX: Convert patologia name to cronoscita_id if needed
            target_cronoscita_id = cronoscita_id
            
            if not target_cronoscita_id and patologia:
                # Convert patologia name to cronoscita_id for proper matching
                from .database import get_database
                from .cronoscita_repository import CronoscitaRepository
                
                db = await get_database()
                cronoscita_repo = CronoscitaRepository(db)
                target_cronoscita_id = await cronoscita_repo.find_cronoscita_id_by_name(patologia)
                
                if target_cronoscita_id:
                    logger.info(f"🔄 Converted patologia '{patologia}' to cronoscita_id: {target_cronoscita_id}")
                else:
                    logger.warning(f"⚠️ Could not find cronoscita_id for patologia: {patologia}")
            
            # ✅ CONDITION 2: Check if future appointments exist for this cronoscita
            has_future_appointment = await self.appointment_repo.has_future_appointment_for_cronoscita(
                cf_paziente, target_cronoscita_id, None  # Use cronoscita_id, not patologia
            )
            
            if has_future_appointment:
                logger.info(f"🚫 Cannot schedule: Future appointment already exists for {cf_paziente} in cronoscita_id '{target_cronoscita_id}'")
                return False
            
            # ✅ BOTH CONDITIONS SATISFIED
            logger.info(f"✅ Can schedule next: Referto completed + No future appointments for {cf_paziente}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error checking schedule permission: {e}")
            return False  # Conservative: block scheduling on error
