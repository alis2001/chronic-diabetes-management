# services/analytics-service/app/exceptions.py
"""
Analytics Service Custom Exceptions
Clean exception hierarchy for analytics operations and error handling
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status

# ================================
# BASE ANALYTICS EXCEPTIONS
# ================================

class AnalyticsServiceException(Exception):
    """Base exception for analytics service"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

# ================================
# WIRGILIO API EXCEPTIONS
# ================================

class WirgilioAPIException(AnalyticsServiceException):
    """Exception for Wirgilio API integration errors"""
    pass

class WirgilioTimeoutException(WirgilioAPIException):
    """Exception for Wirgilio API timeout errors"""
    pass

class WirgilioAuthenticationException(WirgilioAPIException):
    """Exception for Wirgilio API authentication errors"""
    pass

class WirgilioDataNotFoundException(WirgilioAPIException):
    """Exception when no data found for patient"""
    pass

# ================================
# DATA PROCESSING EXCEPTIONS
# ================================

class DataProcessingException(AnalyticsServiceException):
    """Exception for data processing errors"""
    pass

class InvalidCodiceFiscaleException(DataProcessingException):
    """Exception for invalid fiscal code format"""
    pass

class NoValidDataException(DataProcessingException):
    """Exception when no valid data available for processing"""
    pass

class ChartGenerationException(DataProcessingException):
    """Exception for chart data generation errors"""
    pass

# ================================
# ANALYTICS BUSINESS LOGIC EXCEPTIONS
# ================================

class ExamNotFoundException(AnalyticsServiceException):
    """Exception when requested exam not found"""
    pass

class SottanalisiNotFoundException(AnalyticsServiceException):
    """Exception when requested sottanalisi not found"""
    pass

class InsufficientDataException(AnalyticsServiceException):
    """Exception when insufficient data for analysis"""
    pass

# ================================
# HTTP EXCEPTION MAPPING
# ================================

def map_to_http_exception(exception: AnalyticsServiceException) -> HTTPException:
    """Map analytics service exceptions to HTTP exceptions"""
    
    if isinstance(exception, InvalidCodiceFiscaleException):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "INVALID_CODICE_FISCALE",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, WirgilioAuthenticationException):
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "WIRGILIO_AUTHENTICATION_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, WirgilioDataNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "PATIENT_DATA_NOT_FOUND", 
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, ExamNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "EXAM_NOT_FOUND",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, SottanalisiNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "SOTTANALISI_NOT_FOUND",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, WirgilioTimeoutException):
        return HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "error": "WIRGILIO_TIMEOUT",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, WirgilioAPIException):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "WIRGILIO_API_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, NoValidDataException):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "NO_VALID_DATA",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, InsufficientDataException):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "INSUFFICIENT_DATA",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    if isinstance(exception, DataProcessingException):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "DATA_PROCESSING_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Generic analytics service exception
    if isinstance(exception, AnalyticsServiceException):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "ANALYTICS_SERVICE_ERROR",
                "message": exception.message,
                "details": exception.details
            }
        )
    
    # Fallback for unexpected exceptions
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "details": {"original_error": str(exception)}
        }
    )