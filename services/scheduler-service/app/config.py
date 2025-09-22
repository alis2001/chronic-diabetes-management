# services/scheduler-service/app/config.py
"""
Scheduler Service Configuration
Settings and constants for appointment scheduling system
"""

import os
from typing import Dict, List
from datetime import time
import logging

logger = logging.getLogger(__name__)

class SchedulerSettings:
    """Scheduler service settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "scheduler-service"
    SERVICE_VERSION: str = "1.0.0"
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8003))
    ENV: str = os.getenv("ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Database Configuration (same as other services)
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
    )
    DATABASE_NAME: str = "diabetes_db"
    
    # External Services URLs
    TIMELINE_SERVICE_URL: str = os.getenv("TIMELINE_SERVICE_URL", "http://timeline-service:8001")
    ANALYTICS_SERVICE_URL: str = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002")
    ADMIN_DASHBOARD_URL: str = os.getenv("ADMIN_DASHBOARD_URL", "http://admin-dashboard:8084")
    
    # API Configuration
    API_TITLE: str = "Scheduler Service"
    API_DESCRIPTION: str = "Appointment Scheduling with Admin-Configured Exam Integration"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    
    # Scheduling Configuration
    APPOINTMENT_SLOTS_PER_DAY: int = 16  # 8 hours * 2 slots per hour
    APPOINTMENT_DURATION_MINUTES: int = 30
    WORKING_HOURS_START: time = time(9, 0)   # 9:00 AM
    WORKING_HOURS_END: time = time(17, 0)    # 5:00 PM
    LUNCH_BREAK_START: time = time(13, 0)    # 1:00 PM
    LUNCH_BREAK_END: time = time(14, 0)      # 2:00 PM
    
    # Days of week (1=Monday, 7=Sunday)
    WORKING_DAYS: List[int] = [1, 2, 3, 4, 5]  # Monday to Friday
    
    # Future scheduling limits
    MAX_DAYS_IN_ADVANCE: int = 90  # 3 months
    MIN_DAYS_IN_ADVANCE: int = 1   # Next day minimum

# Initialize settings
settings = SchedulerSettings()

def get_cors_origins():
    """Get CORS origins based on environment"""
    vm_host = os.getenv("VM_HOST", "localhost")
    env = os.getenv("ENV", "development")
    
    base_origins = [
        f"http://{vm_host}:3010",  # Timeline Frontend
        f"http://{vm_host}:3011",  # Analytics Frontend  
        f"http://{vm_host}:3012",  # Admin Frontend
        f"http://{vm_host}:3013",  # Scheduler Frontend
        f"http://{vm_host}:8080",  # API Gateway
    ]
    
    # Add additional origins from environment
    cors_env = os.getenv("CORS_ORIGINS", "")
    if cors_env:
        additional_origins = [origin.strip() for origin in cors_env.split(",")]
        base_origins.extend(additional_origins)
    
    # Development localhost variants
    if env == "development":
        base_origins.extend([
            "http://localhost:3010",
            "http://localhost:3011", 
            "http://localhost:3012",
            "http://localhost:3013",
            "http://localhost:8080"
        ])
    
    logger.info(f"🔗 Scheduler CORS Origins: {base_origins}")
    return base_origins

# Italian healthcare system constants
HEALTHCARE_CONSTANTS = {
    "ASL_NAME": "ASL Roma 1",
    "DEPARTMENT_NAME": "Ambulatorio Diabetologia",
    "SYSTEM_NAME": "Sistema Gestione Appuntamenti",
    "TIMEZONE": "Europe/Rome"
}

# Appointment priority levels
APPOINTMENT_PRIORITIES = {
    "routine": {"name": "Controllo Routine", "days_advance": 30},
    "followup": {"name": "Follow-up", "days_advance": 14}, 
    "urgent": {"name": "Urgente", "days_advance": 3},
    "emergency": {"name": "Emergenza", "days_advance": 1}
}

# Default exam requirements by appointment type
DEFAULT_EXAM_REQUIREMENTS = {
    "visita_diabetologica": ["HbA1c", "Glicemia"],
    "visita_oculistica": ["Fundus Oculi"],
    "laboratorio_hba1c": ["HbA1c"],
    "laboratorio_glicemia": ["Glicemia", "Curva Glicemica"]
}