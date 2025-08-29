# services/admin-dashboard/app/models.py
"""
Admin Dashboard Authentication Models
Professional user management for healthcare administrators
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
import re

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager" 
    ANALYST = "analyst"

class UserStatus(str, Enum):
    PENDING = "pending"          # Email verification pending
    ACTIVE = "active"            # Fully verified and active
    SUSPENDED = "suspended"      # Temporarily disabled
    DEACTIVATED = "deactivated"  # Permanently disabled

# ================================
# REQUEST MODELS
# ================================

class SignUpRequest(BaseModel):
    """Professional admin registration request"""
    nome: str = Field(..., min_length=2, max_length=50, description="Nome")
    cognome: str = Field(..., min_length=2, max_length=50, description="Cognome") 
    username: str = Field(..., min_length=4, max_length=30, description="Username")
    email: EmailStr = Field(..., description="Email aziendale @gesan.it")
    password: str = Field(..., min_length=8, description="Password sicura")
    role: UserRole = Field(default=UserRole.ANALYST, description="Ruolo utente")
    
    @validator('email')
    def validate_company_email(cls, v):
        """Validate email is from @gesan.it domain"""
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format"""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username può contenere solo lettere, numeri e underscore')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password deve essere almeno 8 caratteri')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password deve contenere almeno una lettera maiuscola')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password deve contenere almeno una lettera minuscola')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password deve contenere almeno un numero')
        return v

class EmailVerificationRequest(BaseModel):
    """Email verification request"""
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6, regex=r'^\d{6}$')
    
    @validator('email')
    def validate_company_email(cls, v):
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()

class LoginRequest(BaseModel):
    """Professional admin login request"""
    email: EmailStr
    password: str
    verification_code: str = Field(..., min_length=6, max_length=6, regex=r'^\d{6}$')
    
    @validator('email')
    def validate_company_email(cls, v):
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr
    
    @validator('email')
    def validate_company_email(cls, v):
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()

class ResendCodeRequest(BaseModel):
    """Resend verification code request"""
    email: EmailStr
    
    @validator('email') 
    def validate_company_email(cls, v):
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()

# ================================
# DATABASE MODELS
# ================================

class AdminUser(BaseModel):
    """Admin user database model"""
    user_id: Optional[str] = None
    nome: str
    cognome: str
    username: str
    email: str
    password_hash: str
    role: UserRole
    status: UserStatus
    
    # Verification
    email_verified: bool = False
    verification_code: Optional[str] = None
    verification_expires: Optional[datetime] = None
    verification_attempts: int = 0
    
    # Session management
    last_login: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    login_attempts: int = 0
    locked_until: Optional[datetime] = None
    
    # Audit trail
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class EmailVerificationCode(BaseModel):
    """Email verification code tracking"""
    email: str
    code: str
    expires_at: datetime
    attempts: int = 0
    created_at: datetime
    used: bool = False

# ================================
# RESPONSE MODELS
# ================================

class SignUpResponse(BaseModel):
    """Registration response"""
    success: bool
    message: str
    user_id: Optional[str] = None
    email: str
    verification_required: bool = True

class EmailVerificationResponse(BaseModel):
    """Email verification response"""
    success: bool
    message: str
    email_verified: bool = False

class LoginResponse(BaseModel):
    """Login response"""
    success: bool
    message: str
    access_token: Optional[str] = None
    user_info: Optional[Dict[str, Any]] = None
    expires_in: Optional[int] = None

class UserProfileResponse(BaseModel):
    """User profile response"""
    user_id: str
    nome: str
    cognome: str
    username: str
    email: str
    role: UserRole
    status: UserStatus
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ================================
# CONSTANTS
# ================================

# Email configuration
COMPANY_DOMAIN = "@gesan.it"
COMPANY_NAME = "Gesan Healthcare Systems"

# Security settings
MAX_VERIFICATION_ATTEMPTS = 5
MAX_LOGIN_ATTEMPTS = 5
VERIFICATION_CODE_EXPIRY_MINUTES = 15
ACCOUNT_LOCK_DURATION_MINUTES = 30
SESSION_EXPIRY_HOURS = 8

# Default roles hierarchy
ROLE_PERMISSIONS = {
    UserRole.ADMIN: ["all"],
    UserRole.MANAGER: ["read", "write", "manage_users"],  
    UserRole.ANALYST: ["read", "basic_analysis"]
}