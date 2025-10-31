"""
Whisper Transcription Service Configuration
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service configuration
    service_name: str = "whisper-transcription-service"
    service_version: str = "1.0.0"
    debug: bool = False
    
    # Whisper model configuration
    whisper_model_size: str = "medium"  # tiny, base, small, medium, large(-v2)
    whisper_language: str = "it"  # Italian
    whisper_temperature: float = 0.0  # Make output more deterministic
    whisper_beam_size: int = 5
    whisper_best_of: int = 5
    whisper_patience: float = 1.0
    whisper_length_penalty: float = 1.0
    whisper_condition_on_previous_text: bool = False  # Prevent context-based hallucinations
    whisper_fp16: bool = True
    whisper_device: str = "cpu"  # auto, cpu, cuda - using CPU to avoid cuDNN issues
    
    # Anti-hallucination parameters
    whisper_no_speech_threshold: float = 0.6  # Higher threshold to ignore low-confidence segments
    whisper_logprob_threshold: float = -1.0  # Filter out low-probability transcriptions
    whisper_compression_ratio_threshold: float = 2.4  # Filter out repetitive text
    whisper_hallucination_blacklist: str = "Amara.org,sottotitoli di Luca Pagani,subtitles by,created by,traduzione di"  # Known hallucination patterns
    
    # Streaming transcription parameters
    streaming_enabled: bool = True  # Enable real-time streaming
    # Optimized for quality with reasonable latency
    chunk_duration: float = 3.0  # seconds per streaming chunk - longer for better quality
    overlap_duration: float = 0.5  # seconds of overlap for context
    min_chunk_duration: float = 1.0  # Minimum chunk size before attempting streaming - need at least 1s
    max_chunk_duration: float = 6.0  # Maximum chunk size
    partials_enabled: bool = True  # Emit interim partial results
    partial_emit_interval_ms: int = 300  # Lower interval for more frequent updates (300ms)
    num_workers_streaming: int = 1  # Parallelism for streaming decode (lower = lower latency)
    num_workers_final: int = 2  # Parallelism for final decode
    
    # Word-by-word transcription parameters
    word_level_transcription: bool = True  # Enable word-level processing
    word_confidence_threshold: float = 0.5  # Minimum confidence for word acceptance
    word_buffer_size: int = 3  # Number of words to buffer before sending
    word_timeout: float = 0.5  # Timeout in seconds to flush word buffer
    
    # Audio configuration
    sample_rate: int = 16000
    chunk_size: int = 4000
    audio_format: str = "wav"
    max_audio_duration: int = 1800  # 30 minutes max
    
    # Voice Activity Detection (VAD) configuration
    vad_aggressiveness: int = 2  # 0-3, lower = less aggressive (was 3)
    vad_silence_duration: float = 2.0  # Skip audio segments longer than this (seconds)
    vad_energy_threshold: float = 0.00005  # Lower energy threshold to accept soft speech
    streaming_vad_filter_enabled: bool = True  # Enable model-side VAD filter during streaming
    
    # Storage paths
    voice_storage_path: str = "./storage/voices"
    transcription_storage_path: str = "./storage/transcriptions"
    model_cache_path: str = "./storage/models"
    
    # WebSocket configuration
    websocket_timeout: int = 300
    max_session_duration: int = 1800
    
    # CORS origins
    allowed_origins: str = "http://localhost:3000,http://localhost:8080"
    
    # Environment
    env: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Get allowed origins as a list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def whisper_model_name(self) -> str:
        """Get full Whisper model name"""
        return self.whisper_model_size
    
    def ensure_storage_directories(self):
        """Ensure storage directories exist"""
        import os
        os.makedirs(self.voice_storage_path, exist_ok=True)
        os.makedirs(self.transcription_storage_path, exist_ok=True)
        os.makedirs(self.model_cache_path, exist_ok=True)


def get_settings() -> Settings:
    """Get application settings"""
    return Settings()
