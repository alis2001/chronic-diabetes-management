# services/timeline-service/app/main.py
"""
Timeline Service - Complete Application with Session Management
Professional FastAPI application with React frontend support and session management
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging
import sys
import os

# Import our modules
from .config import settings
from .database import connect_to_mongo, close_mongo_connection
from .routers import get_all_routers
from .web_routes import session_router
from .session import session_manager

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
    
    return base_origins

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application with session management
    """
    # Initialize FastAPI app
    app = FastAPI(
        title=f"{settings.API_TITLE} - Session Management",
        description=f"{settings.API_DESCRIPTION} - With React Frontend Session Support",
        version=settings.SERVICE_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_tags=[
            {
                "name": "Session Management",
                "description": "Doctor session management and authentication"
            },
            {
                "name": "Patient Management",
                "description": "Patient registration and lookup operations"
            },
            {
                "name": "Timeline Management", 
                "description": "Patient timeline viewing and management"
            },
            {
                "name": "Appointment Management",
                "description": "Appointment scheduling, completion, and management"
            },
            {
                "name": "Legacy Compatibility",
                "description": "Backward compatibility endpoints (deprecated)"
            }
        ]
    )
    
    # Add CORS middleware for React frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,  # Important: allow cookies for session management
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"]
    )
    
    # Global exception handler for better error handling
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Global exception handler for unhandled exceptions"""
        logger.error(f"Global exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred",
                "detail": str(exc) if settings.ENV == "development" else None
            }
        )
    
    # Register session management routes (NEW - for React frontend)
    app.include_router(session_router)
    
    # Register all existing API routers
    for router in get_all_routers():
        app.include_router(router)
    
    # Add static files serving for any assets (optional)
    if os.path.exists("app/static"):
        app.mount("/static", StaticFiles(directory="app/static"), name="static")
    
    # Application lifecycle events
    @app.on_event("startup")
    async def startup_event():
        """Application startup"""
        logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
        logger.info(f"Environment: {settings.ENV}")
        logger.info(f"Service Port: {settings.SERVICE_PORT}")
        
        # Connect to MongoDB
        try:
            await connect_to_mongo()
            logger.info("MongoDB connection established")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
        
        # Initialize Redis session manager
        try:
            await session_manager.init_redis()
            logger.info("Redis session manager initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis session manager: {e}")
        
        logger.info("🏥 Timeline Service with Session Management started successfully!")
        logger.info("📱 React Frontend Session API available at /api/session/*")
        logger.info("📚 API Documentation available at /docs")
    
    @app.get("/available-pathologie")
    async def get_available_pathologie():
        """Get available pathologie options from database (Microservices)"""
        try:
            from .config import get_available_cronoscita_pathologie_from_db
            
            cronoscita_options = await get_available_cronoscita_pathologie_from_db()
            
            if not cronoscita_options:
                return {
                    "success": False,
                    "message": "Nessuna Cronoscita configurata nel database",
                    "pathologie_options": [],
                    "total": 0
                }
            
            # Format for frontend compatibility
            pathologie_dict = {}
            for cronoscita in cronoscita_options:
                pathologie_dict[cronoscita["code"]] = cronoscita["display"]
            
            return {
                "success": True,
                "message": f"Trovate {len(cronoscita_options)} pathologie disponibili",
                "pathologie_options": pathologie_dict,
                "total": len(cronoscita_options)
            }
            
        except Exception as e:
            logger.error(f"Error getting available pathologie: {str(e)}")
            return {
                "success": False,
                "message": "Errore nel recupero delle pathologie",
                "pathologie_options": {},
                "total": 0
            }

    @app.on_event("shutdown")
    async def shutdown_event():
        """Application shutdown"""
        logger.info("Shutting down Timeline Service...")
        
        # Close MongoDB connection
        try:
            await close_mongo_connection()
            logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
        
        # Close Redis connection
        try:
            if session_manager.redis_client:
                await session_manager.redis_client.close()
                logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
        
        logger.info("Timeline Service shutdown complete")
    
    # Health check endpoint with session management status
    @app.get("/health")
    async def enhanced_health_check():
        """Enhanced health check including session management status"""
        health_status = {
            "service": settings.SERVICE_NAME,
            "version": settings.SERVICE_VERSION,
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",  # Will be replaced with actual timestamp
            "environment": settings.ENV,
            "port": settings.SERVICE_PORT,
            "components": {
                "database": "checking...",
                "session_manager": "checking...",
                "redis": "checking..."
            },
            "features": {
                "session_management": True,
                "react_frontend_support": True,
                "doctor_workspaces": True,
                "10_hour_sessions": True,
                "cookie_authentication": True
            }
        }
        
        # Check database connection
        try:
            from .database import get_database
            db = await get_database()
            await db.command("ping")
            health_status["components"]["database"] = "healthy"
        except Exception as e:
            health_status["components"]["database"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check Redis connection
        try:
            if session_manager.redis_client:
                await session_manager.redis_client.ping()
                health_status["components"]["redis"] = "healthy"
                health_status["components"]["session_manager"] = "healthy"
            else:
                health_status["components"]["redis"] = "not initialized"
                health_status["components"]["session_manager"] = "not initialized"
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["components"]["redis"] = f"unhealthy: {str(e)}"
            health_status["components"]["session_manager"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # Update timestamp
        from datetime import datetime
        health_status["timestamp"] = datetime.now().isoformat()
        
        status_code = 200 if health_status["status"] in ["healthy", "degraded"] else 503
        return JSONResponse(content=health_status, status_code=status_code)
    
    # Root endpoint with service information
    @app.get("/")
    async def service_root():
        """Root endpoint with comprehensive service information"""
        return {
            "service": settings.SERVICE_NAME,
            "version": settings.SERVICE_VERSION,
            "title": "Timeline Service with Session Management",
            "description": "Professional healthcare timeline management with React frontend support",
            "environment": settings.ENV,
            "features": {
                "session_management": "Redis-based doctor sessions (10 hours)",
                "react_frontend": "Full React SPA support with session APIs",
                "doctor_workspaces": "Isolated workspaces per doctor",
                "patient_timeline": "Complete patient timeline management",
                "appointment_management": "Scheduling and completion workflow",
                "wirgilio_integration": "External demographics system integration"
            },
            "endpoints": {
                "session_apis": "/api/session/*",
                "patient_lookup": "POST /patients/lookup",
                "patient_registration": "POST /patients/register",
                "timeline_view": "GET /timeline/{cf_paziente}",
                "appointment_scheduling": "POST /appointments/schedule",
                "appointment_completion": "POST /appointments/complete",
                "health_check": "GET /health",
                "api_documentation": "/docs"
            },
            "react_integration": {
                "login_endpoint": "/api/session/login",
                "logout_endpoint": "/api/session/logout",
                "session_status": "/api/session/status",
                "session_validation": "/api/session/validate",
                "available_doctors": "/api/session/doctors",
                "available_pathologies": "/api/session/pathologies"
            },
            "session_info": {
                "duration_hours": 10,
                "storage": "Redis",
                "authentication": "Cookie-based",
                "isolation": "Per doctor workspace"
            }
        }
    
    return app

# Create the FastAPI application instance
app = create_application()

# For development server
if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting {settings.SERVICE_NAME} development server...")
    logger.info(f"API will be available at: http://localhost:{settings.SERVICE_PORT}")
    logger.info(f"API Documentation at: http://localhost:{settings.SERVICE_PORT}/docs")
    logger.info(f"Session Management APIs at: http://localhost:{settings.SERVICE_PORT}/api/session/")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.SERVICE_PORT,
        reload=True,
        reload_dirs=["app"],
        log_level=settings.LOG_LEVEL.lower()
    )