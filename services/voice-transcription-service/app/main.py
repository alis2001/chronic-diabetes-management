"""
Voice Transcription Service
Real-time Italian voice transcription using Vosk
Integrated with Chronic Diabetes Management System
"""

import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .config import get_settings
from .transcription_service import VoiceTranscriptionService
from .file_manager import VoiceFileManager
from .models import TranscriptionRequest, TranscriptionResponse, SessionInfo

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

def create_application() -> FastAPI:
    """Create FastAPI application with voice transcription capabilities"""
    
    app = FastAPI(
        title="Voice Transcription Service",
        description="Real-time Italian voice transcription using Vosk for Chronic Diabetes Management",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize services
    transcription_service = VoiceTranscriptionService()
    file_manager = VoiceFileManager()
    
    @app.on_event("startup")
    async def startup_event():
        """Initialize services on startup"""
        logger.info("🎤 Voice Transcription Service starting up...")
        
        # Initialize Vosk model
        await transcription_service.initialize_model()
        
        # Ensure voice storage directory exists
        file_manager.ensure_storage_directories()
        
        logger.info("✅ Voice Transcription Service ready")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown"""
        logger.info("🛑 Voice Transcription Service shutting down...")
        await transcription_service.cleanup()
        logger.info("✅ Voice Transcription Service stopped")
    
    @app.get("/")
    async def root():
        """Service information"""
        return {
            "service": "Voice Transcription Service",
            "version": "1.0.0",
            "description": "Real-time Italian voice transcription using Vosk",
            "features": [
                "Word-by-word real-time transcription",
                "Italian language support",
                "File-based voice storage",
                "Cursor-based text insertion",
                "Toggle recording functionality"
            ],
            "status": "active",
            "timestamp": datetime.now().isoformat()
        }
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        model_loaded = transcription_service.is_model_loaded()
        
        return {
            "status": "healthy" if model_loaded else "degraded",
            "model_loaded": model_loaded,
            "service": "voice-transcription",
            "timestamp": datetime.now().isoformat()
        }
    
    @app.websocket("/ws/transcribe/{session_id}")
    async def websocket_transcription(websocket: WebSocket, session_id: str):
        """WebSocket endpoint for real-time voice transcription"""
        await websocket.accept()
        logger.info(f"🎤 WebSocket connection established for session: {session_id}")
        
        try:
            # Initialize session
            session_info = SessionInfo(
                session_id=session_id,
                doctor_id=await websocket.receive_text(),  # First message should be doctor_id
                patient_cf=await websocket.receive_text(),  # Second message should be patient_cf
                cronoscita_id=await websocket.receive_text(),  # Third message should be cronoscita_id
                start_time=datetime.now()
            )
            
            # Create voice file for this session
            voice_file_path = file_manager.create_voice_file(session_info)
            
            # Start transcription session
            await transcription_service.start_session(
                websocket=websocket,
                session_info=session_info,
                voice_file_path=voice_file_path
            )
            
        except WebSocketDisconnect:
            logger.info(f"🔌 WebSocket disconnected for session: {session_id}")
        except Exception as e:
            logger.error(f"❌ WebSocket error for session {session_id}: {e}")
            await websocket.close(code=1011, reason="Internal server error")
    
    @app.post("/api/transcription/start", response_model=TranscriptionResponse)
    async def start_transcription(request: TranscriptionRequest):
        """Start a new transcription session"""
        try:
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.doctor_id}"
            
            # Create session info
            session_info = SessionInfo(
                session_id=session_id,
                doctor_id=request.doctor_id,
                patient_cf=request.patient_cf,
                cronoscita_id=request.cronoscita_id,
                start_time=datetime.now()
            )
            
            # Create voice file
            voice_file_path = file_manager.create_voice_file(session_info)
            
            return TranscriptionResponse(
                success=True,
                session_id=session_id,
                websocket_url=f"/ws/transcribe/{session_id}",
                voice_file_path=str(voice_file_path),
                message="Transcription session ready"
            )
            
        except Exception as e:
            logger.error(f"❌ Error starting transcription: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/transcription/stop/{session_id}")
    async def stop_transcription(session_id: str):
        """Stop transcription session and save files"""
        try:
            # Stop the session
            await transcription_service.stop_session(session_id)
            
            # Finalize voice file
            file_manager.finalize_voice_file(session_id)
            
            return {
                "success": True,
                "session_id": session_id,
                "message": "Transcription session stopped and saved"
            }
            
        except Exception as e:
            logger.error(f"❌ Error stopping transcription: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/transcription/sessions/{doctor_id}")
    async def get_doctor_sessions(doctor_id: str):
        """Get all transcription sessions for a doctor"""
        try:
            sessions = file_manager.get_doctor_sessions(doctor_id)
            return {
                "success": True,
                "doctor_id": doctor_id,
                "sessions": sessions
            }
        except Exception as e:
            logger.error(f"❌ Error getting sessions: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/transcription/files/{session_id}")
    async def get_session_files(session_id: str):
        """Get voice files and transcription for a session"""
        try:
            files = file_manager.get_session_files(session_id)
            return {
                "success": True,
                "session_id": session_id,
                "files": files
            }
        except Exception as e:
            logger.error(f"❌ Error getting session files: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app

# Create the application
app = create_application()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5003,  # Different port from Melody (5002)
        reload=True,
        log_level="info"
    )
