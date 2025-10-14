# services/timeline-service/app/web_routes.py
"""
FastAPI Session Management APIs for React Frontend
Pure JSON APIs for session handling - no HTML templates
"""

from fastapi import APIRouter, Request, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from .session import (
    session_manager, SessionCookie, require_valid_session, get_current_session
)
from .config import HARDCODED_DOCTOR_CREDENTIALS, settings
from datetime import datetime
logger = logging.getLogger(__name__)

# Create API router for session management
session_router = APIRouter(prefix="/api/session", tags=["Session Management"])

# ================================
# HELPER: AUTO-TRACK DOCTOR ACTIVITY
# ================================

async def _track_doctor_activity(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patologia: str,
    cf_paziente: str,
    cronoscita_repo
):
    """
    Automatically track doctor activity when they login with a patient.
    Creates/updates doctor entry in doctors collection.
    Event-driven tracking - happens on every login.
    """
    try:
        # Get doctor info from hardcoded credentials
        doctor_creds = HARDCODED_DOCTOR_CREDENTIALS.get(doctor_id)
        if not doctor_creds:
            logger.warning(f"⚠️ Doctor {doctor_id} not found in credentials")
            return
        
        # Get cronoscita ID
        cronoscita_doc = await db.cronoscita.find_one({"nome": patologia, "is_active": True})
        if not cronoscita_doc:
            logger.warning(f"⚠️ Cronoscita '{patologia}' not found for tracking")
            return
        
        cronoscita_id = str(cronoscita_doc["_id"])
        
        # Check if doctor exists in doctors collection
        doctor_doc = await db.doctors.find_one({"codice_medico": doctor_id})
        
        if not doctor_doc:
            # ✅ CREATE NEW DOCTOR ENTRY
            doctor_entry = {
                "codice_medico": doctor_id,
                "nome_completo": doctor_creds.nome_completo,
                "specializzazione": doctor_creds.specializzazione,
                "struttura": doctor_creds.struttura,
                "email": None,
                "cronoscita_activity": [
                    {
                        "cronoscita_id": cronoscita_id,
                        "cronoscita_nome": patologia,
                        "first_patient_date": datetime.now(),
                        "last_access_date": datetime.now(),
                        "total_patients_enrolled": 1,
                        "total_visits_completed": 0
                    }
                ],
                "is_active": True,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "last_login": datetime.now()
            }
            
            await db.doctors.insert_one(doctor_entry)
            logger.info(f"✅ Created doctor entry for {doctor_id}")
        
        else:
            # ✅ UPDATE EXISTING DOCTOR
            # Check if this Cronoscita is already in their activity
            activity = doctor_doc.get("cronoscita_activity", [])
            cronoscita_exists = False
            
            for i, act in enumerate(activity):
                if act.get("cronoscita_id") == cronoscita_id:
                    # Update existing activity
                    activity[i]["last_access_date"] = datetime.now()
                    cronoscita_exists = True
                    break
            
            if not cronoscita_exists:
                # Add new Cronoscita activity
                activity.append({
                    "cronoscita_id": cronoscita_id,
                    "cronoscita_nome": patologia,
                    "first_patient_date": datetime.now(),
                    "last_access_date": datetime.now(),
                    "total_patients_enrolled": 1,
                    "total_visits_completed": 0
                })
            
            # Update doctor document
            await db.doctors.update_one(
                {"codice_medico": doctor_id},
                {
                    "$set": {
                        "cronoscita_activity": activity,
                        "last_login": datetime.now(),
                        "updated_at": datetime.now()
                    }
                }
            )
            
            logger.info(f"✅ Updated doctor activity for {doctor_id} in '{patologia}'")
    
    except Exception as e:
        logger.error(f"❌ Error tracking doctor activity: {e}")
        raise

# ================================
# SESSION MANAGEMENT APIS
# ================================

