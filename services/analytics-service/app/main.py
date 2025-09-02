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

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI analytics application
    """
    # Initialize FastAPI app
    app = FastAPI(
        title=settings.API_TITLE,
        description=settings.API_DESCRIPTION,
        version=settings.SERVICE_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_tags=[
            {
                "name": "Medical Analytics",
                "description": "Laboratory data analytics and visualization endpoints"
            },
            {
                "name": "Wirgilio Integration", 
                "description": "External medical system integration"
            }
        ]
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production: specify allowed origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    # Global exception handler
    @app.exception_handler(AnalyticsServiceException)
    async def analytics_exception_handler(request: Request, exc: AnalyticsServiceException):
        """Handle analytics service exceptions"""
        logger.error(f"Analytics service error: {exc.message}")
        return map_to_http_exception(exc)

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions"""
        logger.error(f"Unexpected error: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred",
                "detail": str(exc) if settings.ENV == "development" else None
            }
        )

    # Register all API routers
    for router in get_all_routers():
        app.include_router(router)

    # Application lifecycle events
    @app.on_event("startup")
    async def startup_event():
        """Application startup"""
        logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
        logger.info(f"Environment: {settings.ENV}")
        logger.info(f"Service Port: {settings.SERVICE_PORT}")
        logger.info(f"Wirgilio API: {settings.WIRGILIO_API_BASE}")
        
        # Test Wirgilio connection at startup
        from .services import WirgilioService
        wirgilio_service = WirgilioService()
        
        try:
            connected = await wirgilio_service.test_connection()
            if connected:
                logger.info("✅ Wirgilio API connection successful")
            else:
                logger.warning("⚠️ Wirgilio API connection failed - service will continue")
        except Exception as e:
            logger.warning(f"⚠️ Wirgilio API test failed: {str(e)} - service will continue")
        
        logger.info("🧪 Analytics Service started successfully!")
        logger.info("📊 Medical data analytics endpoints available")
        logger.info("📚 API Documentation available at /docs")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Application shutdown"""
        logger.info("Shutting down Analytics Service...")
        logger.info("Analytics Service shutdown complete")

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