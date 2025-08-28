from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any, List
import os

app = FastAPI(title="Timeline Service", description="Patient Timeline Management", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime
    port: int

class PatientEnrollRequest(BaseModel):
    cf_paziente: str
    id_medico: str  
    patologia: str

@app.get("/")
def read_root():
    return {"service": "Timeline Service", "status": "running", "version": "1.0.0"}

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(service="timeline-service", status="healthy", timestamp=datetime.now(), port=int(os.getenv("SERVICE_PORT", 8001)))

@app.post("/enroll")
def enroll_patient(request: PatientEnrollRequest):
    return {"status": "success", "message": f"Patient {request.cf_paziente} enrolled", "patient_id": request.cf_paziente, "timestamp": datetime.now().isoformat()}

@app.get("/patient/{patient_id}")
def get_patient_info(patient_id: str):
    return {"patient_id": patient_id, "info": {"name": f"Patient {patient_id}", "status": "active"}}

@app.get("/timeline/{patient_id}")
def get_patient_timeline(patient_id: str):
    return {
        "patient_id": patient_id,
        "precedenti": [{"date": "2024-01-15", "type": "visit", "status": "completed"}],
        "oggi": [{"date": "2024-02-15", "type": "visit", "status": "scheduled"}],
        "successivo": [{"date": "2024-03-15", "type": "visit", "status": "scheduled"}]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("SERVICE_PORT", 8001)), reload=True)
