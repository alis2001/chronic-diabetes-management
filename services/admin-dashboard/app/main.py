# services/admin-dashboard/app/main.py
"""
Admin Dashboard - Healthcare System Management Interface
Professional admin interface for non-technical healthcare administrators
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Admin Dashboard - Sistema Sanitario ASL",
    description="Dashboard amministrativo per gestione sistema diabetes cronico",
    version="1.0.0"
)

# Mount static files
if os.path.exists("app/static"):
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="app/templates")

@app.get("/", response_class=HTMLResponse)
async def admin_dashboard(request: Request):
    """Main admin dashboard page"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "page_title": "Dashboard Amministrativo",
        "service_name": "Admin Dashboard"
    })

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": "admin-dashboard",
        "status": "healthy",
        "port": int(os.getenv("SERVICE_PORT", 8084)),
        "features": [
            "patient_management",
            "doctor_overview", 
            "system_monitoring",
            "basic_reporting"
        ]
    }

@app.get("/patients", response_class=HTMLResponse)
async def patients_page(request: Request):
    """Patient management page"""
    return templates.TemplateResponse("patients.html", {
        "request": request,
        "page_title": "Gestione Pazienti"
    })

@app.get("/doctors", response_class=HTMLResponse)  
async def doctors_page(request: Request):
    """Doctor management page"""
    return templates.TemplateResponse("doctors.html", {
        "request": request,
        "page_title": "Gestione Medici"
    })

@app.get("/system", response_class=HTMLResponse)
async def system_page(request: Request):
    """System monitoring page"""
    return templates.TemplateResponse("system.html", {
        "request": request,
        "page_title": "Monitoraggio Sistema"
    })

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("SERVICE_PORT", 8084))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)