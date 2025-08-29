# services/admin-dashboard/app/config.py
"""
Admin Dashboard Configuration
Settings and constants for healthcare admin interface
"""

import os
from typing import Dict, List

class AdminSettings:
    """Admin dashboard settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "admin-dashboard"
    SERVICE_VERSION: str = "1.0.0"
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8084))
    ENV: str = os.getenv("ENV", "development")
    
    # Database Configuration (same as other services)
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://:redis123@redis:6379/0")
    
    # External Services URLs
    TIMELINE_SERVICE_URL: str = os.getenv("TIMELINE_SERVICE_URL", "http://timeline-service:8001")
    ANALYTICS_SERVICE_URL: str = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002")
    SCHEDULER_SERVICE_URL: str = os.getenv("SCHEDULER_SERVICE_URL", "http://scheduler-service:8003")
    API_GATEWAY_URL: str = os.getenv("API_GATEWAY_URL", "http://api-gateway:8080")
    
    # Admin Dashboard Specific
    ADMIN_TITLE: str = "Dashboard Amministrativo ASL"
    ADMIN_DESCRIPTION: str = "Interfaccia di gestione per sistema diabetes cronico"
    
    # Healthcare Configuration
    HOSPITAL_NAME: str = "ASL Diabetes Management System"
    SYSTEM_VERSION: str = "2.0.0"
    
    # Admin Features (can be toggled)
    FEATURES_ENABLED: Dict[str, bool] = {
        "patient_management": True,
        "doctor_management": True,
        "appointment_overview": True,
        "system_monitoring": True,
        "basic_reporting": True,
        "data_export": True,
        "user_management": False,  # Future feature
        "advanced_analytics": False  # Future feature
    }

# Initialize settings
settings = AdminSettings()

# Service URLs for API calls
SERVICES: Dict[str, str] = {
    "timeline": settings.TIMELINE_SERVICE_URL,
    "analytics": settings.ANALYTICS_SERVICE_URL,
    "scheduler": settings.SCHEDULER_SERVICE_URL,
    "gateway": settings.API_GATEWAY_URL
}

# Page navigation structure
ADMIN_NAVIGATION: List[Dict[str, str]] = [
    {"name": "Dashboard", "url": "/", "icon": "🏠"},
    {"name": "Pazienti", "url": "/patients", "icon": "👥"},
    {"name": "Medici", "url": "/doctors", "icon": "👨‍⚕️"},
    {"name": "Sistema", "url": "/system", "icon": "⚙️"},
    {"name": "Report", "url": "/reports", "icon": "📊"}
]