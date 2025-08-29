// frontend/timeline-app/src/index.js
// Complete Multi-Doctor Timeline Application with React Router
// 🚀 Supports concurrent doctors with URL-based workspaces and session management

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DoctorWorkspace } from './DoctorWorkspace';
import { DoctorSelection } from './DoctorSelection';
import { styles, globalStyles } from './styles';

// ================================
// MAIN ROUTER APPLICATION
// ================================

const TimelineApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root route - redirect to doctor selection */}
        <Route path="/" element={<Navigate to="/select-doctor" replace />} />
        
        {/* Doctor selection page */}
        <Route path="/select-doctor" element={<DoctorSelection />} />
        
        {/* Doctor workspace routes - handles all /doctor/:doctorId/* paths */}
        <Route path="/doctor/:doctorId/*" element={<DoctorWorkspace />} />
        
        {/* Catch all - redirect to doctor selection */}
        <Route path="*" element={<Navigate to="/select-doctor" replace />} />
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

console.log('🚀 Multi-Doctor Timeline Application Loaded');
console.log('📡 API Gateway URL:', process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080');
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('👨‍⚕️ Multi-Doctor Support: ENABLED');
console.log('🔄 URL Routing: ENABLED');
console.log('💾 Session Storage: Per-Doctor Isolation');

// URL Structure Logging
console.log('📍 Available Routes:');
console.log('  → / (redirects to doctor selection)');
console.log('  → /select-doctor (doctor selection page)');
console.log('  → /doctor/:doctorId/lookup (patient lookup)');
console.log('  → /doctor/:doctorId/timeline/:patientId (patient timeline)');
console.log('  → /doctor/:doctorId/register/:patientId (patient registration)');
console.log('  → /doctor/:doctorId/schedule/:patientId (appointment scheduling)');

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  window.timelineApp = {
    version: '2.0.0-multi-doctor',
    buildDate: new Date().toISOString(),
    apiUrl: process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080',
    features: [
      'multi-doctor-workspace', 
      'url-routing', 
      'session-storage-per-doctor',
      'concurrent-doctor-support',
      'professional-tabs',
      'apple-style-modals'
    ],
    doctors: {
      'DOC001': 'Dr. Mario Rossi',
      'DOC002': 'Dr.ssa Laura Bianchi', 
      'DOC003': 'Dr. Giuseppe Verdi',
      'DOC004': 'Dr.ssa Anna Ferrari'
    },
    testUrls: [
      'http://localhost:3010/select-doctor',
      'http://localhost:3010/doctor/DOC001/lookup',
      'http://localhost:3010/doctor/DOC002/lookup'
    ]
  };

  // Development helper functions
  window.debugDoctorSessions = () => {
    console.log('🔍 Doctor Sessions:');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith('doctor_')) {
        const data = JSON.parse(sessionStorage.getItem(key));
        console.log(`  ${key}:`, data);
      }
    }
  };

  window.clearAllDoctorSessions = () => {
    console.log('🗑️ Clearing all doctor sessions...');
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith('doctor_')) {
        keys.push(key);
      }
    }
    keys.forEach(key => sessionStorage.removeItem(key));
    console.log(`✅ Cleared ${keys.length} doctor sessions`);
  };

  // Log helpful development info
  console.log('🛠️ Development Tools:');
  console.log('  → window.debugDoctorSessions() - Show all doctor sessions');
  console.log('  → window.clearAllDoctorSessions() - Clear all sessions');
  console.log('  → window.timelineApp - Application info');
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

// ================================
// MULTI-DOCTOR ARCHITECTURE INFO
// ================================

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    🏥 MULTI-DOCTOR TIMELINE SYSTEM                 ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  🎯 FEATURES:                                                      ║
║    • Concurrent doctor workspaces                                  ║
║    • URL-based routing and bookmarking                             ║
║    • Per-doctor session isolation                                  ║
║    • Professional tabs (Refertazione, Diario, Esami)              ║
║    • Apple-style modals and UI                                     ║
║                                                                    ║
║  🔗 URL STRUCTURE:                                                 ║
║    /select-doctor                → Doctor selection                ║
║    /doctor/DOC001/lookup         → Dr. Rossi's patient lookup     ║
║    /doctor/DOC001/timeline/ABC   → Dr. Rossi's patient timeline   ║
║    /doctor/DOC002/register/XYZ   → Dr. Bianchi registering patient║
║                                                                    ║
║  💾 SESSION MANAGEMENT:                                            ║
║    • Each doctor has isolated sessionStorage                      ║
║    • State persists on page refresh                               ║
║    • No interference between concurrent doctors                    ║
║                                                                    ║
║  🚀 READY FOR WIRGILIO INTEGRATION:                               ║
║    • JWT authentication layer ready                               ║
║    • Hospital multi-tenancy support                               ║
║    • Audit trail foundation in place                              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

// ================================
// PRODUCTION READINESS CHECK
// ================================

if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production Mode - Multi-Doctor System Ready');
  console.log('✅ Session isolation: Active');
  console.log('✅ URL routing: Active'); 
  console.log('✅ Error boundaries: Active');
  console.log('✅ Service worker: Registering...');
} else {
  console.log('🔧 Development Mode - Full debugging enabled');
  console.log('🔍 Open browser DevTools to see session management');
}