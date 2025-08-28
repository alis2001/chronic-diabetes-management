from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import random

app = FastAPI(title="Analytics Service", description="Clinical Data Analytics", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime
    port: int

@app.get("/")
def read_root():
    return {"service": "Analytics Service", "status": "running", "version": "1.0.0"}

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(service="analytics-service", status="healthy", timestamp=datetime.now(), port=int(os.getenv("SERVICE_PORT", 8002)))

@app.get("/analytics/glucose/{patient_id}")
def get_glucose_analytics(patient_id: str, days: int = 30):
    data = []
    for i in range(days):
        date = datetime.now() - timedelta(days=days-i)
        value = random.uniform(80, 150)
        data.append({"date": date.strftime("%Y-%m-%d"), "value": round(value, 1), "status": "normal" if 80 <= value <= 120 else "high"})
    
    return {"patient_id": patient_id, "parameter": "glucose", "data": data, "statistics": {"mean": round(sum(d["value"] for d in data) / len(data), 1), "trend": "stable"}}

@app.get("/analytics/dashboard/{patient_id}")
def get_patient_dashboard(patient_id: str):
    return {"patient_id": patient_id, "glucose": {"current": 95.0, "trend": "stable"}, "hba1c": {"current": 7.2, "target": 7.0}, "last_updated": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("SERVICE_PORT", 8002)), reload=True)
