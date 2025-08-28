// frontend/timeline-app/src/index.js
// Complete Timeline Application with Fixed Logic - Apple-Inspired Design

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { timelineAPI } from './api';
import { 
  Header, 
  PatientLookup, 
  PatientRegistration, 
  PatientTimeline, 
  ScheduleAppointment 
} from './components';
import { styles, globalStyles } from './styles';

// Application States
const APP_STATES = {
  LOOKUP: 'lookup',
  REGISTER: 'register',
  TIMELINE: 'timeline',
  SCHEDULE: 'schedule'
};

// Main Timeline Application
const TimelineApp = () => {
  // Application State
  const [currentState, setCurrentState] = useState(APP_STATES.LOOKUP);
  const [serviceHealth, setServiceHealth] = useState(null);
  
  // Data State
  const [lookupResult, setLookupResult] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [error, setError] = useState(null);

  // Service health monitoring
  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServiceHealth = async () => {
    try {
      const health = await timelineAPI.health();
      setServiceHealth(health);
      
      // Clear network errors if service is back online
      if (health.status === 'healthy' && error?.status === 0) {
        setError(null);
      }
    } catch (error) {
      setServiceHealth({ 
        status: 'unhealthy', 
        database_status: 'errore',
        error: error.message 
      });
      console.warn('Service health check failed:', error.message);
    }
  };

  // ================================
  // EVENT HANDLERS
  // ================================

  const handlePatientFound = (result, formData) => {
    setLookupResult(result);
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentState(APP_STATES.TIMELINE);
    setError(null);
    
    console.log('✅ Patient found and loaded:', result);
  };

  const handlePatientNotFound = (result, formData) => {
    setLookupResult(result);
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentState(APP_STATES.REGISTER);
    setError(null);
    
    console.log('⚠️ Patient not found, registration required:', result);
  };

  const handleRegistrationSuccess = (result, formData) => {
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentState(APP_STATES.TIMELINE);
    setError(null);
    
    console.log('✅ Patient registration successful:', result);
  };

  const handleScheduleAppointment = (patientId, doctorId) => {
    // Additional validation before allowing scheduling
    if (!patientId || !doctorId) {
      setError({ error: 'Dati paziente non validi per la programmazione' });
      return;
    }
    
    setCurrentState(APP_STATES.SCHEDULE);
    console.log('📅 Starting appointment scheduling for:', patientId);
  };

  const handleScheduleSuccess = () => {
    setCurrentState(APP_STATES.TIMELINE);
    
    // Show success feedback
    setTimeout(() => {
      console.log('✅ Appointment scheduled successfully, returning to timeline');
    }, 100);
  };

  const handleScheduleCancel = () => {
    setCurrentState(APP_STATES.TIMELINE);
    console.log('❌ Appointment scheduling cancelled');
  };

  const handleError = (errorData) => {
    setError(errorData);
    console.error('🚨 Application error:', errorData);
    
    // Enhanced error handling
    if (errorData.status === 0) {
      setError({
        ...errorData,
        suggestion: 'Verificare la connessione di rete e lo stato del servizio'
      });
    } else if (errorData.status === 500) {
      setError({
        ...errorData,
        suggestion: 'Errore interno del server. Riprovare più tardi.'
      });
    } else if (errorData.status === 403) {
      setError({
        ...errorData,
        suggestion: 'Accesso negato. Verificare le credenziali del medico.'
      });
    }
  };

  const handleReset = () => {
    setCurrentState(APP_STATES.LOOKUP);
    setLookupResult(null);
    setPatientData(null);
    setError(null);
    
    console.log('🔄 Application reset to initial state');
  };

  const handleRetry = () => {
    setError(null);
    checkServiceHealth();
    console.log('🔄 Retrying operation...');
  };

  // ================================
  // RENDER APPLICATION
  // ================================

  return (
    <div style={styles.container}>
      <Header serviceHealth={serviceHealth} />
      
      {/* Global Error Display */}
      {error && (
        <AppleErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Progress Indicator */}
      {currentState !== APP_STATES.LOOKUP && (
        <ProgressIndicator 
          currentState={currentState} 
          patientData={patientData}
          onReset={handleReset}
        />
      )}

      {/* Main Application Flow */}
      {currentState === APP_STATES.LOOKUP && (
        <PatientLookup
          onPatientFound={handlePatientFound}
          onPatientNotFound={handlePatientNotFound}
          onError={handleError}
        />
      )}

      {currentState === APP_STATES.REGISTER && (
        <>
          <PatientRegistration
            lookupResult={lookupResult}
            formData={patientData}
            onRegistrationSuccess={handleRegistrationSuccess}
            onError={handleError}
          />
          <ActionButtons onReset={handleReset} />
        </>
      )}

      {currentState === APP_STATES.TIMELINE && patientData && (
        <>
          <PatientTimeline
            patientId={patientData.cf_paziente}
            doctorId={patientData.id_medico}
            onScheduleAppointment={handleScheduleAppointment}
          />
          <ActionButtons onReset={handleReset} />
        </>
      )}

      {currentState === APP_STATES.SCHEDULE && patientData && (
        <>
          <ScheduleAppointment
            patientId={patientData.cf_paziente}
            doctorId={patientData.id_medico}
            onSuccess={handleScheduleSuccess}
            onCancel={handleScheduleCancel}
          />
        </>
      )}

      {/* Application Footer */}
      <AppFooter serviceHealth={serviceHealth} />
    </div>
  );
};

// ================================
// APPLE-STYLE ERROR COMPONENT
// ================================

const AppleErrorDisplay = ({ error, onRetry, onDismiss }) => (
  <div style={{
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    border: '1px solid',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '25px',
    backdropFilter: 'blur(20px)',
    position: 'relative'
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      gap: '20px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '20px',
            color: '#ff3b30'
          }}>
            ⚠️
          </span>
          <h4 style={{ 
            margin: 0, 
            color: '#ff3b30',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Errore Sistema
          </h4>
        </div>
        
        <p style={{ 
          margin: '0 0 12px 0',
          color: '#1d1d1f',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {error.error}
        </p>
        
        {error.status && error.status !== 0 && (
          <p style={{ 
            margin: '0 0 12px 0',
            color: '#86868b',
            fontSize: '14px'
          }}>
            <strong>Codice:</strong> {error.status}
          </p>
        )}
        
        {error.suggestion && (
          <p style={{ 
            margin: '0',
            color: '#86868b',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            <strong>Suggerimento:</strong> {error.suggestion}
          </p>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {(error.status === 0 || error.status >= 500) && (
          <button 
            onClick={onRetry} 
            style={{
              ...styles.secondaryButton,
              padding: '10px 16px',
              fontSize: '14px'
            }}
          >
            Riprova
          </button>
        )}
        <button 
          onClick={onDismiss} 
          style={{
            ...styles.appleCloseButton,
            position: 'static',
            width: '28px',
            height: '28px',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  </div>
);

// ================================
// PROGRESS INDICATOR
// ================================

const ProgressIndicator = ({ currentState, patientData, onReset }) => {
  const getStepInfo = (state) => {
    switch(state) {
      case APP_STATES.REGISTER:
        return { step: 2, title: 'Registrazione Paziente', icon: '📝' };
      case APP_STATES.TIMELINE:
        return { step: 3, title: 'Timeline Paziente', icon: '📋' };
      case APP_STATES.SCHEDULE:
        return { step: 4, title: 'Nuovo Appuntamento', icon: '📅' };
      default:
        return { step: 1, title: 'Ricerca', icon: '🔍' };
    }
  };

  const currentStep = getStepInfo(currentState);

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '25px',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(20px)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '24px' }}>{currentStep.icon}</span>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#1d1d1f',
              marginBottom: '4px'
            }}>
              Passo {currentStep.step}: {currentStep.title}
            </div>
            {patientData && (
              <div style={{
                fontSize: '14px',
                color: '#86868b'
              }}>
                Paziente: {patientData.cf_paziente}
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={onReset} 
          style={{
            ...styles.secondaryButton,
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          Nuovo Paziente
        </button>
      </div>
    </div>
  );
};

// ================================
// ACTION BUTTONS
// ================================

const ActionButtons = ({ onReset }) => (
  <div style={{
    textAlign: 'center',
    marginTop: '30px',
    padding: '25px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)'
  }}>
    <h4 style={{
      margin: '0 0 20px 0',
      color: '#1d1d1f',
      fontSize: '18px',
      fontWeight: '600'
    }}>
      Azioni Disponibili
    </h4>
    
    <div style={{ 
      display: 'flex', 
      gap: '15px', 
      justifyContent: 'center', 
      flexWrap: 'wrap' 
    }}>
      <button onClick={onReset} style={styles.primaryButton}>
        Cerca Nuovo Paziente
      </button>
      
      <button 
        onClick={() => window.location.reload()} 
        style={styles.secondaryButton}
      >
        Ricarica Applicazione
      </button>
    </div>
  </div>
);

// ================================
// MINIMAL FOOTER
// ================================

const AppFooter = ({ serviceHealth }) => (
  <footer style={{
    marginTop: '60px',
    padding: '25px',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  }}>
    <p style={{
      margin: '0 0 15px 0',
      fontSize: '16px',
      fontWeight: '600',
      color: '#1d1d1f'
    }}>
      Sistema Timeline Paziente
    </p>
    
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '30px',
      flexWrap: 'wrap',
      marginBottom: '15px'
    }}>
      <a 
        href="http://localhost:8080/docs" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          color: '#007aff',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          ':hover': { textDecoration: 'underline' }
        }}
      >
        API Gateway
      </a>
      
      <a 
        href="http://localhost:8001/docs" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          color: '#007aff',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        Timeline API
      </a>
    </div>
    
    <div style={{
      fontSize: '12px',
      color: '#86868b',
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      flexWrap: 'wrap'
    }}>
      <span>
        Servizio: <strong style={{
          color: serviceHealth?.status === 'healthy' ? '#10b981' : '#ff3b30'
        }}>
          {serviceHealth?.status === 'healthy' ? 'Online' : 'Offline'}
        </strong>
      </span>
      
      <span>Timeline v2.0.0</span>
      
      <span>Build {new Date().toISOString().split('T')[0]}</span>
    </div>
  </footer>
);

// ================================
// APPLY GLOBAL STYLES
// ================================

const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// ================================
// ERROR BOUNDARY
// ================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          ...styles.container,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}>
          <div style={{
            ...styles.card,
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#ff3b30', marginBottom: '20px' }}>
              Errore Applicazione
            </h2>
            <p style={{ marginBottom: '20px', color: '#86868b' }}>
              Si è verificato un errore imprevisto nell'applicazione.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={styles.primaryButton}
            >
              Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ================================
// INITIALIZE REACT APP
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <TimelineApp />
  </ErrorBoundary>
);

// ================================
// DEVELOPMENT LOGGING
// ================================

console.log('🚀 Timeline Service Application Loaded');
console.log('📡 API Gateway URL:', process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080');
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('📅 Build Date:', new Date().toISOString());

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  window.timelineApp = {
    version: '2.0.0',
    buildDate: new Date().toISOString(),
    apiUrl: process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080'
  };
}

// Service worker registration (optional - for production PWA features)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}