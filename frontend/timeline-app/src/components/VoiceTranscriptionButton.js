/**
 * Voice Transcription Button Component
 * Toggle button for real-time voice transcription
 */

import React from 'react';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';

const VoiceTranscriptionButton = ({ 
  doctorId, 
  patientCf, 
  cronoscitaId, 
  textAreaRef,
  onTranscriptionUpdate,
  onTextInsert,
  style = {},
  className = ""
}) => {
  const {
    isConnected,
    isRecording,
    isProcessing,
    error,
    status,
    canRecord,
    hasError,
    isReady,
    currentText,
    transcriptionHistory,
    toggleRecording,
    clearError
  } = useVoiceTranscription(doctorId, patientCf, cronoscitaId, textAreaRef, onTextInsert);

  // Handle transcription updates
  React.useEffect(() => {
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate({
        isConnected,
        isRecording,
        isProcessing,
        error,
        status
      });
    }
  }, [isConnected, isRecording, isProcessing, error, status, onTranscriptionUpdate]);


  const handleClick = async () => {
    try {
      if (hasError) {
        clearError();
        return;
      }
      
      await toggleRecording();
    } catch (error) {
      console.error('❌ Error toggling recording:', error);
    }
  };

  const getButtonText = () => {
    if (hasError) return '❌ Errore';
    if (isProcessing) return '⏳ Inizializzazione...';
    if (!isConnected) return '🎙️ Connessione...';
    if (isRecording) return '🛑 Stop Registrazione';
    return '🎤 Valutazione Vocale AI';
  };

  const getButtonStyle = () => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: canRecord || hasError ? 'pointer' : 'not-allowed',
      transition: 'all 0.3s ease',
      outline: 'none',
      minWidth: '200px',
      justifyContent: 'center',
      ...style
    };

    if (hasError) {
      return {
        ...baseStyle,
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '2px solid #fca5a5',
        '&:hover': {
          backgroundColor: '#fecaca',
          transform: 'translateY(-1px)'
        }
      };
    }

    if (isProcessing) {
      return {
        ...baseStyle,
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        border: '2px solid #d1d5db'
      };
    }

    if (!isConnected) {
      return {
        ...baseStyle,
        backgroundColor: '#fef3c7',
        color: '#d97706',
        border: '2px solid #fbbf24'
      };
    }

    if (isRecording) {
      return {
        ...baseStyle,
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '2px solid #fca5a5',
        animation: 'pulse 2s infinite',
        '&:hover': {
          backgroundColor: '#fecaca',
          transform: 'translateY(-1px)'
        }
      };
    }

    // Default (ready to record)
    return {
      ...baseStyle,
      backgroundColor: '#dbeafe',
      color: '#2563eb',
      border: '2px solid #93c5fd',
      '&:hover': {
        backgroundColor: '#bfdbfe',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
      }
    };
  };

  const getStatusIcon = () => {
    if (hasError) return '❌';
    if (isProcessing) return '⏳';
    if (!isConnected) return '🔌';
    if (isRecording) return '🔴';
    return '🎤';
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        disabled={isProcessing}
        style={getButtonStyle()}
        className={className}
        title={
          hasError 
            ? `Errore: ${error}` 
            : isProcessing 
            ? 'Inizializzazione in corso...'
            : !isConnected 
            ? 'Connessione al servizio...'
            : isRecording 
            ? 'Clicca per fermare la registrazione'
            : 'Clicca per iniziare la registrazione vocale'
        }
      >
        <span style={{ fontSize: '16px' }}>{getStatusIcon()}</span>
        <span>{getButtonText()}</span>
      </button>

      {/* Status indicator */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '16px',
          height: '16px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          animation: 'pulse 1s infinite'
        }} />
      )}


      {/* Error tooltip */}
      {hasError && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '12px',
          border: '1px solid #fca5a5',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}

      {/* Status tooltip */}
      {status && !hasError && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          borderRadius: '8px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          zIndex: 1000
        }}>
          {status}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceTranscriptionButton;
