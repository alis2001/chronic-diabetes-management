# services/admin-dashboard/app/main.py
"""
Admin Dashboard - Complete Healthcare System Management Interface
Professional admin interface with full authentication system
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import logging
import sys

# Import authentication components
from .auth_routes import auth_router
from .session_manager import session_manager
from .database import connect_to_mongo, close_mongo_connection, check_database_health
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

def create_application() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    # Initialize FastAPI app
    app = FastAPI(
        title="Admin Dashboard - Sistema Sanitario ASL",
        description="Dashboard amministrativo per gestione sistema diabetes cronico",
        version="1.0.0"
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production: specify allowed origins
        allow_credentials=True,
        allow_methods=["*"],
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

    # Include authentication router
    app.include_router(auth_router)

    # ================================
    # MAIN ROUTES
    # ================================

    @app.get("/", response_class=HTMLResponse)
    async def admin_dashboard(request: Request):
        """Main admin dashboard page"""
        if templates:
            return templates.TemplateResponse("dashboard.html", {
                "request": request,
                "page_title": "Dashboard Amministrativo",
                "service_name": "Admin Dashboard"
            })
        else:
            return HTMLResponse("""
            <html>
                <head><title>Admin Dashboard</title></head>
                <body>
                    <h1>🏥 Admin Dashboard</h1>
                    <p>Sistema Gestione Diabetes Cronico</p>
                    <p><a href="/docs">API Documentation</a></p>
                </body>
            </html>
            """)

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        try:
            # Check database health
            db_health = await check_database_health()
            
            return {
                "service": "admin-dashboard",
                "status": "healthy",
                "port": settings.SERVICE_PORT,
                "database": db_health,
                "features": [
                    "authentication_system",
                    "email_verification",
                    "session_management",
                    "patient_management",
                    "doctor_overview", 
                    "system_monitoring",
                    "basic_reporting"
                ],
                "authentication": {
                    "email_domain": "@gesan.it",
                    "verification_method": "6_digit_email_code",
                    "session_duration": "8_hours",
                    "roles": ["admin", "manager", "analyst"]
                }
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
    # DASHBOARD API ROUTES
    # ================================

    @app.get("/dashboard/overview")
    async def dashboard_overview():
        """System overview for dashboard"""
        try:
            # This would integrate with other services
            return {
                "total_patients": 150,  # Placeholder
                "active_doctors": 12,   # Placeholder
                "appointments_today": 8, # Placeholder
                "system_status": "operational",
                "last_updated": "2024-01-15T10:30:00Z"
            }
        except Exception as e:
            logger.error(f"Dashboard overview error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving dashboard data")

    @app.get("/dashboard/patients/stats")
    async def patient_stats():
        """Patient statistics for dashboard"""
        try:
            return {
                "total_registered": 150,
                "active_this_month": 89,
                "new_registrations": 12,
                "by_pathology": {
                    "diabetes_type1": 45,
                    "diabetes_type2": 89,
                    "diabetes_gestational": 16
                }
            }
        except Exception as e:
            logger.error(f"Patient stats error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving patient statistics")

    @app.get("/dashboard/doctors/activity")
    async def doctor_activity():
        """Doctor activity for dashboard"""
        try:
            return {
                "total_doctors": 12,
                "active_today": 8,
                "appointments_scheduled": 24,
                "most_active": [
                    {"name": "Dr. Mario Rossi", "appointments": 8},
                    {"name": "Dr.ssa Laura Bianchi", "appointments": 6}
                ]
            }
        except Exception as e:
            logger.error(f"Doctor activity error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving doctor activity")

    @app.get("/dashboard/system/health")
    async def system_health():
        """System health for dashboard"""
        try:
            # Check all services
            services_status = {
                "timeline_service": "healthy",    # Would check actual service
                "analytics_service": "healthy",   # Would check actual service
                "scheduler_service": "healthy",   # Would check actual service
                "database": "healthy",
                "redis": "healthy"
            }
            
            return {
                "overall_status": "healthy",
                "services": services_status,
                "uptime": "99.9%",
                "last_check": "2024-01-15T10:30:00Z"
            }
        except Exception as e:
            logger.error(f"System health error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error checking system health")

    # ================================
    # LEGACY TEMPLATE ROUTES
    # ================================

    @app.get("/patients", response_class=HTMLResponse)
    async def patients_page(request: Request):
        """Patient management page"""
        if templates:
            return templates.TemplateResponse("patients.html", {
                "request": request,
                "page_title": "Gestione Pazienti"
            })
        else:
            return HTMLResponse("<h1>Gestione Pazienti</h1><p>Coming soon...</p>")

    @app.get("/doctors", response_class=HTMLResponse)  
    async def doctors_page(request: Request):
        """Doctor management page"""
        if templates:
            return templates.TemplateResponse("doctors.html", {
                "request": request,
                "page_title": "Gestione Medici"
            })
        else:
            return HTMLResponse("<h1>Gestione Medici</h1><p>Coming soon...</p>")

    @app.get("/system", response_class=HTMLResponse)
    async def system_page(request: Request):
        """System monitoring page"""
        if templates:
            return templates.TemplateResponse("system.html", {
                "request": request,
                "page_title": "Monitoraggio Sistema"
            })
        else:
            return HTMLResponse("<h1>Monitoraggio Sistema</h1><p>Coming soon...</p>")

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
            
            logger.info("🏥 Admin Dashboard with Authentication started successfully!")
            logger.info("📧 Email verification system ready for @gesan.it domain")
            
        except Exception as e:
            logger.error(f"❌ Startup failed: {str(e)}")
            raise

    @app.on_event("shutdown")
    async def shutdown_event():
        """Application shutdown"""
        logger.info("🛑 Shutting down Admin Dashboard...")
        
        try:
            await close_mongo_connection()
            logger.info("✅ Database connections closed")
        except Exception as e:
            logger.error(f"❌ Shutdown error: {str(e)}")

    # ================================
    # ERROR HANDLERS
    # ================================

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: HTTPException):
        """Custom 404 handler"""
        return JSONResponse(
            status_code=404,
            content={
                "error": "ROUTE_NOT_FOUND",
                "message": f"Route {request.url.path} not found",
                "available_routes": [
                    "/health",
                    "/auth/signup",
                    "/auth/login",
                    "/auth/verify-email",
                    "/dashboard/overview"
                ]
            }
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception):
        """Custom 500 handler"""
        logger.error(f"🚨 Internal server error on {request.url.path}: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "An internal error occurred",
                "service": "admin-dashboard"
            }
        )

    return app

# Create the application
app = create_application()

# ================================
# DEVELOPMENT SERVER
# ================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=settings.SERVICE_PORT, 
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )