# services/timeline-service/app/models.py
"""
Timeline Service Data Models
Pydantic models for request/response validation and data structure definition
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import re

# Predefined pathologies
class PatologiaEnum(str, Enum):
    DIABETES_TYPE1 = "diabetes_mellitus_type1"
    DIABETES_TYPE2 = "diabetes_mellitus_type2"
    DIABETES_GESTATIONAL = "diabetes_gestational"
    HYPERTENSION_PRIMARY = "hypertension_primary"
    HYPERTENSION_SECONDARY = "hypertension_secondary"
    CARDIOVASCULAR = "cardiovascular_disease"
    CHRONIC_KIDNEY = "chronic_kidney_disease"

# Patient status options
class PatientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRANSFERRED = "transferred"

# Appointment types
class AppointmentType(str, Enum):
    VISITA_DIABETOLOGICA = "visita_diabetologica"
    VISITA_OCULISTICA = "visita_oculistica" 
    VISITA_NEUROLOGICA = "visita_neurologica"
    LABORATORIO_HBA1C = "laboratorio_hba1c"
    LABORATORIO_GLICEMIA = "laboratorio_glicemia"
    ECO_ADDOME = "eco_addome"
    TEST_NEUROPATIA = "test_neuropatia"

# Appointment status
class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

# Input Models
class PatientLookupRequest(BaseModel):
    """Request model for patient lookup"""
    cf_paziente: str = Field(..., min_length=16, max_length=16, description="Italian fiscal code")
    id_medico: str = Field(..., min_length=1, description="Doctor ID")
    patologia: PatologiaEnum = Field(..., description="Patient pathology")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        """Validate Italian fiscal code format"""
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Invalid Italian fiscal code format')
        return v.upper()

class PatientRegistrationRequest(BaseModel):
    """Request model for patient registration"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(..., min_length=1)
    patologia: PatologiaEnum
    confirm_registration: bool = Field(..., description="Doctor confirms patient registration")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Invalid Italian fiscal code format')
        return v.upper()

# Data Models
class PatientDemographics(BaseModel):
    """Patient demographic information from Wirgilio"""
    nome: str
    cognome: str
    data_nascita: date
    telefono: Optional[str] = None
    email: Optional[str] = None
    indirizzo: Optional[Dict[str, str]] = None

class DoctorCredentials(BaseModel):
    """Doctor credentials (hardcoded for now)"""
    nome_completo: str
    codice_medico: str
    specializzazione: str
    firma_digitale: str
    struttura: str

class Patient(BaseModel):
    """Patient model for database storage"""
    cf_paziente: str
    id_medico: str
    patologia: PatologiaEnum
    demographics: Optional[PatientDemographics] = None
    status: PatientStatus = PatientStatus.ACTIVE
    enrollment_date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        use_enum_values = True

class Appointment(BaseModel):
    """Appointment model for database storage"""
    cf_paziente: str
    appointment_type: AppointmentType
    scheduled_date: datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    protocol_generated: bool = True
    notes: Optional[str] = None
    location: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        use_enum_values = True

# Response Models
class PatientLookupResponse(BaseModel):
    """Response for patient lookup"""
    exists: bool
    message: str
    patient_data: Optional[Dict[str, Any]] = None

class PatientRegistrationResponse(BaseModel):
    """Response for patient registration"""
    success: bool
    message: str
    patient_id: str
    enrollment_date: datetime
    initial_appointments_created: int

class AppointmentSummary(BaseModel):
    """Summary of an appointment for timeline display"""
    appointment_id: str
    date: str
    time: str
    type: str
    status: str
    location: Optional[str] = None
    notes: Optional[str] = None

class TimelineResponse(BaseModel):
    """Complete timeline response"""
    patient_id: str
    patient_name: Optional[str] = None
    patologia: str
    enrollment_date: str
    precedenti: List[AppointmentSummary]
    oggi: List[AppointmentSummary] 
    successivo: List[AppointmentSummary]
    total_appointments: int
    
class HealthResponse(BaseModel):
    """Health check response"""
    service: str
    status: str
    timestamp: datetime
    database_status: str
    port: int

# Constants for hardcoded values (temporary)
HARDCODED_DOCTOR_CREDENTIALS = {
    "DOC001": DoctorCredentials(
        nome_completo="Dr. Mario Rossi",
        codice_medico="DOC001",
        specializzazione="Diabetologia",
        firma_digitale="HARDCODED_SIGNATURE_001",
        struttura="ASL Roma 1"
    ),
    "DOC002": DoctorCredentials(
        nome_completo="Dr. Laura Bianchi", 
        codice_medico="DOC002",
        specializzazione="Diabetologia",
        firma_digitale="HARDCODED_SIGNATURE_002",
        struttura="ASL Roma 1"
    )
}

# Protocol definitions (hardcoded for now)
PATHOLOGY_PROTOCOLS = {
    PatologiaEnum.DIABETES_TYPE2: [
        {
            "type": AppointmentType.VISITA_DIABETOLOGICA,
            "frequency_months": 3,
            "required_annually": 4,
            "description": "Routine diabetes follow-up"
        },
        {
            "type": AppointmentType.LABORATORIO_HBA1C,
            "frequency_months": 3,
            "required_annually": 4,
            "description": "Glycemic control monitoring"
        },
        {
            "type": AppointmentType.VISITA_OCULISTICA,
            "frequency_months": 12,
            "required_annually": 1,
            "description": "Diabetic retinopathy screening"
        }
    ],
    PatologiaEnum.DIABETES_TYPE1: [
        {
            "type": AppointmentType.VISITA_DIABETOLOGICA,
            "frequency_months": 3,
            "required_annually": 4,
            "description": "Routine diabetes follow-up"
        },
        {
            "type": AppointmentType.LABORATORIO_HBA1C,
            "frequency_months": 3,
            "required_annually": 4,
            "description": "Glycemic control monitoring"
        }
    ]
}