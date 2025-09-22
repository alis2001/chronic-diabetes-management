# services/scheduler-service/app/models.py
"""
Scheduler Service Data Models
Date-based appointment scheduling with visual density gradients
Shows doctor appointment density with colors approaching red for busy dates
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
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
# REQUEST MODELS
# ================================

class ScheduleAppointmentRequest(BaseModel):
    """Request to schedule new appointment on specific date"""
    cf_paziente: str = Field(..., min_length=16, max_length=16)
    id_medico: str = Field(...)
    cronoscita_id: str = Field(...)
    
    # Date-only scheduling
    appointment_date: date = Field(...)
    
    # Exam selection from database (visualizza_nel_referto = "S")
    selected_exam_mappings: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('cf_paziente')
    def validate_codice_fiscale(cls, v):
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale non valido')
        return v.upper()

class GetDoctorDensityRequest(BaseModel):
    """Request to get doctor's appointment density visualization"""
    id_medico: str = Field(...)
    start_date: date = Field(...)
    end_date: date = Field(...)

class GetExamsForSchedulingRequest(BaseModel):
    """Get available exams for scheduling"""
    cronoscita_id: str = Field(...)

# ================================
# RESPONSE MODELS
# ================================

class DateDensity(BaseModel):
    """Single date with appointment density visualization"""
    date: date = Field(...)
    day_name: str = Field(...)  # "Lunedì", "Martedì", etc.
    
    # Appointment count and density
    appointment_count: int = Field(..., ge=0)
    density_level: DensityLevel = Field(...)
    
    # Visual indicators (gradient approaching red for busy dates)
    background_color: str = Field(...)  # Hex color: #E8F5E8 → #FF4444
    text_color: str = Field(...)        # Contrast text color
    density_percentage: float = Field(..., ge=0, le=100)  # For progress bars
    
    # UI descriptions
    density_description: str = Field(...)  # "Molto Libero", "Occupato", "Pieno"
    appointment_summary: str = Field(...)  # "3 appuntamenti programmati"

class ExamForScheduling(BaseModel):
    """Exam available for scheduling from database"""
    mapping_id: str = Field(...)
    codice_catalogo: str = Field(...)
    nome_esame_catalogo: str = Field(...)
    codoffering_wirgilio: str = Field(...)
    nome_esame_wirgilio: str = Field(...)
    struttura_nome: str = Field(...)

class DoctorDensityResponse(BaseModel):
    """Doctor's appointment density visualization"""
    success: bool
    id_medico: str
    doctor_name: str
    specialization: str
    period_start: date
    period_end: date
    
    # Date-by-date density visualization
    date_densities: List[DateDensity] = Field(...)
    
    # Summary statistics
    total_future_appointments: int
    busiest_date: Optional[date] = None
    busiest_date_count: int = 0
    freest_dates: List[date] = Field(default_factory=list)
    average_appointments_per_day: float = 0.0
    
    # Recommendations for scheduling
    recommended_dates: List[date] = Field(default_factory=list)  # Low density dates

class ScheduleAppointmentResponse(BaseModel):
    """Response after scheduling appointment"""
    success: bool
    message: str
    appointment_id: Optional[str] = None
    appointment_date: Optional[date] = None
    selected_exams_count: int = 0
    exam_details: List[ExamForScheduling] = Field(default_factory=list)
    
    # Updated density info for the scheduled date
    updated_date_density: Optional[DateDensity] = None

class GetExamsResponse(BaseModel):
    """Available exams for scheduling"""
    success: bool
    cronoscita_id: str
    cronoscita_name: str
    available_exams: List[ExamForScheduling]
    total_exams: int

# ================================
# DATABASE MODELS
# ================================

class AppointmentDocument(BaseModel):
    """Appointment document for database storage"""
    appointment_id: Optional[str] = None
    cf_paziente: str
    id_medico: str
    cronoscita_id: str
    
    # Date-based scheduling
    appointment_date: date = Field(...)
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    
    # Exam requirements from database
    required_exam_mappings: List[str] = Field(default_factory=list)
    exam_details: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Administrative
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: str  # Doctor ID
    
    # Timeline integration
    referto_saved: bool = False
    referto_id: Optional[str] = None

# ================================
# DENSITY CALCULATION MODELS
# ================================

class DensityCalculationInput(BaseModel):
    """Input for calculating date density"""
    date: date
    appointment_count: int
    max_appointments_observed: int  # For relative density calculation

class DensityVisualization(BaseModel):
    """Visual representation of appointment density"""
    density_level: DensityLevel
    background_color: str
    text_color: str
    density_percentage: float
    description: str
    
# Color gradient mapping (approaching red for busy dates)
DENSITY_COLORS = {
    DensityLevel.VERY_LOW: {
        "bg": "#E8F5E8",      # Very light green
        "text": "#2D5A2D",
        "description": "Molto Libero"
    },
    DensityLevel.LOW: {
        "bg": "#FFF3CD",      # Light yellow
        "text": "#664D03", 
        "description": "Libero"
    },
    DensityLevel.MEDIUM: {
        "bg": "#FFE4B5",      # Light orange
        "text": "#B45309",
        "description": "Moderato"
    },
    DensityLevel.HIGH: {
        "bg": "#FECACA",      # Light red
        "text": "#B91C1C",
        "description": "Occupato"
    },
    DensityLevel.VERY_HIGH: {
        "bg": "#FF4444",      # Strong red
        "text": "#FFFFFF",
        "description": "Molto Occupato"
    }
}

# ================================
# HELPER MODELS
# ================================

class HealthResponse(BaseModel):
    """Health check response"""
    service: str
    status: str
    timestamp: datetime
    database_connected: bool