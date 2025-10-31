"""
File Manager for Whisper Transcription Service
Handles audio file storage and management
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from config import get_settings
from models import SessionInfo, AudioFileInfo

settings = get_settings()
logger = logging.getLogger(__name__)


class WhisperFileManager:
    """File manager for Whisper transcription service"""
    
    def __init__(self):
        self.voice_storage_path = Path(settings.voice_storage_path)
        self.transcription_storage_path = Path(settings.transcription_storage_path)
        self.model_cache_path = Path(settings.model_cache_path)
    
    def ensure_storage_directories(self):
        """Ensure all storage directories exist"""
        self.voice_storage_path.mkdir(parents=True, exist_ok=True)
        self.transcription_storage_path.mkdir(parents=True, exist_ok=True)
        self.model_cache_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"📁 Storage directories ensured:")
        logger.info(f"   Voice: {self.voice_storage_path}")
        logger.info(f"   Transcription: {self.transcription_storage_path}")
        logger.info(f"   Models: {self.model_cache_path}")
    
    def create_voice_file(self, session_info: SessionInfo) -> str:
        """Create a voice file path for a session"""
        try:
            # Create directory structure: voices/doctor_id/patient_cf/date/
            date_str = datetime.now().strftime("%Y%m%d")
            session_dir = self.voice_storage_path / session_info.doctor_id / session_info.patient_cf / date_str
            session_dir.mkdir(parents=True, exist_ok=True)
            
            # Create voice file path
            timestamp = datetime.now().strftime("%H%M%S")
            voice_file_path = session_dir / f"voice_{session_info.session_id}_{timestamp}.wav"
            
            logger.info(f"📁 Created voice file path: {voice_file_path}")
            return str(voice_file_path)
            
        except Exception as e:
            logger.error(f"❌ Error creating voice file path: {e}")
            raise
    
    def get_voice_file_path(self, session_id: str) -> Optional[Path]:
        """Get voice file path for a session"""
        try:
            # Search for voice file with this session ID
            for voice_file in self.voice_storage_path.rglob(f"*{session_id}*.wav"):
                if voice_file.exists():
                    return voice_file
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting voice file path: {e}")
            return None
    
    def get_voice_file_info(self, session_id: str) -> Optional[AudioFileInfo]:
        """Get voice file information for a session"""
        try:
            voice_file_path = self.get_voice_file_path(session_id)
            if not voice_file_path or not voice_file_path.exists():
                return None
            
            # Get file stats
            stat = voice_file_path.stat()
            file_size_bytes = stat.st_size
            file_size_mb = file_size_bytes / (1024 * 1024)
            
            # For now, we'll estimate duration (in a real implementation, you'd use librosa or similar)
            # Assuming 16kHz, 16-bit, mono audio
            estimated_duration = file_size_bytes / (16000 * 2)  # 2 bytes per sample
            
            return AudioFileInfo(
                file_path=str(voice_file_path),
                file_size_bytes=file_size_bytes,
                file_size_mb=round(file_size_mb, 2),
                duration_seconds=round(estimated_duration, 2),
                sample_rate=16000,
                channels=1,
                format="wav",
                created_at=datetime.fromtimestamp(stat.st_ctime)
            )
            
        except Exception as e:
            logger.error(f"❌ Error getting voice file info: {e}")
            return None
    
    def get_doctor_sessions(self, doctor_id: str) -> List[Dict[str, Any]]:
        """Get all transcription sessions for a doctor"""
        try:
            sessions = []
            doctor_dir = self.voice_storage_path / doctor_id
            
            if not doctor_dir.exists():
                return sessions
            
            # Find all voice files for this doctor
            for voice_file in doctor_dir.rglob("*.wav"):
                if voice_file.is_file():
                    # Extract session info from filename
                    filename = voice_file.stem
                    parts = filename.split("_")
                    
                    if len(parts) >= 3:
                        session_id = "_".join(parts[1:-1])  # Everything between "voice_" and timestamp
                        timestamp = parts[-1]
                        
                        # Get file info
                        stat = voice_file.stat()
                        
                        sessions.append({
                            "session_id": session_id,
                            "voice_file": str(voice_file),
                            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            "file_size_bytes": stat.st_size,
                            "file_size_mb": round(stat.st_size / (1024 * 1024), 2)
                        })
            
            # Sort by creation time (newest first)
            sessions.sort(key=lambda x: x["created_at"], reverse=True)
            
            return sessions
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor sessions: {e}")
            return []
    
    def get_session_files(self, session_id: str) -> Dict[str, Any]:
        """Get all files for a session"""
        try:
            files = {
                "voice_file": None,
                "transcription_file": None,
                "session_info": None
            }
            
            # Find voice file
            voice_file_path = self.get_voice_file_path(session_id)
            if voice_file_path:
                files["voice_file"] = {
                    "path": str(voice_file_path),
                    "exists": voice_file_path.exists(),
                    "size_bytes": voice_file_path.stat().st_size if voice_file_path.exists() else 0
                }
                
                # Look for corresponding transcription file
                transcription_file = voice_file_path.with_suffix(".txt")
                if transcription_file.exists():
                    files["transcription_file"] = {
                        "path": str(transcription_file),
                        "exists": True,
                        "size_bytes": transcription_file.stat().st_size
                    }
            
            return files
            
        except Exception as e:
            logger.error(f"❌ Error getting session files: {e}")
            return {"voice_file": None, "transcription_file": None, "session_info": None}
    
    def get_recent_voice_files(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of recent voice files"""
        try:
            recent_files = []
            
            # Find all voice files
            for voice_file in self.voice_storage_path.rglob("*.wav"):
                if voice_file.is_file():
                    stat = voice_file.stat()
                    
                    recent_files.append({
                        "path": str(voice_file),
                        "session_id": voice_file.stem,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "file_size_bytes": stat.st_size,
                        "file_size_mb": round(stat.st_size / (1024 * 1024), 2)
                    })
            
            # Sort by creation time (newest first) and limit
            recent_files.sort(key=lambda x: x["created_at"], reverse=True)
            return recent_files[:limit]
            
        except Exception as e:
            logger.error(f"❌ Error getting recent voice files: {e}")
            return []
    
    def cleanup_old_files(self, days: int = 30):
        """Clean up files older than specified days"""
        try:
            cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
            cleaned_count = 0
            
            # Clean voice files
            for voice_file in self.voice_storage_path.rglob("*.wav"):
                if voice_file.is_file() and voice_file.stat().st_ctime < cutoff_time:
                    voice_file.unlink()
                    cleaned_count += 1
                    
                    # Also remove corresponding transcription file
                    transcription_file = voice_file.with_suffix(".txt")
                    if transcription_file.exists():
                        transcription_file.unlink()
            
            logger.info(f"🧹 Cleaned up {cleaned_count} old files (older than {days} days)")
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up old files: {e}")


# Create global instance
file_manager = WhisperFileManager()
