# services/analytics-service/app/config.py
"""
Analytics Service Configuration
Wirgilio API integration configuration - UPDATED FOR NEW HTTPS ENDPOINTS
"""

import os
from typing import Dict, Set

class Settings:
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "analytics-service"
    SERVICE_VERSION: str = "2.0.0"
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8002))
    ENV: str = os.getenv("ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    
    # API Configuration
    API_TITLE: str = "Analytics Service"
    API_DESCRIPTION: str = "Medical Laboratory Data Analytics - Wirgilio Integration"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    
    # UPDATED: Wirgilio API Configuration for NEW HTTPS Endpoints
    WIRGILIO_BASE_URL: str = os.getenv("WIRGILIO_BASE_URL", "https://10.10.13.14")
    WIRGILIO_API_PATH: str = os.getenv("WIRGILIO_API_PATH", "/cpi/wirgilio-api")
    WIRGILIO_TOKEN: str = os.getenv("WIRGILIO_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTkyIiwiaWF0IjoxNTkyMjI5MTA5fQ.Nr9Wk6NAJuEa16OV8a_Qc3VAWhDrMYfkD_E33tfMQqA")
    
    # NEW: Laboratory endpoint path
    WIRGILIO_ESAMI_ENDPOINT: str = "/esamilaboratorios/listperdataora"
    
    # NEW: SSL Configuration
    WIRGILIO_VERIFY_SSL: bool = os.getenv("WIRGILIO_VERIFY_SSL", "true").lower() == "true"
    WIRGILIO_SSL_TIMEOUT: int = int(os.getenv("WIRGILIO_SSL_TIMEOUT", "30"))
    
    # Analytics Configuration
    ANALYTICS_TIMEOUT_SECONDS: int = int(os.getenv("ANALYTICS_TIMEOUT_SECONDS", 120))
    MAX_CHART_DATA_POINTS: int = int(os.getenv("MAX_CHART_DATA_POINTS", 1000))
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 2
    
    # COMPUTED: Full API URLs
    @property
    def WIRGILIO_API_BASE(self) -> str:
        """Complete base URL for Wirgilio API"""
        return f"{self.WIRGILIO_BASE_URL}{self.WIRGILIO_API_PATH}"
    
    @property 
    def WIRGILIO_ENDPOINT(self) -> str:
        """Complete endpoint for laboratory data"""
        return self.WIRGILIO_ESAMI_ENDPOINT

# Initialize settings
settings = Settings()

# Data validation constraints
DATA_CONSTRAINTS = {
    # Invalid value patterns to skip
    "INVALID_VALUES": {"-3.0", "", "campione insufficiente", "non determinabile", "nd", "n.d."},
    
    # Valid anomaly flags (treat anything else as normal)
    "VALID_ANOMALY_FLAGS": {"N", "P", "AP"},
    
    # Anomaly flags that should trigger red color
    "ANOMALY_FLAGS": {"P", "AP"},
    
    # Normal flags
    "NORMAL_FLAGS": {"N"},
    
    # Minimum data points required for charting (even 1 point should be shown)
    "MIN_CHART_POINTS": 1,
    
    # Maximum processing time per patient (seconds)
    "MAX_PROCESSING_TIME": 60
}

# Chart color configuration for anomaly detection
CHART_COLORS: Dict[str, str] = {
    "normal": "#10b981",      # Green for normal values only
    "anomaly": "#dc2626",     # Red for any P or AP anomalies
    "neutral": "#6b7280"      # Gray for unknown/empty
}

# Diabetes-related exam codes (only for filtering relevant exams)
DIABETES_RELEVANT_CODES: Set[str] = {
    "301", "301U",    # GLUCOSIO
    "302", "302U",    # UREA  
    "303", "303U",    # CREATININA
    "304", "305",     # SODIO, POTASSIO
    "309", "310", "310U", "311", "311U",  # CPK, GOT/AST, GPT/ALT
    "315",            # LDH
    "105", "107", "109",  # Coagulation tests
    "EMO",            # EMOCROMO
    "MY", "MYU",      # MIOGLOBINA
    "TR", "TRU",      # TROPONINA
    "CM", "CMU"       # CK-MB
}