# services/admin-dashboard/app/models.py
"""
Admin Dashboard Authentication Models
Professional user management for healthcare administrators - Pydantic v2 Compatible
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
import re
import secrets
import string

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
    verification_code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')  # Changed regex to pattern
    
    @validator('email')
    def validate_company_email(cls, v):
        if not v.lower().endswith('@gesan.it'):
            raise ValueError('Email deve essere del dominio aziendale @gesan.it')
        return v.lower()

class LoginRequest(BaseModel):
    """Professional admin login request"""
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')  # Changed regex to pattern
    
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

# ================================
# DATA MODELS
# ================================

class AdminUser(BaseModel):
    """Admin user data model"""
    user_id: str
    nome: str
    cognome: str
    username: str
    email: str
    password_hash: str
    role: UserRole
    status: UserStatus = UserStatus.PENDING
    email_verified: bool = False
    verification_attempts: int = 0
    login_attempts: int = 0
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        use_enum_values = True

class EmailVerificationCode(BaseModel):
    """Email verification code model"""
    email: str
    code: str
    purpose: str  # 'signup' or 'login'
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
# LABORATORY EXAM MODELS
# ================================

class ExamCatalogCreate(BaseModel):
    """Request model for creating exam catalog entry - WITH CRONOSCITA SUPPORT"""
    codice_catalogo: str = Field(..., description="Official catalog code (e.g., 90271.003)")
    codicereg: str = Field(..., description="CODICEREG from Excel (e.g., 90.27.1)")
    nome_esame: str = Field(..., description="Official exam name")
    cronoscita_id: str = Field(..., description="Cronoscita ID this exam belongs to")
    codice_branca: str = Field(default="011", description="Medical branch code - always 011 for laboratory")
    branch_description: Optional[str] = Field(default="Branca Laboratorio d'Analisi", description="Branch description")
    descrizione: Optional[str] = Field(None, description="Additional description")
    is_enabled: bool = Field(True, description="Is exam enabled for doctors")


class ExamCatalogResponse(BaseModel):
    """Response model for exam catalog entry - WITH CRONOSCITA SUPPORT"""
    id: str
    codice_catalogo: str
    codicereg: str
    nome_esame: str
    cronoscita_id: str
    cronoscita_nome: Optional[str] = None  # Populated from join
    codice_branca: str
    branch_description: Optional[str]
    descrizione: Optional[str]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
    mappings_count: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Add branch constants
MEDICAL_BRANCHES = {
    "002": "Branca Cardiologia",
    "008": "Branca Diagnostica per Immagini", 
    "009": "Branca Diabetologia",
    "011": "Branca Laboratorio d'Analisi",
    "015": "Branca Neurologia",
    "016": "Branca Oculistica"
}

class ExamMappingCreate(BaseModel):
    """Request model for creating exam mapping - WITH CRONOSCITA SUPPORT"""
    codice_catalogo: str = Field(..., description="Reference to exam catalog")
    cronoscita_id: str = Field(..., description="Cronoscita ID this mapping belongs to")
    struttura_nome: str = Field(..., description="Healthcare structure name")
    codoffering_wirgilio: str = Field(..., description="Wirgilio API codoffering (e.g., 301)")
    nome_esame_wirgilio: str = Field(..., description="Exam name from Wirgilio API")
    is_active: bool = Field(True, description="Is mapping active")

class ExamMappingResponse(BaseModel):
    """Response model for exam mapping - WITH CRONOSCITA SUPPORT"""
    id: str
    codice_catalogo: str
    nome_esame_catalogo: str  # From catalog
    cronoscita_id: str
    cronoscita_nome: Optional[str] = None  # Populated from join
    struttura_nome: str
    codoffering_wirgilio: str
    nome_esame_wirgilio: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class LaboratorioOverviewResponse(BaseModel):
    """Overview response for laboratory management - WITH CRONOSCITA SUPPORT"""
    cronoscita_id: str
    cronoscita_nome: str
    total_catalog_exams: int
    enabled_catalog_exams: int
    total_mappings: int
    active_mappings: int
    strutture_count: int
    last_updated: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CronoscitaCreate(BaseModel):
    """Request model for creating Cronoscita"""
    nome: str = Field(..., min_length=2, max_length=100, description="Nome Cronoscita (sarà convertito in maiuscolo)")
    
    @validator('nome')
    def validate_nome(cls, v):
        """Validate and transform nome to uppercase"""
        if not v or not v.strip():
            raise ValueError('Nome Cronoscita è richiesto')
        
        nome_clean = v.strip().upper()
        
        # Check for valid characters (letters, numbers, spaces, common punctuation)
        if not re.match(r'^[A-Z0-9\s\-\.\_]+$', nome_clean):
            raise ValueError('Nome può contenere solo lettere, numeri, spazi e caratteri - . _')
        
        if len(nome_clean) < 2:
            raise ValueError('Nome deve essere di almeno 2 caratteri')
        
        return nome_clean

class CronoscitaResponse(BaseModel):
    """Response model for Cronoscita"""
    id: str
    nome: str
    codice: str  # Short random ID for reference (e.g., "CR-A7B2")
    created_at: datetime
    updated_at: datetime
    
    # Statistics
    total_catalogo_esami: int = 0
    total_mappings: int = 0
    active_mappings: int = 0
    is_active: bool = True
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

def generate_cronoscita_codice() -> str:
    """Generate a random short code for Cronoscita (e.g., CR-A7B2)"""
    # Generate 4 random alphanumeric characters
    random_chars = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"CR-{random_chars}"

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