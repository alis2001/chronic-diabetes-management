# services/analytics-service/app/main.py
"""
Analytics Service - Complete Application
Professional FastAPI application for medical laboratory data analytics
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os
from .database import connect_to_mongo, close_mongo_connection
# Import our modules
from .config import settings
from .routers import get_all_routers
from .exceptions import AnalyticsServiceException, map_to_http_exception

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
    Create and configure the FastAPI analytics application with database support
    """
    # Initialize FastAPI app
    app = FastAPI(
        title=settings.API_TITLE,
        description=f"{settings.API_DESCRIPTION} - With Exam Mapping Filtering",
        version=settings.SERVICE_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_tags=[
            {
                "name": "Medical Analytics",
                "description": "Laboratory data analytics with admin-configured filtering"
            },
            {
                "name": "Wirgilio Integration", 
                "description": "External medical system integration with mapping filters"
            }
        ]
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"]
    )

    # Global exception handler
    @app.exception_handler(AnalyticsServiceException)
    async def analytics_exception_handler(request: Request, exc: AnalyticsServiceException):
        """Handle analytics service exceptions"""
        logger.error(f"Analytics service error: {exc.message}")
        return map_to_http_exception(exc)

    # Database lifecycle events
    @app.on_event("startup")
    async def startup_event():
        """Initialize database connection on startup"""
        try:
            await connect_to_mongo()
            logger.info("✅ Analytics service startup complete with database connection")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database during startup: {e}")
            raise

    @app.on_event("shutdown")
    async def shutdown_event():
        """Close database connection on shutdown"""
        try:
            await close_mongo_connection()
            logger.info("✅ Analytics service shutdown complete")
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {e}")

    # Include routers
    for router in get_all_routers():
        app.include_router(router)

    # Update root endpoint
    @app.get("/")
    async def read_root():
        """Root endpoint with filtering information"""
        return {
            "service": "Servizio Analytics ASL",
            "version": settings.SERVICE_VERSION,
            "status": "operativo",
            "integration": "wirgilio-api",
            "filtering": "admin-configured",
            "endpoints": {
                "exam_list": "GET /analytics/laboratory-exams/{codice_fiscale}?cronoscita_id=...",
                "sottanalisi_list": "GET /analytics/sottanalisi/{codice_fiscale}?exam_key=...&cronoscita_id=...",
                "chart_data": "GET /analytics/chart-data/{codice_fiscale}?exam_key=...&dessottoanalisi=...&cronoscita_id=...",
                "filtering_info": "GET /analytics/filtering-info?cronoscita_id=...",
                "frontend_app": "GET /analytics-app"
            }
        }

    return app

# Create the app instance
app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=settings.SERVICE_PORT, 
        reload=True if settings.ENV == "development" else False
    )