# services/scheduler-service/app/models.py
"""
Scheduler Service Data Models - FIXED VERSION
Date-based appointment scheduling with visual density gradients - NO CIRCULAR REFERENCES
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import DateDensity
    from datetime import datetime, date
from enum import Enum
import re

# ================================
# ENUMS
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
# SIMPLE DATA MODELS (NO CIRCULAR REFS)
# ================================

class ExamForScheduling(BaseModel):
    """Single exam available for scheduling - SIMPLIFIED"""
    mapping_id: str = Field(..., description="Exam mapping ID")
    exam_name: str = Field(..., description="Nome esame")
    structure_name: str = Field(..., description="Nome struttura")
    is_active: bool = Field(default=True, description="Attivo per programmazione")
    notes: Optional[str] = Field(None, description="Note amministrative")

class DateDensity(BaseModel):
    """Single date with appointment density visualization - SIMPLIFIED"""
    date: date = Field(..., description="Data")
    day_name: str = Field(..., description="Nome giorno")
    appointment_count: int = Field(default=0, description="Numero appuntamenti")
    density_level: DensityLevel = Field(default=DensityLevel.VERY_LOW)
    background_color: str = Field(default="#E8F5E8", description="Colore sfondo")
    text_color: str = Field(default="#2D5A2D", description="Colore testo")
    is_available: bool = Field(default=True, description="Disponibile per prenotazioni")

# ================================
# REQUEST MODELS
# ================================

class ScheduleAppointmentRequest(BaseModel):
    """Request to schedule new appointment on specific date"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(..., description="Doctor ID")
    cronoscita_id: str = Field(..., description="Cronoscita pathology ID")
    
    # Date-only scheduling
    appointment_date: date = Field(..., description="Data appuntamento")
    
    # Exam selection from database (visualizza_nel_referto = "S")
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
# RESPONSE MODELS
# ================================

class ScheduleAppointmentResponse(BaseModel):
    """Response after scheduling appointment - SIMPLIFIED"""
    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    appointment_id: Optional[str] = Field(None, description="Generated appointment ID")
    appointment_date: Optional[date] = Field(None, description="Scheduled date")
    selected_exams_count: int = Field(default=0, description="Number of selected exams")
    
    # Simple exam details (no circular reference)
    exam_details: List[Dict[str, Any]] = Field(default_factory=list, description="Basic exam info")

class DoctorDensityResponse(BaseModel):
    """Doctor density visualization response - SIMPLIFIED"""
    success: bool = Field(..., description="Operation success")
    id_medico: str = Field(..., description="Doctor ID")
    doctor_name: str = Field(..., description="Doctor name")
    
    # Date analysis
    start_date: date = Field(..., description="Period start")
    end_date: date = Field(..., description="Period end")
    total_days: int = Field(..., description="Days analyzed")
    
    dates: List["DateDensity"] = Field(default_factory=list, description="Date density data")
    
    # Simple statistics
    total_future_appointments: int = Field(default=0, description="Total appointments")
    average_per_day: float = Field(default=0.0, description="Average appointments per day")
    busiest_date: Optional[date] = Field(None, description="Busiest date")
    freest_date: Optional[date] = Field(None, description="Freest date")

class GetExamsResponse(BaseModel):
    """Available exams for scheduling - SIMPLIFIED"""
    success: bool = Field(..., description="Operation success")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    cronoscita_name: str = Field(..., description="Cronoscita name")
    available_exams: List[ExamForScheduling] = Field(default_factory=list, description="Available exams")
    total_exams: int = Field(default=0, description="Total exam count")

# ================================
# DATABASE MODELS - SIMPLIFIED
# ================================

class AppointmentDocument(BaseModel):
    """Appointment document for database storage - SIMPLIFIED"""
    appointment_id: Optional[str] = Field(None, description="Appointment ID")
    cf_paziente: str = Field(..., description="Patient fiscal code")
    id_medico: str = Field(..., description="Doctor ID")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    
    # Date-based scheduling
    appointment_date: date = Field(..., description="Appointment date")
    status: AppointmentStatus = Field(default=AppointmentStatus.SCHEDULED)
    
    # Simple exam list (no complex objects)
    required_exam_mappings: List[str] = Field(default_factory=list, description="Required exam mapping IDs")
    exam_details: List[Dict[str, Any]] = Field(default_factory=list, description="Simple exam details")
    
    # Administrative
    notes: Optional[str] = Field(None, description="Administrative notes")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update")
    created_by: str = Field(..., description="Doctor who created")
    
    # Timeline integration flags
    referto_saved: bool = Field(default=False, description="Referto saved flag")
    referto_id: Optional[str] = Field(None, description="Associated referto ID")

# ================================
# UTILITY MODELS
# ================================

class HealthResponse(BaseModel):
    """Health check response"""
    service: str = Field(..., description="Service name")
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    database_connected: bool = Field(..., description="Database connection status")

# ================================
# DENSITY COLORS MAPPING - SIMPLE DICT
# ================================

DENSITY_COLORS = {
    "very_low": {"bg": "#E8F5E8", "text": "#2D5A2D", "description": "Molto Libero"},
    "low": {"bg": "#FFF3CD", "text": "#664D03", "description": "Libero"},
    "medium": {"bg": "#FFE4B5", "text": "#B45309", "description": "Moderato"},
    "high": {"bg": "#FECACA", "text": "#B91C1C", "description": "Occupato"},
    "very_high": {"bg": "#FF4444", "text": "#FFFFFF", "description": "Molto Occupato"}
}