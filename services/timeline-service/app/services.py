# services/timeline-service/app/services.py
"""
Timeline Service Business Logic - Versione Italiana
Separazione pulita della logica di business da routing e accesso dati
Aggiornato: Connessione database Wirgilio reale, registrazione con contatti modificabili
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid
import httpx
import logging
import motor.motor_asyncio

from .models import (
    PatientLookupRequest, PatientLookupResponse,
    PatientRegistrationRequest, PatientRegistrationResponse,
    PatientRegistrationWithContactsRequest,
    DoctorAppointmentDecision, AppointmentSchedulingResponse,
    AppointmentCompletionRequest, TimelineResponse, AppointmentSummary,
    Patient, Appointment, PatientDemographics, PatientStatus, AppointmentStatus
)
from .repositories import PatientRepository, AppointmentRepository
from .config import (
    settings, HARDCODED_DOCTOR_CREDENTIALS,
    APPOINTMENT_TYPE_DESCRIPTIONS
)
from .exceptions import (
    DoctorValidationException, PatientNotFoundException, PatientAlreadyExistsException,
    InvalidAppointmentTypeException, ExternalServiceException
)

logger = logging.getLogger(__name__)

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
        """Ricerca paziente per codice fiscale"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        if not await self._validate_pathology(request.patologia):
            raise ValueError("Patologia non valida")
        # Verifica se il paziente esiste nel nostro sistema
        existing_patient = await self.patient_repo.find_by_cf(request.cf_paziente)
        
        if existing_patient:
            return PatientLookupResponse(
                exists=True,
                message="Paziente già registrato nel sistema",
                patient_data={
                    "cf_paziente": existing_patient["cf_paziente"],
                    "patologia": existing_patient["patologia"],
                    "enrollment_date": existing_patient["enrollment_date"].isoformat(),
                    "status": existing_patient["status"]
                }
            )
        
        # Paziente non nel sistema - ricerca demografici
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
                "demographics": demographics.dict(),
                "suggested_pathology": request.patologia
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
        """Registra nuovo paziente per gestione timeline"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        if not await self._validate_pathology(request.patologia):
            raise ValueError("Patologia non valida")
        # Verifica se il paziente esiste già
        existing_patient = await self.patient_repo.find_by_cf(request.cf_paziente)
        if existing_patient:
            raise PatientAlreadyExistsException("Paziente già registrato")
        
        # Ottieni demografici da Wirgilio
        demographics = await self.wirgilio_service.lookup_patient_demographics(request.cf_paziente)
        
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
        
        # Converti per MongoDB (gestisce serializzazione date)
        patient_dict = patient_data.dict()
        
        # Salva nel database
        await self.patient_repo.create_patient(patient_data)
        
        logger.info(f"Paziente registrato: {request.cf_paziente} dal medico {request.id_medico}")
        
        return PatientRegistrationResponse(
            success=True,
            message=f"Paziente {request.cf_paziente} registrato con successo",
            patient_id=request.cf_paziente,
            enrollment_date=now
        )
    
    async def register_patient_with_contacts(self, request: PatientRegistrationWithContactsRequest) -> PatientRegistrationResponse:
        """Registra paziente con contatti modificabili dal medico"""
        # Valida medico
        if not DoctorService.validate_doctor(request.id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Verifica paziente non esista già
        existing_patient = await self.patient_repo.find_by_cf(request.cf_paziente)
        if existing_patient:
            raise PatientAlreadyExistsException("Paziente già registrato")
        
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
    
    async def get_patient_timeline(self, cf_paziente: str, id_medico: str) -> TimelineResponse:
        """Ottieni timeline completa paziente"""
        # Valida medico
        if not DoctorService.validate_doctor(id_medico):
            raise DoctorValidationException("Credenziali medico non valide")
        
        # Ottieni paziente
        patient = await self.patient_repo.find_by_cf(cf_paziente)
        if not patient:
            raise PatientNotFoundException("Paziente non trovato")
        
        # Ottieni tutti gli appuntamenti
        appointments = await self.appointment_repo.find_by_patient(cf_paziente)
        
        # Categorizza appuntamenti
        today = date.today()
        precedenti = []  # Appuntamenti passati
        oggi = []        # Appuntamenti di oggi
        successivo = []  # Appuntamenti futuri
        
        for apt in appointments:
            appointment_date = apt["scheduled_date"].date()
            
            apt_summary = AppointmentSummary(
                appointment_id=str(apt.get("appointment_id", apt.get("_id"))),
                date=appointment_date.strftime("%d/%m/%Y"),
                time=apt["scheduled_date"].strftime("%H:%M"),
                type=APPOINTMENT_TYPE_DESCRIPTIONS.get(apt["appointment_type"], apt["appointment_type"]),
                status=apt["status"],
                priority=apt.get("priority", "normal"),
                location=apt.get("location"),
                notes=apt.get("doctor_notes")
            )
            
            if appointment_date < today:
                precedenti.append(apt_summary)
            elif appointment_date == today:
                oggi.append(apt_summary)
            else:
                successivo.append(apt_summary)
        
        # Ottieni nome paziente
        patient_name = None
        if patient.get("demographics"):
            demographics = patient["demographics"]
            patient_name = f"{demographics.get('nome', '')} {demographics.get('cognome', '')}"
        
        return TimelineResponse(
            patient_id=cf_paziente,
            patient_name=patient_name,
            patologia=patient["patologia"],
            enrollment_date=patient["enrollment_date"].strftime("%d/%m/%Y"),
            precedenti=precedenti,
            oggi=oggi,
            successivo=successivo,
            total_appointments=len(appointments)
        )


