/**
 * Voice Transcription API Client
 * Real-time Italian voice transcription using Vosk
 * Integrated with Chronic Diabetes Management System
 */

const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';

class VoiceTranscriptionAPI {
  constructor() {
    this.activeSession = null;
    this.websocket = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.onTranscriptionCallback = null;
    this.onStatusCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Start a new transcription session
   */
  async startSession(doctorId, patientCf, cronoscitaId) {
    try {
      console.log('🎙️ Starting voice transcription session...', { doctorId, patientCf, cronoscitaId });

      const response = await fetch(`${API_BASE}/api/voice-transcription/api/transcription/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient_cf: patientCf,
          cronoscita_id: cronoscitaId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start transcription session');
      }

      const sessionData = await response.json();
      this.activeSession = sessionData;

      console.log('✅ Voice transcription session started:', sessionData);
      return sessionData;

    } catch (error) {
      console.error('❌ Error starting voice transcription session:', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time transcription
   */
  async connectWebSocket(sessionId, doctorId, patientCf, cronoscitaId) {
    try {
      const wsUrl = `${API_BASE.replace('http', 'ws')}/api/voice-transcription/ws/transcribe/${sessionId}`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = async () => {
        console.log('✅ WebSocket connected');
        
        // Send session info
        this.websocket.send(doctorId);
        this.websocket.send(patientCf);
        this.websocket.send(cronoscitaId);
        
        // Ensure audio stream is ready before starting MediaRecorder
        if (!this.audioStream) {
          console.log('🎤 Audio stream not ready, waiting for it...');
          // Wait a bit for the audio stream to be ready
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Start MediaRecorder only after WebSocket is ready AND audio stream is ready
        this.startMediaRecorder();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.cleanup();
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      };

    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    console.log('📨 WebSocket message:', data);

    switch (data.type) {
      case 'session_ready':
        console.log('✅ Session ready for transcription');
        break;

      case 'transcription':
        if (this.onTranscriptionCallback) {
          this.onTranscriptionCallback({
            text: data.text,
            isFinal: data.is_final,
            confidence: data.confidence,
            timestamp: data.timestamp
          });
        }
        break;

      case 'recording_started':
        console.log('🎤 Recording started');
        this.isRecording = true;
        if (this.onStatusCallback) {
          this.onStatusCallback({ isRecording: true, message: 'Recording started' });
        }
        break;

      case 'recording_stopped':
        console.log('🛑 Recording stopped');
        this.isRecording = false;
        if (this.onStatusCallback) {
          this.onStatusCallback({ isRecording: false, message: 'Recording stopped' });
        }
        break;

      case 'status':
        if (this.onStatusCallback) {
          this.onStatusCallback(data.status);
        }
        break;

      case 'error':
        console.error('❌ Transcription error:', data.message);
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(data.message));
        }
        break;

      default:
        console.warn('⚠️ Unknown message type:', data.type);
    }
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        console.log('⚠️ Already recording');
        return;
      }

      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      console.log('🎤 Audio stream obtained:', this.audioStream);
      console.log('🎤 Audio stream tracks:', this.audioStream.getTracks().length);

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Process audio data for better transcription quality
   */
  processAudioData(inputData) {
    // Apply noise reduction and volume normalization
    const processedData = new Float32Array(inputData.length);
    
    // Calculate RMS (Root Mean Square) for volume detection
    let rms = 0;
    for (let i = 0; i < inputData.length; i++) {
      rms += inputData[i] * inputData[i];
    }
    rms = Math.sqrt(rms / inputData.length);
    
    // More lenient threshold - only filter out very quiet audio
    if (rms > 0.0001) {
      // Apply gentle noise gate with lower threshold
      const noiseThreshold = 0.001; // Much lower threshold
      const gain = Math.min(3.0, 0.3 / rms); // More aggressive gain
      
      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];
        // Apply noise gate and gain
        if (Math.abs(sample) > noiseThreshold) {
          processedData[i] = sample * gain;
        } else {
          processedData[i] = 0;
        }
      }
    } else {
      // Return original audio if very quiet (don't filter out completely)
      for (let i = 0; i < inputData.length; i++) {
        processedData[i] = inputData[i] * 2.0; // Apply some gain to quiet audio
      }
    }
    
    return processedData;
  }

  /**
   * Start MediaRecorder (called after WebSocket is ready)
   */
  startMediaRecorder() {
    try {
      // Check if audio stream is valid
      if (!this.audioStream || !this.audioStream.active) {
        console.error('❌ Audio stream is not valid:', this.audioStream);
        throw new Error('Audio stream is not valid');
      }

      console.log('🎤 Audio stream is valid, creating Web Audio API components...');

      // Use Web Audio API to capture raw PCM audio data
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      this.audioSource = this.audioContext.createMediaStreamSource(this.audioStream);
      // Use smaller buffer size for more responsive real-time processing
      this.processor = this.audioContext.createScriptProcessor(512, 1, 1);
      
       this.processor.onaudioprocess = (event) => {
         const inputBuffer = event.inputBuffer;
         const inputData = inputBuffer.getChannelData(0);
         
         // Temporarily disable audio processing to debug
         // const processedData = this.processAudioData(inputData);
         
         // Debug: Log audio data
         if (Math.random() < 0.01) { // Log 1% of the time to avoid spam
           console.log('🎵 Audio samples:', inputData.slice(0, 5));
           console.log('🎵 Audio range:', Math.min(...inputData), 'to', Math.max(...inputData));
         }
         
         // Apply much higher gain to boost weak audio signals for Vosk
         const rms = Math.sqrt(inputData.reduce((sum, sample) => sum + sample * sample, 0) / inputData.length);
         const gain = rms > 0.01 ? 5.0 : 10.0; // Further reduced gain to avoid clipping
         
         const int16Array = new Int16Array(inputData.length);
         for (let i = 0; i < inputData.length; i++) {
           const amplifiedSample = inputData[i] * gain;
           int16Array[i] = Math.max(-32768, Math.min(32767, amplifiedSample * 32768));
         }
         
         // Debug: Log int16 values after conversion
         if (Math.random() < 0.01) { // Log 1% of the time to avoid spam
           console.log('🎵 Int16 samples after gain:', int16Array.slice(0, 5));
           console.log('🎵 Int16 range:', Math.min(...int16Array), 'to', Math.max(...int16Array));
         }
         
         // Send raw PCM data
         if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
           // Only log occasionally to avoid spam
           if (Math.random() < 0.001) { // Log 0.1% of the time
             console.log('📤 Sending PCM audio data:', int16Array.length * 2, 'bytes');
           }
           this.websocket.send(int16Array.buffer);
         }
       };
      
      // Connect the audio processing chain
      this.audioSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Send start command to server
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        console.log('📤 Sending start_recording command');
        this.websocket.send(JSON.stringify({ type: 'start_recording' }));
      } else {
        console.log('⚠️ Cannot send start_recording command - WebSocket not ready');
      }

      console.log('🎤 Recording started with Web Audio API');

    } catch (error) {
      console.error('❌ Error starting Web Audio API:', error);
      throw error;
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording() {
    try {
      if (!this.isRecording) {
        console.log('⚠️ Not recording');
        return;
      }

      // Stop Web Audio API processing
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      
      if (this.audioSource) {
        this.audioSource.disconnect();
        this.audioSource = null;
      }
      
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      // Send stop command to server
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'stop_recording' }));
      }

      console.log('🛑 Recording stopped');

    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Toggle recording (start/stop)
   */
  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      // First get microphone access and wait for it to be ready
      await this.startRecording();
      
      // Wait a moment to ensure audio stream is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then start the session and WebSocket connection
      await this.startSession();
    }
  }

  /**
   * Stop transcription session
   */
  async stopSession() {
    try {
      if (this.activeSession) {
        console.log('🛑 Stopping transcription session...');

        // Stop recording if active
        if (this.isRecording) {
          await this.stopRecording();
        }

        // Close WebSocket
        if (this.websocket) {
          this.websocket.close();
        }

        // Stop session on server
        const response = await fetch(`${API_BASE}/api/voice-transcription/transcription/stop/${this.activeSession.session_id}`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          console.log('✅ Transcription session stopped');
        }

        this.activeSession = null;
      }

    } catch (error) {
      console.error('❌ Error stopping transcription session:', error);
      throw error;
    }
  }

  /**
   * Get session files
   */
  async getSessionFiles(sessionId) {
    try {
      const response = await fetch(`${API_BASE}/api/voice-transcription/transcription/files/${sessionId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get session files');
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Error getting session files:', error);
      throw error;
    }
  }

  /**
   * Get doctor sessions
   */
  async getDoctorSessions(doctorId) {
    try {
      const response = await fetch(`${API_BASE}/api/voice-transcription/transcription/sessions/${doctorId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get doctor sessions');
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Error getting doctor sessions:', error);
      throw error;
    }
  }

  /**
   * Set callbacks
   */
  setCallbacks({ onTranscription, onStatus, onError }) {
    this.onTranscriptionCallback = onTranscription;
    this.onStatusCallback = onStatus;
    this.onErrorCallback = onError;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isRecording = false;
    this.activeSession = null;
  }

  /**
   * Check if service is available
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/api/voice-transcription/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ Voice transcription service health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const voiceTranscriptionAPI = new VoiceTranscriptionAPI();

export default voiceTranscriptionAPI;
