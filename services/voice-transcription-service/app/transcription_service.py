"""
Voice Transcription Service using Vosk
Real-time Italian voice transcription
"""

import asyncio
import json
import logging
import wave
import io
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path

import vosk
import numpy as np
from fastapi import WebSocket

from .config import get_settings
from .models import SessionInfo, TranscriptionChunk, TranscriptionStatus

logger = logging.getLogger(__name__)
settings = get_settings()

class VoiceTranscriptionService:
    """Service for real-time voice transcription using Vosk"""
    
    def __init__(self):
        self.model = None
        self.rec = None
        self.active_sessions: Dict[str, Dict] = {}
        self.is_initialized = False
        
    async def initialize_model(self):
        """Initialize Vosk model for Italian transcription"""
        try:
            logger.info("🔄 Initializing Vosk model for Italian transcription...")
            
            # Check if model exists
            model_path = Path(settings.VOSK_MODEL_PATH)
            if not model_path.exists():
                logger.warning(f"⚠️ Model not found at {model_path}, downloading...")
                await self._download_model()
            
            # Initialize Vosk model
            self.model = vosk.Model(str(model_path))
            self.rec = vosk.KaldiRecognizer(self.model, settings.SAMPLE_RATE)
            
            self.is_initialized = True
            logger.info("✅ Vosk model initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Vosk model: {e}")
            raise
    
    async def _download_model(self):
        """Download Vosk Italian model if not present"""
        import urllib.request
        import zipfile
        
        try:
            logger.info("📥 Downloading Vosk Italian model...")
            
            # Create models directory
            model_dir = Path(settings.VOSK_MODEL_PATH).parent
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # Download model
            zip_path = model_dir / "model.zip"
            urllib.request.urlretrieve(settings.VOSK_MODEL_URL, zip_path)
            
            # Extract model
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(model_dir)
            
            # Clean up zip file
            zip_path.unlink()
            
            logger.info("✅ Vosk model downloaded and extracted")
            
        except Exception as e:
            logger.error(f"❌ Failed to download Vosk model: {e}")
            raise
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.is_initialized and self.model is not None
    
    async def start_session(self, websocket: WebSocket, session_info: SessionInfo, voice_file_path: str):
        """Start a new transcription session"""
        try:
            logger.info(f"🎤 Starting transcription session: {session_info.session_id}")
            
            # Initialize session data
            session_data = {
                "session_info": session_info,
                "websocket": websocket,
                "voice_file_path": voice_file_path,
                "audio_buffer": io.BytesIO(),
                "transcription_chunks": [],
                "is_recording": False,
                "start_time": datetime.now(),
                "last_activity": datetime.now()
            }
            
            # Store session
            self.active_sessions[session_info.session_id] = session_data
            
            # Send session ready message
            await websocket.send_text(json.dumps({
                "type": "session_ready",
                "session_id": session_info.session_id,
                "message": "Transcription session ready. Send 'start' to begin recording."
            }))
            
            # Handle WebSocket messages
            await self._handle_websocket_messages(session_info.session_id)
            
        except Exception as e:
            logger.error(f"❌ Error starting session {session_info.session_id}: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Failed to start session: {str(e)}"
            }))
    
    async def _handle_websocket_messages(self, session_id: str):
        """Handle WebSocket messages for a session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        websocket = session_data["websocket"]
        
        try:
            while True:
                # Receive message
                message = await websocket.receive()
                
                if message["type"] == "websocket.receive":
                    if "text" in message:
                        await self._handle_text_message(session_id, message["text"])
                    elif "bytes" in message:
                        await self._handle_audio_data(session_id, message["bytes"])
                
        except Exception as e:
            logger.error(f"❌ WebSocket error for session {session_id}: {e}")
        finally:
            await self.stop_session(session_id)
    
    async def _handle_text_message(self, session_id: str, text: str):
        """Handle text messages from WebSocket"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        websocket = session_data["websocket"]
        
        try:
            message_data = json.loads(text)
            message_type = message_data.get("type")
            
            if message_type == "start_recording":
                await self._start_recording(session_id)
            elif message_type == "stop_recording":
                await self._stop_recording(session_id)
            elif message_type == "get_status":
                await self._send_status(session_id)
            else:
                logger.warning(f"⚠️ Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.warning(f"⚠️ Invalid JSON message: {text}")
        except Exception as e:
            logger.error(f"❌ Error handling text message: {e}")
    
    async def _handle_audio_data(self, session_id: str, audio_data: bytes):
        """Handle audio data from WebSocket"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            logger.warning(f"⚠️ No session data found for {session_id}")
            return
        
        if not session_data["is_recording"]:
            logger.warning(f"⚠️ Not recording for session {session_id}")
            return
        
        try:
            logger.info(f"🎵 Received audio data: {len(audio_data)} bytes for session {session_id}")
            
            # Add audio data to buffer
            session_data["audio_buffer"].write(audio_data)
            
            # Process audio for transcription
            await self._process_audio_chunk(session_id, audio_data)
            
            # Update last activity
            session_data["last_activity"] = datetime.now()
            
        except Exception as e:
            logger.error(f"❌ Error handling audio data: {e}")
    
    async def _process_audio_chunk(self, session_id: str, audio_data: bytes):
        """Process audio chunk for transcription"""
        try:
            # Add a counter to track chunks for logging
            if not hasattr(self, '_chunk_counter'):
                self._chunk_counter = 0
            self._chunk_counter += 1
            
            # Log every 100th chunk to avoid spam (less frequent logging)
            if self._chunk_counter % 100 == 0:
                logger.info(f"🔄 Processing audio chunk #{self._chunk_counter}: {len(audio_data)} bytes for session {session_id}")
            
            # Convert bytes to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            # Log audio details occasionally
            if len(audio_array) > 0 and self._chunk_counter % 200 == 0:
                logger.info(f"🔄 Audio range: min={audio_array.min()}, max={audio_array.max()}")
            
            # Process with Vosk - use the original audio data
            try:
                # Log audio data details for debugging - more frequent for testing
                if self._chunk_counter % 10 == 0:  # Log every 10th chunk for better debugging
                    logger.info(f"🎤 Sending to Vosk: {len(audio_data)} bytes, first 10 bytes: {audio_data[:10]}")
                    # Log audio range for debugging
                    audio_array = np.frombuffer(audio_data, dtype=np.int16)
                    logger.info(f"🎵 Audio range sent to Vosk: min={audio_array.min()}, max={audio_array.max()}")
                
                if self.rec.AcceptWaveform(audio_data):
                    # Final result
                    result = json.loads(self.rec.Result())
                    if result.get("text"):
                        logger.info(f"🎯 Final result: {result['text']}")
                        await self._send_transcription(session_id, result["text"], True, result.get("confidence", 0.0))
                    else:
                        logger.info(f"🎯 Final result (no text): {result}")
                else:
                    # Always get partial result for real-time feedback
                    result = json.loads(self.rec.PartialResult())
                    if result.get("partial"):
                        # Send partial results more frequently for better real-time experience
                        await self._send_transcription(session_id, result["partial"], False, result.get("confidence", 0.0))
                        
                        # Only log partial results that are meaningful (not empty or very short)
                        if len(result["partial"].strip()) > 2:
                            logger.info(f"🔄 Partial result: {result['partial']}")
                    else:
                        # Log when we get empty partial results to debug (more frequently for testing)
                        if self._chunk_counter % 20 == 0:  # Log every 20th chunk for better debugging
                            logger.info(f"🔄 Empty partial result for chunk #{self._chunk_counter}: {result}")
            except Exception as vosk_error:
                logger.error(f"❌ Vosk processing error: {vosk_error}")
                # Try to get partial result even if there was an error
                try:
                    result = json.loads(self.rec.PartialResult())
                    if result.get("partial"):
                        await self._send_transcription(session_id, result["partial"], False, result.get("confidence", 0.0))
                except Exception as partial_error:
                    logger.error(f"❌ Partial result error: {partial_error}")
                    
        except Exception as e:
            logger.error(f"❌ Error processing audio chunk: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
    
    def _preprocess_audio(self, audio_array: np.ndarray) -> bytes:
        """Preprocess audio for better transcription quality"""
        try:
            # Convert to float32 for processing
            audio_float = audio_array.astype(np.float32) / 32768.0
            
            # Apply noise reduction (simple high-pass filter)
            # Remove very low frequencies that are usually noise
            from scipy import signal
            b, a = signal.butter(4, 0.1, btype='high', analog=False)
            filtered_audio = signal.filtfilt(b, a, audio_float)
            
            # Apply volume normalization
            rms = np.sqrt(np.mean(filtered_audio ** 2))
            if rms > 0.001:  # Only normalize if there's significant audio
                target_rms = 0.1
                gain = min(2.0, target_rms / rms)
                filtered_audio = filtered_audio * gain
            
            # Convert back to int16
            processed_audio = (filtered_audio * 32768.0).astype(np.int16)
            
            # Convert back to bytes
            return processed_audio.tobytes()
            
        except Exception as e:
            logger.warning(f"⚠️ Audio preprocessing failed, using original: {e}")
            # Fallback to original audio if preprocessing fails
            return audio_array.tobytes()
    
    async def _send_transcription(self, session_id: str, text: str, is_final: bool, confidence: float):
        """Send transcription result to WebSocket"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        websocket = session_data["websocket"]
        
        try:
            # Create transcription chunk
            chunk = TranscriptionChunk(
                text=text,
                confidence=confidence,
                timestamp=datetime.now(),
                is_final=is_final
            )
            
            # Store chunk
            session_data["transcription_chunks"].append(chunk)
            
            # Send to frontend
            message = {
                "type": "transcription",
                "text": text,
                "is_final": is_final,
                "confidence": confidence,
                "timestamp": chunk.timestamp.isoformat()
            }
            
            await websocket.send_text(json.dumps(message))
            
            logger.debug(f"📝 Sent transcription: {text[:50]}... (final: {is_final})")
            
        except Exception as e:
            logger.error(f"❌ Error sending transcription: {e}")
    
    async def _start_recording(self, session_id: str):
        """Start recording for a session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        session_data["is_recording"] = True
        session_data["start_time"] = datetime.now()
        
        # Reset Vosk recognizer for new recording
        self.rec = vosk.KaldiRecognizer(self.model, settings.SAMPLE_RATE)
        
        # Reset chunk counter for new recording
        self._chunk_counter = 0
        
        await session_data["websocket"].send_text(json.dumps({
            "type": "recording_started",
            "message": "Recording started. Speak now."
        }))
        
        logger.info(f"🎤 Recording started for session: {session_id}")
    
    async def _stop_recording(self, session_id: str):
        """Stop recording for a session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        session_data["is_recording"] = False
        
        # Get final result
        final_result = json.loads(self.rec.FinalResult())
        if final_result.get("text"):
            await self._send_transcription(session_id, final_result["text"], True, final_result.get("confidence", 0.0))
        
        await session_data["websocket"].send_text(json.dumps({
            "type": "recording_stopped",
            "message": "Recording stopped."
        }))
        
        logger.info(f"🛑 Recording stopped for session: {session_id}")
    
    async def _send_status(self, session_id: str):
        """Send current status to WebSocket"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        websocket = session_data["websocket"]
        
        try:
            # Calculate session duration
            duration = (datetime.now() - session_data["start_time"]).total_seconds()
            
            # Get current text
            current_text = ""
            if session_data["transcription_chunks"]:
                current_text = " ".join([chunk.text for chunk in session_data["transcription_chunks"] if chunk.is_final])
            
            status = TranscriptionStatus(
                is_recording=session_data["is_recording"],
                is_processing=False,  # Could be enhanced
                current_text=current_text,
                confidence=0.0,  # Could be calculated from chunks
                words_per_minute=0.0,  # Could be calculated
                session_duration=int(duration)
            )
            
            await websocket.send_text(json.dumps({
                "type": "status",
                "status": status.dict()
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending status: {e}")
    
    async def stop_session(self, session_id: str):
        """Stop and cleanup a transcription session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        try:
            # Stop recording if active
            if session_data["is_recording"]:
                await self._stop_recording(session_id)
            
            # Save voice file
            await self._save_voice_file(session_id)
            
            # Save transcription file
            await self._save_transcription_file(session_id)
            
            # Cleanup session
            del self.active_sessions[session_id]
            
            logger.info(f"✅ Session {session_id} stopped and cleaned up")
            
        except Exception as e:
            logger.error(f"❌ Error stopping session {session_id}: {e}")
    
    async def _save_voice_file(self, session_id: str):
        """Save voice file for a session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        try:
            voice_file_path = session_data["voice_file_path"]
            audio_buffer = session_data["audio_buffer"]
            
            # Save audio buffer to file
            with open(voice_file_path, "wb") as f:
                f.write(audio_buffer.getvalue())
            
            logger.info(f"💾 Voice file saved: {voice_file_path}")
            
        except Exception as e:
            logger.error(f"❌ Error saving voice file: {e}")
    
    async def _save_transcription_file(self, session_id: str):
        """Save transcription file for a session"""
        session_data = self.active_sessions.get(session_id)
        if not session_data:
            return
        
        try:
            # Create transcription file path
            voice_file_path = Path(session_data["voice_file_path"])
            transcription_file_path = voice_file_path.with_suffix(".txt")
            
            # Save transcription
            with open(transcription_file_path, "w", encoding="utf-8") as f:
                f.write(f"Transcription Session: {session_id}\n")
                f.write(f"Doctor: {session_data['session_info'].doctor_id}\n")
                f.write(f"Patient: {session_data['session_info'].patient_cf}\n")
                f.write(f"Cronoscita: {session_data['session_info'].cronoscita_id}\n")
                f.write(f"Start Time: {session_data['start_time'].isoformat()}\n")
                f.write(f"End Time: {datetime.now().isoformat()}\n")
                f.write("-" * 50 + "\n\n")
                
                for chunk in session_data["transcription_chunks"]:
                    if chunk.is_final:
                        f.write(f"[{chunk.timestamp.isoformat()}] {chunk.text}\n")
            
            logger.info(f"📝 Transcription file saved: {transcription_file_path}")
            
        except Exception as e:
            logger.error(f"❌ Error saving transcription file: {e}")
    
    async def cleanup(self):
        """Cleanup all active sessions"""
        logger.info("🧹 Cleaning up all active sessions...")
        
        for session_id in list(self.active_sessions.keys()):
            await self.stop_session(session_id)
        
        logger.info("✅ All sessions cleaned up")
