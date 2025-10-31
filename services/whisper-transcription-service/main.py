"""
Whisper Transcription Service
High-accuracy Italian voice transcription using OpenAI Whisper
Integrated with Chronic Diabetes Management System
"""

import os
import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn

from config import get_settings
from transcription_service import WhisperTranscriptionService
from file_manager import WhisperFileManager
from models import *

# Configure logging with detailed format for debugging
logging.basicConfig(
    level=logging.DEBUG,  # Use DEBUG for more detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

settings = get_settings()

def create_application() -> FastAPI:
    """Create FastAPI application with Whisper transcription capabilities"""
    
    app = FastAPI(
        title="Whisper Transcription Service",
        description="High-accuracy Italian voice transcription using OpenAI Whisper for Chronic Diabetes Management",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize services
    transcription_service = WhisperTranscriptionService()
    file_manager = WhisperFileManager()
    
    @app.on_event("startup")
    async def startup_event():
        """Initialize services on startup"""
        logger.info("🎤 Whisper Transcription Service starting up...")
        
        # Ensure storage directories exist
        file_manager.ensure_storage_directories()
        
        # Initialize Whisper model
        await transcription_service.initialize_model()
        
        logger.info("✅ Whisper Transcription Service ready")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown"""
        logger.info("🛑 Whisper Transcription Service shutting down...")
        await transcription_service.cleanup()
        logger.info("✅ Whisper Transcription Service stopped")
    
    @app.get("/")
    async def root():
        """Service information"""
        return {
            "service": "Whisper Transcription Service",
            "version": "1.0.0",
            "description": "High-accuracy Italian voice transcription using OpenAI Whisper",
            "features": [
                "High-accuracy Italian transcription",
                "Real-time partial results",
                "Word-level timestamps",
                "Language detection",
                "GPU acceleration support",
                "File-based voice storage",
                "WebSocket real-time communication"
            ],
            "model": settings.whisper_model_name,
            "device": transcription_service.device if transcription_service.device else "unknown",
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
            "model_name": settings.whisper_model_name,
            "device": transcription_service.device if transcription_service.device else "unknown",
            "service": "whisper-transcription",
            "timestamp": datetime.now().isoformat()
        }
    
    @app.post("/test-whisper")
    async def test_whisper():
        """Test Whisper with a simple audio signal"""
        try:
            import numpy as np
            
            # Create a simple test audio signal (1 second of sine wave)
            sample_rate = 16000
            duration = 1.0
            frequency = 440  # A note
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            audio = np.sin(2 * np.pi * frequency * t).astype(np.float32)
            
            # Test Faster-Whisper
            segments, info = transcription_service.model.transcribe(
                audio,
                language="it",
                temperature=0.0,
                no_speech_threshold=0.3
            )
            
            # Convert to result format
            result = transcription_service._convert_faster_whisper_result(segments, info)
            
            return {
                "status": "success",
                "audio_length": len(audio),
                "audio_duration": duration,
                "whisper_result": result,
                "text": result.get("text", ""),
                "segments": result.get("segments", [])
            }
            
        except Exception as e:
            import traceback
            return {
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
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
                start_time=datetime.now(),
                language=request.language
            )
            
            # Create voice file
            voice_file_path = file_manager.create_voice_file(session_info)
            
            return TranscriptionResponse(
                success=True,
                session_id=session_id,
                websocket_url=f"/ws/transcribe/{session_id}",
                message="Whisper transcription session ready"
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
            
            return {
                "success": True,
                "session_id": session_id,
                "message": "Whisper transcription session stopped and saved"
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
    
    @app.get("/api/transcription/test")
    async def test_transcription():
        """Test endpoint to check if Whisper is working"""
        try:
            # Test if model is loaded
            model_loaded = transcription_service.is_model_loaded()
            
            if not model_loaded:
                return {
                    "success": False,
                    "message": "Whisper model not loaded",
                    "model_loaded": False
                }
            
            return {
                "success": True,
                "message": "Whisper test completed",
                "model_loaded": True,
                "model_name": settings.whisper_model_name,
                "device": transcription_service.device,
                "language": settings.whisper_language
            }
            
        except Exception as e:
            logger.error(f"❌ Error in test transcription: {e}")
            import traceback
            logger.error(f"❌ Test traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "message": f"Test failed: {str(e)}",
                "model_loaded": transcription_service.is_model_loaded(),
                "error": str(e)
            }
    
    @app.get("/api/transcription/voice/{session_id}")
    async def get_voice_file(session_id: str):
        """Download the recorded voice file for a session"""
        try:
            voice_file_path = file_manager.get_voice_file_path(session_id)
            
            if not voice_file_path or not voice_file_path.exists():
                raise HTTPException(status_code=404, detail="Voice file not found")
            
            return FileResponse(
                path=str(voice_file_path),
                media_type="audio/wav",
                filename=f"voice_{session_id}.wav"
            )
            
        except Exception as e:
            logger.error(f"❌ Error getting voice file: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/transcription/voice/{session_id}/info")
    async def get_voice_file_info(session_id: str):
        """Get information about the voice file for a session"""
        try:
            voice_file_info = file_manager.get_voice_file_info(session_id)
            
            if not voice_file_info:
                return {
                    "success": False,
                    "message": "Voice file not found",
                    "session_id": session_id
                }
            
            return {
                "success": True,
                "session_id": session_id,
                "file_info": voice_file_info.dict(),
                "download_url": f"/api/transcription/voice/{session_id}"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting voice file info: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/transcription/voices/recent")
    async def get_recent_voice_files():
        """Get list of recent voice files"""
        try:
            recent_files = file_manager.get_recent_voice_files(limit=10)
            
            return {
                "success": True,
                "files": recent_files,
                "count": len(recent_files)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting recent voice files: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/transcription/cleanup")
    async def cleanup_old_files(days: int = 30):
        """Clean up old voice files"""
        try:
            file_manager.cleanup_old_files(days)
            
            return {
                "success": True,
                "message": f"Cleaned up files older than {days} days"
            }
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up files: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app

# Create the application
app = create_application()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5003,
        reload=True,
        log_level="info"
    )
