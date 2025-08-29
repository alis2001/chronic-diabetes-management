// frontend/admin-app/src/AuthApp.js
// Main Authentication Coordinator - FIXED SESSION MANAGEMENT
// Handles complete auth flow with proper token persistence and session restoration

import React, { useState, useEffect } from 'react';
import { SignUp, Login, EmailVerification } from './components/auth';
import { authAPI, sessionStorage } from './api';
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
  const [infoMessage, setInfoMessage] = useState('');

  // Check existing session on mount - FIXED VERSION
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('🔍 AuthApp: Checking for existing session...');
      
      // Use the fixed session checking method
      const sessionResult = await authAPI.checkSession();
      
      if (sessionResult.authenticated && sessionResult.user) {
        console.log('✅ AuthApp: Found existing session:', sessionResult.user);
        setUser(sessionResult.user);
        onAuthSuccess(sessionResult.user);
        return;
      } else {
        console.log('ℹ️ AuthApp: No existing session found');
      }
    } catch (error) {
      console.log('⚠️ AuthApp: Session check failed:', error);
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

  // Handle user not found - redirect to signup
  const handleUserNotFound = (email, errorMessage) => {
    console.log('🔄 User not found, redirecting to signup');
    setTempData(prev => ({ ...prev, email }));
    setCurrentView('signup');
    setError('');
    setInfoMessage(`Account non trovato per ${email}. Crea un nuovo account.`);
  };

  // Handle account pending - redirect to verification
  const handleAccountPending = (email, errorMessage) => {
    console.log('⏳ Account pending verification, redirecting to verification');
    setTempData(prev => ({ ...prev, email }));
    setCurrentView('verify-signup');
    setError('');
    setInfoMessage(`Account ${email} necessita verifica email. Controlla la tua casella di posta.`);
  };

  // Handle verification success
  const handleVerificationSuccess = async (verificationData) => {
    try {
      console.log('✅ Verification successful:', verificationData);
      
      if (currentView === 'verify-signup') {
        // User completed signup verification - switch to login
        console.log('📧 Email verificata, ora puoi effettuare l\'accesso');
        setCurrentView('login');
        setTempData(prev => ({ ...prev, email: verificationData.email, password: '' }));
        setError('');
        setInfoMessage('Email verificata con successo! Ora puoi effettuare l\'accesso.');
        
      } else if (currentView === 'verify-login') {
        // User completed login verification - session should be created
        console.log('🎉 Login process completed successfully');
        
        // The session token should already be stored by the login API call
        // Let's verify the session was properly stored
        const sessionCheck = await authAPI.checkSession();
        
        if (sessionCheck.authenticated && sessionCheck.user) {
          console.log('✅ Session confirmed after login verification');
          const userData = {
            ...sessionCheck.user,
            access_token: verificationData.access_token
          };
          setUser(userData);
          onAuthSuccess(userData);
        } else {
          console.error('❌ Session not found after successful verification');
          setError('Errore durante la creazione della sessione. Riprova.');
        }
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
    setTempData(prev => ({ ...prev, password: '' }));
    setError('');
    setInfoMessage('');
  };

  const handleSwitchToSignUp = () => {
    console.log('🔄 Switching to signup view');
    setCurrentView('signup');
    setTempData(prev => ({ ...prev, nome: '', cognome: '', password: '' }));
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

  // Message display component
  const MessageDisplay = () => {
    if (error) {
      return (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button 
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              marginLeft: 'auto',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
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
        <div className="info-message" style={{ marginBottom: '20px' }}>
          <span>ℹ️</span>
          <span>{infoMessage}</span>
          <button 
            onClick={() => setInfoMessage('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              marginLeft: 'auto',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
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

  // Loading state - enhanced design
  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🏥</div>
            <h1 className="auth-title">Controllo Sessione</h1>
            <p className="auth-subtitle">Verifica autenticazione in corso...</p>
          </div>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Caricamento...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate view
  return (
    <div className="auth-container">
      {currentView === 'login' && (
        <div>
          <MessageDisplay />
          <Login
            initialEmail={tempData.email}
            onSwitchToSignUp={handleSwitchToSignUp}
            onLoginRequireVerification={handleLoginRequireVerification}
            onUserNotFound={handleUserNotFound}
            onAccountPending={handleAccountPending}
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'signup' && (
        <div>
          <MessageDisplay />
          <SignUp
            initialEmail={tempData.email}
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