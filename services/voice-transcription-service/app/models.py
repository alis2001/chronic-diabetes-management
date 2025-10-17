"""
Pydantic models for Voice Transcription Service
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TranscriptionRequest(BaseModel):
    """Request to start a transcription session"""
    doctor_id: str = Field(..., description="Doctor ID")
    patient_cf: str = Field(..., description="Patient fiscal code")
    cronoscita_id: str = Field(..., description="Cronoscita ID for context")
    
class TranscriptionResponse(BaseModel):
    """Response from transcription session start"""
    success: bool = Field(..., description="Whether the request was successful")
    session_id: str = Field(..., description="Unique session identifier")
    websocket_url: str = Field(..., description="WebSocket URL for real-time transcription")
    voice_file_path: str = Field(..., description="Path where voice will be saved")
    message: str = Field(..., description="Response message")

class SessionInfo(BaseModel):
    """Information about a transcription session"""
    session_id: str = Field(..., description="Unique session identifier")
    doctor_id: str = Field(..., description="Doctor ID")
    patient_cf: str = Field(..., description="Patient fiscal code")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    start_time: datetime = Field(..., description="Session start time")
    end_time: Optional[datetime] = Field(None, description="Session end time")
    duration_seconds: Optional[int] = Field(None, description="Session duration in seconds")
    status: str = Field("active", description="Session status: active, completed, error")
    
class TranscriptionChunk(BaseModel):
    """A chunk of transcribed text"""
    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., description="Confidence score (0-1)")
    timestamp: datetime = Field(..., description="When this chunk was transcribed")
    is_final: bool = Field(False, description="Whether this is final transcription")
    
class VoiceFileInfo(BaseModel):
    """Information about a voice file"""
    file_path: str = Field(..., description="Path to the voice file")
    file_size: int = Field(..., description="File size in bytes")
    duration_seconds: float = Field(..., description="Audio duration in seconds")
    format: str = Field(..., description="Audio format (wav, mp3, etc.)")
    created_at: datetime = Field(..., description="When the file was created")
    
class TranscriptionFileInfo(BaseModel):
    """Information about a transcription file"""
    file_path: str = Field(..., description="Path to the transcription file")
    file_size: int = Field(..., description="File size in bytes")
    word_count: int = Field(..., description="Number of words transcribed")
    created_at: datetime = Field(..., description="When the file was created")
    
class SessionFiles(BaseModel):
    """Files associated with a transcription session"""
    session_id: str = Field(..., description="Session identifier")
    voice_file: Optional[VoiceFileInfo] = Field(None, description="Voice file information")
    transcription_file: Optional[TranscriptionFileInfo] = Field(None, description="Transcription file information")
    chunks: List[TranscriptionChunk] = Field(default_factory=list, description="Transcription chunks")
    
class DoctorSessionSummary(BaseModel):
    """Summary of sessions for a doctor"""
    doctor_id: str = Field(..., description="Doctor ID")
    total_sessions: int = Field(..., description="Total number of sessions")
    total_duration_seconds: int = Field(..., description="Total recording time in seconds")
    total_words: int = Field(..., description="Total words transcribed")
    sessions: List[SessionInfo] = Field(..., description="List of sessions")
    
class WebSocketMessage(BaseModel):
    """Message sent over WebSocket"""
    type: str = Field(..., description="Message type: audio, text, control")
    data: Any = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")
    
class AudioChunk(BaseModel):
    """Audio data chunk"""
    data: bytes = Field(..., description="Audio data")
    sample_rate: int = Field(16000, description="Sample rate")
    channels: int = Field(1, description="Number of audio channels")
    format: str = Field("wav", description="Audio format")
    
class TranscriptionStatus(BaseModel):
    """Current transcription status"""
    is_recording: bool = Field(False, description="Whether currently recording")
    is_processing: bool = Field(False, description="Whether currently processing audio")
    current_text: str = Field("", description="Current transcribed text")
    confidence: float = Field(0.0, description="Current confidence score")
    words_per_minute: float = Field(0.0, description="Current speaking rate")
    session_duration: int = Field(0, description="Current session duration in seconds")
