# services/timeline-service/app/web_routes.py
"""
FastAPI Session Management APIs for React Frontend
Pure JSON APIs for session handling - no HTML templates
"""

from fastapi import APIRouter, Request, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Optional

from .session import (
    session_manager, SessionCookie, require_valid_session, get_current_session
)
from .config import HARDCODED_DOCTOR_CREDENTIALS, settings
from .models import PatologiaEnum

logger = logging.getLogger(__name__)

# Create API router for session management
session_router = APIRouter(prefix="/api/session", tags=["Session Management"])

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
    """Doctor login with patient context"""
    
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
        
        # Validate pathology
        try:
            PatologiaEnum(patologia)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Patologia non valida"
                }
            )
        
        # Create doctor session
        session_id = await session_manager.create_session(
            id_medico, 
            {
                "current_patient": cf_paziente,
                "current_pathology": patologia,
                "login_timestamp": True,
                "workspace_active": True
            }
        )
        
        # Get doctor info
        doctor_info = HARDCODED_DOCTOR_CREDENTIALS[id_medico]
        
        # Return success with session cookie
        response = JSONResponse(content={
            "success": True,
            "message": "Login effettuato con successo",
            "data": {
                "doctor_id": id_medico,
                "doctor_name": doctor_info.nome_completo,
                "doctor_specialization": doctor_info.specializzazione,
                "current_patient": cf_paziente,
                "current_pathology": patologia,
                "session_expires_hours": 10
            }
        })
        
        # Set session cookie
        SessionCookie.set_session_cookie(response, id_medico, session_id)
        
        logger.info(f"Doctor {id_medico} logged in successfully for patient {cf_paziente}")
        return response
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Errore interno del server: {str(e)}"
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
    """Get list of available pathologies for forms"""
    
    pathologies = [
        {
            "value": pathology.value,
            "label": pathology.value.replace("_", " ").title(),
            "category": "diabetes" if "diabetes" in pathology.value else "other"
        }
        for pathology in PatologiaEnum
    ]
    
    return JSONResponse(content={
        "success": True,
        "pathologies": pathologies
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
        "available_pathologies": len(PatologiaEnum)
    }