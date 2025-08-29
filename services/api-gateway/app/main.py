# services/api-gateway/app/main.py
"""
Professional API Gateway with Request Routing
Central entry point for all microservices in diabetes management system
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import httpx
import os
import logging
import time
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="API Gateway - Sistema Sanitario ASL",
    description="Gateway centrale per Sistema Gestione Diabetes Cronico",
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

# Service URLs
SERVICES = {
    "timeline": os.getenv("TIMELINE_SERVICE_URL", "http://timeline-service:8001"),
    "analytics": os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002"),
    "scheduler": os.getenv("SCHEDULER_SERVICE_URL", "http://scheduler-service:8003")
}

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime
    services: Dict[str, str]
    gateway_info: Dict[str, Any]

# ================================
# MIDDLEWARE FOR LOGGING
# ================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests for monitoring"""
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"📥 {request.method} {request.url.path} - Client: {request.client.host}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    
    return response

# ================================
# ROOT ENDPOINT
# ================================

@app.get("/")
def read_root():
    """Gateway information and available routes"""
    return {
        "service": "API Gateway - Sistema Sanitario ASL Roma 1",
        "status": "operativo",
        "version": "1.0.0",
        "description": "Gateway centrale per microservizi gestione diabetes cronico",
        "available_routes": {
            "timeline_service": {
                "prefix": "/api/timeline/",
                "description": "Gestione timeline pazienti",
                "target": SERVICES["timeline"]
            },
            "analytics_service": {
                "prefix": "/api/analytics/",
                "description": "Analytics dati clinici", 
                "target": SERVICES["analytics"]
            },
            "scheduler_service": {
                "prefix": "/api/scheduler/",
                "description": "Programmazione appuntamenti",
                "target": SERVICES["scheduler"]
            }
        },
        "health_check": "/health",
        "direct_service_access": "❌ Disabled - Use gateway routes only"
    }

# ================================
# HEALTH CHECK
# ================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check of gateway and all services"""
    services_health = {}
    
    # Check each service
    for service_name, service_url in SERVICES.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{service_url}/health")
                if response.status_code == 200:
                    services_health[service_name] = "healthy"
                else:
                    services_health[service_name] = f"unhealthy (status: {response.status_code})"
        except httpx.TimeoutException:
            services_health[service_name] = "timeout"
        except httpx.ConnectError:
            services_health[service_name] = "unreachable"
        except Exception as e:
            services_health[service_name] = f"error: {str(e)}"
    
    return HealthResponse(
        service="api-gateway",
        status="healthy",
        timestamp=datetime.now(),
        services=services_health,
        gateway_info={
            "port": int(os.getenv("SERVICE_PORT", 8080)),
            "environment": os.getenv("ENV", "development"),
            "services_count": len(SERVICES),
            "all_services_healthy": all(status == "healthy" for status in services_health.values())
        }
    )

# ================================
# SERVICE ROUTING FUNCTIONS
# ================================

async def proxy_request(service_name: str, path: str, request: Request):
    """Proxy request to appropriate service"""
    if service_name not in SERVICES:
        raise HTTPException(status_code=404, detail=f"Service '{service_name}' not found")
    
    service_url = SERVICES[service_name]
    target_url = f"{service_url}{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Forward the request
            response = await client.request(
                method=request.method,
                url=target_url,
                headers={k: v for k, v in request.headers.items() if k.lower() != 'host'},
                params=request.query_params,
                content=await request.body()
            )
            
            # Return response
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() not in ['content-length', 'transfer-encoding']}
            )
            
    except httpx.TimeoutException:
        logger.error(f"⏰ Timeout calling {service_name} service at {target_url}")
        raise HTTPException(
            status_code=504, 
            detail=f"Timeout calling {service_name} service"
        )
    except httpx.ConnectError:
        logger.error(f"🔌 Cannot connect to {service_name} service at {target_url}")
        raise HTTPException(
            status_code=503, 
            detail=f"Service {service_name} is unavailable"
        )
    except Exception as e:
        logger.error(f"❌ Error proxying to {service_name}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal error calling {service_name} service"
        )

# ================================
# ROUTE HANDLERS
# ================================

@app.api_route("/api/timeline/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def timeline_proxy(path: str, request: Request):
    """Route all /api/timeline/* requests to timeline service"""
    return await proxy_request("timeline", f"/{path}", request)

@app.api_route("/api/analytics/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])  
async def analytics_proxy(path: str, request: Request):
    """Route all /api/analytics/* requests to analytics service"""
    return await proxy_request("analytics", f"/{path}", request)

@app.api_route("/api/scheduler/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def scheduler_proxy(path: str, request: Request):
    """Route all /api/scheduler/* requests to scheduler service"""
    return await proxy_request("scheduler", f"/{path}", request)


@app.api_route("/api/session/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def session_proxy(path: str, request: Request):
    """Route all /api/session/* requests to timeline service"""
    return await proxy_request("timeline", f"/api/session/{path}", request)

# ================================
# LEGACY COMPATIBILITY ROUTES
# ================================
# For backwards compatibility, also accept direct timeline routes

@app.api_route("/patients/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def legacy_patients_proxy(path: str, request: Request):
    """Legacy route: /patients/* → timeline service"""
    logger.info(f"🔄 Legacy route accessed: /patients/{path}")
    return await proxy_request("timeline", f"/patients/{path}", request)

@app.api_route("/timeline/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def legacy_timeline_proxy(path: str, request: Request):
    """Legacy route: /timeline/* → timeline service"""
    logger.info(f"🔄 Legacy route accessed: /timeline/{path}")
    return await proxy_request("timeline", f"/timeline/{path}", request)

@app.api_route("/appointments/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def legacy_appointments_proxy(path: str, request: Request):
    """Legacy route: /appointments/* → timeline service"""
    logger.info(f"🔄 Legacy route accessed: /appointments/{path}")
    return await proxy_request("timeline", f"/appointments/{path}", request)

# ================================
# ERROR HANDLERS
# ================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Custom 404 handler with helpful information"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "ROUTE_NOT_FOUND",
            "message": f"Route {request.url.path} not found",
            "available_routes": [
                "/api/timeline/*",
                "/api/analytics/*", 
                "/api/scheduler/*"
            ],
            "suggestion": "Check the API documentation at /docs"
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
            "timestamp": datetime.now().isoformat()
        }
    )

# ================================
# STARTUP/SHUTDOWN EVENTS
# ================================

@app.on_event("startup")
async def startup_event():
    """Gateway startup"""
    logger.info("🚀 API Gateway starting up...")
    logger.info(f"📊 Configured services: {list(SERVICES.keys())}")
    logger.info(f"🔗 Service URLs: {SERVICES}")
    logger.info("✅ API Gateway ready!")

@app.on_event("shutdown") 
async def shutdown_event():
    """Gateway shutdown"""
    logger.info("🛑 API Gateway shutting down...")

# ================================
# DEVELOPMENT SERVER
# ================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("SERVICE_PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)