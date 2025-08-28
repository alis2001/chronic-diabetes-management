# services/timeline-service/app/config.py
"""
Timeline Service Configuration
Centralized configuration and constants management
"""

import os
from typing import Dict
from .models import DoctorCredentials, PatologiaEnum, AppointmentType

class Settings:
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "timeline-service"
    SERVICE_VERSION: str = "2.0.0"
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8001))
    ENV: str = os.getenv("ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    
    # Database Configuration
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
    )
    DATABASE_NAME: str = "diabetes_timeline_db"
    
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
        nome_completo="Dr. Laura Bianchi", 
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
        nome_completo="Dr. Anna Ferrari",
        codice_medico="DOC004",
        specializzazione="Diabetologia Pediatrica",
        firma_digitale="HARDCODED_SIGNATURE_004",
        struttura="ASL Roma 1"
    )
}

# Available appointment types by pathology
AVAILABLE_APPOINTMENT_TYPES: Dict[PatologiaEnum, list] = {
    PatologiaEnum.DIABETES_TYPE2: [
        AppointmentType.VISITA_DIABETOLOGICA,
        AppointmentType.LABORATORIO_HBA1C,
        AppointmentType.LABORATORIO_GLICEMIA,
        AppointmentType.VISITA_OCULISTICA,
        AppointmentType.TEST_NEUROPATIA,
        AppointmentType.ECO_ADDOME
    ],
    PatologiaEnum.DIABETES_TYPE1: [
        AppointmentType.VISITA_DIABETOLOGICA,
        AppointmentType.LABORATORIO_HBA1C,
        AppointmentType.LABORATORIO_GLICEMIA,
        AppointmentType.VISITA_OCULISTICA,
        AppointmentType.TEST_NEUROPATIA
    ],
    PatologiaEnum.DIABETES_GESTATIONAL: [
        AppointmentType.VISITA_DIABETOLOGICA,
        AppointmentType.LABORATORIO_GLICEMIA,
        AppointmentType.VISITA_OCULISTICA
    ],
    PatologiaEnum.HYPERTENSION_PRIMARY: [
        AppointmentType.VISITA_DIABETOLOGICA,
        AppointmentType.ECO_ADDOME,
        AppointmentType.LABORATORIO_GLICEMIA
    ],
    PatologiaEnum.CARDIOVASCULAR: [
        AppointmentType.VISITA_DIABETOLOGICA,
        AppointmentType.ECO_ADDOME,
        AppointmentType.TEST_NEUROPATIA
    ]
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