# 🏗 Architecture Documentation

## Sistema di Gestione Malattie Croniche - Architettura Tecnica

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Microservices Design](#microservices-design)
3. [Data Model](#data-model)
4. [Cronoscita System](#cronoscita-system)
5. [Integration Patterns](#integration-patterns)
6. [Security Architecture](#security-architecture)
7. [Performance Considerations](#performance-considerations)
8. [Scalability & Future Enhancements](#scalability--future-enhancements)

---

## Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                            │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Timeline   │  │  Analytics   │  │   Scheduler  │               │
│  │  Frontend   │  │   Frontend   │  │   Frontend   │  ... (5 apps) │
│  │  (React)    │  │   (React)    │  │   (React)    │               │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                        │
│         └─────────────────┼──────────────────┘                       │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                            │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              API Gateway (FastAPI) - Port 8080                 │ │
│  │  • Request Routing & Proxying                                  │ │
│  │  • CORS Management                                             │ │
│  │  • Health Monitoring                                           │ │
│  │  • Legacy Route Support                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        MICROSERVICES LAYER                            │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Timeline   │  │  Analytics   │  │  Scheduler   │               │
│  │  Service    │  │   Service    │  │   Service    │               │
│  │  (8001)     │  │   (8002)     │  │   (8003)     │               │
│  └─────────────┘  └──────────────┘  └──────────────┘               │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐                                  │
│  │   Admin     │  │    Diario    │                                  │
│  │  Dashboard  │  │   Service    │                                  │
│  │  (8084)     │  │   (8005)     │                                  │
│  └─────────────┘  └──────────────┘                                  │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                   │
│                                                                       │
│  ┌────────────────────┐    ┌──────────────────┐                     │
│  │     MongoDB        │    │      Redis       │                     │
│  │  (Shared Database) │    │  (Sessions TTL)  │                     │
│  │    Port 27017      │    │    Port 6379     │                     │
│  └────────────────────┘    └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                              │
│                                                                       │
│  ┌──────────────────────┐    ┌────────────────────────┐             │
│  │   Wirgilio DB        │    │   Wirgilio API         │             │
│  │  (Demographics)      │    │  (Laboratory Data)     │             │
│  │  MongoDB External    │    │  REST API External     │             │
│  └──────────────────────┘    └────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Microservices Design

### 1. Timeline Service (Core Service)

**Responsabilità:**
- Patient lifecycle management (lookup, registration, enrollment)
- Timeline visualization (past, today, future appointments)
- Medical report (referto) management with Cronoscita isolation
- Doctor session management (Redis-based, 10h TTL)
- Appointment tracking and status management
- Wirgilio demographics integration

**Key Components:**

```python
# Layered Architecture
┌─────────────────────────────────────┐
│        Routers (API Endpoints)      │  ← FastAPI routes
├─────────────────────────────────────┤
│        Services (Business Logic)    │  ← PatientService, RefertoService
├─────────────────────────────────────┤
│      Repositories (Data Access)     │  ← PatientRepository, RefertoRepository
├─────────────────────────────────────┤
│         Database (MongoDB)          │  ← Motor async driver
└─────────────────────────────────────┘
```

**Data Flow Example - Patient Lookup:**

```
1. Frontend → POST /patients/lookup
2. Router → PatientService.lookup_patient()
3. Service validates doctor credentials
4. Service validates Cronoscita exists
5. Repository queries: find_by_cf_and_patologia()
6. If not found in this Cronoscita → check other Cronoscita
7. If not found anywhere → query Wirgilio DB
8. Return PatientLookupResponse with demographics
```

**Key Features:**
- Multi-Cronoscita enrollment support
- Demographics reuse across Cronoscita
- Strict Cronoscita isolation for timeline/referti
- Session persistence with Redis

### 2. Analytics Service

**Responsabilità:**
- Wirgilio laboratory data retrieval
- Exam filtering based on admin-configured mappings
- Anomaly detection (P/AP flags)
- Time-series data processing
- Chart data generation

**Data Processing Pipeline:**

```
1. Frontend requests exam list
   ↓
2. Fetch raw data from Wirgilio API
   ↓
3. Apply Cronoscita-specific exam filtering
   (Only show exams with active mappings)
   ↓
4. Process and clean data
   • Normalize anomaly flags (N/P/AP)
   • Parse numeric values
   • Validate data quality
   ↓
5. Group by exam type (desesame)
   • Merge multiple codoffering codes
   • Track anomalies
   • Count results
   ↓
6. Return ExamListResponse
```

**Filtering System:**

```python
# Exam Mapping Filter
Wirgilio Data (raw) → Filter by cronoscita_id mappings → Filtered Data

Example:
Raw data has 50 exams
Cronoscita "DIABETE TIPO 2" has 12 mapped exams
Frontend shows ONLY those 12 exams
```

### 3. Scheduler Service

**Responsabilità:**
- Date-based appointment scheduling
- Duplicate appointment prevention
- Doctor density visualization (color gradients)
- Exam selection from Cronoscita catalog
- Timeline service integration

**Scheduling Validation Flow:**

```
1. Check scheduling permission
   ↓
2. Validate patient registered in Cronoscita
   ↓
3. Check referto completed today
   ↓
4. Check for existing future appointments (CF + Cronoscita)
   ↓
5. If all pass → Allow scheduling
   ↓
6. Display density calendar
   ↓
7. User selects date + exams
   ↓
8. Create appointment in MongoDB
   ↓
9. Notify Timeline service (optional webhook)
```

**Density Calculation:**

```python
# Color gradient based on appointment count
0-1 appointments:  Very Low  → Green (#E8F5E8)
2-3 appointments:  Low       → Light Yellow (#FFF3CD)
4-6 appointments:  Medium    → Orange (#FFE4B5)
7-10 appointments: High      → Light Red (#FECACA)
11+ appointments:  Very High → Red (#FF4444)
```

### 4. Admin Dashboard

**Responsabilità:**
- Cronoscita CRUD operations
- Exam catalog management per Cronoscita
- Exam mappings configuration (internal ↔ Wirgilio codes)
- Master catalog validation (regional catalog)
- User authentication & authorization
- Email verification system

**Admin Operations:**

```
1. Create Cronoscita
   • Generate unique code
   • Initialize empty catalog
   
2. Configure Exam Catalog
   • Validate against master catalog
   • Add exam to Cronoscita-specific catalog
   
3. Create Exam Mappings
   • Map internal exam code → Wirgilio codoffering
   • Structure-specific mappings
   • Business rule validation:
     ✓ No duplicate codoffering per structure
     ✓ No duplicate exam mapping per structure
   
4. Cascade Delete Support
   • Delete exam → auto-delete all mappings
```

### 5. Diario Service

**Responsabilità:**
- Wirgilio document list retrieval
- PDF document download (via repository endpoint)
- Document display in modal

**Integration:**
- Uses same Wirgilio authentication as Analytics
- Repository endpoint has different auth (TBD)

### 6. API Gateway

**Responsabilità:**
- Centralized request routing
- Service health monitoring
- CORS management
- Legacy route support
- Request/response logging

**Routing Table:**

```
/api/timeline/*   → Timeline Service (8001)
/api/analytics/*  → Analytics Service (8002)
/api/scheduler/*  → Scheduler Service (8003)
/api/admin/*      → Admin Dashboard (8084)
/api/diario/*     → Diario Service (8005)
/api/session/*    → Timeline Service (session routes)

# Legacy routes (backward compatibility)
/patients/*       → Timeline Service
/timeline/*       → Timeline Service
/appointments/*   → Timeline Service
/referti/*        → Timeline Service
```

---

## Data Model

### Core Collections

#### 1. `cronoscita` Collection

```javascript
{
  _id: ObjectId("..."),
  nome: "DIABETE TIPO 2",                    // Display name
  codice: "DT2-ABC123",                      // Unique short code
  is_active: true,                           // Active status
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
}
```

**Indexes:**
- `nome` (unique)
- `codice` (unique)
- `is_active`

#### 2. `patients` Collection

```javascript
{
  _id: ObjectId("..."),
  cf_paziente: "RSSMRA80A01H501U",           // Italian Fiscal Code
  id_medico: "DOC001",                       // Enrolling doctor
  patologia: "DIABETE TIPO 2",               // Cronoscita name
  cronoscita_id: ObjectId("..."),            // Cronoscita reference
  
  demographics: {
    nome: "Mario",
    cognome: "Rossi",
    data_nascita: ISODate("1980-01-01"),
    telefono: "333-1234567",
    email: "mario.rossi@example.com",
    indirizzo: {
      via: "Via Roma 123",
      città: "Roma",
      cap: "00100"
    }
  },
  
  status: "active",                          // active|inactive|transferred
  enrollment_date: ISODate("2024-01-15T10:00:00Z"),
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
}
```

**Key Points:**
- Same `cf_paziente` can appear multiple times (different Cronoscita)
- Each enrollment is independent
- Demographics can be reused across enrollments

**Indexes:**
- `cf_paziente`
- `cf_paziente + patologia` (compound for Cronoscita-specific queries)
- `id_medico`
- `status`

#### 3. `appointments` Collection

```javascript
{
  _id: ObjectId("..."),
  appointment_id: "APT_1705315800",
  cf_paziente: "RSSMRA80A01H501U",
  id_medico: "DOC001",
  cronoscita_id: ObjectId("..."),            // CRITICAL for isolation
  patologia: "DIABETE TIPO 2",               // For fallback matching
  
  appointment_date: ISODate("2024-02-15T09:00:00Z"),
  appointment_type: "visita_diabetologica",
  status: "scheduled",                       // scheduled|completed|cancelled
  priority: "normal",                        // routine|normal|urgent|emergency
  
  required_exam_mappings: [                  // From scheduler
    "mapping_id_1",
    "mapping_id_2"
  ],
  
  exam_details: [
    {
      exam_name: "GLICEMIA",
      structure_name: "LAB CENTRALE"
    }
  ],
  
  doctor_notes: "Controllo trimestrale",
  completion_notes: null,
  location: "ASL Roma 1",
  
  created_at: ISODate("2024-01-15T10:30:00Z"),
  updated_at: ISODate("2024-01-15T10:30:00Z"),
  completed_at: null,
  
  referto_saved: false,
  referto_id: null
}
```

**Indexes:**
- `appointment_id` (unique)
- `cf_paziente + cronoscita_id` (compound for duplicate prevention)
- `id_medico + appointment_date` (compound for density calculation)
- `appointment_date`
- `status`

#### 4. `referti` Collection

```javascript
{
  _id: ObjectId("..."),
  referto_id: "REF_1705315900",
  cf_paziente: "RSSMRA80A01H501U",
  id_medico: "DOC001",
  appointment_id: "APT_1705315800",          // Optional link
  
  // CRONOSCITA ISOLATION - CRITICAL
  patologia: "DIABETE TIPO 2",
  cronoscita_id: ObjectId("..."),
  
  // Referto content
  testo_referto: "Paziente in buone condizioni generali...",
  diagnosi: "Diabete tipo 2 compensato",
  terapia_prescritta: "Metformina 1000mg x2/die",
  note_medico: "Proseguire terapia attuale",
  
  status: "completato",                      // bozza|completato|revisionato|archiviato
  data_visita: ISODate("2024-01-15"),
  data_compilazione: ISODate("2024-01-15T14:30:00Z"),
  
  created_at: ISODate("2024-01-15T14:30:00Z"),
  updated_at: ISODate("2024-01-15T14:30:00Z")
}
```

**Indexes:**
- `referto_id` (unique)
- `cf_paziente + patologia` (compound for Cronoscita isolation)
- `id_medico`
- `data_visita`

#### 5. `exam_catalog` Collection

```javascript
{
  _id: ObjectId("..."),
  cronoscita_id: ObjectId("..."),            // SCOPED to Cronoscita
  
  // From regional master catalog
  codice_catalogo: "90.43.2",
  codicereg: "90.43.2",
  nome_esame: "GLICEMIA",
  codice_branca: "01",
  branch_description: "PATOLOGIA CLINICA",
  
  // Scheduling configuration
  visualizza_nel_referto: "S",               // S|N
  is_enabled: true,
  
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
}
```

**Indexes:**
- `cronoscita_id + codice_catalogo` (unique compound)
- `cronoscita_id`
- `is_enabled`

#### 6. `exam_mappings` Collection

```javascript
{
  _id: ObjectId("..."),
  cronoscita_id: ObjectId("..."),            // SCOPED to Cronoscita
  
  codice_catalogo: "90.43.2",                // Internal exam code
  nome_esame_wirgilio: "GLICEMIA",          // Wirgilio exam name (uppercase)
  codoffering_wirgilio: "301",               // Wirgilio offering code
  struttura_nome: "LAB CENTRALE",            // Hospital structure
  
  is_active: true,
  visualizza_nel_referto: "S",
  
  created_at: ISODate("2024-01-15T11:00:00Z"),
  updated_at: ISODate("2024-01-15T11:00:00Z")
}
```

**Business Rules:**
- One `codoffering_wirgilio` per `struttura_nome` per Cronoscita (prevent conflicts)
- One `codice_catalogo` mapping per `struttura_nome` per Cronoscita

**Indexes:**
- `cronoscita_id + codice_catalogo + codoffering_wirgilio` (compound)
- `cronoscita_id`
- `is_active`

---

## Cronoscita System

### Concept & Implementation

**Cronoscita** = Chronic Disease Management Pathway

#### Multi-Enrollment Pattern

```
Patient: RSSMRA80A01H501U (Mario Rossi)

Enrollments:
┌──────────────────────────────────────────────────┐
│ Cronoscita: DIABETE TIPO 2                      │
│ • Doctor: DOC001                                 │
│ • Enrollment Date: 2024-01-15                    │
│ • Appointments: 5                                │
│ • Referti: 3                                     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Cronoscita: IPERTENSIONE ARTERIOSA              │
│ • Doctor: DOC003                                 │
│ • Enrollment Date: 2024-02-01                    │
│ • Appointments: 2                                │
│ • Referti: 1                                     │
└──────────────────────────────────────────────────┘
```

#### Data Isolation Implementation

**Repository Pattern:**

```python
# CORRECT: Cronoscita-specific query
async def find_by_cf_and_patologia(cf: str, patologia: str):
    return await db.patients.find_one({
        "cf_paziente": cf.upper(),
        "patologia": patologia,  # REQUIRED
        "status": {"$ne": "inactive"}
    })

# DEPRECATED: Global query (data leakage risk)
async def find_by_cf(cf: str):
    # ⚠️ Returns ANY enrollment - not Cronoscita-safe
    return await db.patients.find_one({"cf_paziente": cf.upper()})
```

**Timeline Service:**

```python
# Timeline MUST include cronoscita parameter
timeline = await get_patient_timeline(
    cf_paziente="RSSMRA80A01H501U",
    id_medico="DOC001",
    patologia="DIABETE TIPO 2"  # MANDATORY
)

# Filter appointments by cronoscita_id
appointments = [
    apt for apt in all_appointments
    if apt.get("cronoscita_id") == target_cronoscita_id
]
```

**Referti Service:**

```python
# Referti are STRICTLY isolated by Cronoscita
referti = await db.referti.find({
    "cf_paziente": cf,
    "patologia": cronoscita_name  # REQUIRED filter
}).sort("data_visita", -1)
```

### Cronoscita ID Resolution

Some legacy appointments may have `patologia` but not `cronoscita_id`. Resolution:

```python
async def ensure_patient_has_cronoscita_id(patient_data):
    if patient_data.get("cronoscita_id"):
        return patient_data
    
    # Find cronoscita_id by patologia name
    cronoscita_id = await find_cronoscita_id_by_name(
        patient_data["patologia"]
    )
    
    patient_data["cronoscita_id"] = cronoscita_id
    return patient_data
```

---

## Integration Patterns

### 1. Wirgilio Database Integration (Demographics)

**Direct MongoDB Connection:**

```python
# Timeline Service → Wirgilio DB (MongoDB)
wirgilio_client = AsyncIOMotorClient(
    host="192.168.125.193",
    port=27017,
    username="sysdba",
    password="mederos",
    authSource="admin"
)

db = wirgilio_client["wirgilio"]
patient = await db.visitediabetologichedue.find_one({
    "codicefiscale": {"$regex": f"^{cf}$", "$options": "i"}
})
```

### 2. Wirgilio API Integration (Laboratory Data)

**HTTP Client with Bearer Token:**

```python
# Analytics Service → Wirgilio API (REST)
headers = {
    "Authorization": f"Bearer {WIRGILIO_TOKEN}",
    "Content-Type": "application/json"
}

response = await httpx.get(
    f"{WIRGILIO_BASE_URL}/cpi/wirgilio-api/archivios/",
    params={"codicefiscale": cf},
    headers=headers,
    verify=WIRGILIO_VERIFY_SSL
)
```

### 3. Inter-Service Communication

**Microservices Pattern: Shared Database**

Services communicate via:
- ✅ **Shared MongoDB** - Direct database access (no HTTP)
- ✅ **Event Pattern** - Minimal (optional webhooks)
- ✅ **Gateway Routing** - Frontend → Gateway → Services

**Example: Scheduler → Timeline Integration**

```python
# Scheduler creates appointment → writes to MongoDB
await db.appointments.insert_one(appointment_data)

# Timeline reads appointments → already in database
appointments = await db.appointments.find({"cf_paziente": cf})
```

**Advantages:**
- No HTTP overhead
- ACID transactions
- Simpler error handling
- Lower latency

---

## Security Architecture

### Authentication Layers

#### 1. Doctor Authentication (Timeline Service)

```python
# Hardcoded doctor credentials (temporary)
HARDCODED_DOCTOR_CREDENTIALS = {
    "DOC001": {
        "nome_completo": "Dr. Mario Rossi",
        "specializzazione": "Diabetologia",
        "firma_digitale": "SIGNATURE_001"
    }
}

# Validation
def validate_doctor(doctor_id: str) -> bool:
    return doctor_id in HARDCODED_DOCTOR_CREDENTIALS
```

**Future:** Integration with Cartella Clinica Elettronica for real doctor auth

#### 2. Admin Authentication (Admin Dashboard)

```python
# Email-based authentication with verification
1. User enters email + password
2. System sends verification code (6 digits) via email
3. User enters code within 15 minutes
4. System creates session (Redis, 24h TTL)
5. Session cookie returned to frontend
```

**Security Features:**
- BCrypt password hashing
- Email verification required
- Redis session management
- CSRF protection
- Rate limiting (planned)

#### 3. Session Management

**Redis Session Storage:**

```python
# Session key format
session_key = f"session:{doctor_id}:{cronoscita_name}"

# Session data
{
    "doctor_id": "DOC001",
    "cronoscita": "DIABETE TIPO 2",
    "login_time": "2024-01-15T08:00:00Z",
    "last_activity": "2024-01-15T14:30:00Z"
}

# TTL: 10 hours
await redis.setex(session_key, 36000, json.dumps(session_data))
```

### Data Validation

#### 1. Italian Fiscal Code Validation

```python
@validator('cf_paziente')
def validate_codice_fiscale(cls, v):
    pattern = r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$'
    if not re.match(pattern, v.upper()):
        raise ValueError('Invalid Italian fiscal code format')
    return v.upper()
```

#### 2. Cronoscita Validation

```python
async def validate_pathology(pathology_name: str) -> bool:
    # Check against database
    count = await db.cronoscita.count_documents({
        "nome": pathology_name,
        "is_active": True
    })
    return count > 0
```

#### 3. Business Rule Validation

```python
# Scheduler: Duplicate prevention
async def validate_can_schedule(cf: str, cronoscita_id: str):
    existing = await db.appointments.find_one({
        "cf_paziente": cf,
        "cronoscita_id": cronoscita_id,
        "appointment_date": {"$gte": datetime.now()},
        "status": {"$in": ["scheduled", "confirmed"]}
    })
    
    return existing is None  # Can schedule if no future appointment
```

---

## Performance Considerations

### Database Optimization

#### Indexes Strategy

```javascript
// Compound indexes for common queries
db.patients.createIndex({ "cf_paziente": 1, "patologia": 1 })
db.appointments.createIndex({ "cf_paziente": 1, "cronoscita_id": 1 })
db.appointments.createIndex({ "id_medico": 1, "appointment_date": 1 })
db.exam_mappings.createIndex({ "cronoscita_id": 1, "codoffering_wirgilio": 1 })
```

#### Query Optimization

```python
# ✅ GOOD: Specific query with indexes
appointments = await db.appointments.find({
    "cf_paziente": cf,
    "cronoscita_id": cronoscita_id,
    "appointment_date": {"$gte": today}
})

# ❌ BAD: Full table scan
all_appointments = await db.appointments.find({})
filtered = [a for a in all_appointments if a["cf_paziente"] == cf]
```

### Caching Strategy

#### Redis Caching

```python
# Cache Cronoscita options (TTL: 1 hour)
cache_key = "cronoscita:active_list"
cached = await redis.get(cache_key)

if cached:
    return json.loads(cached)

# Fetch from database
options = await db.cronoscita.find({"is_active": True})
await redis.setex(cache_key, 3600, json.dumps(options))
```

### Async Operations

All services use **async/await** for I/O operations:

```python
# Parallel async requests
async with httpx.AsyncClient() as client:
    tasks = [
        client.get(url1),
        client.get(url2),
        client.get(url3)
    ]
    results = await asyncio.gather(*tasks)
```

---

## Scalability & Future Enhancements

### Current Limitations

1. **Hardcoded Doctor Credentials** → Integrate with Cartella Clinica
2. **Single MongoDB Instance** → Replica set for HA
3. **No Load Balancing** → Nginx upstream with multiple instances
4. **No Message Queue** → Add RabbitMQ/Kafka for events
5. **Repository Authentication** → Complete Wirgilio repository integration

### Planned Enhancements

#### Phase 1: Enhanced Security
- [ ] OAuth2/OIDC integration
- [ ] Role-based access control (RBAC)
- [ ] Audit logging
- [ ] API rate limiting

#### Phase 2: Scalability
- [ ] MongoDB replica set
- [ ] Redis cluster
- [ ] Service auto-scaling (Kubernetes)
- [ ] CDN for static assets

#### Phase 3: Features
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app (React Native)
- [ ] Voice transcription integration (Melody)
- [ ] PDF report generation
- [ ] Export to external systems (HL7 FHIR)

#### Phase 4: DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing
- [ ] Performance monitoring (Prometheus)
- [ ] Log aggregation (ELK Stack)
- [ ] Health dashboards (Grafana)

### Horizontal Scaling Strategy

```
                    Load Balancer (Nginx)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  Instance 1          Instance 2          Instance 3
  (Timeline)          (Timeline)          (Timeline)
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    MongoDB Replica Set
                   (Primary + 2 Secondaries)
```

---

## Development Guidelines

### Code Structure

**Service Template:**

```
service-name/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app creation
│   ├── models.py            # Pydantic models
│   ├── services.py          # Business logic
│   ├── repositories.py      # Data access
│   ├── routers.py           # API endpoints
│   ├── database.py          # DB connection
│   ├── config.py            # Configuration
│   └── exceptions.py        # Custom exceptions
├── requirements.txt
└── Dockerfile.dev
```

### Naming Conventions

**Python (Backend):**
- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case()`
- Constants: `UPPER_SNAKE_CASE`

**JavaScript (Frontend):**
- Files: `PascalCase.js` (components), `camelCase.js` (utilities)
- Components: `PascalCase`
- Functions: `camelCase()`
- Constants: `UPPER_SNAKE_CASE`

### API Design Principles

1. **RESTful conventions** - Standard HTTP methods
2. **Consistent responses** - Always return success/error format
3. **Italian messages** - User-facing messages in Italian
4. **Cronoscita context** - Always include Cronoscita in scoped operations
5. **Comprehensive logging** - Log all operations with context

---

## Monitoring & Observability

### Health Checks

Each service exposes `/health` endpoint:

```json
{
  "service": "timeline-service",
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "session_manager": "healthy"
  }
}
```

### Logging Strategy

**Log Levels:**
- `DEBUG` - Detailed development info
- `INFO` - Normal operations, business events
- `WARNING` - Recoverable issues
- `ERROR` - Service errors, failed operations

**Log Format:**

```
2024-01-15 10:30:45 - timeline-service - INFO - ✅ Patient registered: RSSMRA80A01H501U in Cronoscita DIABETE TIPO 2
2024-01-15 10:31:12 - analytics-service - WARNING - ⚠️ No filtering applied - showing all exams
2024-01-15 10:31:45 - scheduler-service - ERROR - ❌ Duplicate appointment prevention: CF=RSSMRA80A01H501U
```

### Metrics to Monitor

**Service Metrics:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Active sessions

**Business Metrics:**
- Patients enrolled per Cronoscita
- Appointments scheduled per day
- Referti completion rate
- Average time to schedule

**Infrastructure Metrics:**
- MongoDB query performance
- Redis memory usage
- Docker container health
- Network latency to Wirgilio

---

## 🎓 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Pydantic Models](https://docs.pydantic.dev/)

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintained by:** Development Team

