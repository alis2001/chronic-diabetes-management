"""
File Manager for Voice Transcription Service
Handles voice file storage and organization
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .config import get_settings
from .models import SessionInfo, VoiceFileInfo, TranscriptionFileInfo, SessionFiles, DoctorSessionSummary

logger = logging.getLogger(__name__)
settings = get_settings()

class VoiceFileManager:
    """Manages voice files and transcriptions storage"""
    
    def __init__(self):
        self.voice_storage_path = Path(settings.VOICE_STORAGE_PATH)
        self.transcription_storage_path = Path(settings.TRANSCRIPTION_STORAGE_PATH)
        
    def ensure_storage_directories(self):
        """Ensure storage directories exist"""
        try:
            self.voice_storage_path.mkdir(parents=True, exist_ok=True)
            self.transcription_storage_path.mkdir(parents=True, exist_ok=True)
            
            # Create subdirectories for organization
            (self.voice_storage_path / "sessions").mkdir(exist_ok=True)
            (self.voice_storage_path / "doctors").mkdir(exist_ok=True)
            (self.transcription_storage_path / "sessions").mkdir(exist_ok=True)
            (self.transcription_storage_path / "doctors").mkdir(exist_ok=True)
            
            logger.info("✅ Storage directories created/verified")
            
        except Exception as e:
            logger.error(f"❌ Error creating storage directories: {e}")
            raise
    
    def create_voice_file(self, session_info: SessionInfo) -> Path:
        """Create a voice file for a session"""
        try:
            # Create directory structure: /storage/voices/doctors/{doctor_id}/{date}/
            date_str = session_info.start_time.strftime("%Y-%m-%d")
            doctor_dir = self.voice_storage_path / "doctors" / session_info.doctor_id / date_str
            doctor_dir.mkdir(parents=True, exist_ok=True)
            
            # Create voice file path
            timestamp_str = session_info.start_time.strftime("%H-%M-%S")
            voice_filename = f"{session_info.session_id}_{timestamp_str}.wav"
            voice_file_path = doctor_dir / voice_filename
            
            # Create empty file
            voice_file_path.touch()
            
            logger.info(f"📁 Created voice file: {voice_file_path}")
            return voice_file_path
            
        except Exception as e:
            logger.error(f"❌ Error creating voice file: {e}")
            raise
    
    def finalize_voice_file(self, session_id: str):
        """Finalize voice file after session ends"""
        try:
            # Find the voice file
            voice_file = self._find_voice_file(session_id)
            if not voice_file:
                logger.warning(f"⚠️ Voice file not found for session: {session_id}")
                return
            
            # Create metadata file
            metadata_file = voice_file.with_suffix(".json")
            metadata = {
                "session_id": session_id,
                "finalized_at": datetime.now().isoformat(),
                "file_path": str(voice_file),
                "file_size": voice_file.stat().st_size if voice_file.exists() else 0
            }
            
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"✅ Voice file finalized: {voice_file}")
            
        except Exception as e:
            logger.error(f"❌ Error finalizing voice file: {e}")
    
    def _find_voice_file(self, session_id: str) -> Optional[Path]:
        """Find voice file by session ID"""
        try:
            # Search in all doctor directories
            for doctor_dir in (self.voice_storage_path / "doctors").iterdir():
                if doctor_dir.is_dir():
                    for date_dir in doctor_dir.iterdir():
                        if date_dir.is_dir():
                            for file_path in date_dir.iterdir():
                                if file_path.name.startswith(session_id) and file_path.suffix == ".wav":
                                    return file_path
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding voice file: {e}")
            return None
    
    def get_doctor_sessions(self, doctor_id: str) -> List[Dict]:
        """Get all sessions for a doctor"""
        try:
            sessions = []
            doctor_dir = self.voice_storage_path / "doctors" / doctor_id
            
            if not doctor_dir.exists():
                return sessions
            
            # Iterate through date directories
            for date_dir in doctor_dir.iterdir():
                if date_dir.is_dir():
                    for file_path in date_dir.iterdir():
                        if file_path.suffix == ".wav":
                            # Extract session info from filename
                            session_id = file_path.stem.split("_")[0]
                            
                            # Get file info
                            stat = file_path.stat()
                            
                            session_info = {
                                "session_id": session_id,
                                "voice_file": str(file_path),
                                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                "file_size": stat.st_size,
                                "duration_seconds": 0  # Could be calculated from audio
                            }
                            
                            # Check for transcription file
                            transcription_file = file_path.with_suffix(".txt")
                            if transcription_file.exists():
                                session_info["transcription_file"] = str(transcription_file)
                                session_info["has_transcription"] = True
                            else:
                                session_info["has_transcription"] = False
                            
                            sessions.append(session_info)
            
            # Sort by creation time (newest first)
            sessions.sort(key=lambda x: x["created_at"], reverse=True)
            
            return sessions
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor sessions: {e}")
            return []
    
    def get_session_files(self, session_id: str) -> Dict:
        """Get all files for a specific session"""
        try:
            # Find voice file
            voice_file = self._find_voice_file(session_id)
            if not voice_file:
                return {"error": "Session not found"}
            
            # Get voice file info
            voice_info = None
            if voice_file.exists():
                stat = voice_file.stat()
                voice_info = VoiceFileInfo(
                    file_path=str(voice_file),
                    file_size=stat.st_size,
                    duration_seconds=0,  # Could be calculated
                    format="wav",
                    created_at=datetime.fromtimestamp(stat.st_ctime)
                )
            
            # Get transcription file info
            transcription_file = voice_file.with_suffix(".txt")
            transcription_info = None
            if transcription_file.exists():
                stat = transcription_file.stat()
                word_count = 0
                if stat.st_size > 0:
                    with open(transcription_file, "r", encoding="utf-8") as f:
                        content = f.read()
                        word_count = len(content.split())
                
                transcription_info = TranscriptionFileInfo(
                    file_path=str(transcription_file),
                    file_size=stat.st_size,
                    word_count=word_count,
                    created_at=datetime.fromtimestamp(stat.st_ctime)
                )
            
            # Get metadata file
            metadata_file = voice_file.with_suffix(".json")
            metadata = None
            if metadata_file.exists():
                with open(metadata_file, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
            
            return {
                "session_id": session_id,
                "voice_file": voice_info.dict() if voice_info else None,
                "transcription_file": transcription_info.dict() if transcription_info else None,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting session files: {e}")
            return {"error": str(e)}
    
    def get_doctor_summary(self, doctor_id: str) -> DoctorSessionSummary:
        """Get summary of all sessions for a doctor"""
        try:
            sessions = self.get_doctor_sessions(doctor_id)
            
            total_duration = 0
            total_words = 0
            
            for session in sessions:
                # Calculate duration (could be enhanced)
                total_duration += session.get("duration_seconds", 0)
                
                # Count words from transcription
                if session.get("has_transcription"):
                    transcription_file = session.get("transcription_file")
                    if transcription_file and Path(transcription_file).exists():
                        with open(transcription_file, "r", encoding="utf-8") as f:
                            content = f.read()
                            total_words += len(content.split())
            
            return DoctorSessionSummary(
                doctor_id=doctor_id,
                total_sessions=len(sessions),
                total_duration_seconds=total_duration,
                total_words=total_words,
                sessions=sessions
            )
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor summary: {e}")
            return DoctorSessionSummary(
                doctor_id=doctor_id,
                total_sessions=0,
                total_duration_seconds=0,
                total_words=0,
                sessions=[]
            )
    
    def cleanup_old_files(self, days_old: int = 30):
        """Clean up old voice files"""
        try:
            cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
            deleted_count = 0
            
            # Clean up voice files
            for file_path in self.voice_storage_path.rglob("*.wav"):
                if file_path.stat().st_mtime < cutoff_date:
                    file_path.unlink()
                    deleted_count += 1
                    
                    # Also delete associated files
                    for ext in [".txt", ".json"]:
                        associated_file = file_path.with_suffix(ext)
                        if associated_file.exists():
                            associated_file.unlink()
            
            logger.info(f"🧹 Cleaned up {deleted_count} old voice files")
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up old files: {e}")
    
    def get_storage_stats(self) -> Dict:
        """Get storage statistics"""
        try:
            voice_files = list(self.voice_storage_path.rglob("*.wav"))
            transcription_files = list(self.transcription_storage_path.rglob("*.txt"))
            
            total_voice_size = sum(f.stat().st_size for f in voice_files)
            total_transcription_size = sum(f.stat().st_size for f in transcription_files)
            
            return {
                "voice_files_count": len(voice_files),
                "voice_files_size_mb": round(total_voice_size / (1024 * 1024), 2),
                "transcription_files_count": len(transcription_files),
                "transcription_files_size_mb": round(total_transcription_size / (1024 * 1024), 2),
                "total_size_mb": round((total_voice_size + total_transcription_size) / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting storage stats: {e}")
            return {"error": str(e)}
