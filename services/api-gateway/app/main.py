from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import httpx
import os

app = FastAPI(title="API Gateway", description="API Gateway for Chronic Diabetes Management", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

TIMELINE_SERVICE_URL = os.getenv("TIMELINE_SERVICE_URL", "http://timeline-service:8001")
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002") 
SCHEDULER_SERVICE_URL = os.getenv("SCHEDULER_SERVICE_URL", "http://scheduler-service:8003")

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime
    services: dict

@app.get("/")
def read_root():
    return {"service": "API Gateway", "status": "running", "version": "1.0.0", "routes": {"timeline": "/api/timeline/*", "analytics": "/api/analytics/*", "scheduler": "/api/scheduler/*"}}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    services = {}
    for name, url in [("timeline", TIMELINE_SERVICE_URL), ("analytics", ANALYTICS_SERVICE_URL), ("scheduler", SCHEDULER_SERVICE_URL)]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{url}/health", timeout=5.0)
                services[name] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            services[name] = "unreachable"
    
    return HealthResponse(service="api-gateway", status="healthy", timestamp=datetime.now(), services=services)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("SERVICE_PORT", 8080)), reload=True)
