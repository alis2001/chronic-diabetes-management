// frontend/admin-app/src/components/auth/Login.js
// Professional Login Component - Gesan Healthcare - UPDATED WITH REAL API

import React, { useState } from 'react';
import { authAPI } from '../../api';
import '../../auth.css';

const Login = ({ onSwitchToSignUp, onLoginRequireVerification, onError }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email domain
    if (!formData.email.toLowerCase().endsWith('@gesan.it')) {
      const errorMsg = 'Email deve essere del dominio aziendale @gesan.it';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!formData.password) {
      const errorMsg = 'Password richiesta';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Login attempt:', formData.email);
      
      // REAL API CALL - Request login (sends verification code to email)
      const response = await authAPI.requestLoginCode({
        email: formData.email,
        password: formData.password
      });

      console.log('✅ Login request response:', response);
      
      if (response.success) {
        // Success - verification code sent
        console.log('📧 Verification code sent to:', formData.email);
        onLoginRequireVerification(formData.email, formData.password);
      } else {
        const errorMsg = response.error || 'Errore durante la richiesta di accesso';
        console.error('❌ Login request failed:', errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Login request error:', error);
      
      let errorMsg;
      if (error.status === 400) {
        errorMsg = error.message || 'Credenziali non valide';
      } else if (error.status === 404) {
        errorMsg = 'Servizio di autenticazione non disponibile';
      } else if (error.status === 500) {
        errorMsg = 'Errore interno del server';
      } else if (error.status === 0) {
        errorMsg = 'Impossibile contattare il server. Verificare la connessione.';
      } else {
        errorMsg = error.message || 'Errore durante l\'accesso';
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">🏥</div>
        <h1 className="auth-title">Accesso Admin</h1>
        <p className="auth-subtitle">Sistema Gestione Diabetes Cronico</p>
        <div className="company-badge">Gesan Healthcare Systems</div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label required">Email Aziendale</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
            className="form-input email-input"
            placeholder="mario.rossi@gesan.it"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label required">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="form-input password-input"
            placeholder="La tua password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button 
          type="submit" 
          className={`auth-button ${loading ? 'loading' : ''}`}
          disabled={loading}
        >
          {loading ? (
            <span>
              <span className="spinner"></span>
              Invio codice...
            </span>
          ) : (
            'Accedi'
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="link-button"
            disabled={loading}
          >
            Non hai un account? Registrati
          </button>
        </div>
      </form>
      
      <div className="auth-info" style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          💡 Inserendo email e password riceverai un codice di verifica via email
        </p>
      </div>
    </div>
  );
};

export default Login;