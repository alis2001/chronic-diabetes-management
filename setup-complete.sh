#!/bin/bash
# Complete setup for chronic-diabetes-management

cd ~/chronic-diabetes-management

echo "🚀 Setting up complete containerized chronic diabetes management system..."

# ========================================
# 1. CREATE ALL FASTAPI SERVICES
# ========================================

echo "📦 Creating FastAPI services..."

# Create services directory structure
for service in timeline-service analytics-service scheduler-service api-gateway; do
    echo "Creating $service..."
    mkdir -p services/$service/app
    
    # Create __init__.py
    touch services/$service/app/__init__.py
    
    # Create requirements.txt
    cat > services/$service/requirements.txt << 'REQUIREMENTS_EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.4.2
motor==3.3.1
redis==5.0.1
python-jose[cryptography]==3.3.0
httpx==0.25.0
python-multipart==0.0.6
REQUIREMENTS_EOF

    # Create Dockerfile.dev
    cat > services/$service/Dockerfile.dev << 'DOCKERFILE_EOF'
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --shell /bin/bash app_user && \
    chown -R app_user:app_user /app
USER app_user

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:${SERVICE_PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${SERVICE_PORT:-8000} --reload"]
DOCKERFILE_EOF

    # Create .env
    port_num=${service: -1}
    if [[ $service == *"gateway"* ]]; then port_num=0; fi
    cat > services/$service/.env << SERVICE_ENV_EOF
ENV=development
SERVICE_NAME=$service
SERVICE_PORT=800$port_num
LOG_LEVEL=debug
SERVICE_ENV_EOF

    # Create README
    cat > services/$service/README.md << SERVICE_README_EOF
# $service

FastAPI microservice for Chronic Diabetes Management System.

## 🚀 Quick Start

\`\`\`bash
# Run with Docker
docker-compose -f docker-compose.dev.yml up $service

# Or run locally  
pip install -r requirements.txt
uvicorn app.main:app --reload --port 800$port_num
\`\`\`

## 📚 API Documentation

- Interactive docs: http://localhost:800$port_num/docs
- ReDoc: http://localhost:800$port_num/redoc
SERVICE_README_EOF
done

# ========================================
# 2. CREATE MAIN.PY FILES FOR ALL SERVICES
# ========================================

echo "⚡ Creating FastAPI applications..."

# Timeline Service main.py
cat > services/timeline-service/app/main.py << 'TIMELINE_MAIN_EOF'
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
TIMELINE_MAIN_EOF

# Analytics Service main.py  
cat > services/analytics-service/app/main.py << 'ANALYTICS_MAIN_EOF'
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
ANALYTICS_MAIN_EOF

# Scheduler Service main.py
cat > services/scheduler-service/app/main.py << 'SCHEDULER_MAIN_EOF'
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
SCHEDULER_MAIN_EOF

# API Gateway main.py
cat > services/api-gateway/app/main.py << 'GATEWAY_MAIN_EOF'
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
GATEWAY_MAIN_EOF

echo "✅ FastAPI services created successfully!"

# ========================================  
# 3. CREATE REACT FRONTENDS
# ========================================

echo "🎨 Creating React frontends..."

# Timeline Frontend
mkdir -p frontend/timeline-app/{src,public}
mkdir -p frontend/analytics-app/{src,public}

# Package.json for timeline
cat > frontend/timeline-app/package.json << 'TIMELINE_PACKAGE_EOF'
{
  "name": "diabetes-timeline-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.4",
    "@testing-library/react": "^13.4.0", 
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.3.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  }
}
TIMELINE_PACKAGE_EOF

# Copy package.json for analytics (same structure)
cp frontend/timeline-app/package.json frontend/analytics-app/
sed -i 's/diabetes-timeline-frontend/diabetes-analytics-frontend/g' frontend/analytics-app/package.json

# Create basic HTML files
cat > frontend/timeline-app/public/index.html << 'TIMELINE_HTML_EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Diabetes Timeline Management</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
TIMELINE_HTML_EOF

cat > frontend/analytics-app/public/index.html << 'ANALYTICS_HTML_EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Diabetes Analytics Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
ANALYTICS_HTML_EOF

# Create basic React index.js files
cat > frontend/timeline-app/src/index.js << 'TIMELINE_INDEX_EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{padding: '20px', fontFamily: 'Arial'}}>
    <h1>🏥 Diabetes Timeline Management</h1>
    <h2>📅 Timeline Service Frontend</h2>
    <div style={{background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginTop: '20px'}}>
      <h3>✅ Frontend Service Running</h3>
      <p>This React frontend is ready for development!</p>
      <p><strong>Backend API:</strong> <a href="http://localhost:8001/docs" target="_blank">http://localhost:8001/docs</a></p>
      <p><strong>Status:</strong> Under Development 🚧</p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
TIMELINE_INDEX_EOF

cat > frontend/analytics-app/src/index.js << 'ANALYTICS_INDEX_EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{padding: '20px', fontFamily: 'Arial'}}>
    <h1>📊 Diabetes Analytics Dashboard</h1>
    <h2>📈 Analytics Service Frontend</h2>
    <div style={{background: '#f0fff0', padding: '20px', borderRadius: '8px', marginTop: '20px'}}>
      <h3>✅ Frontend Service Running</h3>
      <p>This React frontend is ready for development!</p>
      <p><strong>Backend API:</strong> <a href="http://localhost:8002/docs" target="_blank">http://localhost:8002/docs</a></p>
      <p><strong>Status:</strong> Under Development 🚧</p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
ANALYTICS_INDEX_EOF

# Create Dockerfile for both frontends
cat > frontend/timeline-app/Dockerfile.dev << 'FRONTEND_DOCKERFILE_EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]
FRONTEND_DOCKERFILE_EOF

cp frontend/timeline-app/Dockerfile.dev frontend/analytics-app/

echo "✅ React frontends created!"

# ========================================
# 4. CREATE ROOT CONFIGURATION FILES  
# ========================================

echo "⚙️ Creating configuration files..."

# Create .env.example
cat > .env.example << 'ROOT_ENV_EOF'
# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
MONGO_INITDB_DATABASE=diabetes_db

# Redis  
REDIS_PASSWORD=redis123

# Ports (avoiding conflicts with your existing services)
TIMELINE_FRONTEND_PORT=3010
ANALYTICS_FRONTEND_PORT=3011
API_GATEWAY_PORT=8080
TIMELINE_SERVICE_PORT=8001
ANALYTICS_SERVICE_PORT=8002
SCHEDULER_SERVICE_PORT=8003
MONGODB_PORT=27017
REDIS_PORT=6381
ROOT_ENV_EOF

# Create Makefile
cat > Makefile << 'MAKEFILE_EOF'
.PHONY: help build up down logs clean restart status

help:
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@echo '  build    Build all Docker images'
	@echo '  up       Start all services'
	@echo '  down     Stop all services'  
	@echo '  logs     View logs for all services'
	@echo '  clean    Clean up all resources'
	@echo '  restart  Restart all services'
	@echo '  status   Show service status'

build:
	docker-compose -f docker-compose.dev.yml build

up:  
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

restart: down up

status:
	docker-compose -f docker-compose.dev.yml ps
MAKEFILE_EOF

echo "✅ All files created successfully!"
echo ""
echo "📊 Project Summary:"
echo "📁 Total directories: $(find . -type d | wc -l)"
echo "📄 Total files: $(find . -type f | wc -l)"
echo ""
echo "🎯 Structure Created:"
echo "  ✅ 4 FastAPI services with working endpoints"
echo "  ✅ 2 React frontends with basic setup"
echo "  ✅ All Dockerfiles and configuration files"
echo "  ✅ Makefile for easy commands"
echo ""
echo "🚀 Next Steps:"
echo "  1. Add docker-compose.dev.yml file"
echo "  2. Test with: make build && make up"
echo "  3. Access services at:"
echo "     • Timeline Frontend: http://localhost:3010"
echo "     • Analytics Frontend: http://localhost:3011"
echo "     • API Gateway: http://localhost:8080/docs"
echo "     • Timeline API: http://localhost:8001/docs"
echo "     • Analytics API: http://localhost:8002/docs"
echo "     • Scheduler API: http://localhost:8003/docs"

