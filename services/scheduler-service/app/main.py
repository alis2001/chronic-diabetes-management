from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import os

app = FastAPI(title="Scheduler Service", description="Appointment Scheduling & Notifications", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime
    port: int

@app.get("/")
def read_root():
    return {"service": "Scheduler Service", "status": "running", "version": "1.0.0"}

@app.get("/health", response_model=HealthResponse) 
def health_check():
    return HealthResponse(service="scheduler-service", status="healthy", timestamp=datetime.now(), port=int(os.getenv("SERVICE_PORT", 8003)))

@app.get("/available-slots")
def get_available_slots(date: str):
    slots = []
    base_time = datetime.strptime("09:00", "%H:%M")
    for i in range(6):
        slot_time = base_time + timedelta(minutes=30*i)
        slots.append({"slot_id": f"slot_{i+1}", "time": slot_time.strftime("%H:%M"), "available": True})
    return {"date": date, "available_slots": slots}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("SERVICE_PORT", 8003)), reload=True)
