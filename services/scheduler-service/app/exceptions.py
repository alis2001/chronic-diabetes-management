# services/scheduler-service/app/exceptions.py
"""
Scheduler Service Custom Exceptions
Proper error handling for appointment scheduling and validation
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any

# ================================
# BASE SCHEDULER EXCEPTIONS
# ================================

class SchedulerServiceException(Exception):
    """Base exception for scheduler service"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

# ================================
# APPOINTMENT VALIDATION EXCEPTIONS
# ================================

class DuplicateAppointmentException(SchedulerServiceException):
    """Exception when patient already has future appointment for same Cronoscita"""
    
    def __init__(self, cf_paziente: str, cronoscita_name: str, existing_date: str, appointment_id: str):
        message = (
            f"Il paziente {cf_paziente} ha già un appuntamento programmato "
            f"per {cronoscita_name} in data {existing_date}. "
            f"Un paziente può avere solo un appuntamento futuro per patologia."
        )
        details = {
            "cf_paziente": cf_paziente,
            "cronoscita_name": cronoscita_name,
            "existing_appointment_date": existing_date,
            "existing_appointment_id": appointment_id,
            "error_type": "DUPLICATE_FUTURE_APPOINTMENT"
        }
        super().__init__(message, details)

class PatientNotFoundException(SchedulerServiceException):
    """Exception when patient CF is not found"""
    
    def __init__(self, cf_paziente: str):
        message = f"Paziente con codice fiscale {cf_paziente} non trovato nel sistema"
        details = {
            "cf_paziente": cf_paziente,
            "error_type": "PATIENT_NOT_FOUND"
        }
        super().__init__(message, details)

class CronoscitaNotFoundException(SchedulerServiceException):
    """Exception when Cronoscita ID is not found"""
    
    def __init__(self, cronoscita_id: str):
        message = f"Cronoscita con ID {cronoscita_id} non trovata"
        details = {
            "cronoscita_id": cronoscita_id,
            "error_type": "CRONOSCITA_NOT_FOUND"
        }
        super().__init__(message, details)

class InvalidCronoscitaIdException(SchedulerServiceException):
    """Exception when Cronoscita ID format is invalid"""
    
    def __init__(self, cronoscita_id: str):
        message = f"ID Cronoscita non valido: {cronoscita_id}"
        details = {
            "cronoscita_id": cronoscita_id,
            "error_type": "INVALID_CRONOSCITA_ID"
        }
        super().__init__(message, details)

# ================================
# DOCTOR VALIDATION EXCEPTIONS
# ================================

class DoctorNotFoundException(SchedulerServiceException):
    """Exception when doctor ID is not found"""
    
    def __init__(self, id_medico: str):
        message = f"Medico con ID {id_medico} non trovato"
        details = {
            "id_medico": id_medico,
            "error_type": "DOCTOR_NOT_FOUND"
        }
        super().__init__(message, details)

class DoctorNotAvailableException(SchedulerServiceException):
    """Exception when doctor is not available for scheduling"""
    
    def __init__(self, id_medico: str, reason: str):
        message = f"Medico {id_medico} non disponibile per programmazione: {reason}"
        details = {
            "id_medico": id_medico,
            "reason": reason,
            "error_type": "DOCTOR_NOT_AVAILABLE"
        }
        super().__init__(message, details)

# ================================
# EXAM SELECTION EXCEPTIONS
# ================================

class NoExamsAvailableException(SchedulerServiceException):
    """Exception when no exams are available for scheduling"""
    
    def __init__(self, cronoscita_id: str, cronoscita_name: str):
        message = (
            f"Nessun esame disponibile per programmazione per {cronoscita_name}. "
            f"Contattare l'amministratore per configurare gli esami."
        )
        details = {
            "cronoscita_id": cronoscita_id,
            "cronoscita_name": cronoscita_name,
            "error_type": "NO_EXAMS_AVAILABLE"
        }
        super().__init__(message, details)

class InvalidExamSelectionException(SchedulerServiceException):
    """Exception when selected exam mappings are invalid"""
    
    def __init__(self, invalid_mappings: list, cronoscita_id: str):
        message = f"Selezione esami non valida: {', '.join(invalid_mappings)}"
        details = {
            "invalid_mappings": invalid_mappings,
            "cronoscita_id": cronoscita_id,
            "error_type": "INVALID_EXAM_SELECTION"
        }
        super().__init__(message, details)

# ================================
# SCHEDULING VALIDATION EXCEPTIONS
# ================================