@session_router.post("/login")
async def login(
    request: Request,
    cf_paziente: str = Form(..., min_length=16, max_length=16),
    id_medico: str = Form(...),
    patologia: str = Form(...)
):
    """Doctor login with patient context and STRICT cronoscita validation"""
    
    try:
        # Validate doctor exists
        if id_medico not in HARDCODED_DOCTOR_CREDENTIALS:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Credenziali medico non valide"
                }
            )
        
        # Validate and format CF
        cf_paziente = cf_paziente.upper().strip()
        if len(cf_paziente) != 16:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Codice fiscale deve essere di 16 caratteri"
                }
            )
        
        # ✅ CRITICAL: Validate cronoscita exists and is active BEFORE session creation
        try:
            from .database import get_database
            from .cronoscita_repository import CronoscitaRepository
            
            db = await get_database()
            cronoscita_repo = CronoscitaRepository(db)
            
            is_valid_pathology = await cronoscita_repo.validate_pathologie(patologia)
            if not is_valid_pathology:
                logger.warning(f"🚨 Invalid cronoscita login attempt: '{patologia}' by Dr.{id_medico}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"❌ Cronoscita '{patologia}' non valida o non attiva.\n\n🔧 Contattare amministratore per verificare configurazione Cronoscita."
                    }
                )
            
            logger.info(f"✅ Cronoscita validated for session: '{patologia}'")
            
            # ✅ AUTO-TRACK DOCTOR IN DOCTORS COLLECTION (Event-driven)
            try:
                await _track_doctor_activity(db, id_medico, patologia, cf_paziente, cronoscita_repo)
                logger.info(f"📊 Doctor activity tracked for {id_medico} in Cronoscita '{patologia}'")
            except Exception as track_error:
                # Non-blocking: Log error but don't fail login
                logger.warning(f"⚠️ Could not track doctor activity: {track_error}")
                
        except Exception as e:
            logger.error(f"❌ Error validating pathology during login: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": f"Errore validazione Cronoscita: {str(e)}"
                }
            )
        
        # ✅ Create session with VALIDATED cronoscita context
        session_id = await session_manager.create_session(
            id_medico,
            {
                "cf_paziente": cf_paziente,
                "patologia": patologia,
                "cronoscita_validated": True,
                "cronoscita_validation_time": datetime.now().isoformat(),
                "patient_context": True,
                "context_created": datetime.now().isoformat(),
                "session_type": "validated_cronoscita"
            }
        )
        
        # Set secure session cookie
        response = JSONResponse(content={
            "success": True,
            "message": "Sessione creata con cronoscita validata",
            "doctor_id": id_medico,
            "cronoscita": patologia,
            "session_context": "cronoscita_validated"
        })
        
        SessionCookie.set_session_cookie(response, id_medico, session_id)
        
        logger.info(f"✅ VALIDATED SESSION: Dr.{id_medico} → CF:{cf_paziente} → Cronoscita:'{patologia}'")
        return response
        
    except Exception as e:
        logger.error(f"❌ Session creation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Errore creazione sessione: {str(e)}"
            }
        )

@session_router.post("/logout")
async def logout(
    request: Request,
    current_session: Optional[dict] = Depends(get_current_session)
):
    """Logout and invalidate session"""
    
    try:
        if current_session:
            # Invalidate session in Redis
            await session_manager.invalidate_session(
                current_session["doctor_id"],
                current_session["session_id"]
            )
            
            logger.info(f"Doctor {current_session['doctor_id']} logged out successfully")
        
        # Return success and clear cookie
        response = JSONResponse(content={
            "success": True,
            "message": "Logout effettuato con successo"
        })
        
        SessionCookie.clear_session_cookie(response)
        return response
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Errore durante il logout: {str(e)}"
            }
        )

