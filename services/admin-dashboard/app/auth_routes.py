# services/admin-dashboard/app/auth_routes.py
"""
Admin Authentication API Routes
Complete API endpoints for Gesan Healthcare admin authentication
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

from .models import (
    SignUpRequest, LoginRequest, EmailVerificationRequest,
    SignUpResponse, LoginResponse, EmailVerificationResponse, UserProfileResponse
)
from .auth_service import auth_service
from .session_manager import session_manager

logger = logging.getLogger(__name__)

# Create authentication router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# ================================
# AUTHENTICATION ENDPOINTS
# ================================

@auth_router.post("/signup", response_model=SignUpResponse)
async def signup(request: SignUpRequest):
    """Register new admin user - requires email verification"""
    try:
        logger.info(f"🔐 Signup attempt: {request.email}")
        
        result = await auth_service.signup(request)
        
        if result["success"]:
            logger.info(f"✅ Signup successful: {request.email}")
            return SignUpResponse(
                success=True,
                message=result["message"],
                user_id=result.get("user_id"),
                email=result["email"],
                verification_required=True
            )
        else:
            logger.warning(f"❌ Signup failed: {request.email} - {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"🚨 Signup error for {request.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno durante la registrazione")

@auth_router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(request: EmailVerificationRequest):
    """Verify email with 6-digit code"""
    try:
        logger.info(f"📧 Email verification attempt: {request.email}")
        
        result = await auth_service.verify_email(request)
        
        if result["success"]:
            logger.info(f"✅ Email verified: {request.email}")
            return EmailVerificationResponse(
                success=True,
                message=result["message"],
                email_verified=True
            )
        else:
            logger.warning(f"❌ Email verification failed: {request.email} - {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"🚨 Email verification error for {request.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno durante la verifica")

@auth_router.post("/login-request")
async def login_request(login_data: dict):
    """Request login - sends 6-digit code to email"""
    try:
        email = login_data.get("email")
        password = login_data.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email e password richiesti")
        
        logger.info(f"🔐 Login request: {email}")
        
        result = await auth_service.login_request(email, password)
        
        if result["success"]:
            logger.info(f"✅ Login verification code sent: {email}")
            return {
                "success": True,
                "message": result["message"],
                "verification_required": True
            }
        else:
            logger.warning(f"❌ Login request failed: {email} - {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 Login request error: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno durante l'accesso")

@auth_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Complete login with email verification code"""
    try:
        logger.info(f"🔐 Login completion attempt: {request.email}")
        
        result = await auth_service.complete_login(request)
        
        if result["success"]:
            # Create session
            session_token = await session_manager.create_session(
                result["user_id"], 
                result["user_data"]
            )
            
            logger.info(f"✅ Login successful: {request.email}")
            
            return LoginResponse(
                success=True,
                message="Login completato con successo",
                access_token=session_token,
                user_info=result["user_data"],
                expires_in=8 * 3600  # 8 hours
            )
        else:
            logger.warning(f"❌ Login failed: {request.email} - {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 Login error for {request.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore interno durante l'accesso")

@auth_router.post("/resend-code")
async def resend_verification_code(resend_data: dict):
    """Resend verification code"""
    try:
        email = resend_data.get("email")
        purpose = resend_data.get("purpose", "signup")  # 'signup' or 'login'
        
        if not email:
            raise HTTPException(status_code=400, detail="Email richiesta")
        
        logger.info(f"🔄 Resend code request: {email} - {purpose}")
        
        result = await auth_service.resend_verification_code(email, purpose)
        
        if result["success"]:
            logger.info(f"✅ Code resent: {email}")
            return {
                "success": True,
                "message": result["message"]
            }
        else:
            logger.warning(f"❌ Resend failed: {email} - {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 Resend code error: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore nell'invio del codice")

@auth_router.get("/me")
async def get_current_user(request: Request):
    """Get current authenticated user"""
    try:
        # Extract session token from headers or cookies
        auth_header = request.headers.get("Authorization")
        session_token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
        
        # Try to get from cookies if not in header
        if not session_token:
            session_token = request.cookies.get("session_token")
        
        if not session_token:
            raise HTTPException(status_code=401, detail="Token di accesso richiesto")
        
        # Validate session
        user_data = await session_manager.get_session(session_token)
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Sessione non valida o scaduta")
        
        logger.info(f"✅ Session validated: {user_data.get('email')}")
        
        return {
            "authenticated": True,
            "user": user_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 Session check error: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore controllo sessione")

@auth_router.post("/logout")
async def logout(request: Request):
    """Logout and invalidate session"""
    try:
        # Extract session token
        auth_header = request.headers.get("Authorization")
        session_token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
        
        if not session_token:
            session_token = request.cookies.get("session_token")
        
        if session_token:
            await session_manager.delete_session(session_token)
            logger.info("✅ User logged out")
        
        return {
            "success": True,
            "message": "Logout completato con successo"
        }
        
    except Exception as e:
        logger.error(f"🚨 Logout error: {str(e)}")
        # Don't fail logout even if there's an error
        return {
            "success": True,
            "message": "Logout completato"
        }

# ================================
# HEALTH CHECK FOR AUTH SERVICE
# ================================

@auth_router.get("/health")
async def auth_health_check():
    """Health check for authentication service"""
    try:
        # Test database connection
        from .database import get_database
        db = await get_database()
        await db.command("ping")
        
        return {
            "service": "admin-authentication",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "features": [
                "email_verification",
                "session_management", 
                "role_based_access",
                "security_features"
            ]
        }
        
    except Exception as e:
        logger.error(f"🚨 Auth health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Authentication service unavailable")