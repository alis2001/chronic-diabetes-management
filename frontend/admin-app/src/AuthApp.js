// frontend/admin-app/src/AuthApp.js
// Main Authentication Coordinator - Gesan Healthcare
// Handles complete auth flow: signup → email verification → login → dashboard

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
  };

  // Handle login request - requires email verification  
  const handleLoginRequireVerification = async (email, password) => {
    console.log('🔐 Login requested, switching to verification');
    setTempData({ email, password });
    setCurrentView('verify-login');
    setError('');
  };

  // Handle email verification success
  const handleVerificationSuccess = async (verificationData) => {
    try {
      console.log('✅ Email verification successful');
      
      if (currentView === 'verify-signup') {
        // User completed signup verification
        console.log('🎉 Signup process completed');
        setUser({
          email: tempData.email,
          nome: tempData.nome,
          cognome: tempData.cognome,
          role: 'analyst', // Default, will be updated by backend
          username: tempData.email.split('@')[0]
        });
        onAuthSuccess({
          email: tempData.email,
          nome: tempData.nome,
          cognome: tempData.cognome,
          role: 'analyst',
          username: tempData.email.split('@')[0]
        });
        
      } else if (currentView === 'verify-login') {
        // User completed login verification
        console.log('🎉 Login process completed');
        setUser({
          email: tempData.email,
          role: 'analyst', // Will be updated by backend
          username: tempData.email.split('@')[0]
        });
        onAuthSuccess({
          email: tempData.email,
          role: 'analyst',
          username: tempData.email.split('@')[0]
        });
      }
      
      // Clear temp data
      setTempData({ email: '', nome: '', cognome: '', password: '' });
      
    } catch (error) {
      console.error('❌ Verification completion error:', error);
      setError('Errore durante il completamento della verifica');
    }
  };

  // Navigation handlers
  const handleSwitchToLogin = () => {
    console.log('🔄 Switching to login view');
    setCurrentView('login');
    setTempData({ email: '', nome: '', cognome: '', password: '' });
    setError('');
  };

  const handleSwitchToSignUp = () => {
    console.log('🔄 Switching to signup view');
    setCurrentView('signup');
    setTempData({ email: '', nome: '', cognome: '', password: '' });
    setError('');
  };

  const handleBackToAuth = () => {
    console.log('🔄 Going back to auth');
    if (currentView === 'verify-signup') {
      setCurrentView('signup');
    } else if (currentView === 'verify-login') {
      setCurrentView('login');
    }
    setError('');
  };

  // Global error handler
  const handleError = (errorMessage) => {
    console.error('❌ Auth error:', errorMessage);
    setError(errorMessage);
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

  // Global error display
  const ErrorDisplay = () => error && (
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

  // Render appropriate view
  return (
    <div className="auth-container">
      {currentView === 'login' && (
        <div>
          <ErrorDisplay />
          <Login
            onSwitchToSignUp={handleSwitchToSignUp}
            onLoginRequireVerification={handleLoginRequireVerification}
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'signup' && (
        <div>
          <ErrorDisplay />
          <SignUp
            onSwitchToLogin={handleSwitchToLogin}
            onSignUpSuccess={handleSignUpSuccess}
            onError={handleError}
          />
        </div>
      )}

      {currentView === 'verify-signup' && (
        <div>
          <ErrorDisplay />
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
          <ErrorDisplay />
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