# services/analytics-service/app/models.py
"""
Analytics Service Data Models
Pydantic models for Wirgilio API integration and medical data analytics
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import re

# ================================
# ENUMS
# ================================

class AnomalyStatus(str, Enum):
    """Anomaly status based on flaganomalia values"""
    NORMAL = "normal"          # Only N flags in history
    ANOMALY = "anomaly"        # Contains P or AP flags
    UNKNOWN = "unknown"        # No valid flags or empty data

# ================================
# REQUEST/INPUT MODELS
# ================================

class AnalyticsRequest(BaseModel):
    """Base analytics request with CF validation"""
    codice_fiscale: str = Field(..., min_length=16, max_length=16, description="Codice fiscale paziente")
    
    @validator('codice_fiscale')
    def validate_codice_fiscale(cls, v):
        """Validate Italian fiscal code format"""
        if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', v.upper()):
            raise ValueError('Formato codice fiscale non valido')
        return v.upper()

# ================================
# WIRGILIO DATA MODELS
# ================================

class WirgilioRisultato(BaseModel):
    """Single test result from Wirgilio API"""
    dessottoanalisi: str
    valore: str
    unitadimisura: Optional[str] = ""
    rangevalori: Optional[str] = ""
    flaganomalia: Optional[str] = "N"  # Default to normal if missing
    datavalidazione: Optional[str] = ""
    oravalidazione: Optional[str] = ""

class WirgilioEsame(BaseModel):
    """Single exam from Wirgilio API"""
    desesame: str
    codoffering: str
    risultati: List[WirgilioRisultato]

class WirgilioReport(BaseModel):
    """Complete laboratory report from Wirgilio API"""
    codicefiscale: str
    nome: str
    cognome: str
    datareferto: str
    orareferto: str
    esami: List[WirgilioEsame]

# ================================
# PROCESSED DATA MODELS
# ================================

class ProcessedResult(BaseModel):
    """Processed individual test result"""
    dessottoanalisi: str
    valore: str
    valore_numerico: Optional[float] = None
    unitadimisura: str
    rangevalori: str
    flaganomalia: str
    datareferto: str
    is_anomaly: bool
    is_valid_value: bool
    codoffering_original: Optional[str] = None  # ADD THIS LINE

class ExamSummary(BaseModel):
    """Summary of exam type (desesame) with anomaly info"""
    exam_key: str = Field(..., description="desesame_codoffering")
    desesame: str
    codoffering: str
    has_anomaly: bool = Field(..., description="Contains any P or AP flags")
    anomaly_status: AnomalyStatus
    sottanalisi_count: int
    total_results: int
    anomaly_count: int

class SottanalisiSummary(BaseModel):
    """Summary of specific parameter (dessottoanalisi)"""
    dessottoanalisi: str
    has_anomaly: bool
    anomaly_status: AnomalyStatus
    total_values: int
    anomaly_count: int
    latest_value: Optional[str] = None
    latest_date: Optional[str] = None
    unit: Optional[str] = None

class ChartDataPoint(BaseModel):
    """Single point for chart visualization"""
    date: str = Field(..., description="Date from datareferto")
    value: float = Field(..., description="Numeric value")
    valore_originale: str = Field(..., description="Original string value")
    anomaly: bool = Field(..., description="Is P or AP flag")
    flag: str = Field(..., description="Original flaganomalia")
    unit: str = Field(..., description="Unit from data")
    range: str = Field(..., description="Range from data")
    formatted_date: str = Field(..., description="DD/MM/YYYY format")
    struttura: str = Field(..., description="Hospital unit/structure")  # ADD THIS LINE
    codoffering: str = Field(..., description="Original codoffering for context")  # ADD THIS LINE

# ================================
# API RESPONSE MODELS
# ================================

class HealthResponse(BaseModel):
    """Health check response"""
    service: str
    status: str
    timestamp: datetime
    port: int
    wirgilio_status: str

class ExamListResponse(BaseModel):
    """Response for exam dropdown population"""
    success: bool
    codice_fiscale: str
    exam_summaries: List[ExamSummary]
    total_exams: int
    processing_summary: Dict[str, int] = Field(default_factory=dict)

class SottanalisiListResponse(BaseModel):
    """Response for sottanalisi dropdown population"""
    success: bool
    exam_key: str
    desesame: str
    codoffering: str
    sottanalisi: List[SottanalisiSummary]
    total_sottanalisi: int

class ChartDataResponse(BaseModel):
    """Response for chart data generation"""
    success: bool
    exam_key: str
    dessottoanalisi: str
    chart_data: List[ChartDataPoint]
    total_points: int
    anomaly_points: int
    anomaly_percentage: float
    chart_color: str = Field(..., description="Color based on anomaly presence")

# ================================
# ERROR MODELS
# ================================

class AnalyticsError(BaseModel):
    """Error response model"""
    success: bool = False
    error_type: str
    message: str
    details: Optional[Dict[str, Any]] = None