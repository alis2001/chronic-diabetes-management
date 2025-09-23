# services/scheduler-service/app/models.py
"""
Scheduler Service Data Models - COMPLETELY FIXED VERSION
NO circular references, NO forward references, NO recursion issues
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from enum import Enum
import re

# ================================
# ENUMS - KEEP THESE SIMPLE
# ================================

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class DensityLevel(str, Enum):
    """Visual density levels for appointment count per date"""
    VERY_LOW = "very_low"       # 0-1 appointments
    LOW = "low"                 # 2-3 appointments  
    MEDIUM = "medium"           # 4-6 appointments
    HIGH = "high"               # 7-10 appointments
    VERY_HIGH = "very_high"     # 11+ appointments

# ================================
# SIMPLE LEAF MODELS (NO DEPENDENCIES)
# ================================

class ExamForScheduling(BaseModel):
    """Single exam available for scheduling"""
    mapping_id: str = Field(..., description="Exam mapping ID")
    exam_name: str = Field(..., description="Nome esame")
    structure_name: str = Field(..., description="Nome struttura")
    is_active: bool = Field(default=True, description="Attivo per programmazione")
    notes: Optional[str] = Field(None, description="Note amministrative")

class DateDensity(BaseModel):
    """Single date with appointment density visualization"""
    date: date = Field(..., description="Data")
    day_name: str = Field(..., description="Nome giorno")
    appointment_count: int = Field(default=0, description="Numero appuntamenti")
    density_level: DensityLevel = Field(default=DensityLevel.VERY_LOW)
    background_color: str = Field(default="#E8F5E8", description="Colore sfondo")
    text_color: str = Field(default="#2D5A2D", description="Colore testo")
    is_available: bool = Field(default=True, description="Disponibile per programmazione")

class HealthResponse(BaseModel):
    """Health check response"""
    service: str = Field(..., description="Service name")
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    database_connected: bool = Field(..., description="Database connection status")

# ================================
# REQUEST MODELS
# ================================

class ScheduleAppointmentRequest(BaseModel):
    """Request to schedule new appointment on specific date"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(..., description="Doctor ID")
    cronoscita_id: str = Field(..., description="Cronoscita pathology ID")
    appointment_date: date = Field(..., description="Data appuntamento")
    selected_exam_mappings: List[str] = Field(default_factory=list, description="Selected exam IDs")
    notes: Optional[str] = Field(None, max_length=500, description="Note opzionali")
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale non valido')
        return v.upper()

class GetDoctorDensityRequest(BaseModel):
    """Request to get doctor's appointment density visualization"""
    id_medico: str = Field(..., description="Doctor ID")
    start_date: date = Field(..., description="Start date")
    end_date: date = Field(..., description="End date")

class GetExamsForSchedulingRequest(BaseModel):
    """Get available exams for scheduling"""
    cronoscita_id: str = Field(..., description="Cronoscita pathology ID")

# ================================
# RESPONSE MODELS - NO CIRCULAR REFERENCES
# ================================

class ScheduleAppointmentResponse(BaseModel):
    """Response after scheduling appointment"""
    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    appointment_id: Optional[str] = Field(None, description="Generated appointment ID")
    appointment_date: Optional[date] = Field(None, description="Scheduled date")
    selected_exams_count: int = Field(default=0, description="Number of selected exams")
    exam_details: List[Dict[str, Any]] = Field(default_factory=list, description="Basic exam info")

class DoctorDensityResponse(BaseModel):
    """Doctor density visualization response - NO CIRCULAR REFERENCES"""
    success: bool = Field(..., description="Operation success")
    id_medico: str = Field(..., description="Doctor ID")
    doctor_name: str = Field(..., description="Doctor name")
    start_date: date = Field(..., description="Period start")
    end_date: date = Field(..., description="Period end")
    total_days: int = Field(..., description="Days analyzed")
    
    # CRITICAL FIX: Use List[Dict] instead of List[DateDensity] to avoid recursion
    dates: List[Dict[str, Any]] = Field(default_factory=list, description="Date density data as dicts")
    
    total_future_appointments: int = Field(default=0, description="Total appointments")
    average_per_day: float = Field(default=0.0, description="Average appointments per day")
    busiest_date: Optional[date] = Field(None, description="Busiest date")
    freest_date: Optional[date] = Field(None, description="Freest date")

class GetExamsResponse(BaseModel):
    """Available exams for scheduling"""
    success: bool = Field(..., description="Operation success")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    cronoscita_name: str = Field(..., description="Cronoscita name")
    
    # CRITICAL FIX: Use List[Dict] instead of List[ExamForScheduling] to avoid recursion  
    available_exams: List[Dict[str, Any]] = Field(default_factory=list, description="Available exams as dicts")
    total_exams: int = Field(default=0, description="Total exam count")

# ================================
# DATABASE MODELS
# ================================

class AppointmentDocument(BaseModel):
    """Appointment document for database storage"""
    appointment_id: Optional[str] = Field(None, description="Appointment ID")
    cf_paziente: str = Field(..., description="Patient fiscal code")
    id_medico: str = Field(..., description="Doctor ID")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    appointment_date: date = Field(..., description="Appointment date")
    status: AppointmentStatus = Field(default=AppointmentStatus.SCHEDULED)
    required_exam_mappings: List[str] = Field(default_factory=list, description="Required exam mapping IDs")
    exam_details: List[Dict[str, Any]] = Field(default_factory=list, description="Simple exam details")
    notes: Optional[str] = Field(None, description="Administrative notes")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update")
    created_by: str = Field(..., description="Doctor who created")
    referto_saved: bool = Field(default=False, description="Referto saved flag")
    referto_id: Optional[str] = Field(None, description="Associated referto ID")

# ================================
# DENSITY COLORS MAPPING
# ================================

DENSITY_COLORS = {
    "very_low": {"bg": "#E8F5E8", "text": "#2D5A2D", "description": "Molto Libero"},
    "low": {"bg": "#FFF3CD", "text": "#664D03", "description": "Libero"},
    "medium": {"bg": "#FFE4B5", "text": "#B45309", "description": "Moderato"},
    "high": {"bg": "#FECACA", "text": "#B91C1C", "description": "Occupato"},
    "very_high": {"bg": "#FF4444", "text": "#FFFFFF", "description": "Molto Occupato"}
}