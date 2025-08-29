# services/admin-dashboard/app/auth_service.py
"""
Admin Authentication Service - COMPLETE VERSION WITH USER REDIRECTION
Complete authentication logic for Gesan Healthcare admin system with improved UX
"""

import bcrypt
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from .models import (
    SignUpRequest, LoginRequest, EmailVerificationRequest,
    AdminUser, EmailVerificationCode, UserStatus, UserRole
)
from .email_service import email_service
from .database import get_database

logger = logging.getLogger(__name__)

class AuthService:
    """Professional authentication service for admin users"""
    
    def __init__(self):
        self.max_verification_attempts = 5
        self.max_login_attempts = 5
        self.verification_expiry_minutes = 15
        self.account_lock_duration_minutes = 30
        self.session_expiry_hours = 8
        
    async def _get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        return await get_database()
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _generate_session_token(self) -> str:
        """Generate secure session token"""
        return secrets.token_urlsafe(32)
    
    async def signup(self, request: SignUpRequest) -> Dict[str, Any]:
        """Register new admin user"""
        try:
            db = await self._get_database()
            
            # Check if user already exists
            existing_user = await db.admin_users.find_one({"email": request.email})
            
            if existing_user:
                return {
                    "success": False,
                    "error": "Un utente con questa email esiste già"
                }
            
            # Check username availability
            existing_username = await db.admin_users.find_one({"username": request.username})
            if existing_username:
                return {
                    "success": False,
                    "error": "Username già in uso"
                }
            
            # Generate verification code
            verification_code = email_service.generate_verification_code()
            
            # Store verification code
            await db.admin_verification_codes.insert_one({
                "email": request.email,
                "code": verification_code,
                "expires_at": datetime.now() + timedelta(minutes=self.verification_expiry_minutes),
                "attempts": 0,
                "created_at": datetime.now(),
                "used": False,
                "purpose": "signup"
            })
            
            # Create pending user account (pending verification)
            now = datetime.now()
            user_data = AdminUser(
                user_id=str(uuid.uuid4()),
                nome=request.nome,
                cognome=request.cognome,
                username=request.username,
                email=request.email,
                password_hash=self._hash_password(request.password),
                role=request.role,
                status=UserStatus.PENDING,
                email_verified=False,
                verification_attempts=0,
                login_attempts=0,
                created_at=now,
                updated_at=now
            )
            
            # Convert to dict for MongoDB
            user_dict = user_data.dict()
            await db.admin_users.insert_one(user_dict)
            
            # Send verification email
            email_sent = await email_service.send_verification_email(
                request.email,
                request.nome,
                request.cognome,
                verification_code,
                "signup"
            )
            
            if not email_sent:
                logger.error(f"Failed to send verification email to {request.email}")
                return {
                    "success": False,
                    "error": "Errore nell'invio dell'email di verifica"
                }
            
            logger.info(f"User signup successful: {request.email}")
            
            return {
                "success": True,
                "message": "Registrazione completata. Controlla la tua email per il codice di verifica.",
                "user_id": user_data.user_id,
                "email": request.email,
                "verification_required": True
            }
            
        except Exception as e:
            logger.error(f"Signup error for {request.email}: {str(e)}")
            return {
                "success": False,
                "error": "Errore interno durante la registrazione"
            }
    
    async def verify_email(self, request: EmailVerificationRequest) -> Dict[str, Any]:
        """Verify email with 6-digit code"""
        try:
            db = await self._get_database()
            
            # Find verification code
            verification_record = await db.admin_verification_codes.find_one({
                "email": request.email,
                "used": False,
                "expires_at": {"$gt": datetime.now()}
            })
            
            if not verification_record:
                return {
                    "success": False,
                    "error": "Codice di verifica scaduto o non valido"
                }
            
            # Check attempts
            if verification_record["attempts"] >= self.max_verification_attempts:
                return {
                    "success": False,
                    "error": "Troppi tentativi di verifica. Richiedi un nuovo codice."
                }
            
            # Verify code
            if verification_record["code"] != request.verification_code:
                # Increment attempts
                await db.admin_verification_codes.update_one(
                    {"_id": verification_record["_id"]},
                    {"$inc": {"attempts": 1}}
                )
                
                remaining_attempts = self.max_verification_attempts - verification_record["attempts"] - 1
                return {
                    "success": False,
                    "error": f"Codice non corretto. Tentativi rimanenti: {remaining_attempts}"
                }
            
            # Mark code as used
            await db.admin_verification_codes.update_one(
                {"_id": verification_record["_id"]},
                {"$set": {"used": True}}
            )
            
            # Activate user account
            await db.admin_users.update_one(
                {"email": request.email},
                {
                    "$set": {
                        "status": UserStatus.ACTIVE,
                        "email_verified": True,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            # Send welcome email
            user = await db.admin_users.find_one({"email": request.email})
            if user:
                await email_service.send_welcome_email(
                    request.email,
                    user["nome"],
                    user["cognome"]
                )
            
            logger.info(f"Email verification successful: {request.email}")
            
            return {
                "success": True,
                "message": "Email verificata con successo! Account attivato.",
                "email_verified": True
            }
            
        except Exception as e:
            logger.error(f"Email verification error for {request.email}: {str(e)}")
            return {
                "success": False,
                "error": "Errore interno durante la verifica"
            }
    
    async def login_request(self, email: str, password: str) -> Dict[str, Any]:
        """Request login - sends verification code to email - IMPROVED WITH USER REDIRECTION"""
        try:
            db = await self._get_database()
            
            # Find user
            user = await db.admin_users.find_one({"email": email})
            
            # ✅ IMPROVED: Better user not found handling
            if not user:
                return {
                    "success": False,
                    "error_type": "user_not_found",
                    "error": "Account non trovato. Registrati prima di effettuare l'accesso.",
                    "suggestion": "register_first",
                    "redirect_to": "signup"
                }
            
            # ✅ IMPROVED: Better inactive account handling
            if user["status"] != UserStatus.ACTIVE.value:
                if user["status"] == UserStatus.PENDING.value:
                    return {
                        "success": False,
                        "error_type": "account_pending",
                        "error": "Account non ancora verificato. Controlla la tua email per completare la verifica.",
                        "suggestion": "verify_email_first",
                        "redirect_to": "verify_signup"
                    }
                else:
                    return {
                        "success": False,
                        "error_type": "account_inactive", 
                        "error": "Account non attivo. Contatta l'amministratore.",
                        "suggestion": "contact_admin"
                    }
            
            # ✅ IMPROVED: Better password error handling
            if not self._verify_password(password, user["password_hash"]):
                # Increment login attempts
                await db.admin_users.update_one(
                    {"email": email},
                    {"$inc": {"login_attempts": 1}}
                )
                
                return {
                    "success": False,
                    "error_type": "invalid_password",
                    "error": "Password non corretta. Riprova.",
                    "suggestion": "check_password"
                }
            
            # Generate and send login verification code
            verification_code = email_service.generate_verification_code()
            
            # Store verification code
            await db.admin_verification_codes.insert_one({
                "email": email,
                "code": verification_code,
                "expires_at": datetime.now() + timedelta(minutes=self.verification_expiry_minutes),
                "attempts": 0,
                "created_at": datetime.now(),
                "used": False,
                "purpose": "login"
            })
            
            # Send login verification email
            email_sent = await email_service.send_verification_email(
                email,
                user["nome"],
                user["cognome"],
                verification_code,
                "login"
            )
            
            if not email_sent:
                return {
                    "success": False,
                    "error": "Errore nell'invio dell'email di verifica"
                }
            
            logger.info(f"Login verification code sent to: {email}")
            
            return {
                "success": True,
                "message": "Codice di verifica inviato alla tua email",
                "verification_required": True
            }
            
        except Exception as e:
            logger.error(f"Login request error for {email}: {str(e)}")
            return {
                "success": False,
                "error": "Errore interno durante la richiesta di accesso"
            }
    
    async def complete_login(self, request: LoginRequest) -> Dict[str, Any]:
        """Complete login with verification code"""
        try:
            db = await self._get_database()
            
            # Find verification code
            verification_record = await db.admin_verification_codes.find_one({
                "email": request.email,
                "used": False,
                "purpose": "login",
                "expires_at": {"$gt": datetime.now()}
            })
            
            if not verification_record:
                return {
                    "success": False,
                    "error": "Codice di verifica scaduto o non valido"
                }
            
            # Check attempts
            if verification_record["attempts"] >= self.max_verification_attempts:
                return {
                    "success": False,
                    "error": "Troppi tentativi. Richiedi un nuovo codice."
                }
            
            # Verify code
            if verification_record["code"] != request.verification_code:
                # Increment attempts
                await db.admin_verification_codes.update_one(
                    {"_id": verification_record["_id"]},
                    {"$inc": {"attempts": 1}}
                )
                
                remaining_attempts = self.max_verification_attempts - verification_record["attempts"] - 1
                return {
                    "success": False,
                    "error": f"Codice non corretto. Tentativi rimanenti: {remaining_attempts}"
                }
            
            # Mark code as used
            await db.admin_verification_codes.update_one(
                {"_id": verification_record["_id"]},
                {"$set": {"used": True}}
            )
            
            # Get user data
            user = await db.admin_users.find_one({"email": request.email})
            if not user:
                return {
                    "success": False,
                    "error": "Utente non trovato"
                }
            
            # Update last login
            await db.admin_users.update_one(
                {"email": request.email},
                {
                    "$set": {
                        "last_login": datetime.now(),
                        "login_attempts": 0  # Reset failed attempts
                    }
                }
            )
            
            # Prepare user data for session
            user_data = {
                "user_id": user["user_id"],
                "email": user["email"],
                "nome": user["nome"],
                "cognome": user["cognome"],
                "username": user["username"],
                "role": user["role"]
            }
            
            logger.info(f"Login completed successfully: {request.email}")
            
            return {
                "success": True,
                "message": "Accesso completato con successo",
                "user_id": user["user_id"],
                "user_data": user_data
            }
            
        except Exception as e:
            logger.error(f"Login completion error for {request.email}: {str(e)}")
            return {
                "success": False,
                "error": "Errore interno durante l'accesso"
            }
    
    async def resend_verification_code(self, email: str, purpose: str = "signup") -> Dict[str, Any]:
        """Resend verification code"""
        try:
            db = await self._get_database()
            
            # Find user
            user = await db.admin_users.find_one({"email": email})
            if not user:
                return {
                    "success": False,
                    "error": "Utente non trovato"
                }
            
            # Check if user can receive new code
            recent_code = await db.admin_verification_codes.find_one({
                "email": email,
                "created_at": {"$gt": datetime.now() - timedelta(minutes=2)}
            })
            
            if recent_code:
                return {
                    "success": False,
                    "error": "Attendi almeno 2 minuti prima di richiedere un nuovo codice"
                }
            
            # Generate new verification code
            verification_code = email_service.generate_verification_code()
            
            # Store new verification code
            await db.admin_verification_codes.insert_one({
                "email": email,
                "code": verification_code,
                "expires_at": datetime.now() + timedelta(minutes=self.verification_expiry_minutes),
                "attempts": 0,
                "created_at": datetime.now(),
                "used": False,
                "purpose": purpose
            })
            
            # Send email
            email_sent = await email_service.send_verification_email(
                email,
                user["nome"],
                user["cognome"],
                verification_code,
                purpose
            )
            
            if not email_sent:
                return {
                    "success": False,
                    "error": "Errore nell'invio dell'email"
                }
            
            logger.info(f"Verification code resent: {email} - {purpose}")
            
            return {
                "success": True,
                "message": "Nuovo codice di verifica inviato alla tua email"
            }
            
        except Exception as e:
            logger.error(f"Resend code error for {email}: {str(e)}")
            return {
                "success": False,
                "error": "Errore nell'invio del codice"
            }

# Global auth service instance
auth_service = AuthService()