"""
Configuration for Voice Transcription Service
"""

import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Service configuration
    SERVICE_NAME: str = "voice-transcription-service"
    SERVICE_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Vosk model configuration
    VOSK_MODEL_PATH: str = "/app/models/vosk-model-small-it-0.22"
    VOSK_MODEL_URL: str = "https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip"
    
    # Voice file storage
    VOICE_STORAGE_PATH: str = "/app/storage/voices"
    TRANSCRIPTION_STORAGE_PATH: str = "/app/storage/transcriptions"
    
    # WebSocket configuration
    WEBSOCKET_TIMEOUT: int = 300  # 5 minutes
    MAX_SESSION_DURATION: int = 1800  # 30 minutes
    
    # Audio configuration
    SAMPLE_RATE: int = 16000
    CHUNK_SIZE: int = 4000
    AUDIO_FORMAT: str = "wav"
    
    # CORS configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080"
    
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

def get_settings() -> Settings:
    """Get application settings"""
    return Settings()
