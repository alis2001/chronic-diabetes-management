# services/timeline-service/app/models.py
"""
Timeline Service Data Models - Versione Italiana
Modelli Pydantic per validazione richieste/risposte e definizione strutture dati
Aggiornato: Workflow medico-driven, serializzazione datetime, sistema italiano
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import re

# Opzioni stato paziente
class PatientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRANSFERRED = "transferred"

# Tipi appuntamento
class AppointmentType(str, Enum):
    VISITA_DIABETOLOGICA = "visita_diabetologica"
    VISITA_OCULISTICA = "visita_oculistica" 
    VISITA_NEUROLOGICA = "visita_neurologica"
    LABORATORIO_HBA1C = "laboratorio_hba1c"
    LABORATORIO_GLICEMIA = "laboratorio_glicemia"
    ECO_ADDOME = "eco_addome"
    TEST_NEUROPATIA = "test_neuropatia"

# Stato appuntamento
class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

# Livelli priorità per decisioni medico
class AppointmentPriority(str, Enum):
    ROUTINE = "routine"
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"

# Insert these models after AppointmentPriority enum and before PatientLookupRequest

# Stato referto medico
class RefertoStatus(str, Enum):
    DRAFT = "bozza"
    COMPLETED = "completato"
    REVIEWED = "revisionato" 
    ARCHIVED = "archiviato"

class Referto(BaseModel):
    """Modello referto medico per storage database con isolamento Cronoscita"""
    referto_id: Optional[str] = None
    cf_paziente: str = Field(..., description="Codice fiscale paziente")
    id_medico: str = Field(..., description="ID medico")
    appointment_id: Optional[str] = Field(None, description="ID appuntamento associato")
    
    # ✅ CRONOSCITA ISOLATION - CRITICAL ADDITION
    patologia: str = Field(..., description="Cronoscita di appartenenza del referto")
    cronoscita_id: Optional[str] = Field(None, description="ID Cronoscita (opzionale)")
    
    # Contenuto referto
    # 🔥 MIN LENGTH REMOVED - Allow empty referti (even blank text)
    testo_referto: str = Field(default="", description="Testo refertazione medica (lunghezza minima: 0 caratteri)")
    diagnosi: Optional[str] = Field(None, description="Diagnosi principale")
    terapia_prescritta: Optional[str] = Field(None, description="Terapia prescritta")
    note_medico: Optional[str] = Field(None, description="Note aggiuntive")
    
    # Metadati
    status: RefertoStatus = Field(default=RefertoStatus.DRAFT)
    data_visita: date = Field(default_factory=date.today)
    data_compilazione: datetime = Field(default_factory=datetime.now)
    
    # Sistema
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

class RefertoSaveRequest(BaseModel):
    """Richiesta salvataggio referto con contesto Cronoscita"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(...)
    appointment_id: Optional[str] = None
    
    # ✅ CRONOSCITA CONTEXT - REQUIRED FOR ISOLATION
    patologia: str = Field(..., description="Cronoscita di appartenenza (OBBLIGATORIO)")
    
    # 🔥 MIN LENGTH REMOVED - Allow empty referti (even blank text)
    testo_referto: str = Field(default="", description="Testo refertazione (lunghezza minima: 0 caratteri)")
    diagnosi: Optional[str] = None
    terapia_prescritta: Optional[str] = None
    note_medico: Optional[str] = None
    data_visita: date = Field(default_factory=date.today)

# Response models for Referto  
class RefertoSaveResponse(BaseModel):
    """Risposta salvataggio referto"""
    success: bool
    message: str
    referto_id: str
    status: str
    can_schedule_next: bool = Field(description="Se true, può programmare prossimo appuntamento")
    saved_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Modelli Input
class PatientLookupRequest(BaseModel):
    """Modello richiesta ricerca paziente"""
    cf_paziente: str = Field(..., min_length=16, max_length=16, description="Codice fiscale italiano")
    id_medico: str = Field(..., min_length=1, description="ID Medico")
    patologia: str = Field(..., description="Patologia paziente (from Cronoscita)")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        """Valida formato codice fiscale italiano"""
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale italiano non valido')
        return v.upper()

