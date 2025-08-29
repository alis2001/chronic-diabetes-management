// frontend/timeline-app/src/index.js
// Complete Multi-Doctor Timeline Application with Fixed Navigation
// Passes data properly to DoctorWorkspace for timeline and tabs to work

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DoctorWorkspace } from './DoctorWorkspace';
import { Header, PatientLookup } from './components';
import { styles, globalStyles } from './styles';

// ================================
// PATIENT LOOKUP PAGE - Fixed Navigation
// ================================

const PatientLookupPage = () => {
  const navigate = useNavigate();
  
  const handlePatientFound = (response, formData) => {
    console.log('📍 Patient found, navigating with data:', formData);
    
    // Navigate to timeline with patient data in state
    navigate(`/doctor/${formData.id_medico}/timeline/${formData.cf_paziente}`, {
      state: {
        patientData: {
          cf_paziente: formData.cf_paziente,
          id_medico: formData.id_medico,
          patologia: formData.patologia
        },
        lookupResult: response,
        shouldUpdateSession: true
      }
    });
  };

  const handlePatientNotFound = (response, formData) => {
    console.log('📍 Patient not found, navigating to registration with data:', formData);
    
    // Navigate to registration with patient data in state
    navigate(`/doctor/${formData.id_medico}/register/${formData.cf_paziente}`, {
      state: {
        patientData: {
          cf_paziente: formData.cf_paziente,
          id_medico: formData.id_medico,
          patologia: formData.patologia
        },
        lookupResult: response,
        shouldUpdateSession: true
      }
    });
  };

  const handleError = (error) => {
    console.error('Patient lookup error:', error);
    alert(`Errore: ${error.error || 'Errore di connessione'}`);
  };

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.mainContent}>
        <PatientLookup
          onPatientFound={handlePatientFound}
          onPatientNotFound={handlePatientNotFound}
          onError={handleError}
        />
      </div>
    </div>
  );
};

// ================================
// MAIN ROUTER APPLICATION
// ================================

const TimelineApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root route - Combined CF + Doctor selection */}
        <Route path="/" element={<PatientLookupPage />} />
        
        {/* Doctor workspace routes - handles all doctor functionality */}
        <Route path="/doctor/:doctorId/*" element={<DoctorWorkspace />} />
        
        {/* Legacy redirect - if someone accesses old doctor selection */}
        <Route path="/select-doctor" element={<Navigate to="/" replace />} />
        
        {/* Catch all - redirect to patient lookup */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

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
              style={{
                ...styles.button,
                backgroundColor: '#007AFF',
                color: 'white'
              }}
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
// RENDER APP
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <TimelineApp />
  </ErrorBoundary>
);

// ================================
// SERVICE WORKER
// ================================

if ('serviceWorker' in navigator) {
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

// ================================
// ARCHITECTURE INFO
// ================================

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    🏥 MULTI-DOCTOR TIMELINE SYSTEM                 ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  🎯 FEATURES:                                                      ║
║    • Combined CF + Doctor selection in one page                   ║
║    • Backend 10-hour Redis sessions                               ║  
║    • Professional tabs (Refertazione, Diario, Esami)              ║
║    • No separate doctor selection page                            ║
║                                                                    ║
║  🔗 URL STRUCTURE:                                                 ║
║    /                             → Combined CF + Doctor selection  ║
║    /doctor/DOC001/timeline/ABC   → Dr. Rossi's patient timeline   ║
║    /doctor/DOC002/register/XYZ   → Dr. Bianchi registering patient║
║                                                                    ║
║  💾 SESSION MANAGEMENT:                                            ║
║    • Backend Redis sessions (10 hours)                            ║
║    • Frontend React Router state                                  ║
║    • Cookie-based authentication                                  ║
║    • Proper data flow to timeline components                      ║
║                                                                    ║
║  🚀 READY FOR WIRGILIO INTEGRATION:                               ║
║    • JWT authentication layer ready                               ║
║    • Hospital multi-tenancy support                               ║
║    • Audit trail foundation in place                              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production Mode - Multi-Doctor System Ready');
  console.log('✅ Combined CF + Doctor selection');
  console.log('✅ Backend session management'); 
  console.log('✅ Fixed data flow to timeline components');
} else {
  console.log('🔧 Development Mode - Full debugging enabled');
  console.log('🔍 Combined patient lookup with proper navigation');
}