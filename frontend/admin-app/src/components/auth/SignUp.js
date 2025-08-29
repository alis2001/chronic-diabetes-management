// frontend/admin-app/src/components/auth/SignUp.js
// Professional SignUp Component - Gesan Healthcare - WITH EMAIL PREFILL SUPPORT
// Supports prefilled email from login redirection for better UX

import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api';
import '../../auth.css';

const SignUp = ({ initialEmail = '', onSwitchToLogin, onSignUpSuccess, onError }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    username: '',
    email: initialEmail,
    password: '',
    role: 'analyst'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update email if initialEmail changes (from redirection)
  useEffect(() => {
    if (initialEmail) {
      setFormData(prev => ({ 
        ...prev, 
        email: initialEmail,
        // ✅ AUTO-GENERATE USERNAME from email if email is prefilled
        username: prev.username || initialEmail.split('@')[0].replace('.', '_')
      }));
    }
  }, [initialEmail]);

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

    // Basic validation
    if (!formData.nome.trim() || !formData.cognome.trim()) {
      const errorMsg = 'Nome e cognome sono richiesti';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!formData.username.trim()) {
      const errorMsg = 'Username è richiesto';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (formData.password.length < 8) {
      const errorMsg = 'Password deve essere almeno 8 caratteri';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('📝 Signup attempt:', formData.email);
      
      // REAL API CALL - SignUp user
      const response = await authAPI.signUp(formData);

      console.log('✅ Signup response:', response);
      
      if (response.success) {
        console.log('🎉 Signup successful for:', formData.email);
        onSignUpSuccess(formData.email, formData.nome, formData.cognome);
      } else {
        const errorMsg = response.error || 'Errore durante la registrazione';
        console.error('❌ Signup failed:', errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      
      let errorMsg;
      if (error.status === 400) {
        errorMsg = error.message || 'Dati non validi';
      } else if (error.status === 409) {
        errorMsg = 'Un utente con questa email o username esiste già';
      } else if (error.status === 500) {
        errorMsg = 'Errore interno del server';
      } else if (error.status === 0) {
        errorMsg = 'Impossibile contattare il server. Verificare la connessione.';
      } else {
        errorMsg = error.message || 'Errore di connessione';
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
        <h1 className="auth-title">Registrati</h1>
        <p className="auth-subtitle">Sistema Gestione Diabetes Cronico</p>
        <div className="company-badge">Gesan Healthcare Systems</div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* ✅ NEW: Show helpful message if email is prefilled */}
      {initialEmail && (
        <div className="alert alert-info" style={{ 
          backgroundColor: '#e0f2fe',
          borderColor: '#0288d1',
          color: '#01579b',
          marginBottom: '20px'
        }}>
          <span className="alert-icon">ℹ️</span>
          Email precompilata dalla pagina di accesso. Completa la registrazione.
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label required">Nome</label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            className="form-input"
            placeholder="Nome"
            required
            disabled={loading}
            autoComplete="given-name"
          />
        </div>

        <div className="form-group">
          <label className="form-label required">Cognome</label>
          <input
            type="text"
            value={formData.cognome}
            onChange={(e) => handleInputChange('cognome', e.target.value)}
            className="form-input"
            placeholder="Cognome"
            required
            disabled={loading}
            autoComplete="family-name"
          />
        </div>

        <div className="form-group">
          <label className="form-label required">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            className="form-input"
            placeholder="username_senza_punti"
            required
            disabled={loading}
            autoComplete="username"
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Solo lettere, numeri e underscore (_)
          </small>
        </div>

        <div className="form-group">
          <label className="form-label required">Email aziendale</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`form-input ${initialEmail ? 'prefilled' : ''}`}
            placeholder="nome.cognome@gesan.it"
            required
            disabled={loading}
            autoComplete="email"
            style={initialEmail ? { 
              backgroundColor: '#f0f9ff', 
              borderColor: '#0284c7' 
            } : {}}
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Deve terminare con @gesan.it
          </small>
        </div>

        <div className="form-group">
          <label className="form-label required">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="form-input password-input"
            placeholder="Password sicura (min 8 caratteri)"
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Minimo 8 caratteri con maiuscole, minuscole e numeri
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Ruolo</label>
          <select
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className="form-input"
            disabled={loading}
          >
            <option value="analyst">Analista</option>
            <option value="manager">Manager</option>
            <option value="admin">Amministratore</option>
          </select>
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Admin: accesso completo, Manager: gestione utenti, Analyst: solo lettura
          </small>
        </div>

        <button 
          type="submit" 
          className={`auth-button ${loading ? 'loading' : ''}`}
          disabled={loading}
        >
          {loading ? (
            <span>
              <span className="spinner"></span>
              Registrazione...
            </span>
          ) : (
            'Registrati'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="link-button"
          disabled={loading}
        >
          Hai già un account? Accedi
        </button>
      </form>
      
      <div className="auth-info" style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          💡 Dopo la registrazione riceverai un codice di verifica via email
        </p>
      </div>
    </div>
  );
};

export default SignUp;