// frontend/admin-app/src/components/auth/Login.js
// Professional Login Component - Gesan Healthcare - WITH SMART USER REDIRECTION
// Handles user not found, account pending, and other error states with proper UX

import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api';
import '../../auth.css';

const Login = ({ 
  initialEmail = '', 
  onSwitchToSignUp, 
  onLoginRequireVerification, 
  onUserNotFound, 
  onAccountPending, 
  onError 
}) => {
  const [formData, setFormData] = useState({
    email: initialEmail,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update email if initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setFormData(prev => ({ ...prev, email: initialEmail }));
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
        // 🔥 2FA DISABLED CHECK
        if (response.verification_required === false && response.access_token) {
          // Direct login without 2FA - session created immediately
          console.log('✅ Direct login successful (2FA disabled)');
          
          // Store session token using imported sessionStorage
          const { sessionStorage } = await import('../../api');
          sessionStorage.setToken(response.access_token);
          sessionStorage.setUser(response.user_info);
          
          // Trigger auth success callback from parent
          // This needs to be passed as a prop to Login component
          console.log('🎉 Notifying parent of successful authentication');
          
          // Reload page to trigger main app with authenticated session
          window.location.reload();
          
          return; // Exit - don't show verification screen
        }
        
        // Original 2FA flow (if verification_required === true)
        console.log('📧 Verification code sent to:', formData.email);
        onLoginRequireVerification(formData.email, formData.password);
      } else {
        // ✅ IMPROVED: Handle specific error types with smart redirection
        const errorType = response.error_type;
        const errorMsg = response.error || 'Errore durante la richiesta di accesso';
        
        console.log('❌ Login request failed:', errorType, errorMsg);
        
        switch (errorType) {
          case 'user_not_found':
            // User doesn't exist - redirect to signup
            console.log('🔄 User not found, redirecting to signup');
            if (onUserNotFound) {
              onUserNotFound(formData.email, errorMsg);
            } else {
              // Fallback: switch to signup manually
              onSwitchToSignUp();
            }
            break;
            
          case 'account_pending':
            // Account exists but not verified - redirect to verification
            console.log('📧 Account pending verification');
            if (onAccountPending) {
              onAccountPending(formData.email, errorMsg);
            } else {
              setError(errorMsg);
              if (onError) onError(errorMsg);
            }
            break;
            
          case 'account_inactive':
            // Account suspended/deactivated
            console.log('🚫 Account inactive');
            setError(errorMsg);
            if (onError) onError(errorMsg);
            break;
            
          case 'invalid_password':
            // Wrong password
            console.log('🔑 Invalid password');
            setError(errorMsg);
            if (onError) onError(errorMsg);
            break;
            
          default:
            // Generic error
            console.error('❌ Generic login error:', errorMsg);
            setError(errorMsg);
            if (onError) onError(errorMsg);
            break;
        }
      }
      
    } catch (error) {
      console.error('❌ Login request error:', error);
      
      let errorMsg;
      
      // ✅ IMPROVED: Handle structured error responses from API
      if (error.details && error.details.error_type) {
        const errorType = error.details.error_type;
        
        switch (errorType) {
          case 'user_not_found':
            console.log('🔄 User not found (from API error), redirecting to signup');
            if (onUserNotFound) {
              onUserNotFound(formData.email, error.message);
              return;
            }
            break;
            
          case 'account_pending':
            console.log('📧 Account pending (from API error)');
            if (onAccountPending) {
              onAccountPending(formData.email, error.message);
              return;
            }
            break;
            
          default:
            errorMsg = error.message || 'Errore durante la richiesta';
            break;
        }
      } else {
        // Handle HTTP status codes
        switch (error.status) {
          case 400:
            errorMsg = error.message || 'Credenziali non valide';
            break;
          case 401:
            errorMsg = 'Non autorizzato. Verifica le credenziali.';
            break;
          case 404:
            errorMsg = 'Servizio di autenticazione non disponibile';
            break;
          case 500:
            errorMsg = 'Errore interno del server';
            break;
          case 0:
            errorMsg = 'Impossibile contattare il server. Verificare la connessione.';
            break;
          default:
            errorMsg = error.message || 'Errore di connessione';
            break;
        }
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
        <h1 className="auth-title">Accedi</h1>
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
          <label className="form-label required">Email aziendale</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="form-input"
            placeholder="nome.cognome@gesan.it"
            required
            disabled={loading}
            autoComplete="username"
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
            className="form-input"
            placeholder="Password"
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
              Accesso...
            </span>
          ) : (
            'Accedi'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="link-button"
          disabled={loading}
        >
          Non hai un account? Registrati
        </button>
      </form>
      
      <div className="auth-info" style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          🔓 Autenticazione diretta con email e password
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
          2FA disabilitato per questo ambiente
        </p>
      </div>
    </div>
  );
};

export default Login;