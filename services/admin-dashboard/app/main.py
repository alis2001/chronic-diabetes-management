# services/admin-dashboard/app/main.py
"""
Admin Dashboard - COMPLETE VERSION WITH REAL DATA ENDPOINTS
Professional admin interface with actual database integration
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, date
import os
import logging
import sys
import httpx
from typing import List, Dict, Any
from bson import ObjectId
# Import authentication components
from .auth_routes import auth_router
from .session_manager import session_manager
from .database import (
    connect_to_mongo, close_mongo_connection, check_database_health, 
    get_database, LaboratorioRepository  # ← ADD LaboratorioRepository HERE
)
from .models import (  # ← ADD ALL LABORATORY MODELS HERE
    ExamCatalogCreate, ExamCatalogResponse,
    ExamMappingCreate, ExamMappingResponse, 
    LaboratorioOverviewResponse
)
from .config import settings
from .utils import MongoJSONEncoder, serialize_mongo_list, serialize_mongo_doc
# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"/tmp/{settings.SERVICE_NAME}.log", mode="a")
    ]
)
logger = logging.getLogger(__name__)

# Hardcoded doctor information (matching timeline service)
HARDCODED_DOCTORS = {
    "DOC001": {
        "id": "DOC001",
        "nome_completo": "Dr. Mario Rossi",
        "specializzazione": "Diabetologia",
        "struttura": "ASL Roma 1",
        "codice_medico": "DOC001"
    },
    "DOC002": {
        "id": "DOC002", 
        "nome_completo": "Dr.ssa Laura Bianchi",
        "specializzazione": "Diabetologia", 
        "struttura": "ASL Roma 1",
        "codice_medico": "DOC002"
    },
    "DOC003": {
        "id": "DOC003",
        "nome_completo": "Dr. Giuseppe Verdi", 
        "specializzazione": "Endocrinologia",
        "struttura": "ASL Roma 1", 
        "codice_medico": "DOC003"
    }
}

def create_application() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    # Initialize FastAPI app
    app = FastAPI(
        title="Admin Dashboard - Sistema Sanitario ASL",
        description="Dashboard amministrativo per gestione sistema diabetes cronico",
        version="1.0.0"
    )

    def get_cors_origins():
        """Get CORS origins based on environment"""
        # Get VM host from environment (localhost for dev, 10.10.13.122 for VM)
        vm_host = os.getenv("VM_HOST", "localhost")
        env = os.getenv("ENV", "development")
        
        # Base origins using environment variable
        base_origins = [
            f"http://{vm_host}:3010",  # Timeline Frontend
            f"http://{vm_host}:3011",  # Analytics Frontend  
            f"http://{vm_host}:3012",  # Admin Frontend
            f"http://{vm_host}:8080",  # API Gateway
        ]
        
        # Add additional origins from environment if specified
        cors_env = os.getenv("CORS_ORIGINS", "")
        if cors_env:
            additional_origins = [origin.strip() for origin in cors_env.split(",")]
            base_origins.extend(additional_origins)
        
        # In development, also allow localhost variants
        if env == "development":
            base_origins.extend([
                "http://localhost:3010",
                "http://localhost:3011", 
                "http://localhost:3012",
                "http://localhost:8080"
            ])
        
        logger.info(f"🏥 Admin Dashboard CORS Origins: {base_origins}")
        return base_origins

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),  # Dynamic origins based on environment
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"]
    )

    # Mount static files
    if os.path.exists("app/static"):
        app.mount("/static", StaticFiles(directory="app/static"), name="static")

    # Setup templates
    if os.path.exists("app/templates"):
        templates = Jinja2Templates(directory="app/templates")
    else:
        templates = None

    # Include authentication routes
    app.include_router(auth_router)

    # ================================
    # HELPER FUNCTIONS
    # ================================

    def format_date(date_obj) -> str:
        """Format date for display"""
        if isinstance(date_obj, datetime):
            return date_obj.strftime("%d/%m/%Y %H:%M")
        elif isinstance(date_obj, date):
            return date_obj.strftime("%d/%m/%Y")
        return str(date_obj)

    def get_pathology_display(pathology: str) -> str:
        """Get human-readable pathology name"""
        pathology_names = {
            "diabetes_mellitus_type1": "Diabete Mellito Tipo 1",
            "diabetes_mellitus_type2": "Diabete Mellito Tipo 2", 
            "diabetes_gestational": "Diabete Gestazionale",
            "hypertension_primary": "Ipertensione Primaria",
            "hypertension_secondary": "Ipertensione Secondaria",
            "cardiovascular": "Malattie Cardiovascolari",
            "chronic_kidney": "Malattia Renale Cronica"
        }
        return pathology_names.get(pathology, pathology.replace("_", " ").title())

    def get_appointment_type_display(appointment_type: str) -> str:
        """Get human-readable appointment type"""
        type_names = {
            "visita_diabetologica": "Visita Diabetologica",
            "visita_oculistica": "Visita Oculistica", 
            "visita_neurologica": "Visita Neurologica",
            "laboratorio_hba1c": "Esame HbA1c",
            "laboratorio_glicemia": "Esame Glicemia",
            "eco_addome": "Ecografia Addome",
            "test_neuropatia": "Test Neuropatia"
        }
        return type_names.get(appointment_type, appointment_type.replace("_", " ").title())

    # ================================
    # MAIN DASHBOARD ENDPOINTS
    # ================================

    @app.get("/")
    async def read_root():
        """Root endpoint"""
        return {"service": "admin-dashboard", "status": "running", "version": "1.0.0"}

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        try:
            # Test database connection
            db = await get_database()
            await db.command("ping")
            
            return {
                "service": "admin-dashboard",
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "port": settings.SERVICE_PORT,
                "database": "connected",
                "session_duration": "8_hours",
                "roles": ["admin", "manager", "analyst"]
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "service": "admin-dashboard",
                "status": "unhealthy",
                "error": str(e),
                "port": settings.SERVICE_PORT
            }

    # ================================
    # PATIENTS DATA ENDPOINTS
    # ================================

    @app.get("/dashboard/patients/list")
    async def get_patients_list():
        """Get complete list of patients with enrollment information"""
        try:
            db = await get_database()
            
            # Get all patients from timeline database (diabetes_db)
            patients_cursor = db.patients.find({})
            patients = await patients_cursor.to_list(length=None)
            
            patients_data = []
            for patient in patients:
                # Get patient demographics
                demographics = patient.get("demographics", {})
                
                # Get enrolling doctor info
                doctor_id = patient.get("id_medico", "Unknown")
                doctor_info = HARDCODED_DOCTORS.get(doctor_id, {
                    "nome_completo": f"Medico {doctor_id}",
                    "specializzazione": "N/A"
                })
                
                patients_data.append({
                    "codice_fiscale": patient.get("cf_paziente", ""),
                    "nome": demographics.get("nome", "N/A"),
                    "cognome": demographics.get("cognome", "N/A"),
                    "data_nascita": demographics.get("data_nascita", "N/A"),
                    "telefono": demographics.get("telefono", "N/A"),
                    "email": demographics.get("email", "N/A"),
                    "patologia": get_pathology_display(patient.get("patologia", "")),
                    "medico_nome": doctor_info.get("nome_completo", "N/A"),
                    "medico_specializzazione": doctor_info.get("specializzazione", "N/A"),
                    "data_registrazione": format_date(patient.get("enrollment_date")),
                    "status": patient.get("status", "active").title(),
                    "created_at": format_date(patient.get("created_at")),
                    "indirizzo": demographics.get("indirizzo", {})
                })
            
            return {
                "success": True,
                "total": len(patients_data),
                "patients": patients_data
            }
            
        except Exception as e:
            logger.error(f"Error getting patients list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving patients data")


    # ================================
    # BACKEND CHANGES - services/admin-dashboard/app/main.py
    # ================================

    # ADD THESE NEW ENDPOINTS TO YOUR EXISTING main.py

    @app.get("/dashboard/laboratorio/catalogo-for-mapping")
    async def get_catalog_for_mapping():
        """Get simplified catalog list for mapping dropdown"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # Get only enabled catalog entries
            catalog_data = await lab_repo.get_exam_catalog_list(enabled_only=True)
            
            # Format for dropdown with UPPERCASE exam names
            dropdown_options = []
            for exam in catalog_data:
                dropdown_options.append({
                    "value": exam["codice_catalogo"],
                    "label": f"{exam['codice_catalogo']} - {exam['nome_esame'].upper()}",
                    "codice_catalogo": exam["codice_catalogo"],
                    "nome_esame": exam["nome_esame"].upper(),  # FORCE UPPERCASE
                    "codicereg": exam.get("codicereg", ""),
                    "codice_branca": exam.get("codice_branca", "011")
                })
            
            return {
                "success": True,
                "options": dropdown_options,
                "total": len(dropdown_options)
            }
            
        except Exception as e:
            logger.error(f"Error getting catalog for mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving catalog options")

    # MODIFY EXISTING MAPPING ENDPOINT TO ADD VALIDATION AND UPPERCASE
    @app.post("/dashboard/laboratorio/mappings")
    async def create_exam_mapping_enhanced(request: ExamMappingCreate):
        """Create new exam mapping with validation and uppercase names"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # VALIDATE: Ensure codice_catalogo exists in catalog
            catalog_exists = await lab_repo.catalog_collection.find_one({
                "codice_catalogo": request.codice_catalogo,
                "is_enabled": True
            })
            if not catalog_exists:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Codice catalogo {request.codice_catalogo} non trovato o disabilitato"
                )
            
            # VALIDATE: Check for duplicate mapping
            existing_mapping = await lab_repo.mapping_collection.find_one({
                "codice_catalogo": request.codice_catalogo,
                "struttura_nome": request.struttura_nome,
                "codoffering_wirgilio": request.codoffering_wirgilio
            })
            if existing_mapping:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mapping già esistente per questa combinazione"
                )
            
            # FORCE UPPERCASE for exam names
            mapping_data = request.dict()
            mapping_data["nome_esame_wirgilio"] = mapping_data["nome_esame_wirgilio"].upper()
            
            mapping_id = await lab_repo.create_exam_mapping(mapping_data)
            
            logger.info(f"✅ Enhanced mapping created: {request.codice_catalogo} -> {request.struttura_nome} -> {request.codoffering_wirgilio}")
            
            return {
                "success": True,
                "message": f"Mapping creato: {catalog_exists['nome_esame'].upper()} -> {request.struttura_nome}",
                "mapping_id": mapping_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating enhanced exam mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating exam mapping")

    # ================================
    # DOCTORS DATA ENDPOINTS  
    # ================================

    @app.get("/dashboard/doctors/list")
    async def get_doctors_list():
        """Get list of doctors with activity information"""
        try:
            db = await get_database()
            
            doctors_data = []
            
            # Get activity data for each doctor
            for doctor_id, doctor_info in HARDCODED_DOCTORS.items():
                
                # Count patients enrolled by this doctor
                patients_count = await db.patients.count_documents({"id_medico": doctor_id})
                
                # Count total appointments for this doctor
                appointments_count = await db.appointments.count_documents({"id_medico": doctor_id})
                
                # Count appointments by status
                completed_count = await db.appointments.count_documents({
                    "id_medico": doctor_id,
                    "status": "completed"
                })
                
                scheduled_count = await db.appointments.count_documents({
                    "id_medico": doctor_id, 
                    "status": "scheduled"
                })
                
                # Get recent activity (last appointment)
                last_appointment = await db.appointments.find_one(
                    {"id_medico": doctor_id},
                    sort=[("scheduled_date", -1)]
                )
                
                last_activity = "Mai utilizzato"
                if last_appointment:
                    last_activity = format_date(last_appointment.get("scheduled_date"))
                
                # Calculate completion rate
                completion_rate = 0
                if appointments_count > 0:
                    completion_rate = round((completed_count / appointments_count) * 100, 1)
                
                doctors_data.append({
                    "id_medico": doctor_id,
                    "nome_completo": doctor_info.get("nome_completo"),
                    "specializzazione": doctor_info.get("specializzazione"),
                    "struttura": doctor_info.get("struttura"),
                    "codice_medico": doctor_info.get("codice_medico"),
                    "pazienti_registrati": patients_count,
                    "appuntamenti_totali": appointments_count,
                    "appuntamenti_completati": completed_count,
                    "appuntamenti_programmati": scheduled_count,
                    "tasso_completamento": completion_rate,
                    "ultima_attivita": last_activity,
                    "stato": "Attivo" if appointments_count > 0 else "Inattivo"
                })
            
            return {
                "success": True,
                "total": len(doctors_data),
                "doctors": doctors_data
            }
            
        except Exception as e:
            logger.error(f"Error getting doctors list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving doctors data")

    # ================================
    # VISITS DATA ENDPOINTS
    # ================================

    @app.get("/dashboard/visits/list")
    async def get_visits_list():
        """Get complete list of visits/appointments"""
        try:
            db = await get_database()
            
            # Get all appointments
            appointments_cursor = db.appointments.find({}).sort("scheduled_date", -1)
            appointments = await appointments_cursor.to_list(length=None)
            
            visits_data = []
            for appointment in appointments:
                
                # Get patient info
                patient_cf = appointment.get("cf_paziente", "")
                patient = await db.patients.find_one({"cf_paziente": patient_cf})
                
                patient_name = "Paziente Sconosciuto"
                if patient and patient.get("demographics"):
                    demographics = patient["demographics"]
                    patient_name = f"{demographics.get('nome', '')} {demographics.get('cognome', '')}"
                
                # Get doctor info
                doctor_id = appointment.get("id_medico", "")
                doctor_info = HARDCODED_DOCTORS.get(doctor_id, {
                    "nome_completo": f"Medico {doctor_id}"
                })
                
                # Status display
                status_display = {
                    "scheduled": "Programmata",
                    "completed": "Completata", 
                    "cancelled": "Cancellata",
                    "no_show": "Paziente Assente"
                }.get(appointment.get("status", ""), appointment.get("status", "").title())
                
                # Priority display
                priority_display = {
                    "routine": "Routine",
                    "normal": "Normale",
                    "urgent": "Urgente", 
                    "emergency": "Emergenza"
                }.get(appointment.get("priority", "normal"), "Normale")
                
                visits_data.append({
                    "appointment_id": appointment.get("appointment_id", str(appointment.get("_id", ""))),
                    "paziente_cf": patient_cf,
                    "paziente_nome": patient_name.strip(),
                    "medico_nome": doctor_info.get("nome_completo", "N/A"),
                    "medico_specializzazione": doctor_info.get("specializzazione", "N/A"),
                    "tipo_visita": get_appointment_type_display(appointment.get("appointment_type", "")),
                    "data_programmata": format_date(appointment.get("scheduled_date")),
                    "stato": status_display,
                    "priorita": priority_display,
                    "location": appointment.get("location", "N/A"),
                    "note_medico": appointment.get("doctor_notes", ""),
                    "note_completamento": appointment.get("completion_notes", ""),
                    "data_completamento": format_date(appointment.get("completed_at")) if appointment.get("completed_at") else "N/A",
                    "created_at": format_date(appointment.get("created_at"))
                })
            
            return {
                "success": True,
                "total": len(visits_data),
                "visits": visits_data
            }
            
        except Exception as e:
            logger.error(f"Error getting visits list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving visits data")

    # ================================
    # DASHBOARD OVERVIEW ENDPOINTS
    # ================================

    @app.get("/dashboard/overview")
    async def dashboard_overview():
        """System overview with real data"""
        try:
            db = await get_database()
            
            # Count totals
            total_patients = await db.patients.count_documents({})
            total_appointments = await db.appointments.count_documents({})
            completed_appointments = await db.appointments.count_documents({"status": "completed"})
            
            # Count patients by pathology
            pathology_pipeline = [
                {"$group": {"_id": "$patologia", "count": {"$sum": 1}}}
            ]
            pathology_cursor = db.patients.aggregate(pathology_pipeline)
            pathology_stats = await pathology_cursor.to_list(length=None)
            
            pathology_breakdown = {}
            for stat in pathology_stats:
                pathology_breakdown[stat["_id"]] = stat["count"]
            
            return {
                "total_patients": total_patients,
                "total_doctors": len(HARDCODED_DOCTORS),
                "total_appointments": total_appointments,
                "completed_appointments": completed_appointments,
                "completion_rate": round((completed_appointments / total_appointments * 100), 1) if total_appointments > 0 else 0,
                "pathology_breakdown": pathology_breakdown,
                "system_status": "operational",
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Dashboard overview error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving dashboard overview")

    # ================================
    # APPLICATION LIFECYCLE EVENTS
    # ================================

    @app.on_event("startup")
    async def startup_event():
        """Application startup"""
        logger.info(f"🚀 Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
        logger.info(f"🌍 Environment: {settings.ENV}")
        logger.info(f"🔌 Port: {settings.SERVICE_PORT}")
        
        try:
            # Connect to MongoDB
            await connect_to_mongo()
            logger.info("✅ MongoDB connection established")
            
            # Initialize Redis session manager
            await session_manager.init_redis()
            logger.info("✅ Redis session manager initialized")
            
            logger.info("🏥 Admin Dashboard with Real Data Endpoints started successfully!")
            
        except Exception as e:
            logger.error(f"❌ Startup failed: {str(e)}")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Application shutdown"""
        logger.info("🛑 Shutting down Admin Dashboard")
        try:
            await close_mongo_connection()
            logger.info("✅ MongoDB connection closed")
        except Exception as e:
            logger.error(f"❌ Shutdown error: {str(e)}")

    # ================================
    # LABORATORY EXAM MANAGEMENT ENDPOINTS
    # ================================

    @app.get("/dashboard/laboratorio/catalogo")
    async def get_exam_catalog():
        """Get exam catalog list - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            catalog_data = await lab_repo.get_exam_catalog_list()
            
            # Use the new serialization utility
            serialized_catalog = serialize_mongo_list(catalog_data)
            
            return {
                "success": True,
                "total": len(serialized_catalog),
                "catalog": serialized_catalog,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting exam catalog: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving exam catalog")

    @app.get("/dashboard/laboratorio/catalogo-for-mapping")
    async def get_catalog_for_mapping():
        """Get catalog options for mapping dropdown - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # Get enabled exams only
            catalog_data = await lab_repo.get_exam_catalog_list(enabled_only=True)
            
            # Create dropdown options
            dropdown_options = []
            for exam in catalog_data:
                dropdown_options.append({
                    "codice_catalogo": exam.get("codice_catalogo"),
                    "nome_esame": exam.get("nome_esame"),
                    "codicereg": exam.get("codicereg"),
                    "mappings_count": exam.get("mappings_count", 0)
                })
            
            return {
                "success": True,
                "options": dropdown_options,
                "total": len(dropdown_options),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting catalog for mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving catalog options")

    @app.get("/dashboard/laboratorio/mappings")
    async def get_exam_mappings():
        """Get exam mappings list - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            mappings_data = await lab_repo.get_exam_mappings_list()
            
            # Use the new serialization utility
            serialized_mappings = serialize_mongo_list(mappings_data)
            
            return {
                "success": True,
                "total": len(serialized_mappings),
                "mappings": serialized_mappings,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting exam mappings: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving exam mappings")

    @app.post("/dashboard/laboratorio/catalogo")
    async def create_exam_catalog(request: ExamCatalogCreate):
        """Create new exam catalog entry - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # Check if codice_catalogo already exists
            existing = await lab_repo.catalog_collection.find_one({"codice_catalogo": request.codice_catalogo})
            if existing:
                raise HTTPException(status_code=400, detail="Codice catalogo già esistente")
            
            exam_id = await lab_repo.create_exam_catalog(request.dict())
            
            logger.info(f"✅ Exam catalog created: {request.codice_catalogo}")
            
            return {
                "success": True,
                "message": f"Esame {request.nome_esame} aggiunto al catalogo",
                "exam_id": exam_id,
                "codice_catalogo": request.codice_catalogo,
                "created_at": datetime.now().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating exam catalog: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating exam catalog")

    @app.post("/dashboard/laboratorio/mappings")
    async def create_exam_mapping_enhanced(request: ExamMappingCreate):
        """Create new exam mapping with validation - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # VALIDATE: Ensure codice_catalogo exists in catalog
            catalog_exists = await lab_repo.catalog_collection.find_one({
                "codice_catalogo": request.codice_catalogo,
                "is_enabled": True
            })
            if not catalog_exists:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Codice catalogo {request.codice_catalogo} non trovato o disabilitato"
                )
            
            # VALIDATE: Check for duplicate mapping
            existing_mapping = await lab_repo.mapping_collection.find_one({
                "codice_catalogo": request.codice_catalogo,
                "struttura_nome": request.struttura_nome,
                "codoffering_wirgilio": request.codoffering_wirgilio
            })
            if existing_mapping:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mapping già esistente per questa combinazione"
                )
            
            # FORCE UPPERCASE for exam names
            mapping_data = request.dict()
            mapping_data["nome_esame_wirgilio"] = mapping_data["nome_esame_wirgilio"].upper()
            
            mapping_id = await lab_repo.create_exam_mapping(mapping_data)
            
            logger.info(f"✅ Enhanced mapping created: {request.codice_catalogo} -> {request.struttura_nome} -> {request.codoffering_wirgilio}")
            
            return {
                "success": True,
                "message": f"Mapping creato: {catalog_exists['nome_esame'].upper()} -> {request.struttura_nome}",
                "mapping_id": mapping_id,
                "codice_catalogo": request.codice_catalogo,
                "created_at": datetime.now().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating exam mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating exam mapping")

    @app.get("/dashboard/laboratorio/enabled-mappings")
    async def get_enabled_mappings():
        """Get enabled mappings for analytics service - FIXED VERSION"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            mappings = await lab_repo.get_enabled_mappings_for_analytics()
            
            # Serialize the mappings data
            serialized_mappings = serialize_mongo_doc(mappings)
            
            return {
                "success": True,
                "mappings": serialized_mappings,
                "total_enabled_codofferings": len(serialized_mappings) if isinstance(serialized_mappings, dict) else 0,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting enabled mappings: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving enabled mappings")


    @app.delete("/dashboard/laboratorio/mappings/{mapping_id}")
    async def delete_exam_mapping(mapping_id: str):
        """Delete exam mapping - allows exam to be mapped again"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # Find the mapping first to get details for logging
            mapping = await lab_repo.mapping_collection.find_one({"_id": ObjectId(mapping_id)})
            if not mapping:
                raise HTTPException(status_code=404, detail="Mappatura non trovata")
            
            # Delete the mapping
            result = await lab_repo.mapping_collection.delete_one({"_id": ObjectId(mapping_id)})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Mappatura non trovata")
            
            logger.info(f"✅ Mapping deleted: {mapping.get('codice_catalogo')} from {mapping.get('struttura_nome')}")
            
            return {
                "success": True,
                "message": f"Mappatura rimossa. L'esame {mapping.get('codice_catalogo')} può ora essere mappato nuovamente.",
                "deleted_mapping": {
                    "codice_catalogo": mapping.get("codice_catalogo"),
                    "struttura_nome": mapping.get("struttura_nome"),
                    "codoffering_wirgilio": mapping.get("codoffering_wirgilio")
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error deleting mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Errore durante la rimozione della mappatura")

    # ================================
    # HELPER ENDPOINT FOR DEBUGGING
    # ================================

    @app.get("/dashboard/laboratorio/debug/collections")
    async def debug_collections():
        """Debug endpoint to check collection contents"""
        try:
            db = await get_database()
            
            catalog_count = await db.exam_catalog.count_documents({})
            mappings_count = await db.exam_mappings.count_documents({})
            
            # Get sample documents (safely serialized)
            sample_catalog = await db.exam_catalog.find_one({})
            sample_mapping = await db.exam_mappings.find_one({})
            
            return {
                "success": True,
                "debug_info": {
                    "catalog_count": catalog_count,
                    "mappings_count": mappings_count,
                    "sample_catalog": serialize_mongo_doc(sample_catalog) if sample_catalog else None,
                    "sample_mapping": serialize_mongo_doc(sample_mapping) if sample_mapping else None,
                    "collections": ["exam_catalog", "exam_mappings"],
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Debug collections error: {str(e)}")
            raise HTTPException(status_code=500, detail="Debug error")

    return app


# Create the app instance
app = create_application()