// frontend/admin-app/src/components/auth/SignUp.js
// Professional SignUp Component - Gesan Healthcare

import React, { useState } from 'react';
import '../../auth.css';

const SignUp = ({ onSwitchToLogin, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    username: '',
    email: '',
    password: '',
    role: 'analyst'
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
      setError('Email deve essere del dominio aziendale @gesan.it');
      return;
    }

    setLoading(true);
    try {
      // API call will be implemented next
      console.log('SignUp attempt:', formData);
      // const response = await authAPI.signUp(formData);
      // if (response.success) {
      //   onSignUpSuccess(formData.email, formData.nome, formData.cognome);
      // }
      
      // Temporary success simulation
      setTimeout(() => {
        onSignUpSuccess(formData.email, formData.nome, formData.cognome);
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      setError(error.message || 'Errore durante la registrazione');
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">🏥</div>
        <h1 className="auth-title">Registrazione Admin</h1>
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
        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="form-input"
              placeholder="Mario"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label required">Cognome</label>
            <input
              type="text"
              value={formData.cognome}
              onChange={(e) => handleInputChange('cognome', e.target.value)}
              className="form-input"
              placeholder="Rossi"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label required">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
            className="form-input"
            placeholder="mario.rossi"
            required
            disabled={loading}
          />
        </div>

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
          />
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
          />
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
        </div>

        <button 
          type="submit" 
          className={`auth-button ${loading ? 'loading' : ''}`}
          disabled={loading}
        >
          {loading ? '' : 'Registrati'}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="link-button"
        >
          Hai già un account? Accedi
        </button>
      </form>
    </div>
  );
};

export default SignUp;