class PatientRegistrationRequest(BaseModel):
    """Modello richiesta registrazione paziente"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(..., min_length=1)
    patologia: str
    confirm_registration: bool = Field(..., description="Medico conferma registrazione paziente")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale italiano non valido')
        return v.upper()

class PatientRegistrationWithContactsRequest(BaseModel):
    """Richiesta registrazione paziente con contatti modificabili"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(..., min_length=1)
    patologia: str
    telefono: Optional[str] = Field(None, description="Telefono inserito/modificato dal medico")
    email: Optional[str] = Field(None, description="Email inserita/modificata dal medico")
    confirm_registration: bool = Field(..., description="Conferma registrazione del medico")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale italiano non valido')
        return v.upper()

class DoctorAppointmentDecision(BaseModel):
    """Decisione medico per programmazione prossimo appuntamento"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    appointment_type: AppointmentType
    suggested_date: date = Field(..., description="Data approssimativa suggerita dal medico")
    priority: AppointmentPriority = AppointmentPriority.NORMAL
    notes: Optional[str] = Field(None, max_length=500, description="Note del medico per questo appuntamento")
    id_medico: str = Field(..., description="Medico che prende la decisione")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale italiano non valido')
        return v.upper()
    
    @validator('suggested_date')
    def validate_future_date(cls, v):
        if v <= date.today():
            raise ValueError('La data suggerita deve essere nel futuro')
        return v

class AppointmentCompletionRequest(BaseModel):
    """Richiesta per completare appuntamento"""
    appointment_id: str
    id_medico: str
    completion_notes: Optional[str] = None
    next_appointment_decision: Optional[DoctorAppointmentDecision] = None

# Modelli Dati
class PatientDemographics(BaseModel):
    """Informazioni demografiche paziente da Wirgilio"""
    nome: str
    cognome: str
    data_nascita: date
    telefono: Optional[str] = None
    email: Optional[str] = None
    indirizzo: Optional[Dict[str, str]] = None
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }

class DoctorCredentials(BaseModel):
    """Credenziali medico (hardcoded per ora)"""
    nome_completo: str
    codice_medico: str
    specializzazione: str
    firma_digitale: str
    struttura: str

class Patient(BaseModel):
    """Modello paziente per storage database"""
    cf_paziente: str
    id_medico: str
    patologia: str
    demographics: Optional[PatientDemographics] = None
    status: PatientStatus = PatientStatus.ACTIVE
    enrollment_date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

class Appointment(BaseModel):
    """Modello appuntamento per storage database"""
    appointment_id: Optional[str] = None  # Verrà generato
    cf_paziente: str
    id_medico: str
    appointment_type: AppointmentType
    scheduled_date: datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    priority: AppointmentPriority = AppointmentPriority.NORMAL
    doctor_notes: Optional[str] = None
    completion_notes: Optional[str] = None
    location: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

# Modelli Risposta
class PatientLookupResponse(BaseModel):
    """Risposta per ricerca paziente"""
    exists: bool
    message: str
    patient_data: Optional[Dict[str, Any]] = None

class PatientRegistrationResponse(BaseModel):
    """Risposta per registrazione paziente"""
    success: bool
    message: str
    patient_id: str
    enrollment_date: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AppointmentSummary(BaseModel):
    """Riassunto appuntamento per visualizzazione timeline"""
    appointment_id: str
    date: str
    time: str
    type: str
    status: str
    priority: str
    location: Optional[str] = None
    notes: Optional[str] = None

class TimelineResponse(BaseModel):
    """Risposta timeline paziente con informazioni cronoscita per scheduler"""
    patient_id: str = Field(..., description="Codice fiscale paziente")
    patient_name: Optional[str] = Field(None, description="Nome completo paziente")
    patologia: str = Field(..., description="Nome patologia (technical name)")
    patologia_display: Optional[str] = Field(None, description="Nome presentante (user-friendly display name)")
    
    # CRITICAL: Add cronoscita_id for scheduler integration
    cronoscita_id: Optional[str] = Field(None, description="ID Cronoscita per scheduler")
    patologia_id: Optional[str] = Field(None, description="Alias per cronoscita_id") 
    
    enrollment_date: str = Field(..., description="Data arruolamento")
    precedenti: List[AppointmentSummary] = Field(default_factory=list)
    oggi: List[AppointmentSummary] = Field(default_factory=list)
    successivo: List[AppointmentSummary] = Field(default_factory=list)
    total_appointments: int = Field(default=0)
    
    # Additional scheduler integration fields
    can_schedule_next: Optional[bool] = Field(None, description="Può programmare prossimo appuntamento")
    last_referto_date: Optional[str] = Field(None, description="Data ultimo referto")
    
class HealthResponse(BaseModel):
    """Risposta controllo stato"""
    service: str
    status: str
    timestamp: datetime
    database_status: str
    port: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AppointmentSchedulingResponse(BaseModel):
    """Risposta quando medico programma prossimo appuntamento"""
    success: bool
    message: str
    appointment_id: str
    suggested_slots: List[Dict[str, Any]]  # Slot disponibili da servizio scheduler

# Costanti per valori hardcoded (temporaneo)
HARDCODED_DOCTOR_CREDENTIALS = {
    "DOC001": DoctorCredentials(
        nome_completo="Dr. Mario Rossi",
        codice_medico="DOC001",
        specializzazione="Diabetologia",
        firma_digitale="HARDCODED_SIGNATURE_001",
        struttura="ASL Roma 1"
    ),
    "DOC002": DoctorCredentials(
        nome_completo="Dr.ssa Laura Bianchi", 
        codice_medico="DOC002",
        specializzazione="Diabetologia",
        firma_digitale="HARDCODED_SIGNATURE_002",
        struttura="ASL Roma 1"
    ),
    "DOC003": DoctorCredentials(
        nome_completo="Dr. Giuseppe Verdi",
        codice_medico="DOC003",
        specializzazione="Endocrinologia",
        firma_digitale="HARDCODED_SIGNATURE_003",
        struttura="ASL Roma 1"
    ),
    "DOC004": DoctorCredentials(
        nome_completo="Dr.ssa Anna Ferrari",
        codice_medico="DOC004",
        specializzazione="Diabetologia Pediatrica",
        firma_digitale="HARDCODED_SIGNATURE_004",
        struttura="ASL Roma 1"
    )
}


# Descrizioni tipi appuntamento
APPOINTMENT_TYPE_DESCRIPTIONS = {
    AppointmentType.VISITA_DIABETOLOGICA: "Visita diabetologica di controllo",
    AppointmentType.VISITA_OCULISTICA: "Controllo oculistico per retinopatia diabetica",
    AppointmentType.VISITA_NEUROLOGICA: "Visita neurologica specialistica",
    AppointmentType.LABORATORIO_HBA1C: "Esame emoglobina glicata (HbA1c)",
    AppointmentType.LABORATORIO_GLICEMIA: "Esami glicemia e profilo lipidico",
    AppointmentType.ECO_ADDOME: "Ecografia addome completo",
    AppointmentType.TEST_NEUROPATIA: "Test per neuropatia diabetica"
}



# ================================
# CRONOSCITA PATHOLOGY VALIDATION
# ================================

async def validate_pathology_against_database(pathology_name: str) -> bool:
    """
    Validate pathology against active Cronoscita in database
    Replaces hardcoded PatologiaEnum validation
    """
    try:
        from .database import get_database
        from .cronoscita_repository import CronoscitaRepository
        
        db = await get_database()
        cronoscita_repo = CronoscitaRepository(db)
        
        return await cronoscita_repo.validate_pathologie(pathology_name)
    except Exception as e:
        logger.error(f"❌ Error validating pathology: {str(e)}")
        return False