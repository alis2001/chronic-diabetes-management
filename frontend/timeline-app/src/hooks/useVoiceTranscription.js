/**
 * React Hook for Voice Transcription
 * Manages voice transcription state and functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import voiceTranscriptionAPI from '../voiceTranscriptionAPI';

export const useVoiceTranscription = (doctorId, patientCf, cronoscitaId, textAreaRef = null, onTextInsert = null) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('disconnected');

  // Refs
  const sessionRef = useRef(null);
  const internalTextAreaRef = useRef(null);
  const lastPartialTextRef = useRef('');
  const lastInsertionPositionRef = useRef({ start: 0, end: 0 });
  
  // Use passed textAreaRef or fallback to internal one
  const activeTextAreaRef = textAreaRef || internalTextAreaRef;

  /**
   * Initialize transcription session
   */
  const initializeSession = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setStatus('initializing');

      // Check service health
      const isHealthy = await voiceTranscriptionAPI.checkHealth();
      if (!isHealthy) {
        throw new Error('Voice transcription service is not available');
      }

      // Start session
      const sessionData = await voiceTranscriptionAPI.startSession(doctorId, patientCf, cronoscitaId);
      sessionRef.current = sessionData;

      // Connect WebSocket
      await voiceTranscriptionAPI.connectWebSocket(
        sessionData.session_id,
        doctorId,
        patientCf,
        cronoscitaId
      );

      // Set callbacks
      voiceTranscriptionAPI.setCallbacks({
        onTranscription: handleTranscription,
        onStatus: handleStatus,
        onError: handleError
      });

      setIsConnected(true);
      setStatus('ready');

    } catch (error) {
      console.error('❌ Error initializing voice transcription:', error);
      setError(error.message);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  }, [doctorId, patientCf, cronoscitaId]);

  /**
   * Insert text at cursor position
   */
  const insertTextAtCursor = useCallback((text) => {
    console.log('🔍 insertTextAtCursor called with:', text);
    console.log('🔍 activeTextAreaRef.current:', activeTextAreaRef.current);
    console.log('🔍 onTextInsert callback:', onTextInsert);
    
    // Use the callback if available (for controlled components)
    if (onTextInsert) {
      console.log('🔍 Using onTextInsert callback');
      onTextInsert(text, false); // Pass false for isPartial (final text)
      return;
    }
    
    // Fallback to direct textarea manipulation (for uncontrolled components)
    if (activeTextAreaRef.current) {
      const textarea = activeTextAreaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      console.log('🔍 Textarea info:', { start, end, valueLength: value.length });
      
      // Insert text at cursor position
      const newValue = value.substring(0, start) + text + ' ' + value.substring(end);
      
      // Update textarea value
      textarea.value = newValue;
      
      // Set cursor position after inserted text
      const newCursorPos = start + text.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger change event
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      
      // Focus textarea
      textarea.focus();
      
      console.log('✅ Text inserted successfully:', text);
    } else {
      console.error('❌ activeTextAreaRef.current is null!');
    }
  }, [activeTextAreaRef, onTextInsert]);

  /**
   * Insert or replace partial text for real-time updates
   */
  const insertOrReplacePartialText = useCallback((text) => {
    console.log('🔄 insertOrReplacePartialText called with:', text);
    console.log('🔄 lastPartialTextRef.current:', lastPartialTextRef.current);
    
    // For partial text, we'll use the callback if available, but we need to handle replacement logic
    // For now, let's use the callback for partial text too
    if (onTextInsert) {
      console.log('🔄 Using onTextInsert callback for partial text');
      onTextInsert(text, true); // Pass true for isPartial
      return;
    }
    
    // Fallback to direct textarea manipulation
    if (activeTextAreaRef.current) {
      const textarea = activeTextAreaRef.current;
      const value = textarea.value;
      
      // Check if we have a previous partial text to replace
      if (lastPartialTextRef.current && 
          lastInsertionPositionRef.current.start !== lastInsertionPositionRef.current.end &&
          lastPartialTextRef.current.trim().length > 0) {
        
        // Replace the last partial text
        const { start, end } = lastInsertionPositionRef.current;
        const beforePartial = value.substring(0, start);
        const afterPartial = value.substring(end);
        const newValue = beforePartial + text + ' ' + afterPartial;
        
        textarea.value = newValue;
        
        // Update cursor position
        const newCursorPos = start + text.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Update insertion position for next replacement
        lastInsertionPositionRef.current = { start, end: newCursorPos };
        
        console.log('🔄 Replaced partial text:', lastPartialTextRef.current, '->', text);
      } else {
        // First partial text or no previous partial - insert normally
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + ' ' + value.substring(end);
        
        textarea.value = newValue;
        
        const newCursorPos = start + text.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Store insertion position for future replacements
        lastInsertionPositionRef.current = { start, end: newCursorPos };
        
        console.log('🔄 Inserted new partial text:', text);
      }
      
      // Store the current partial text
      lastPartialTextRef.current = text;
      
      // Trigger change event
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      
      // Focus textarea
      textarea.focus();
      
      console.log('✅ Partial text inserted/replaced successfully:', text);
    } else {
      console.error('❌ activeTextAreaRef.current is null!');
    }
  }, [activeTextAreaRef, onTextInsert]);

  /**
   * Handle transcription results
   */
  const handleTranscription = useCallback((data) => {
    console.log('📝 Transcription received:', data);

    if (data.isFinal) {
      console.log('🎯 Final transcription - finalizing text:', data.text);
      
      // Final transcription - add to history
      setTranscriptionHistory(prev => [...prev, {
        text: data.text,
        timestamp: data.timestamp,
        confidence: data.confidence
      }]);

      // Only insert if it's different from the last partial text (avoid duplicates)
      if (data.text !== lastPartialTextRef.current) {
        insertTextAtCursor(data.text);
      }
      
      // Clear partial text tracking for next session
      lastPartialTextRef.current = '';
      lastInsertionPositionRef.current = { start: 0, end: 0 };
    } else {
      // Partial transcription - show in real-time
      setCurrentText(data.text);
      
      // Insert or replace partial text directly into textarea for immediate feedback
      // Only process if text is meaningful (not empty or very short)
      if (data.text && data.text.trim() && data.text.trim().length > 1) {
        console.log('🔄 Partial transcription - real-time update:', data.text);
        insertOrReplacePartialText(data.text);
      }
    }
  }, [insertTextAtCursor, insertOrReplacePartialText]);

  /**
   * Handle status updates
   */
  const handleStatus = useCallback((data) => {
    console.log('📊 Status update:', data);
    
    if (data.isRecording !== undefined) {
      setIsRecording(data.isRecording);
    }
    
    if (data.message) {
      setStatus(data.message);
    }
  }, []);

  /**
   * Handle errors
   */
  const handleError = useCallback((error) => {
    console.error('❌ Voice transcription error:', error);
    setError(error.message);
    setStatus('error');
  }, []);


  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      // Always start a fresh session for new recording
      await initializeSession();
      
      await voiceTranscriptionAPI.startRecording();
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError(error.message);
    }
  }, [initializeSession]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    try {
      await voiceTranscriptionAPI.stopRecording();
      
      // Clear partial text tracking but keep the text in textarea
      lastPartialTextRef.current = '';
      lastInsertionPositionRef.current = { start: 0, end: 0 };
      
      // Clear current text state but don't clear the textarea
      setCurrentText('');
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setError(error.message);
    }
  }, []);

  /**
   * Toggle recording
   */
  const toggleRecording = useCallback(async () => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error('❌ Error toggling recording:', error);
      setError(error.message);
    }
  }, [isRecording, startRecording, stopRecording]);

  /**
   * Stop session
   */
  const stopSession = useCallback(async () => {
    try {
      await voiceTranscriptionAPI.stopSession();
      setIsConnected(false);
      setIsRecording(false);
      setStatus('disconnected');
      sessionRef.current = null;
    } catch (error) {
      console.error('❌ Error stopping session:', error);
      setError(error.message);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get session files
   */
  const getSessionFiles = useCallback(async () => {
    try {
      if (sessionRef.current) {
        return await voiceTranscriptionAPI.getSessionFiles(sessionRef.current.session_id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting session files:', error);
      setError(error.message);
      return null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        voiceTranscriptionAPI.cleanup();
      }
    };
  }, []);

  return {
    // State
    isConnected,
    isRecording,
    isProcessing,
    currentText,
    transcriptionHistory,
    error,
    status,
    
    // Actions
    initializeSession,
    startRecording,
    stopRecording,
    toggleRecording,
    stopSession,
    clearError,
    getSessionFiles,
    
    // Refs
    textAreaRef,
    
    // Computed
    canRecord: isConnected && !isProcessing,
    hasError: !!error,
    isReady: isConnected && !isProcessing && !error
  };
};
