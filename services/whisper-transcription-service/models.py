"""
Whisper Transcription Service Models
High-accuracy Italian voice transcription using OpenAI Whisper
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TranscriptionRequest(BaseModel):
    """Request to start a transcription session"""
    doctor_id: str = Field(..., description="Doctor ID")
    patient_cf: str = Field(..., description="Patient fiscal code")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    language: str = Field(default="it", description="Language code (default: Italian)")


class TranscriptionResponse(BaseModel):
    """Response from transcription session"""
    success: bool = Field(..., description="Whether the operation was successful")
    session_id: str = Field(..., description="Unique session identifier")
    websocket_url: str = Field(..., description="WebSocket URL for real-time transcription")
    message: str = Field(..., description="Status message")


class SessionInfo(BaseModel):
    """Session information for transcription"""
    session_id: str = Field(..., description="Unique session identifier")
    doctor_id: str = Field(..., description="Doctor ID")
    patient_cf: str = Field(..., description="Patient fiscal code")
    cronoscita_id: str = Field(..., description="Cronoscita ID")
    start_time: datetime = Field(default_factory=datetime.now, description="Session start time")
    language: str = Field(default="it", description="Language code")


class WordTranscription(BaseModel):
    """Individual word transcription for real-time streaming"""
    word: str = Field(..., description="Transcribed word")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    confidence: float = Field(..., description="Word confidence score (0.0-1.0)")
    is_final: bool = Field(default=False, description="Whether this word is final")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Timestamp")


class TranscriptionChunk(BaseModel):
    """Individual transcription chunk"""
    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., description="Confidence score (0.0-1.0)")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Timestamp")
    is_final: bool = Field(..., description="Whether this is a final result")
    language: str = Field(default="it", description="Detected language")
    words: List[WordTranscription] = Field(default_factory=list, description="Word-level details")


class TranscriptionStatus(BaseModel):
    """Current transcription status"""
    is_recording: bool = Field(..., description="Whether currently recording")
    is_processing: bool = Field(..., description="Whether currently processing audio")
    current_text: str = Field(default="", description="Current transcribed text")
    confidence: float = Field(default=0.0, description="Overall confidence score")
    words_per_minute: float = Field(default=0.0, description="Transcription speed")
    session_duration: int = Field(default=0, description="Session duration in seconds")
    language: str = Field(default="it", description="Detected language")


class WhisperConfig(BaseModel):
    """Whisper model configuration"""
    model_size: str = Field(default="medium", description="Whisper model size (tiny, base, small, medium, large)")
    language: str = Field(default="it", description="Target language")
    temperature: float = Field(default=0.0, description="Temperature for sampling")
    beam_size: int = Field(default=5, description="Beam size for beam search")
    best_of: int = Field(default=5, description="Number of candidates to consider")
    patience: float = Field(default=1.0, description="Patience for beam search")
    length_penalty: float = Field(default=1.0, description="Length penalty")
    suppress_tokens: List[int] = Field(default_factory=list, description="Tokens to suppress")
    initial_prompt: Optional[str] = Field(default=None, description="Initial prompt for context")
    condition_on_previous_text: bool = Field(default=True, description="Whether to condition on previous text")
    fp16: bool = Field(default=True, description="Whether to use FP16 precision")
    device: str = Field(default="auto", description="Device to use (auto, cpu, cuda)")


class AudioFileInfo(BaseModel):
    """Audio file information"""
    file_path: str = Field(..., description="Path to audio file")
    file_size_bytes: int = Field(..., description="File size in bytes")
    file_size_mb: float = Field(..., description="File size in MB")
    duration_seconds: float = Field(..., description="Audio duration in seconds")
    sample_rate: int = Field(..., description="Sample rate")
    channels: int = Field(..., description="Number of audio channels")
    format: str = Field(..., description="Audio format")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")


class TranscriptionResult(BaseModel):
    """Final transcription result"""
    text: str = Field(..., description="Complete transcribed text")
    language: str = Field(..., description="Detected language")
    confidence: float = Field(..., description="Overall confidence score")
    duration: float = Field(..., description="Audio duration in seconds")
    segments: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed segments")
    words: List[Dict[str, Any]] = Field(default_factory=list, description="Word-level timestamps")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
