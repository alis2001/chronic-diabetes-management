// frontend/admin-app/src/components/auth/Login.js
// Professional Login Component - Gesan Healthcare

import React, { useState } from 'react';
import '../../auth.css';

const Login = ({ onSwitchToSignUp, onLoginRequireVerification }) => {
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
      setError('Email deve essere del dominio aziendale @gesan.it');
      return;
    }

    setLoading(true);
    try {
      // API call will be implemented
      console.log('Login attempt:', formData);
      // const response = await authAPI.requestLoginCode(formData);
      // if (response.success) {
      //   onLoginRequireVerification(formData.email, formData.password);
      // }
      
      // Temporary simulation - require verification
      setTimeout(() => {
        onLoginRequireVerification(formData.email, formData.password);
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      setError(error.message || 'Errore durante l\'accesso');
      setLoading(false);
    }
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
          {loading ? '' : 'Accedi'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="link-button"
          >
            Non hai un account? Registrati
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;