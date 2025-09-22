# services/scheduler-service/app/main.py
"""
Scheduler Service - Main Application
Complete appointment scheduling service with density visualization
Integrates with Admin Panel configured exams and Timeline Service
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
import os

from .database import connect_to_mongo, close_mongo_connection
from .routers import (
    main_router, validation_router, appointment_router, 
    density_router, exam_router, integration_router
)
from .config import settings, get_cors_origins
from .exceptions import map_to_http_exception, SchedulerServiceException

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI scheduler application
    """
    
    # Initialize FastAPI app
    app = FastAPI(
        title=settings.API_TITLE,
        description=f"{settings.API_DESCRIPTION} - Complete Integration with Admin Panel and Timeline Service",
        version=settings.SERVICE_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_tags=[
            {
                "name": "Scheduling Validation",
                "description": "Validate scheduling permissions and prevent duplicate appointments"
            },
            {
                "name": "Appointment Scheduling", 
                "description": "Core appointment scheduling with exam integration"
            },
            {
                "name": "Doctor Density Visualization",
                "description": "Visual appointment density with color gradients approaching red for busy dates"
            },
            {
                "name": "Exam Selection",
                "description": "Admin-configured exam selection from database (visualizza_nel_referto = 'S')"
            },
            {
                "name": "Service Integration",
                "description": "Timeline service integration and health monitoring"
            }
        ]
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"]
    )

    # Global exception handler for scheduler-specific exceptions
    @app.exception_handler(SchedulerServiceException)
    async def scheduler_exception_handler(request: Request, exc: SchedulerServiceException):
        """Handle scheduler service exceptions with proper HTTP mapping"""
        logger.error(f"Scheduler service error on {request.url.path}: {exc.message}")
        return map_to_http_exception(exc)

    # Global exception handler for unexpected errors
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions"""
        logger.error(f"🚨 Unexpected error on {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "Errore interno del sistema. Contattare l'amministratore.",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url.path)
            }
        )

    # Include all routers
    app.include_router(main_router)
    app.include_router(validation_router)
    app.include_router(appointment_router)
    app.include_router(density_router)
    app.include_router(exam_router)
    app.include_router(integration_router)

    # Database lifecycle events
    @app.on_event("startup")
    async def startup_event():
        """Initialize scheduler service on startup"""
        try:
            logger.info("🚀 Scheduler Service starting up...")
            
            # Connect to database
            await connect_to_mongo()
            logger.info("✅ Database connection established")
            
            # Log service configuration
            logger.info(f"📊 Service Configuration:")
            logger.info(f"   • Service: {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
            logger.info(f"   • Port: {settings.SERVICE_PORT}")
            logger.info(f"   • Environment: {settings.ENV}")
            logger.info(f"   • Database: {settings.DATABASE_NAME}")
            
            # Log integration endpoints
            logger.info(f"🔗 Integration URLs:")
            logger.info(f"   • Timeline Service: {settings.TIMELINE_SERVICE_URL}")
            logger.info(f"   • Analytics Service: {settings.ANALYTICS_SERVICE_URL}")
            logger.info(f"   • Admin Dashboard: {settings.ADMIN_DASHBOARD_URL}")
            
            # Log CORS origins
            cors_origins = get_cors_origins()
            logger.info(f"🌐 CORS Origins: {len(cors_origins)} configured")
            for origin in cors_origins[:5]:  # Log first 5 origins
                logger.info(f"   • {origin}")
            
            # Log feature status
            logger.info(f"🎯 Scheduler Features:")
            logger.info(f"   ✅ Date-based appointment scheduling")
            logger.info(f"   ✅ Doctor density visualization with color gradients")
            logger.info(f"   ✅ Admin-configured exam integration")
            logger.info(f"   ✅ Duplicate appointment prevention (CF + Cronoscita)")
            logger.info(f"   ✅ Timeline service integration")
            logger.info(f"   ✅ Italian healthcare compliance")
            
            logger.info("✅ Scheduler Service ready!")
            
        except Exception as e:
            logger.error(f"❌ Startup failed: {str(e)}")
            raise

    @app.on_event("shutdown") 
    async def shutdown_event():
        """Clean shutdown of scheduler service"""
        try:
            logger.info("🛑 Scheduler Service shutting down...")
            
            # Close database connection
            await close_mongo_connection()
            logger.info("✅ Database connection closed")
            
            logger.info("✅ Scheduler Service shutdown complete")
            
        except Exception as e:
            logger.error(f"❌ Shutdown error: {str(e)}")

    # Add custom middleware for request logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """Log all requests for monitoring and debugging"""
        start_time = datetime.now()
        
        # Log incoming request
        logger.info(f"📥 {request.method} {request.url.path} - Client: {request.client.host}")
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = (datetime.now() - start_time).total_seconds()
        
        # Log response with timing
        if response.status_code >= 400:
            logger.warning(f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
        else:
            logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
        
        return response

    # Additional service information endpoint
    @app.get("/service-info")
    async def get_service_info():
        """Detailed service information for monitoring and debugging"""
        return {
            "service_details": {
                "name": settings.SERVICE_NAME,
                "version": settings.SERVICE_VERSION,
                "environment": settings.ENV,
                "port": settings.SERVICE_PORT,
                "database": settings.DATABASE_NAME
            },
            "features": {
                "date_based_scheduling": True,
                "density_visualization": True,
                "color_gradients": "Green → Yellow → Orange → Red for busy dates",
                "exam_integration": "Admin-configured exams (visualizza_nel_referto = 'S')",
                "duplicate_prevention": "One CF + One Cronoscita = Max One Future Appointment",
                "timeline_integration": True,
                "italian_compliance": True
            },
            "business_rules": {
                "duplicate_appointments": "Prevented at CF + Cronoscita level",
                "future_scheduling_only": "Cannot schedule appointments in the past",
                "exam_filtering": "Only active exams marked for timeline display",
                "density_calculation": "Real-time from database appointments"
            },
            "api_endpoints": {
                "main_scheduling_data": "GET /scheduling-data/{cf_paziente}",
                "validate_permission": "POST /validation/check-scheduling-permission",
                "schedule_appointment": "POST /appointments/schedule", 
                "doctor_density": "GET /density/doctor/{id_medico}",
                "available_exams": "GET /exams/{cronoscita_id}",
                "health_check": "GET /health",
                "documentation": "/docs"
            },
            "integration_status": {
                "timeline_service": settings.TIMELINE_SERVICE_URL,
                "analytics_service": settings.ANALYTICS_SERVICE_URL,
                "admin_dashboard": settings.ADMIN_DASHBOARD_URL
            },
            "timestamp": datetime.now().isoformat()
        }

    return app

# Create the FastAPI application instance
app = create_application()

# Development server
if __name__ == "__main__":
    import uvicorn
    
    logger.info("🏥 Starting Scheduler Service for ASL Healthcare System...")
    logger.info(f"🌐 API will be available at: http://localhost:{settings.SERVICE_PORT}")
    logger.info(f"📚 API Documentation at: http://localhost:{settings.SERVICE_PORT}/docs")
    logger.info(f"🔍 Service Info at: http://localhost:{settings.SERVICE_PORT}/service-info")
    logger.info(f"⚕️ Healthcare Features:")
    logger.info(f"   • Italian compliance and error messages")
    logger.info(f"   • ASL appointment scheduling workflow")
    logger.info(f"   • Medical exam integration")
    logger.info(f"   • Doctor density visualization")
    logger.info(f"   • Timeline service integration")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.SERVICE_PORT,
        reload=True,
        reload_dirs=["app"],
        log_level=settings.LOG_LEVEL.lower()
    )