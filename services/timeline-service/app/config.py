# services/timeline-service/app/config.py
"""
Timeline Service Configuration
Centralized configuration and constants management
FIXED: Uses correct enum values and main database
"""

import os
from typing import Dict
from .models import DoctorCredentials, AppointmentType
import logging

logger = logging.getLogger(__name__)

class Settings:
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "timeline-service"
    SERVICE_VERSION: str = "2.0.0"
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8001))
    ENV: str = os.getenv("ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    
    # Database Configuration - FIXED: Use main database
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
    )
    DATABASE_NAME: str = "diabetes_db"  # FIXED: Use same database as admin dashboard
    
    # External Services
    SCHEDULER_SERVICE_URL: str = os.getenv("SCHEDULER_SERVICE_URL", "http://scheduler-service:8003")
    WIRGILIO_API_URL: str = os.getenv("WIRGILIO_API_URL", "http://wirgilio-mock:8090")
    
    # API Configuration
    API_TITLE: str = "Timeline Service"
    API_DESCRIPTION: str = "Patient Timeline Management for Chronic Diabetes Care - Doctor-Driven Workflow"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"

# Initialize settings
settings = Settings()

# Hardcoded Doctor Credentials (temporary - will be moved to database later)
HARDCODED_DOCTOR_CREDENTIALS: Dict[str, DoctorCredentials] = {
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

# Appointment type descriptions
APPOINTMENT_TYPE_DESCRIPTIONS: Dict[AppointmentType, str] = {
    AppointmentType.VISITA_DIABETOLOGICA: "Visita diabetologica di controllo",
    AppointmentType.VISITA_OCULISTICA: "Controllo oculistico per retinopatia diabetica",
    AppointmentType.VISITA_NEUROLOGICA: "Visita neurologica specialistica",
    AppointmentType.LABORATORIO_HBA1C: "Esame emoglobina glicata (HbA1c)",
    AppointmentType.LABORATORIO_GLICEMIA: "Esami glicemia e profilo lipidico",
    AppointmentType.ECO_ADDOME: "Ecografia addome completo",
    AppointmentType.TEST_NEUROPATIA: "Test per neuropatia diabetica"
}

# Default appointment locations by type
APPOINTMENT_LOCATIONS: Dict[AppointmentType, str] = {
    AppointmentType.VISITA_DIABETOLOGICA: "ASL Roma 1 - Ambulatorio Diabetologia",
    AppointmentType.VISITA_OCULISTICA: "ASL Roma 1 - Ambulatorio Oculistico",
    AppointmentType.VISITA_NEUROLOGICA: "ASL Roma 1 - Ambulatorio Neurologico",
    AppointmentType.LABORATORIO_HBA1C: "ASL Roma 1 - Laboratorio Analisi",
    AppointmentType.LABORATORIO_GLICEMIA: "ASL Roma 1 - Laboratorio Analisi",
    AppointmentType.ECO_ADDOME: "ASL Roma 1 - Diagnostica per Immagini",
    AppointmentType.TEST_NEUROPATIA: "ASL Roma 1 - Ambulatorio Diabetologia"
}

# System constants
MAX_APPOINTMENTS_PER_DAY = 8
DEFAULT_APPOINTMENT_DURATION_MINUTES = 30
NOTIFICATION_ADVANCE_DAYS = 2



async def get_available_cronoscita_pathologie_from_db():
    """Get available pathologie from database (Microservices pattern)"""
    from .database import get_database
    from .cronoscita_repository import get_available_pathologie_from_db
    
    try:
        db = await get_database()
        return await get_available_pathologie_from_db(db)
    except Exception as e:
        logger.error(f"❌ Error getting pathologie from database: {str(e)}")
        return []

async def get_pathologie_display_name_from_db(cronoscita_name: str) -> str:
    """Get display name for cronoscita pathologie (Database access)"""
    from .database import get_database
    from .cronoscita_repository import get_pathologie_display_from_db
    
    try:
        db = await get_database()
        return await get_pathologie_display_from_db(db, cronoscita_name)
    except Exception as e:
        logger.error(f"❌ Error getting pathologie display name: {str(e)}")
        return cronoscita_name  # Fallback