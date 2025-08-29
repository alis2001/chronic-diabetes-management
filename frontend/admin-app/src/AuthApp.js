// frontend/admin-app/src/AuthApp.js
// Main Authentication Coordinator - Gesan Healthcare - WITH USER REDIRECTION
// Handles complete auth flow: signup → email verification → login → dashboard + smart redirection

import React, { useState, useEffect } from 'react';
import { SignUp, Login, EmailVerification } from './components/auth';
import { authAPI } from './api';
import './auth.css';

const AuthApp = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'signup', 'verify-signup', 'verify-login'
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tempData, setTempData] = useState({
    email: '',
    nome: '',
    cognome: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(''); // ✅ NEW: For helpful messages

  // Check existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('🔍 Checking for existing session...');
      const response = await authAPI.checkSession();
      
      if (response.authenticated && response.user) {
        console.log('✅ Found existing session:', response.user);
        setUser(response.user);
        onAuthSuccess(response.user);
        return;
      }
    } catch (error) {
      console.log('ℹ️ No existing session found');
    }
    setLoading(false);
  };

  // Handle signup success - requires email verification
  const handleSignUpSuccess = async (email, nome, cognome) => {
    console.log('📝 Signup successful, switching to verification');
    setTempData({ email, nome, cognome });
    setCurrentView('verify-signup');
    setError('');
    setInfoMessage('');
  };

  // Handle login request - requires email verification  
  const handleLoginRequireVerification = async (email, password) => {
    console.log('🔐 Login requested, switching to verification');
    setTempData({ email, password });
    setCurrentView('verify-login');
    setError('');
    setInfoMessage('');
  };

  // ✅ NEW: Handle user not found - redirect to signup
  const handleUserNotFound = (email, errorMessage) => {
    console.log('🔄 User not found, redirecting to signup with prefilled email');
    setTempData({ email, nome: '', cognome: '', password: '' });
    setCurrentView('signup');
    setError('');
    setInfoMessage(`${errorMessage} Email precompilata per la registrazione.`);
  };

  // ✅ NEW: Handle account pending - redirect to verification
  const handleAccountPending = (email, errorMessage) => {
    console.log('📧 Account pending verification, switching to verification');
    setTempData({ email, nome: '', cognome: '', password: '' });
    setCurrentView('verify-signup');
    setError('');
    setInfoMessage(errorMessage);
  };

  // Handle email verification success
  const handleVerificationSuccess = async (verificationData) => {
    try {
      console.log('✅ Email verification successful');
      
      if (currentView === 'verify-signup') {
        // User completed signup verification
        console.log('🎉 Signup process completed, switching to login');
        setUser(null);
        setCurrentView('login');
        setTempData({ email: tempData.email, nome: '', cognome: '', password: '' });
        setInfoMessage('✅ Account attivato con successo! Ora puoi effettuare l\'accesso.');
        
      } else if (currentView === 'verify-login') {
        // User completed login verification - create session
        console.log('🎉 Login process completed');
        const userData = {
          email: verificationData.email,
          access_token: verificationData.access_token,
          user_info: verificationData.user_info,
          role: verificationData.user_info?.role || 'analyst'
        };
        setUser(userData);
        onAuthSuccess(userData);
      }
      
      setError('');
      
    } catch (error) {
      console.error('❌ Verification completion error:', error);
      setError('Errore durante il completamento della verifica');
    }
  };

  // Navigation handlers
  const handleSwitchToLogin = () => {
    console.log('🔄 Switching to login view');
    setCurrentView('login');
    setTempData({ email: tempData.email || '', nome: '', cognome: '', password: '' });
    setError('');
    setInfoMessage('');
  };

  const handleSwitchToSignUp = () => {
    console.log('🔄 Switching to signup view');
    setCurrentView('signup');
    setTempData({ email: tempData.email || '', nome: '', cognome: '', password: '' });
    setError('');
    setInfoMessage('');
  };

  const handleBackToAuth = () => {
    console.log('🔄 Going back to auth');
    if (currentView === 'verify-signup') {
      setCurrentView('signup');
    } else if (currentView === 'verify-login') {
      setCurrentView('login');
    }
    setError('');
    setInfoMessage('');
  };

  // Global error handler
  const handleError = (errorMessage) => {
    console.error('❌ Auth error:', errorMessage);
    setError(errorMessage);
    setInfoMessage('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🏥</div>
            <h1 className="auth-title">Caricamento...</h1>
            <p className="auth-subtitle">Sistema Gestione Diabetes Cronico</p>
            <div className="company-badge">Gesan Healthcare Systems</div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f4f6',
              borderRadius: '50%',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px 0'
            }} />
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Controllo sessione esistente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ IMPROVED: Global message display
  const MessageDisplay = () => {
    if (error) {
      return (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          {error}
          <button 
            onClick={() => setError('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      );
    }
    
    if (infoMessage) {
      return (
        <div className="alert alert-info" style={{ 
          marginBottom: '20px',
          backgroundColor: '#e0f2fe',
          borderColor: '#0288d1',
          color: '#01579b'
        }}>
          <span className="alert-icon">ℹ️</span>
          {infoMessage}
          <button 
            onClick={() => setInfoMessage('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#01579b',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      );
    }
    
    return null;
  };

  // Render appropriate view
  return (
    <div className="auth-container">
      {currentView === 'login' && (
        <div>
          <MessageDisplay />
          <Login
            initialEmail={tempData.email} // ✅ NEW: Prefill email
            onSwitchToSignUp={handleSwitchToSignUp}
            onLoginRequireVerification={handleLoginRequireVerification}
            onUserNotFound={handleUserNotFound} // ✅ NEW: Handle user not found
            onAccountPending={handleAccountPending} // ✅ NEW: Handle pending account
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'signup' && (
        <div>
          <MessageDisplay />
          <SignUp
            initialEmail={tempData.email} // ✅ NEW: Prefill email
            onSwitchToLogin={handleSwitchToLogin}
            onSignUpSuccess={handleSignUpSuccess}
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'verify-signup' && (
        <div>
          <MessageDisplay />
          <EmailVerification
            email={tempData.email}
            nome={tempData.nome}
            cognome={tempData.cognome}
            purpose="signup"
            onVerificationSuccess={handleVerificationSuccess}
            onBackToAuth={handleBackToAuth}
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'verify-login' && (
        <div>
          <MessageDisplay />
          <EmailVerification
            email={tempData.email}
            purpose="login"
            onVerificationSuccess={handleVerificationSuccess}
            onBackToAuth={handleBackToAuth}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
};

export default AuthApp;