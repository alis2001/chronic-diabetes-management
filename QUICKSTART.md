# ⚡ Quick Start Guide

## Get Up and Running in 5 Minutes

This guide will help you get the Chronic Disease Management System running on your local machine quickly.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Docker** installed (v20+)
- ✅ **Docker Compose** installed (v2+)
- ✅ **Git** installed
- ✅ **8GB RAM** minimum available
- ✅ **10GB disk space** available

Check your installations:

```bash
docker --version          # Should show Docker version 20+
docker-compose --version  # Should show version 2+
git --version            # Any recent version
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/chronic-diabetes-management.git
cd chronic-diabetes-management
```

---

## Step 2: Configure Environment

Create `.env` file in the project root:

```bash
# Create .env file
cat > .env << 'EOF'
# Basic Configuration
ENVIRONMENT=development
VM_HOST=localhost

# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
MONGO_INITDB_DATABASE=diabetes_db
MONGODB_PORT=27018

# Redis
REDIS_PASSWORD=redis123
REDIS_PORT=6381

# Wirgilio Integration (REQUIRED - Get from your admin)
WIRGILIO_TOKEN=your_wirgilio_jwt_token_here
WIRGILIO_BASE_URL=https://10.10.13.14
WIRGILIO_API_PATH=/cpi/wirgilio-api
WIRGILIO_VERIFY_SSL=false

# Service Ports (default values)
TIMELINE_SERVICE_PORT=8001
ANALYTICS_SERVICE_PORT=8002
SCHEDULER_SERVICE_PORT=8003
ADMIN_SERVICE_PORT=8084
DIARIO_SERVICE_PORT=8005
API_GATEWAY_PORT=8080

# Frontend Ports
TIMELINE_FRONTEND_PORT=3010
ANALYTICS_FRONTEND_PORT=3011
ADMIN_FRONTEND_PORT=3012
SCHEDULER_FRONTEND_PORT=3013
DIARIO_FRONTEND_PORT=3014

# Development Tools
MONGO_EXPRESS_PORT=8081
REDIS_COMMANDER_PORT=8082

# Email (for admin verification)
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EOF
```

**⚠️ IMPORTANT:** Replace `WIRGILIO_TOKEN` with your actual token!

---

## Step 3: Build and Start

```bash
# Build all Docker images (first time only, ~5-10 minutes)
make build

# Start all services
make up

# Check status
make status
```

You should see all containers running:

```
NAME                           STATUS
diabetes-mongodb              Up
diabetes-redis                Up
diabetes-timeline-service     Up
diabetes-analytics-service    Up
diabetes-scheduler-service    Up
diabetes-admin-dashboard      Up
diabetes-diario-service       Up
diabetes-api-gateway          Up
diabetes-timeline-frontend    Up
diabetes-analytics-frontend   Up
diabetes-admin-frontend       Up
diabetes-scheduler-frontend   Up
diabetes-diario-frontend      Up
diabetes-mongo-express        Up
diabetes-redis-commander      Up
```

---

## Step 4: Verify Services

### Check Health

```bash
# API Gateway health (includes all services)
curl http://localhost:8080/health
```

Should return:

```json
{
  "service": "api-gateway",
  "status": "healthy",
  "services": {
    "timeline": "healthy",
    "analytics": "healthy",
    "scheduler": "healthy",
    "admin": "healthy",
    "diario": "healthy"
  }
}
```

### Access Admin Tools

1. **Mongo Express** (Database viewer): http://localhost:8081
   - Username: `admin`
   - Password: `admin123`

2. **Redis Commander** (Session viewer): http://localhost:8082

---

## Step 5: Initial Setup

### 5.1 Create Your First Cronoscita

1. Open **Admin Panel**: http://localhost:3012

2. **Register an admin user** (first time):
   - Email: your-email@example.com
   - Password: Choose a strong password
   - Verify email (check console logs for verification code)

3. **Create a Cronoscita**:
   - Go to "Gestione Cronoscita" tab
   - Click "Nuova Cronoscita"
   - Nome: `DIABETE TIPO 2`
   - Click "Salva"

### 5.2 Configure Exam Catalog

1. **Add exams to catalog**:
   - Select your Cronoscita
   - Go to "Catalogo Esami" tab
   - Search master catalog: `glicemia`
   - Add exam from results

2. **Create exam mappings**:
   - Go to "Mappature Esami" tab
   - Click "Nuova Mappatura"
   - Select exam from catalog
   - Enter Wirgilio details:
     - Nome esame Wirgilio: `GLICEMIA`
     - Codoffering: `301`
     - Struttura: `LAB CENTRALE`
   - Save

Repeat for common exams: HbA1c, Creatinina, Colesterolo, etc.

---

## Step 6: Use the Timeline App

### 6.1 Login as Doctor

1. Open **Timeline App**: http://localhost:3010

2. **Select Doctor**:
   - DOC001 - Dr. Mario Rossi (Diabetologia)
   - DOC002 - Dr.ssa Laura Bianchi (Diabetologia)
   - DOC003 - Dr. Giuseppe Verdi (Endocrinologia)
   - DOC004 - Dr.ssa Anna Ferrari (Diabetologia Pediatrica)

3. **Select Cronoscita**: `DIABETE TIPO 2`

4. Click **"Accedi"**

### 6.2 Search for a Patient

1. **Enter Italian Fiscal Code** (Codice Fiscale):
   - Example: `RSSMRA80A01H501U`
   - Or use a real CF if you have Wirgilio access

2. Click **"Cerca Paziente"**

