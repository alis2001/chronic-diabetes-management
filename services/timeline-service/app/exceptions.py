# services/timeline-service/app/exceptions.py
"""
Timeline Service Custom Exceptions
Centralized exception handling for better error management
"""

from fastapi import HTTPException, status

class TimelineServiceException(Exception):
    """Base exception for Timeline Service"""
    
    def __init__(self, message: str, details: str = None):
        self.message = message
        self.details = details
        super().__init__(self.message)

class DoctorValidationException(TimelineServiceException):
    """Raised when doctor credentials are invalid"""
    pass

class PatientNotFoundException(TimelineServiceException):
    """Raised when patient is not found"""
    pass

class PatientAlreadyExistsException(TimelineServiceException):
    """Raised when trying to register existing patient"""
    pass

class AppointmentNotFoundException(TimelineServiceException):
    """Raised when appointment is not found"""
    pass

class InvalidAppointmentTypeException(TimelineServiceException):
    """Raised when appointment type is not valid for pathology"""
    pass

class ExternalServiceException(TimelineServiceException):
    """Raised when external service call fails"""
    pass

class DatabaseException(TimelineServiceException):
    """Raised when database operations fail"""
    pass

# HTTP Exception Mappers
def map_to_http_exception(exception: TimelineServiceException) -> HTTPException:
    """Map custom exceptions to HTTP exceptions"""
    
    if isinstance(exception, DoctorValidationException):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "DOCTOR_VALIDATION_FAILED",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, PatientNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "PATIENT_NOT_FOUND",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, PatientAlreadyExistsException):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "PATIENT_ALREADY_EXISTS",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, AppointmentNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "APPOINTMENT_NOT_FOUND",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, InvalidAppointmentTypeException):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_APPOINTMENT_TYPE",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, ExternalServiceException):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "EXTERNAL_SERVICE_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, DatabaseException):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DATABASE_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Generic fallback
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "details": str(exception)
        }
    )