# 🏥 Sistema di Gestione Malattie Croniche (Chronic Disease Management System)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://www.mongodb.com/)

> **Sistema sanitario completo per la gestione di pazienti con malattie croniche basato su architettura microservizi**

Un sistema professionale sviluppato per l'ASL (Azienda Sanitaria Locale) italiana che gestisce percorsi di cura cronici (Cronoscita) con separazione completa dei dati, integrazione con sistemi esterni Wirgilio, e workflow medico completo.

---

## 📋 Indice

- [Panoramica](#-panoramica)
- [Architettura](#-architettura)
- [Caratteristiche Principali](#-caratteristiche-principali)
- [Tecnologie Utilizzate](#-tecnologie-utilizzate)
- [Struttura del Progetto](#-struttura-del-progetto)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [Utilizzo](#-utilizzo)
- [API Documentation](#-api-documentation)
- [Workflow Clinico](#-workflow-clinico)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

---

## 🎯 Panoramica

Il **Sistema di Gestione Malattie Croniche** è una piattaforma completa per la gestione integrata di pazienti con patologie croniche come diabete, ipertensione, e altre condizioni a lungo termine.

### Concetto Chiave: Cronoscita

**Cronoscita** è il concetto organizzativo centrale del sistema - rappresenta un percorso di cura specifico per una patologia cronica:

- **Isolamento Completo dei Dati**: Ogni Cronoscita ha i propri pazienti, referti, appuntamenti ed esami
- **Multi-enrollment**: Uno stesso paziente può essere registrato in più Cronoscita contemporaneamente
- **Configurazione Personalizzata**: Ogni Cronoscita ha il proprio catalogo esami e mappature laboratorio
- **Sicurezza dei Dati**: Prevenzione di data leakage tra percorsi di cura diversi

### Obiettivi del Sistema

✅ **Gestione Timeline Paziente** - Visualizzazione cronologica completa del percorso di cura  
✅ **Refertazione Digitale** - Sistema di refertazione medica con requisiti di completezza  
✅ **Scheduling Intelligente** - Programmazione appuntamenti con visualizzazione densità  
✅ **Analytics Laboratorio** - Analisi dati di laboratorio con filtri configurabili  
✅ **Integrazione Wirgilio** - Connessione con sistemi esterni per dati demografici e laboratorio  
✅ **Diario Clinico** - Accesso documenti storici del paziente  

---

## 🏗 Architettura

### Architettura Microservizi

Il sistema implementa un'architettura a microservizi con database condiviso (shared database pattern):

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (8080)                        │
│                   Routing Centralizzato                          │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
   ┌───────────▼─────┐   ┌───▼────────┐   ┌▼──────────────┐
   │ Timeline Service │   │ Analytics  │   │   Scheduler   │
   │     (8001)       │   │  Service   │   │    Service    │
   │                  │   │   (8002)   │   │    (8003)     │
   └──────────────────┘   └────────────┘   └───────────────┘
   
   ┌──────────────────┐   ┌────────────┐   ┌───────────────┐
   │  Admin Dashboard │   │   Diario   │   │   MongoDB     │
   │     (8084)       │   │  Service   │   │    (27017)    │
   │                  │   │   (8005)   │   │               │
   └──────────────────┘   └────────────┘   └───────────────┘
                                            
   ┌──────────────────────────────────────────────────────────┐
   │                  Redis (6379)                            │
   │           Session Management (10h TTL)                   │
   └──────────────────────────────────────────────────────────┘
```

### Frontend React Applications

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Timeline    │  │  Analytics   │  │    Admin     │
│  Frontend    │  │  Frontend    │  │  Dashboard   │
│   (3010)     │  │   (3011)     │  │   (3012)     │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│  Scheduler   │  │    Diario    │
│  Frontend    │  │  Frontend    │
│   (3013)     │  │   (3014)     │
└──────────────┘  └──────────────┘
```

### Database Schema Principale

**Collections MongoDB:**

- `cronoscita` - Definizione percorsi di cura
- `patients` - Pazienti registrati (multi-enrollment per Cronoscita)
- `appointments` - Appuntamenti programmati (Cronoscita-isolated)
- `referti` - Referti medici (Cronoscita-isolated)
- `exam_catalog` - Catalogo esami per Cronoscita
- `exam_mappings` - Mappature esami interni ↔ codici Wirgilio
- `admin_users` - Utenti amministratori
- `master_prestazioni` - Catalogo master prestazioni regionali

---

## ✨ Caratteristiche Principali

### 1. 🏥 Timeline Service (Core)

**Gestione completa del percorso paziente**

- ✅ **Lookup Paziente** - Ricerca in Wirgilio DB con riutilizzo demografici
- ✅ **Registrazione Multi-Cronoscita** - Un paziente in più percorsi di cura
- ✅ **Timeline Temporale** - Vista appuntamenti: precedenti / oggi / futuri
- ✅ **Refertazione Medica** - Sistema referto con validazione minima
- ✅ **Session Management** - Sessioni medico Redis (10 ore)
- ✅ **Isolamento Cronoscita** - Dati completamente separati per percorso

**Endpoints Principali:**
```
POST   /patients/lookup              - Ricerca paziente
POST   /patients/register            - Registrazione paziente
GET    /timeline/{cf_paziente}       - Timeline completa
POST   /referti/save                 - Salva referto
GET    /referti/patient/{cf}         - Referti paziente
```

### 2. 📊 Analytics Service

**Analisi dati laboratorio con filtering intelligente**

- ✅ **Integrazione Wirgilio API** - Recupero dati laboratorio esterni
- ✅ **Exam Mapping Filtering** - Solo esami configurati per Cronoscita
- ✅ **Anomaly Detection** - Rilevamento automatico valori anomali (P/AP flags)
- ✅ **Time-series Charts** - Grafici temporali parametri laboratorio
- ✅ **Struttura-aware** - Mappature specifiche per struttura ospedaliera

**Endpoints Principali:**
```
GET    /analytics/laboratory-exams/{cf}          - Lista esami
GET    /analytics/sottanalisi/{cf}               - Parametri esame
GET    /analytics/chart-data/{cf}                - Dati grafici
GET    /analytics/filtering-info                 - Info filtri attivi
```

### 3. 📅 Scheduler Service

**Programmazione appuntamenti con prevenzione duplicati**

- ✅ **Date-based Scheduling** - Selezione data calendario
- ✅ **Density Visualization** - Colori graduali per occupazione (verde→rosso)
- ✅ **Duplicate Prevention** - Max 1 appuntamento futuro per CF+Cronoscita
- ✅ **Exam Selection** - Scelta esami da catalogo configurato
- ✅ **Referto Gating** - Scheduling bloccato senza referto oggi

**Business Rules:**
- ✅ Un paziente può avere solo **un appuntamento futuro** per Cronoscita
- ✅ Deve completare **referto oggi** prima di schedulare successivo
- ✅ Visualizzazione densità medico per ottimizzazione calendario

**Endpoints Principali:**
```
GET    /scheduling-data/{cf_paziente}            - Dati completi scheduling
POST   /validation/check-scheduling-permission   - Valida permesso
POST   /appointments/schedule                    - Crea appuntamento
GET    /density/doctor/{id_medico}               - Densità calendario medico
GET    /exams/{cronoscita_id}                    - Esami disponibili
```

### 4. 🔧 Admin Dashboard

**Configurazione completa sistema**

- ✅ **Gestione Cronoscita** - Creazione/modifica percorsi di cura
- ✅ **Catalogo Esami** - Configurazione esami per Cronoscita
- ✅ **Exam Mappings** - Mappatura codici interni ↔ Wirgilio
- ✅ **Validazione Master Catalog** - Verifica contro catalogo regionale
- ✅ **User Management** - Gestione utenti amministratori
- ✅ **Email Verification** - Sistema verifica email con Redis

**Caratteristiche Avanzate:**
- Master Catalog Validation (catalogo regionale Lazio)
- Business Rules Validation (prevenzione conflitti mappature)
- Cascade Delete (eliminazione esami con mappature correlate)

### 5. 📄 Diario Service

**Accesso documenti clinici storici**

- ✅ **Lista Documenti** - Recupero documenti paziente da Wirgilio
- ✅ **Visualizzazione PDF** - Download e display PDF in modal
- ✅ **Ordinamento Temporale** - Documenti ordinati per data (recenti primi)

**Note:** Repository endpoint richiede autenticazione separata (in sviluppo)

### 6. 🌐 API Gateway

**Routing centralizzato con proxy intelligente**

- ✅ **Unified Entry Point** - Singolo endpoint per tutti i servizi
- ✅ **Request Proxying** - Instradamento automatico richieste
- ✅ **CORS Management** - Gestione centralizzata CORS
- ✅ **Health Monitoring** - Controllo stato tutti i servizi
- ✅ **Legacy Compatibility** - Supporto route legacy

---

## 🛠 Tecnologie Utilizzate

### Backend

| Tecnologia | Versione | Uso |
|------------|----------|-----|
| **Python** | 3.11 | Linguaggio principale backend |
| **FastAPI** | 0.104+ | Framework API asincrono |
| **MongoDB** | 6.0 | Database NoSQL principale |
| **Motor** | 3.3+ | Driver MongoDB asincrono |
| **Redis** | 7 | Session management & caching |
| **Pydantic** | 2.0+ | Validazione dati & modelli |
| **httpx** | 0.25+ | Client HTTP asincrono |
| **Uvicorn** | 0.24+ | Server ASGI |

### Frontend

| Tecnologia | Versione | Uso |
|------------|----------|-----|
| **React** | 18.2 | Framework UI |
| **React Router** | 6.x | Routing SPA |
| **Recharts** | 2.x | Grafici analytics |
| **CSS3** | - | Styling moderno |

### DevOps & Infrastructure

| Tecnologia | Versione | Uso |
|------------|----------|-----|
| **Docker** | 20+ | Containerizzazione |
| **Docker Compose** | 2.x | Orchestrazione locale |
| **Nginx** | (planned) | Reverse proxy produzione |

### Integrazioni Esterne

- **Wirgilio DB** (MongoDB) - Database demografico pazienti
- **Wirgilio API** - API dati laboratorio e documenti
- **Catalogo Regionale** - Validazione prestazioni Lazio

---

## 📁 Struttura del Progetto

```
chronic-diabetes-management/
│
├── services/                          # Backend Microservices (FastAPI)
│   ├── timeline-service/             # 🏥 Core - Timeline & Referti
│   │   ├── app/
│   │   │   ├── main.py               # FastAPI app & routing
│   │   │   ├── models.py             # Pydantic models
│   │   │   ├── services.py           # Business logic
│   │   │   ├── repositories.py       # Data access layer
│   │   │   ├── routers.py            # API endpoints
│   │   │   ├── session.py            # Redis session manager
│   │   │   ├── web_routes.py         # Session API routes
│   │   │   ├── cronoscita_repository.py  # Cronoscita data access
│   │   │   ├── database.py           # MongoDB connection
│   │   │   ├── config.py             # Configuration
│   │   │   └── exceptions.py         # Custom exceptions
│   │   ├── requirements.txt
│   │   └── Dockerfile.dev
│   │
│   ├── analytics-service/            # 📊 Laboratory Analytics
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py             # Analytics data models
│   │   │   ├── services.py           # Wirgilio integration
│   │   │   ├── filtering.py          # Exam filtering logic
│   │   │   ├── repositories.py       # Exam mapping repository
│   │   │   ├── routers.py
│   │   │   ├── database.py
│   │   │   ├── config.py
│   │   │   └── exceptions.py
│   │   ├── requirements.txt
│   │   └── Dockerfile.dev
│   │
│   ├── scheduler-service/            # 📅 Appointment Scheduling
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py             # Scheduling models
│   │   │   ├── services.py           # Scheduling logic
│   │   │   ├── routers.py            # Scheduling endpoints
│   │   │   ├── repositories.py       # Appointment repository
│   │   │   ├── database.py
│   │   │   ├── config.py
│   │   │   └── exceptions.py
│   │   ├── requirements.txt
│   │   └── Dockerfile.dev
│   │
│   ├── admin-dashboard/              # 🔧 Admin Configuration
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py             # Admin models
│   │   │   ├── database.py           # Repositories (Lab, Cronoscita)
│   │   │   ├── auth_routes.py        # Authentication routes
│   │   │   ├── auth_service.py       # Auth business logic
│   │   │   ├── session_manager.py    # Redis session management
│   │   │   ├── email_service.py      # Email verification
│   │   │   ├── config.py
│   │   │   └── utils.py
│   │   ├── scripts/
│   │   │   ├── import_master_catalog.py
│   │   │   └── seed_exam_data_corrected.py
│   │   ├── requirements.txt
│   │   └── Dockerfile.dev
│   │
│   ├── diario-service/               # 📄 Clinical Documents
│   │   ├── app/
│   │   │   └── main.py               # Wirgilio document integration
│   │   ├── requirements.txt
│   │   └── Dockerfile.dev
│   │
│   └── api-gateway/                  # 🌐 API Gateway
│       ├── app/
│       │   └── main.py               # Request routing & proxying
│       ├── requirements.txt
│       └── Dockerfile.dev
│
├── frontend/                          # React Frontend Applications
│   ├── timeline-app/                 # 🏥 Doctor Workspace
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── DoctorWorkspace.js    # Main workspace component
│   │   │   ├── api.js                # API client
│   │   │   ├── components/           # React components
│   │   │   │   ├── auth/             # Login components
│   │   │   │   ├── PatientLookup.js
│   │   │   │   ├── PatientRegistration.js
│   │   │   │   ├── PatientTimeline.js
│   │   │   │   └── ScheduleAppointment.js
│   │   │   ├── styles.js
│   │   │   └── index.css
│   │   ├── package.json
│   │   └── Dockerfile.dev
│   │
│   ├── analytics-app/                # 📊 Analytics Dashboard
│   │   ├── src/
│   │   │   ├── App.js
│   │   │   ├── api.js
│   │   │   └── styles.css
│   │   ├── package.json
│   │   └── Dockerfile.dev
│   │
│   ├── scheduler-app/                # 📅 Scheduler Interface
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── api.js
│   │   ├── package.json
│   │   └── Dockerfile.dev
│   │
│   ├── admin-app/                    # 🔧 Admin Panel
│   │   ├── src/
│   │   │   ├── AuthApp.js            # Authentication
│   │   │   ├── components/
│   │   │   │   ├── auth/             # Auth components
│   │   │   │   └── LaboratorioManagement.js
│   │   │   ├── api.js
│   │   │   └── auth.css
│   │   ├── package.json
│   │   └── Dockerfile.dev
│   │
│   └── diario-app/                   # 📄 Clinical Documents Viewer
│       ├── src/
│       │   ├── index.js
│       │   └── styles.css
│       ├── package.json
│       └── Dockerfile.dev
│
├── docs/                              # Documentation
│   └── Timeline Service Implementation Documentation.pdf
│
├── docker-compose.dev.yml            # Development orchestration
├── Makefile                          # Build automation
├── .env                              # Environment variables (gitignored)
├── .gitignore
└── README.md                         # This file
```

---

## 🚀 Installazione

### Prerequisiti

- **Docker** 20.x o superiore
- **Docker Compose** 2.x o superiore
- **Git**
- Accesso a Wirgilio DB (per ambiente produzione)

### Clone del Repository

```bash
git clone https://github.com/your-org/chronic-diabetes-management.git
cd chronic-diabetes-management
```

### Configurazione Ambiente

1. **Crea file `.env`** nella root del progetto:

```bash
cp .env.example .env
```

2. **Configura variabili d'ambiente** in `.env`:

```env
# ================================
# ENVIRONMENT
# ================================
ENVIRONMENT=development
VM_HOST=localhost

# ================================
# MONGODB
# ================================
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
MONGO_INITDB_DATABASE=diabetes_db
MONGODB_PORT=27018

# ================================
# REDIS
# ================================
REDIS_PASSWORD=redis123
REDIS_PORT=6381

# ================================
# WIRGILIO INTEGRATION
# ================================
WIRGILIO_TOKEN=your_wirgilio_jwt_token_here
WIRGILIO_BASE_URL=https://10.10.13.14
WIRGILIO_API_PATH=/cpi/wirgilio-api
WIRGILIO_VERIFY_SSL=false

# ================================
# SERVICE PORTS
# ================================
TIMELINE_SERVICE_PORT=8001
ANALYTICS_SERVICE_PORT=8002
SCHEDULER_SERVICE_PORT=8003
ADMIN_SERVICE_PORT=8084
DIARIO_SERVICE_PORT=8005
API_GATEWAY_PORT=8080

# ================================
# FRONTEND PORTS
# ================================
TIMELINE_FRONTEND_PORT=3010
ANALYTICS_FRONTEND_PORT=3011
ADMIN_FRONTEND_PORT=3012
SCHEDULER_FRONTEND_PORT=3013
DIARIO_FRONTEND_PORT=3014

# ================================
# ADMIN TOOLS
# ================================
MONGO_EXPRESS_PORT=8081
REDIS_COMMANDER_PORT=8082

# ================================
# SMTP (for email verification)
# ================================
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Build e Avvio

```bash
# Build tutti i container
make build

# Avvia tutti i servizi
make up

# Verifica stato servizi
make status

# Visualizza logs
make logs
```

### Comandi Makefile Disponibili

```bash
make build      # Build all Docker images
make up         # Start all services
make down       # Stop all services
make logs       # View logs for all services
make clean      # Clean up all resources
make restart    # Restart all services
make status     # Show service status
```

---

## ⚙️ Configurazione

### Accesso ai Servizi

Dopo l'avvio, i servizi sono disponibili su:

**Backend Services:**
- API Gateway: http://localhost:8080
- Timeline Service: http://localhost:8001
- Analytics Service: http://localhost:8002
- Scheduler Service: http://localhost:8003
- Admin Dashboard: http://localhost:8084
- Diario Service: http://localhost:8005

**Frontend Applications:**
- Timeline App: http://localhost:3010
- Analytics App: http://localhost:3011
- Admin Panel: http://localhost:3012
- Scheduler App: http://localhost:3013
- Diario App: http://localhost:3014

**Development Tools:**
- Mongo Express: http://localhost:8081 (admin/admin123)
- Redis Commander: http://localhost:8082

**API Documentation:**
- Timeline: http://localhost:8001/docs
- Analytics: http://localhost:8002/docs
- Scheduler: http://localhost:8003/docs
- Admin: http://localhost:8084/docs
- Gateway: http://localhost:8080/docs

### Primo Setup

1. **Accedi al Admin Panel**: http://localhost:3012

2. **Crea una Cronoscita**:
   - Vai a "Gestione Cronoscita"
   - Click "Nuova Cronoscita"
   - Nome: "DIABETE TIPO 2"
   - Salva

3. **Configura Catalogo Esami**:
   - Seleziona la Cronoscita creata
   - Vai a "Catalogo Esami"
   - Aggiungi esami dal catalogo master

4. **Crea Mappature Wirgilio**:
   - Vai a "Mappature Esami"
   - Associa codici interni a codici Wirgilio per struttura

5. **Accedi a Timeline App**: http://localhost:3010
   - Login come medico (DOC001, DOC002, ecc.)
   - Seleziona Cronoscita
   - Inizia a gestire pazienti

---

## 🎯 Utilizzo

### Workflow Medico Completo

#### 1. Login Medico

```
Timeline App → Login → Seleziona Cronoscita
```

Il sistema crea una **sessione Redis** di 10 ore per il medico.

#### 2. Ricerca Paziente

```
Inserisci CF → Sistema cerca in:
  1. Database locale (per questa Cronoscita)
  2. Altre Cronoscita (riutilizzo demografici)
  3. Wirgilio DB (paziente nuovo)
```

**Scenari:**
- ✅ **Paziente esistente in Cronoscita** → Vai a Timeline
- ✅ **Paziente in altra Cronoscita** → Registrazione semplificata
- ✅ **Paziente completamente nuovo** → Registrazione con dati Wirgilio

#### 3. Registrazione Paziente

```
Timeline App → Register Patient → Conferma Dati
```

Il sistema:
- Recupera dati demografici da Wirgilio
- Permette modifica telefono/email
- Crea enrollment nella Cronoscita selezionata

#### 4. Visualizzazione Timeline

```
Timeline App → Mostra Timeline Paziente
```

Vista divisa in tre sezioni:
- **Precedenti** - Appuntamenti passati (ordinati: recenti primi)
- **Oggi** - Appuntamenti odierni
- **Successivo** - Prossimo appuntamento futuro

**Features:**
- Tab "Referti" - Storico referti Cronoscita-isolated
- Tab "Analytics" - Grafici laboratorio (iframe analytics-app)
- Tab "Diario" - Documenti clinici storici (iframe diario-app)
- Bottone "Successivo" - Apre scheduler (se abilitato)

#### 5. Compilazione Referto

```
Timeline Tab "Referti" → Compila Nuovo Referto
```

**Validazioni:**
- Minimo 10 caratteri testo refertazione
- Campi diagnosi/terapia opzionali
- Salvataggio con stato "completato"

**Effetto:** Abilita bottone "Successivo" per scheduling

#### 6. Programmazione Appuntamento

```
Timeline → Click "Successivo" → Scheduler App (iframe)
```

**Pre-condizioni:**
- ✅ Referto completato oggi
- ✅ Nessun appuntamento futuro per CF+Cronoscita

**Processo:**
1. Seleziona esami da catalogo configurato
2. Visualizza densità calendario medico (colori verde→rosso)
3. Seleziona data disponibile
4. Conferma → Appuntamento creato

**Business Rule:** Max **1 appuntamento futuro** per paziente per Cronoscita

#### 7. Analytics Laboratorio

```
Timeline Tab "Analytics" → Visualizza Grafici
```

**Features:**
- Dropdown esami (solo quelli mappati per Cronoscita)
- Dropdown parametri (sotto-analisi)
- Grafico time-series con anomaly detection
- Colori: Verde (normale) / Rosso (anomalie P/AP)

---

## 📚 API Documentation

### Timeline Service API

**Base URL:** `http://localhost:8001` (o via Gateway: `http://localhost:8080/api/timeline`)

#### Patient Management

```http
POST /patients/lookup
Content-Type: application/json

{
  "cf_paziente": "RSSMRA80A01H501U",
  "id_medico": "DOC001",
  "patologia": "DIABETE TIPO 2"
}

Response 200:
{
  "exists": true/false,
  "message": "...",
  "patient_data": {...}
}
```

```http
POST /patients/register
Content-Type: application/json

{
  "cf_paziente": "RSSMRA80A01H501U",
  "id_medico": "DOC001",
  "patologia": "DIABETE TIPO 2",
  "confirm_registration": true
}

Response 200:
{
  "success": true,
  "message": "...",
  "patient_id": "RSSMRA80A01H501U",
  "enrollment_date": "2024-01-15T10:30:00"
}
```

#### Timeline

```http
GET /timeline/{cf_paziente}?id_medico=DOC001&patologia=DIABETE%20TIPO%202

Response 200:
{
  "patient_id": "RSSMRA80A01H501U",
  "patient_name": "Mario Rossi",
  "patologia": "DIABETE TIPO 2",
  "cronoscita_id": "507f1f77bcf86cd799439011",
  "enrollment_date": "15/01/2024",
  "precedenti": [...],
  "oggi": [...],
  "successivo": [...],
  "total_appointments": 5,
  "can_schedule_next": true
}
```

#### Referti

```http
POST /referti/save
Content-Type: application/json

{
  "cf_paziente": "RSSMRA80A01H501U",
  "id_medico": "DOC001",
  "patologia": "DIABETE TIPO 2",
  "testo_referto": "Paziente in buone condizioni...",
  "diagnosi": "Diabete tipo 2 compensato",
  "terapia_prescritta": "Metformina 1000mg",
  "data_visita": "2024-01-15"
}

Response 200:
{
  "success": true,
  "message": "Referto salvato con successo",
  "referto_id": "REF_1705315800",
  "can_schedule_next": true,
  "saved_at": "2024-01-15T10:30:00"
}
```

### Analytics Service API

**Base URL:** `http://localhost:8002` (o via Gateway: `http://localhost:8080/api/analytics`)

```http
GET /analytics/laboratory-exams/{cf}?cronoscita_id=507f1f77bcf86cd799439011

Response 200:
{
  "success": true,
  "codice_fiscale": "RSSMRA80A01H501U",
  "exam_summaries": [
    {
      "exam_key": "GLICEMIA",
      "has_anomaly": true,
      "total_results": 15,
      "anomaly_count": 3
    }
  ],
  "total_exams": 8
}
```

### Scheduler Service API

**Base URL:** `http://localhost:8003` (o via Gateway: `http://localhost:8080/api/scheduler`)

```http
POST /validation/check-scheduling-permission
Content-Type: application/json

{
  "cf_paziente": "RSSMRA80A01H501U",
  "cronoscita_id": "507f1f77bcf86cd799439011"
}

Response 200:
{
  "can_schedule": true/false,
  "error_type": null,
  "message": "...",
  "existing_appointment": null
}
```

```http
POST /appointments/schedule
Content-Type: application/json

{
  "cf_paziente": "RSSMRA80A01H501U",
  "id_medico": "DOC001",
  "cronoscita_id": "507f1f77bcf86cd799439011",
  "appointment_date": "2024-02-15",
  "selected_exam_mappings": ["mapping_id_1", "mapping_id_2"],
  "notes": "Controllo trimestrale"
}

Response 200:
{
  "success": true,
  "message": "Appuntamento creato con successo",
  "appointment_id": "APT_123456",
  "appointment_date": "2024-02-15"
}
```

---

## 🔄 Workflow Clinico

### Diagramma Flusso Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                      1. LOGIN MEDICO                            │
│              Timeline App → Selezione Cronoscita                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   2. RICERCA PAZIENTE (CF)                      │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────┐      │
│  │ Esiste in    │───▶│ Esiste in   │───▶│ Nuovo da     │      │
│  │ Cronoscita   │    │ altra       │    │ Wirgilio     │      │
│  │ Corrente     │    │ Cronoscita  │    │              │      │
│  └──────┬───────┘    └──────┬──────┘    └──────┬───────┘      │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│    Timeline          Registrazione        Registrazione        │
│                      Semplificata         Completa             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. VISUALIZZA TIMELINE                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐            │
│  │ Precedenti │  │    Oggi    │  │  Successivo  │            │
│  │ (passati)  │  │ (corrente) │  │   (futuro)   │            │
│  └────────────┘  └────────────┘  └──────────────┘            │
│                                                                 │
│  Tabs: [Referti] [Analytics] [Diario]                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. COMPILA REFERTO                           │
│  ✅ Testo refertazione (min 10 caratteri)                      │
│  ✅ Diagnosi (opzionale)                                        │
│  ✅ Terapia prescritta (opzionale)                             │
│  → Salva → Status: COMPLETATO                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. VALIDAZIONE SCHEDULING                          │
│  ✅ Referto completato oggi? → YES                             │
│  ✅ Appuntamento futuro esistente? → NO                        │
│  → Bottone "Successivo" ABILITATO                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                6. SCHEDULER (iframe)                            │
│  1. Seleziona esami da catalogo Cronoscita                     │
│  2. Visualizza densità calendario (verde→giallo→rosso)         │
│  3. Seleziona data disponibile                                 │
│  4. Conferma                                                    │
│  → Appuntamento creato in timeline "Successivo"                │
└─────────────────────────────────────────────────────────────────┘
```

### Stati e Transizioni

```
NUOVO PAZIENTE
    │
    ├─→ RICERCA (Wirgilio DB)
    │       │
    │       └─→ REGISTRAZIONE → TIMELINE VIEW
    │
PAZIENTE ESISTENTE
    │
    └─→ TIMELINE VIEW
            │
            ├─→ Tab REFERTI
            │       │
            │       ├─→ Compila Referto → REFERTO SALVATO
            │       │                          │
            │       │                          └─→ can_schedule_next = TRUE
            │       │
            │       └─→ Visualizza Storico Referti
            │
            ├─→ Tab ANALYTICS
            │       │
            │       └─→ Grafici Laboratorio (filtered by Cronoscita)
            │
            ├─→ Tab DIARIO
            │       │
            │       └─→ Documenti Storici
            │
            └─→ Bottone SUCCESSIVO (se abilitato)
                    │
                    └─→ SCHEDULER → APPUNTAMENTO CREATO
                                            │
                                            └─→ Appare in "Successivo"
```

---

## 🔐 Sicurezza & Isolamento Dati

### Cronoscita Isolation

Il sistema implementa **strict isolation** a livello Cronoscita:

```python
# Esempio: Query paziente SEMPRE con Cronoscita
patient = await db.patients.find_one({
    "cf_paziente": cf,
    "patologia": cronoscita_name  # REQUIRED filter
})

# Esempio: Timeline appuntamenti SEMPRE filtrati
appointments = await db.appointments.find({
    "cf_paziente": cf,
    "cronoscita_id": cronoscita_id  # REQUIRED filter
})

# Esempio: Referti SEMPRE isolati
referti = await db.referti.find({
    "cf_paziente": cf,
    "patologia": cronoscita_name  # REQUIRED filter
})
```

### Session Management

**Redis Sessions (10 ore TTL):**
- Session key: `session:{doctor_id}:{cronoscita_name}`
- Browser sessionStorage per persistenza locale
- Auto-cleanup dopo 10 ore

### Validation Layers

1. **Pydantic Models** - Input validation
2. **Business Rules** - Logica applicativa
3. **Database Constraints** - Unique indexes
4. **Repository Layer** - Data access isolation

---

## 🧪 Testing

### Test Manuale

```bash
# 1. Health Check tutti i servizi
curl http://localhost:8080/health

# 2. Test Timeline Service
curl -X POST http://localhost:8001/patients/lookup \
  -H "Content-Type: application/json" \
  -d '{"cf_paziente":"RSSMRA80A01H501U","id_medico":"DOC001","patologia":"DIABETE TIPO 2"}'

# 3. Test Analytics Service
curl http://localhost:8002/analytics/laboratory-exams/RSSMRA80A01H501U?cronoscita_id=123

# 4. Test Scheduler Service
curl http://localhost:8003/health
```

### Database Inspection

**Mongo Express:** http://localhost:8081
- Username: admin
- Password: admin123

**Collections da verificare:**
- `patients` - Enrollment pazienti
- `cronoscita` - Percorsi di cura
- `appointments` - Appuntamenti
- `referti` - Referti medici
- `exam_catalog` - Catalogo esami
- `exam_mappings` - Mappature Wirgilio

**Redis Commander:** http://localhost:8082
- Verifica sessioni medico
- TTL monitoring

---

## 🐛 Troubleshooting

### Problemi Comuni

#### 1. Servizio non si avvia

```bash
# Controlla logs
docker logs diabetes-timeline-service --tail 100

# Verifica porte in uso
netstat -tuln | grep -E '8001|8002|8003|8080|27018|6381'

# Riavvia servizio specifico
docker restart diabetes-timeline-service
```

#### 2. MongoDB connection refused

```bash
# Verifica MongoDB running
docker ps | grep mongodb

# Controlla logs MongoDB
docker logs diabetes-mongodb --tail 50

# Riavvia MongoDB
docker restart diabetes-mongodb
```

#### 3. Redis session errors

```bash
# Verifica Redis running
docker logs diabetes-redis --tail 50

# Test Redis connection
docker exec -it diabetes-redis redis-cli -a redis123 PING
```

#### 4. Frontend non carica

```bash
# Ricompila frontend
docker-compose -f docker-compose.dev.yml up --build timeline-frontend

# Controlla logs frontend
docker logs diabetes-timeline-frontend --tail 100
```

#### 5. Wirgilio integration errors

Verifica token e configurazione:
```bash
docker exec diabetes-diario-service env | grep WIRGILIO
```

Common issues:
- Token scaduto → Richiedi nuovo token
- SSL verification → Set `WIRGILIO_VERIFY_SSL=false` per test
- Network connectivity → Verifica accesso a 10.10.13.14

---

## 🚢 Deployment Produzione

### Prerequisiti Produzione

- Server Linux (Ubuntu 20.04+)
- Docker & Docker Compose
- Nginx come reverse proxy
- SSL certificates (Let's Encrypt)
- Backup automatizzato MongoDB
- Monitoring (Prometheus + Grafana)

### Environment Produzione

```env
ENVIRONMENT=production
VM_HOST=your-production-domain.com
WIRGILIO_VERIFY_SSL=true
# ... altre configurazioni produzione
```

### Nginx Configuration (esempio)

```nginx
# /etc/nginx/sites-available/chronic-management

upstream api_gateway {
    server localhost:8080;
}

upstream timeline_frontend {
    server localhost:3010;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # API Gateway
    location /api/ {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Timeline Frontend
    location / {
        proxy_pass http://timeline_frontend;
        proxy_set_header Host $host;
    }
}
```

### Backup Strategy

```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec diabetes-mongodb mongodump \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --out /backup/diabetes_db_$DATE

# Compress backup
tar -czf diabetes_db_$DATE.tar.gz /backup/diabetes_db_$DATE
```

---

## 🤝 Contribuire

Contributi sono benvenuti! Per favore segui questi step:

1. **Fork** il repository
2. **Crea branch** per la feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. **Push** al branch (`git push origin feature/AmazingFeature`)
5. **Apri Pull Request**

### Coding Standards

- **Python**: Follow PEP 8, use type hints
- **JavaScript**: ES6+, functional components
- **Commit Messages**: Conventional Commits format
- **Documentation**: Update README for API changes

---

## 📄 Licenza

Questo progetto è distribuito sotto licenza **MIT License**.

```
MIT License

Copyright (c) 2024 ASL Healthcare System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Team & Contatti

**Developed for:** ASL (Azienda Sanitaria Locale)  
**Architecture:** Microservices with Cronoscita Isolation  
**Integration:** Wirgilio Healthcare System  

### Support

Per supporto tecnico o domande:
- 📧 Email: support@your-domain.com
- 📝 Issues: https://github.com/your-org/chronic-diabetes-management/issues
- 📖 Documentation: https://docs.your-domain.com

---

## 🙏 Riconoscimenti

- **FastAPI** - Modern async web framework
- **React** - UI library
- **MongoDB** - NoSQL database
- **Redis** - Session management
- **Wirgilio** - Healthcare data integration
- **Docker** - Containerization platform

---

## 📊 Statistiche Progetto

- **Backend Services:** 6 microservices
- **Frontend Apps:** 5 React applications
- **Database Collections:** 8+ collections
- **API Endpoints:** 50+ endpoints
- **Lines of Code:** ~15,000+ LOC
- **Docker Containers:** 13 containers
- **Technologies:** 10+ technologies

---

**Made with ❤️ for Italian Healthcare System**

*Last Updated: January 2024*