@session_router.get("/status")
async def session_status(
    request: Request,
    current_session: Optional[dict] = Depends(get_current_session)
):
    """Get current session status for React frontend"""
    
    if not current_session:
        return JSONResponse(content={
            "authenticated": False,
            "session_active": False
        })
    
    # Get doctor info
    doctor_info = HARDCODED_DOCTOR_CREDENTIALS.get(current_session["doctor_id"])
    if not doctor_info:
        return JSONResponse(content={
            "authenticated": False,
            "session_active": False,
            "error": "Doctor not found"
        })
    
    # Get session data
    session_data = current_session["session_data"]
    
    return JSONResponse(content={
        "authenticated": True,
        "session_active": True,
        "doctor": {
            "id": current_session["doctor_id"],
            "name": doctor_info.nome_completo,
            "specialization": doctor_info.specializzazione,
            "code": doctor_info.codice_medico
        },
        "patient_context": {
            "current_patient": session_data.get("current_patient"),
            "current_pathology": session_data.get("current_pathology")
        },
        "session_info": {
            "created_at": session_data.get("created_at"),
            "last_activity": session_data.get("last_activity"),
            "expires_in_hours": 10
        }
    })

@session_router.post("/validate")
async def validate_session(
    request: Request,
    session_auth: dict = Depends(require_valid_session)
):
    """Validate session (protected endpoint for React route guards)"""
    
    return JSONResponse(content={
        "valid": True,
        "doctor_id": session_auth["doctor_id"],
        "session_id": session_auth["session_id"]
    })

@session_router.get("/doctors")
async def get_available_doctors():
    """Get list of available doctors for login form"""
    
    doctors = [
        {
            "id": doc_id,
            "name": doc_data.nome_completo,
            "specialization": doc_data.specializzazione,
            "code": doc_data.codice_medico
        }
        for doc_id, doc_data in HARDCODED_DOCTOR_CREDENTIALS.items()
    ]
    
    return JSONResponse(content={
        "success": True,
        "doctors": doctors
    })

@session_router.get("/pathologies")
async def get_available_pathologies():
    """Get list of available pathologies from database (Cronoscita)"""
    
    try:
        from .database import get_database
        from .cronoscita_repository import CronoscitaRepository
        
        db = await get_database()
        cronoscita_repo = CronoscitaRepository(db)
        
        cronoscita_options = await cronoscita_repo.get_active_pathologie_options()
        
        pathologies = [
            {
                "value": option["code"],
                "label": option["display"],
                "category": "cronoscita"
            }
            for option in cronoscita_options
        ]
        
        return JSONResponse(content={
            "success": True,
            "pathologies": pathologies
        })
    except Exception as e:
        logger.error(f"Error getting pathologies from database: {str(e)}")
        return JSONResponse(content={
            "success": False,
            "pathologies": []
        })

@session_router.post("/update-patient-context")
async def update_patient_context(
    request: Request,
    cf_paziente: str = Form(...),
    patologia: str = Form(...),
    session_auth: dict = Depends(require_valid_session)
):
    """Update current patient context in session"""
    
    try:
        # Validate inputs
        cf_paziente = cf_paziente.upper().strip()
        if len(cf_paziente) != 16:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Codice fiscale deve essere di 16 caratteri"
                }
            )
        
        # Update session with new patient context
        doctor_id = session_auth["doctor_id"]
        session_id = session_auth["session_id"]
        
        # Get current session data
        session_data = session_auth["session_data"]
        session_data.update({
            "current_patient": cf_paziente,
            "current_pathology": patologia,
            "patient_context_updated": True
        })
        
        # Update session in Redis
        session_key = f"doctor_session:{doctor_id}:{session_id}"
        import json
        await session_manager.redis_client.setex(
            session_key,
            session_manager.session_expiry,
            json.dumps(session_data)
        )
        
        logger.info(f"Updated patient context for doctor {doctor_id}: {cf_paziente}")
        
        return JSONResponse(content={
            "success": True,
            "message": "Contesto paziente aggiornato",
            "current_patient": cf_paziente,
            "current_pathology": patologia
        })
        
    except Exception as e:
        logger.error(f"Error updating patient context: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Errore aggiornamento contesto: {str(e)}"
            }
        )

# ================================
# HEALTH CHECK
# ================================

@session_router.get("/health")
async def session_health():
    """Health check for session management"""
    return {
        "service": "session-management",
        "status": "healthy",
        "redis_connected": session_manager.redis_client is not None,
        "session_expiry_hours": 10,
        "available_doctors": len(HARDCODED_DOCTOR_CREDENTIALS),
        "available_pathologies": "dynamic_from_database"
    }