class InvalidDateException(SchedulerServiceException):
    """Exception when appointment date is invalid"""
    
    def __init__(self, appointment_date: str, reason: str):
        message = f"Data appuntamento non valida {appointment_date}: {reason}"
        details = {
            "appointment_date": appointment_date,
            "reason": reason,
            "error_type": "INVALID_DATE"
        }
        super().__init__(message, details)

class PastDateException(SchedulerServiceException):
    """Exception when trying to schedule appointment in the past"""
    
    def __init__(self, appointment_date: str):
        message = f"Non è possibile programmare appuntamenti nel passato: {appointment_date}"
        details = {
            "appointment_date": appointment_date,
            "error_type": "PAST_DATE"
        }
        super().__init__(message, details)

# ================================
# DATABASE EXCEPTIONS
# ================================

class DatabaseConnectionException(SchedulerServiceException):
    """Exception when database connection fails"""
    
    def __init__(self, operation: str):
        message = f"Errore connessione database durante: {operation}"
        details = {
            "operation": operation,
            "error_type": "DATABASE_CONNECTION_ERROR"
        }
        super().__init__(message, details)

class DatabaseOperationException(SchedulerServiceException):
    """Exception when database operation fails"""
    
    def __init__(self, operation: str, error: str):
        message = f"Errore database durante {operation}: {error}"
        details = {
            "operation": operation,
            "database_error": error,
            "error_type": "DATABASE_OPERATION_ERROR"
        }
        super().__init__(message, details)

# ================================
# INTEGRATION EXCEPTIONS
# ================================

class TimelineServiceException(SchedulerServiceException):
    """Exception when timeline service integration fails"""
    
    def __init__(self, operation: str, error: str):
        message = f"Errore integrazione Timeline Service durante {operation}: {error}"
        details = {
            "operation": operation,
            "integration_error": error,
            "error_type": "TIMELINE_INTEGRATION_ERROR"
        }
        super().__init__(message, details)

# ================================
# HTTP EXCEPTION MAPPING
# ================================

def map_to_http_exception(exception: SchedulerServiceException) -> HTTPException:
    """Map scheduler service exceptions to HTTP exceptions"""
    
    # Patient validation errors
    if isinstance(exception, PatientNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "PATIENT_NOT_FOUND",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Duplicate appointment errors
    if isinstance(exception, DuplicateAppointmentException):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "DUPLICATE_APPOINTMENT",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Cronoscita validation errors
    if isinstance(exception, (CronoscitaNotFoundException, InvalidCronoscitaIdException)):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "CRONOSCITA_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Doctor validation errors
    if isinstance(exception, (DoctorNotFoundException, DoctorNotAvailableException)):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "DOCTOR_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Exam selection errors
    if isinstance(exception, (NoExamsAvailableException, InvalidExamSelectionException)):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "EXAM_SELECTION_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Date validation errors
    if isinstance(exception, (InvalidDateException, PastDateException)):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "DATE_VALIDATION_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Database errors
    if isinstance(exception, (DatabaseConnectionException, DatabaseOperationException)):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "DATABASE_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Integration errors
    if isinstance(exception, TimelineServiceException):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "INTEGRATION_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Generic scheduler service errors
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error": "SCHEDULER_SERVICE_ERROR",
            "message": exception.message,
            "details": exception.details
        }
    )

# ================================
# VALIDATION HELPERS
# ================================

def validate_codice_fiscale(cf: str) -> str:
    """Validate and normalize codice fiscale"""
    import re
    
    if not cf or len(cf.strip()) != 16:
        raise SchedulerServiceException(
            "Codice fiscale deve essere di 16 caratteri",
            {"error_type": "INVALID_CF_LENGTH", "provided_cf": cf}
        )
    
    cf_clean = cf.strip().upper()
    if not re.match(r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$', cf_clean):
        raise SchedulerServiceException(
            "Formato codice fiscale non valido",
            {"error_type": "INVALID_CF_FORMAT", "provided_cf": cf}
        )
    
    return cf_clean

def validate_object_id(obj_id: str, field_name: str) -> str:
    """Validate MongoDB ObjectId format"""
    from bson import ObjectId
    from bson.errors import InvalidId
    
    try:
        ObjectId(obj_id)
        return obj_id
    except InvalidId:
        raise SchedulerServiceException(
            f"{field_name} non valido: formato ID non corretto",
            {"error_type": "INVALID_OBJECT_ID", "field": field_name, "provided_id": obj_id}
        )