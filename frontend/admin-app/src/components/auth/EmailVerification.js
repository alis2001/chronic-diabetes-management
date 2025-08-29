// frontend/admin-app/src/components/auth/EmailVerification.js
// Email Verification with 6-digit codes

import React, { useState, useEffect } from 'react';
import '../../auth.css';

const EmailVerification = ({ 
  email, 
  nome, 
  cognome, 
  purpose = 'signup', // 'signup' or 'login'
  onVerificationSuccess,
  onBackToAuth 
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
      setError('Inserisci un codice di 6 cifre');
      return;
    }

    setLoading(true);
    try {
      console.log('Verification attempt:', { email, code, purpose });
      // API call will be implemented
      // const response = await authAPI.verifyCode({ email, code, purpose });
      // if (response.success) {
      //   onVerificationSuccess(response.data);
      // }
      
      // Temporary simulation
      setTimeout(() => {
        if (code === '123456') { // Mock success
          onVerificationSuccess({ email, verified: true });
        } else {
          setAttempts(prev => prev + 1);
          setError(`Codice non valido. Tentativi: ${attempts + 1}/5`);
        }
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      setAttempts(prev => prev + 1);
      setError(error.message || 'Errore durante la verifica');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    try {
      console.log('Resend code for:', email);
      // API call will be implemented
      // await authAPI.resendCode({ email, purpose });
      
      setResendTimer(60); // 60 second cooldown
      setError('');
      
      setTimeout(() => {
        setResendLoading(false);
      }, 1500);
      
    } catch (error) {
      setError('Errore durante l\'invio del codice');
      setResendLoading(false);
    }
  };

  const purposeText = purpose === 'signup' ? 'registrazione' : 'accesso';
  const displayName = nome && cognome ? `${nome} ${cognome}` : email;

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">📧</div>
        <h1 className="auth-title">Verifica Email</h1>
        <p className="auth-subtitle">Conferma il tuo {purposeText}</p>
        <div className="company-badge">Gesan Healthcare Systems</div>
      </div>

      <div className="verification-section">
        <div className="verification-title">
          Codice inviato a
        </div>
        <div className="verification-subtitle">
          <strong>{displayName}</strong>
          <br />
          {email}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {attempts === 0 && (
        <div className="alert alert-info">
          <span className="alert-icon">💌</span>
          Abbiamo inviato un codice di 6 cifre alla tua email aziendale. 
          Controlla anche la cartella spam.
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label required">Codice di Verifica</label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="form-input code-input"
            placeholder="000000"
            required
            disabled={loading}
            maxLength="6"
            autoComplete="one-time-code"
            autoFocus
          />
          <div className="timer">
            {code.length}/6 cifre
          </div>
        </div>

        <button 
          type="submit" 
          className={`auth-button ${loading ? 'loading' : ''}`}
          disabled={loading || code.length !== 6}
        >
          {loading ? '' : 'Verifica Codice'}
        </button>
      </form>

      <div className="resend-section">
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>
          Non hai ricevuto il codice?
        </p>
        
        <button
          type="button"
          onClick={handleResendCode}
          className="link-button"
          disabled={resendTimer > 0 || resendLoading}
        >
          {resendLoading ? 'Invio in corso...' : 
           resendTimer > 0 ? `Reinvia codice (${resendTimer}s)` : 
           'Reinvia codice'}
        </button>

        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            onClick={onBackToAuth}
            className="link-button"
          >
            ← Torna al {purposeText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;