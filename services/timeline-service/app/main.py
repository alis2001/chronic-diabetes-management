# services/timeline-service/app/main.py
"""
Timeline Service - Clean Main Application
Professional FastAPI application with clean architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

# Import our modules
from .config import settings
from .database import connect_to_mongo, close_mongo_connection
from .routers import get_all_routers

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
    Create and configure the FastAPI application
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
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify allowed origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    
    # Register all routers
    for router in get_all_routers():
        app.include_router(router)
    
    # Application lifecycle events
    @app.on_event("startup")
    async def startup_event():
        """Application startup"""
        logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
        logger.info(f"Environment: {settings.ENV}")
        logger.info(f"Port: {settings.SERVICE_PORT}")
        logger.info(f"Database: {settings.DATABASE_NAME}")
        
        # Connect to MongoDB
        await connect_to_mongo()
        logger.info("Database connection established")
        
        logger.info(f"{settings.SERVICE_NAME} started successfully")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Application shutdown"""
        logger.info(f"Shutting down {settings.SERVICE_NAME}")
        
        # Close database connection
        await close_mongo_connection()
        logger.info("Database connection closed")
        
        logger.info(f"{settings.SERVICE_NAME} shutdown complete")
    
    return app

# Create the app instance
app = create_application()

# For development server
if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting development server on port {settings.SERVICE_PORT}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.SERVICE_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )