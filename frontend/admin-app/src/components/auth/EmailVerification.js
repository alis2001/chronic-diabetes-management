// frontend/admin-app/src/components/auth/EmailVerification.js
// Email Verification with 6-digit codes - UPDATED WITH REAL API

import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api';
import '../../auth.css';

const EmailVerification = ({ 
  email, 
  nome, 
  cognome, 
  purpose = 'signup', // 'signup' or 'login'
  onVerificationSuccess,
  onBackToAuth,
  onError
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Timer for resend functionality
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (value) => {
    // Only allow digits, max 6 characters
    const cleanCode = value.replace(/\D/g, '').substring(0, 6);
    setCode(cleanCode);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      const errorMsg = 'Inserisci un codice di 6 cifre';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`🔐 Verifying ${purpose} code for:`, email);
      
      if (purpose === 'signup') {
        // REAL API CALL - Email verification for signup
        const response = await authAPI.verifyEmail({
          email: email,
          verification_code: code
        });

        if (response.success) {
          console.log('✅ Email verification successful');
          onVerificationSuccess({
            email: email,
            nome: nome,
            cognome: cognome,
            purpose: purpose
          });
        } else {
          console.error('❌ Email verification failed:', response.error);
          const errorMsg = response.error || 'Codice di verifica non valido';
          setError(errorMsg);
          setAttempts(prev => prev + 1);
          if (onError) onError(errorMsg);
        }
        
      } else if (purpose === 'login') {
        // REAL API CALL - Login completion with verification code
        const response = await authAPI.login({
          email: email,
          verification_code: code
        });

        if (response.success) {
          console.log('✅ Login verification successful');
          onVerificationSuccess({
            email: email,
            access_token: response.access_token,
            user_info: response.user_info,
            purpose: purpose
          });
        } else {
          console.error('❌ Login verification failed:', response.error);
          const errorMsg = response.error || 'Codice di verifica non valido';
          setError(errorMsg);
          setAttempts(prev => prev + 1);
          if (onError) onError(errorMsg);
        }
      }
      
    } catch (error) {
      console.error('❌ Verification error:', error);
      
      let errorMsg;
      if (error.status === 400) {
        errorMsg = error.message || 'Codice non valido';
      } else if (error.status === 404) {
        errorMsg = 'Servizio di verifica non disponibile';
      } else if (error.status === 500) {
        errorMsg = 'Errore interno del server';
      } else if (error.status === 0) {
        errorMsg = 'Impossibile contattare il server. Verificare la connessione.';
      } else {
        errorMsg = error.message || 'Errore durante la verifica';
      }
      
      setError(errorMsg);
      setAttempts(prev => prev + 1);
      if (onError) onError(errorMsg);
    }
    
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    setError('');
    
    try {
      console.log('🔄 Resending verification code for:', email);
      
      // REAL API CALL - Resend verification code
      const response = await authAPI.resendCode({
        email: email,
        purpose: purpose
      });

      if (response.success) {
        console.log('✅ Code resent successfully');
        setResendTimer(120); // 2 minutes cooldown
        // Don't show success message to avoid confusion
      } else {
        console.error('❌ Resend failed:', response.error);
        const errorMsg = response.error || 'Errore nell\'invio del codice';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Resend error:', error);
      
      let errorMsg;
      if (error.status === 429) {
        errorMsg = 'Troppi tentativi. Riprova tra qualche minuto.';
        setResendTimer(120);
      } else if (error.status === 400) {
        errorMsg = error.message || 'Richiesta non valida';
      } else {
        errorMsg = 'Errore nell\'invio del nuovo codice';
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
    
    setResendLoading(false);
  };

  const purposeText = purpose === 'signup' ? 'registrazione' : 'accesso';
  const displayName = nome && cognome ? `${nome} ${cognome}` : '';

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">📧</div>
        <h1 className="auth-title">
          {purpose === 'signup' ? 'Verifica Email' : 'Verifica Accesso'}
        </h1>
        <p className="auth-subtitle">Sistema Gestione Diabetes Cronico</p>
        <div className="company-badge">Gesan Healthcare Systems</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <p style={{ fontSize: '16px', color: '#374151', marginBottom: '10px' }}>
          Abbiamo inviato un codice di verifica di 6 cifre a:
        </p>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '5px' }}>
          {email}
        </p>
        {displayName && (
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {displayName}
          </p>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          {attempts > 0 && (
            <small style={{ display: 'block', marginTop: '5px' }}>
              Tentativi: {attempts}/5
            </small>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label required">Codice Verifica</label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="form-input verification-input"
            placeholder="123456"
            maxLength={6}
            required
            disabled={loading}
            autoComplete="one-time-code"
            inputMode="numeric"
            style={{ 
              textAlign: 'center', 
              fontSize: '24px', 
              letterSpacing: '4px',
              fontFamily: 'monospace'
            }}
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Inserisci il codice di 6 cifre ricevuto via email
          </small>
        </div>

        <button 
          type="submit" 
          className={`auth-button ${loading ? 'loading' : ''}`}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <span>
              <span className="spinner"></span>
              Verifica...
            </span>
          ) : (
            purpose === 'signup' ? 'Verifica e Attiva Account' : 'Completa Accesso'
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
            Non hai ricevuto il codice?
          </p>
          
          <button 
            type="button"
            onClick={handleResendCode}
            className="link-button"
            disabled={resendTimer > 0 || resendLoading || loading}
          >
            {resendLoading ? (
              'Invio in corso...'
            ) : resendTimer > 0 ? (
              `Riinvia tra ${resendTimer}s`
            ) : (
              'Riinvia codice'
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button 
            type="button"
            onClick={onBackToAuth}
            className="link-button"
            disabled={loading}
          >
            ← Torna indietro
          </button>
        </div>
      </form>
      
      <div className="auth-info" style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>
          💡 Il codice scade dopo 15 minuti
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>
          🔍 Controlla anche la cartella spam/junk
        </p>
      </div>
    </div>
  );
};

export default EmailVerification;