3. **Scenarios:**

   **A. Patient Not Found:**
   - System shows demographics from Wirgilio
   - Click "Registra Paziente"
   - Confirm details
   - Patient enrolled in Cronoscita ✅

   **B. Patient Found:**
   - System shows existing timeline
   - View past/today/future appointments
   - Access tabs: Referti, Analytics, Diario

### 6.3 Complete Workflow

**Day 1 - Registration:**
```
1. Search patient (CF)
2. Register patient in Cronoscita
3. View timeline (empty for new patient)
4. Write first referto
5. Schedule next appointment
```

**Day 2+ - Follow-up:**
```
1. Login → Same Cronoscita
2. Search patient (CF)
3. View timeline with history
4. Check Analytics tab for lab results
5. Write referto for today's visit
6. Schedule next appointment
```

---

## Step 7: Explore Features

### Timeline Features

**Timeline Tab (Main View):**
- **Precedenti**: Shows all past appointments
- **Oggi**: Today's scheduled appointments
- **Successivo**: Next future appointment (max 1)

**Referti Tab:**
- List all referti for this Cronoscita
- Write new referto (min 10 characters)
- View referto history

**Analytics Tab:**
- Select exam type (dropdown)
- Select parameter (dropdown)
- View time-series chart
- Green = normal, Red = anomalies (P/AP flags)

**Diario Tab:**
- List historical clinical documents
- Click "Visualizza PDF" to view document
- Sorted by date (most recent first)

### Scheduler Features

Click **"Successivo"** button (when enabled):

1. **Pre-conditions checked:**
   - ✅ Referto completed today
   - ✅ No future appointments

2. **Scheduler opens in modal:**
   - Select exams from catalog
   - View calendar density (green → red)
   - Pick available date
   - Confirm

3. **Appointment created:**
   - Appears in timeline "Successivo"
   - Blocks future scheduling until completed

---

## Common Commands

### Service Management

```bash
# Start all services
make up

# Stop all services
make down

# Restart services
make restart

# View logs (all services)
make logs

# View specific service logs
docker logs diabetes-timeline-service --tail 100 -f

# Clean everything (WARNING: deletes data)
make clean
```

### Database Operations

```bash
# Access MongoDB shell
docker exec -it diabetes-mongodb mongosh \
  -u admin -p admin123 --authenticationDatabase admin

# List databases
show dbs

# Use diabetes database
use diabetes_db

# View collections
show collections

# Query patients
db.patients.find().pretty()

# Count appointments
db.appointments.countDocuments()
```

### Redis Operations

```bash
# Access Redis CLI
docker exec -it diabetes-redis redis-cli -a redis123

# List all keys
KEYS *

# Get session data
GET session:DOC001:DIABETE_TIPO_2

# Check TTL
TTL session:DOC001:DIABETE_TIPO_2
```

---

## Quick Test Scenarios

### Scenario 1: Register New Patient

```bash
# Timeline Service API
curl -X POST http://localhost:8001/patients/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "cf_paziente": "RSSMRA80A01H501U",
    "id_medico": "DOC001",
    "patologia": "DIABETE TIPO 2"
  }'

# If patient not found, register:
curl -X POST http://localhost:8001/patients/register \
  -H "Content-Type: application/json" \
  -d '{
    "cf_paziente": "RSSMRA80A01H501U",
    "id_medico": "DOC001",
    "patologia": "DIABETE TIPO 2",
    "confirm_registration": true
  }'
```

### Scenario 2: View Timeline

```bash
curl "http://localhost:8001/timeline/RSSMRA80A01H501U?id_medico=DOC001&patologia=DIABETE%20TIPO%202"
```

### Scenario 3: Save Referto

```bash
curl -X POST http://localhost:8001/referti/save \
  -H "Content-Type: application/json" \
  -d '{
    "cf_paziente": "RSSMRA80A01H501U",
    "id_medico": "DOC001",
    "patologia": "DIABETE TIPO 2",
    "testo_referto": "Paziente in buone condizioni generali. Glicemia sotto controllo.",
    "diagnosi": "Diabete tipo 2 compensato",
    "terapia_prescritta": "Metformina 1000mg x2/die",
    "data_visita": "2024-01-15"
  }'
```

---

## Troubleshooting Quick Fixes

### Service Won't Start

```bash
# Check port conflicts
netstat -tuln | grep 8001

# Kill conflicting process
sudo kill $(sudo lsof -t -i:8001)

# Restart service
docker restart diabetes-timeline-service
```

### Can't Connect to Database

```bash
# Restart MongoDB
docker restart diabetes-mongodb

# Wait 5 seconds
sleep 5

# Restart dependent services
docker restart diabetes-timeline-service
```

### Frontend Not Loading

```bash
# Clear and rebuild
docker-compose -f docker-compose.dev.yml up --build -d timeline-frontend

# Check browser console for errors
# Clear browser cache if needed
```

### Wirgilio Connection Issues

```bash
# Test network connectivity
ping 10.10.13.14

# Test HTTPS connection
curl -k https://10.10.13.14/cpi/wirgilio-api/health

# Check service logs
docker logs diabetes-analytics-service --tail 50 | grep Wirgilio
```

---

## Next Steps

After completing the quick start:

1. **Read** [ARCHITECTURE.md](ARCHITECTURE.md) for technical deep-dive
2. **Explore** API documentation at http://localhost:8001/docs
3. **Configure** more Cronoscita and exam mappings
4. **Test** complete clinical workflows
5. **Monitor** logs and metrics
6. **Customize** for your specific needs

---

## Getting Help

- 📖 Full documentation: [README.md](README.md)
- 🏗 Architecture details: [ARCHITECTURE.md](ARCHITECTURE.md)
- 🐛 Report issues: GitHub Issues
- 💬 Ask questions: GitHub Discussions

---

**Happy coding! 🎉**

