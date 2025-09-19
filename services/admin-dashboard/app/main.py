# services/admin-dashboard/app/main.py
"""
Admin Dashboard - CRONOSCITA VERSION - CLEANED
Professional admin interface with Cronoscita organizational structure
"""

from fastapi import FastAPI, Request, HTTPException, Depends, Query
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
from typing import List, Dict, Any, Optional
from bson import ObjectId

# Import authentication components
from .auth_routes import auth_router
from .session_manager import session_manager
from .database import (
    connect_to_mongo, close_mongo_connection, check_database_health, 
    get_database, LaboratorioRepository, CronoscitaRepository,
    MasterCatalogRepository 
)
from .models import (
    ExamCatalogCreate, ExamCatalogResponse,
    ExamMappingCreate, ExamMappingResponse, 
    LaboratorioOverviewResponse,
    CronoscitaCreate, CronoscitaResponse
)
from .config import settings

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
        title="Admin Dashboard - Sistema Sanitario ASL con Cronoscita",
        description="Dashboard amministrativo con struttura organizzativa Cronoscita",
        version=settings.SERVICE_VERSION,
        docs_url="/docs",
        redoc_url="/redoc"
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
        allow_origins=get_cors_origins(),
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

    app.include_router(auth_router)

    # ================================
    # HELPER FUNCTIONS
    # ================================

    def format_date(date_obj) -> str:
        """Format date for display"""
        if not date_obj:
            return "N/A"
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
        return {
            "service": "admin-dashboard", 
            "status": "running", 
            "version": settings.SERVICE_VERSION,
            "cronoscita_support": "enabled",
            "description": "Admin dashboard with Cronoscita organizational structure"
        }

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        try:
            db_health = await check_database_health()
            
            return {
                "service": "admin-dashboard",
                "status": "healthy" if db_health["status"] == "healthy" else "unhealthy", 
                "timestamp": datetime.now(),
                "database": db_health,
                "cronoscita_system": "active"
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {"service": "admin-dashboard", "status": "unhealthy", "error": str(e)}

    # ================================
    # CRONOSCITA MANAGEMENT ENDPOINTS
    # ================================

    @app.get("/dashboard/cronoscita/list")
    async def get_cronoscita_list():
        """Get all Cronoscita with statistics"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            cronoscita_list = await cronoscita_repo.get_all_cronoscita()
            
            return {
                "success": True,
                "total": len(cronoscita_list),
                "cronoscita": cronoscita_list
            }
            
        except Exception as e:
            logger.error(f"Error getting Cronoscita list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving Cronoscita data")

    @app.post("/dashboard/cronoscita")
    async def create_cronoscita(request: CronoscitaCreate):
        """Create new Cronoscita"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            # Check if Cronoscita with this name already exists
            exists = await cronoscita_repo.check_cronoscita_exists(request.nome)
            if exists:
                raise HTTPException(status_code=400, detail=f"Cronoscita '{request.nome}' già esistente")
            
            cronoscita_id = await cronoscita_repo.create_cronoscita(request.dict())
            
            # Get the created Cronoscita
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            
            logger.info(f"✅ Cronoscita created: {request.nome}")
            
            return {
                "success": True,
                "message": f"Cronoscita '{request.nome}' creata con successo",
                "cronoscita": cronoscita_data
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating Cronoscita: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating Cronoscita")

    @app.get("/dashboard/cronoscita/{cronoscita_id}")
    async def get_cronoscita_details(cronoscita_id: str):
        """Get specific Cronoscita details"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            return {
                "success": True,
                "cronoscita": cronoscita_data
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting Cronoscita details: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving Cronoscita details")

    # ================================
    # CRONOSCITA-SCOPED LABORATORY ENDPOINTS
    # ================================

    @app.get("/dashboard/laboratorio/overview/{cronoscita_id}")
    async def get_laboratorio_overview(cronoscita_id: str):
        """Get laboratory overview for specific Cronoscita"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            # Get overview stats for this Cronoscita
            stats = await lab_repo.get_overview_stats(cronoscita_id)
            
            return {
                "success": True,
                "overview": {
                    "cronoscita_id": cronoscita_id,
                    "cronoscita_nome": cronoscita_data["nome"],
                    **stats
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting laboratory overview: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving laboratory overview")

    @app.get("/dashboard/laboratorio/catalogo/{cronoscita_id}")
    async def get_exam_catalog(cronoscita_id: str):
        """Get exam catalog for specific Cronoscita"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            catalog_entries = await lab_repo.get_exam_catalog(cronoscita_id)
            
            return {
                "success": True,
                "cronoscita_nome": cronoscita_data["nome"],
                "total": len(catalog_entries),
                "catalog": catalog_entries
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting exam catalog: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving exam catalog")

    @app.get("/dashboard/prestazioni/search")
    async def search_master_prestazioni(
        query: str = Query(..., min_length=2, description="Search term"), 
        limit: int = Query(20, le=50)
    ):
        """Search master prestazioni catalog"""
        try:
            db = await get_database()
            master_repo = MasterCatalogRepository(db)
            
            results = await master_repo.search_prestazioni(query, limit)
            
            return {
                "success": True,
                "query": query,
                "total_found": len(results),
                "prestazioni": results
            }
            
        except Exception as e:
            logger.error(f"Error searching prestazioni: {str(e)}")
            raise HTTPException(status_code=500, detail="Error searching prestazioni")



    @app.post("/dashboard/laboratorio/catalogo")  # Keep existing endpoint name
    async def create_exam_catalog(request: ExamCatalogCreate):
        """Create exam catalog with master validation"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            master_repo = MasterCatalogRepository(db)  # NEW
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(request.cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=400, detail="Cronoscita non trovata")
            
            # VALIDATE AGAINST MASTER CATALOG
            validation = await master_repo.validate_prestazione({
                "codice_catalogo": request.codice_catalogo,
                "codicereg": request.codicereg,
                "nome_esame": request.nome_esame,
                "codice_branca": request.codice_branca
            })
            
            if not validation["valid"]:
                logger.warning(f"❌ Validation failed: {validation['error']}")
                raise HTTPException(status_code=400, detail=validation["error"])
            
            # Add branch description from master
            exam_data = request.dict()
            exam_data["branch_description"] = validation["master_data"]["branch_description"]
            
            exam_id = await lab_repo.create_exam_catalog(exam_data)
            
            logger.info(f"✅ Validated exam added: {request.codice_catalogo} to {cronoscita_data['nome']}")
            
            return {
                "success": True,
                "message": f"Esame '{request.nome_esame}' aggiunto e validato per {cronoscita_data['nome']}",
                "exam_id": exam_id,
                "validated": True
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating validated exam: {str(e)}")
            raise HTTPException(status_code=500, detail="Errore durante creazione esame")
    


    @app.get("/dashboard/laboratorio/mappings/{cronoscita_id}")
    async def get_exam_mappings(cronoscita_id: str):
        """Get exam mappings for specific Cronoscita"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            mappings = await lab_repo.get_exam_mappings(cronoscita_id)
            
            return {
                "success": True,
                "cronoscita_nome": cronoscita_data["nome"],
                "total": len(mappings),
                "mappings": mappings
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting exam mappings: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving exam mappings")

    @app.delete("/dashboard/laboratorio/catalogo/{codice_catalogo}")
    async def delete_exam_catalog(
        codice_catalogo: str,
        cronoscita_id: str = Query(..., description="Cronoscita ID for security")
    ):
        """Delete exam catalog entry and cascade delete related mappings"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            # Check if exam exists in this Cronoscita
            existing_exam = await lab_repo.get_catalog_by_code(codice_catalogo, cronoscita_id)
            if not existing_exam:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Esame '{codice_catalogo}' non trovato per {cronoscita_data['nome']}"
                )
            
            # Get mappings count before deletion (for response info)
            mappings = await lab_repo.get_exam_mappings_for_catalog(codice_catalogo, cronoscita_id)
            mappings_count = len(mappings)
            
            # Perform cascade deletion
            deleted_exam = await lab_repo.delete_exam_catalog_with_mappings(codice_catalogo, cronoscita_id)
            
            if not deleted_exam:
                raise HTTPException(status_code=500, detail="Errore durante eliminazione esame")
            
            logger.info(f"✅ Exam deleted: {codice_catalogo} from {cronoscita_data['nome']} with {mappings_count} mappings")
            
            return {
                "success": True,
                "message": f"Esame '{existing_exam['nome_esame']}' eliminato con successo",
                "deleted": {
                    "codice_catalogo": codice_catalogo,
                    "nome_esame": existing_exam['nome_esame'],
                    "mappings_deleted": mappings_count,
                    "cronoscita_nome": cronoscita_data['nome']
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting exam catalog: {str(e)}")
            raise HTTPException(status_code=500, detail="Errore interno durante eliminazione")

    @app.delete("/dashboard/laboratorio/mappings/{mapping_id}")
    async def delete_exam_mapping(mapping_id: str):
        """Delete exam mapping by ID"""
        try:
            db = await get_database()
            lab_repo = LaboratorioRepository(db)
            
            # Delete the mapping
            success = await lab_repo.delete_exam_mapping(mapping_id)
            
            if success:
                logger.info(f"✅ Mapping deleted: {mapping_id}")
                return {
                    "success": True,
                    "message": "Mappatura rimossa con successo"
                }
            else:
                raise HTTPException(status_code=404, detail="Mapping not found")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting exam mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error deleting exam mapping")

    @app.post("/dashboard/laboratorio/mappings")
    async def create_exam_mapping(request: ExamMappingCreate):
        """Create exam mapping for specific Cronoscita with business rule validation"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(request.cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=400, detail="Cronoscita not found")
            
            # Verify catalog exam exists in this Cronoscita
            catalog_exists = await lab_repo.get_catalog_by_code(request.codice_catalogo, request.cronoscita_id)
            if not catalog_exists:
                raise HTTPException(status_code=400, detail=f"Exam {request.codice_catalogo} not found in Cronoscita catalog")
            
            # NEW: Validate business rules
            validation_result = await lab_repo.validate_mapping_business_rules(
                request.cronoscita_id,
                request.struttura_nome,
                request.codice_catalogo,
                request.codoffering_wirgilio
            )
            
            if not validation_result["valid"]:
                error_messages = [error["message"] for error in validation_result["errors"]]
                raise HTTPException(
                    status_code=409,  # Conflict status code
                    detail={
                        "error": "Conflitto mappatura",
                        "details": error_messages,
                        "validation_errors": validation_result["errors"]
                    }
                )
            
            # Create mapping with uppercase exam name
            mapping_data = request.dict()
            mapping_data["nome_esame_wirgilio"] = mapping_data["nome_esame_wirgilio"].upper()
            
            mapping_id = await lab_repo.create_exam_mapping(mapping_data)
            
            logger.info(f"✅ Mapping created: {request.codice_catalogo} -> {request.struttura_nome} for Cronoscita {cronoscita_data['nome']}")
            
            return {
                "success": True,
                "message": f"Mapping creato per {cronoscita_data['nome']}: {catalog_exists['nome_esame'].upper()} -> {request.struttura_nome}",
                "mapping_id": mapping_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating exam mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating exam mapping")


    @app.put("/dashboard/laboratorio/mappings/{mapping_id}")
    async def update_exam_mapping(mapping_id: str, request: ExamMappingCreate):
        """Update existing exam mapping with business rule validation"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify mapping exists
            existing_mapping = await lab_repo.get_mapping_by_id(mapping_id)
            if not existing_mapping:
                raise HTTPException(status_code=404, detail="Mapping not found")
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(request.cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=400, detail="Cronoscita not found")
            
            # Verify catalog exam exists in this Cronoscita
            catalog_exists = await lab_repo.get_catalog_by_code(request.codice_catalogo, request.cronoscita_id)
            if not catalog_exists:
                raise HTTPException(status_code=400, detail=f"Exam {request.codice_catalogo} not found in Cronoscita catalog")
            
            # NEW: Validate business rules (excluding current mapping)
            validation_result = await lab_repo.validate_mapping_business_rules(
                request.cronoscita_id,
                request.struttura_nome,
                request.codice_catalogo,
                request.codoffering_wirgilio,
                exclude_mapping_id=mapping_id
            )
            
            if not validation_result["valid"]:
                error_messages = [error["message"] for error in validation_result["errors"]]
                raise HTTPException(
                    status_code=409,  # Conflict status code
                    detail={
                        "error": "Conflitto mappatura",
                        "details": error_messages,
                        "validation_errors": validation_result["errors"]
                    }
                )
            
            # Update mapping
            mapping_data = request.dict()
            mapping_data["nome_esame_wirgilio"] = mapping_data["nome_esame_wirgilio"].upper()
            
            success = await lab_repo.update_exam_mapping(mapping_id, mapping_data)
            
            if success:
                logger.info(f"✅ Mapping updated: {mapping_id} -> {request.struttura_nome} for Cronoscita {cronoscita_data['nome']}")
                
                return {
                    "success": True,
                    "message": f"Mapping aggiornato per {cronoscita_data['nome']}: {catalog_exists['nome_esame'].upper()} -> {request.struttura_nome}",
                    "mapping_id": mapping_id
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to update mapping")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating exam mapping: {str(e)}")
            raise HTTPException(status_code=500, detail="Error updating exam mapping")

    @app.get("/dashboard/laboratorio/catalogo-for-mapping/{cronoscita_id}")
    async def get_catalog_for_mapping(cronoscita_id: str):
        """Get simplified catalog list for mapping dropdown for specific Cronoscita"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            lab_repo = LaboratorioRepository(db)
            
            # Verify Cronoscita exists
            cronoscita_data = await cronoscita_repo.get_cronoscita_by_id(cronoscita_id)
            if not cronoscita_data:
                raise HTTPException(status_code=404, detail="Cronoscita not found")
            
            catalog_options = await lab_repo.get_catalog_for_mapping(cronoscita_id)
            
            return {
                "success": True,
                "cronoscita_nome": cronoscita_data["nome"],
                "options": catalog_options
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting catalog options: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving catalog options")

    # ================================
    # BASIC DATA ENDPOINTS (for other tabs - simplified without pathology filtering)
    # ================================

    @app.get("/dashboard/patients/list")
    async def get_patients_list():
        """Get patients list - simplified"""
        try:
            # Mock data for now
            mock_patients = [
                {
                    "cf_paziente": "RSSMRA80A01H501U",
                    "nome": "Mario",
                    "cognome": "Rossi", 
                    "data_nascita": "1980-01-01",
                    "telefono": "+39 333 1234567",
                    "email": "mario.rossi@email.com",
                    "patologia": "Diabete Mellito Tipo 2",
                    "last_visit": "2024-01-15",
                    "status": "Attivo"
                }
            ]
            
            return {
                "success": True,
                "total": len(mock_patients),
                "patients": mock_patients
            }
            
        except Exception as e:
            logger.error(f"Error getting patients list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving patients data")

    @app.get("/dashboard/doctors/list")
    async def get_doctors_list():
        """Get doctors list - simplified"""
        try:
            doctors_data = []
            for doctor_id, doctor_info in HARDCODED_DOCTORS.items():
                doctors_data.append({
                    **doctor_info,
                    "pazienti_totali": 15,  # Mock data
                    "visite_programmate": 3,
                    "ultima_attivita": format_date(datetime.now()),
                    "status": "Attivo"
                })
            
            return {
                "success": True,
                "total": len(doctors_data),
                "doctors": doctors_data
            }
            
        except Exception as e:
            logger.error(f"Error getting doctors list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving doctors data")


    @app.get("/api/cronoscita/for-timeline")
    async def get_cronoscita_for_timeline():
        """Get active Cronoscita list for Timeline service integration"""
        try:
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            cronoscita_list = await cronoscita_repo.get_all_cronoscita()
            
            # Filter only active ones and format for Timeline
            active_cronoscita = [
                {
                    "code": cronoscita["nome"],  # Use nome as the selection value
                    "display": cronoscita["nome"],  # Same for display
                    "cronoscita_id": cronoscita["id"]
                }
                for cronoscita in cronoscita_list if cronoscita.get("is_active", True)
            ]
            
            return {
                "success": True,
                "total": len(active_cronoscita),
                "cronoscita_options": active_cronoscita
            }
            
        except Exception as e:
            logger.error(f"Error getting cronoscita for timeline: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving cronoscita options")
    
    # ================================
    # APPLICATION STARTUP/SHUTDOWN EVENTS  
    # ================================

    @app.on_event("startup")
    async def startup_event():
        """Application startup - connect to MongoDB"""
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
            
            logger.info("🏥 Admin Dashboard with Cronoscita support started successfully!")
            
        except Exception as e:
            logger.error(f"❌ Startup failed: {str(e)}")
            raise

    @app.on_event("shutdown") 
    async def shutdown_event():
        """Application shutdown - close connections"""
        logger.info("🔌 Shutting down Admin Dashboard...")
        await close_mongo_connection()
        logger.info("✅ Admin Dashboard shutdown complete")

    return app

# Create the FastAPI application
app = create_application()