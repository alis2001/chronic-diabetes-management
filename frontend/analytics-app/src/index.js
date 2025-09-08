// frontend/analytics-app/src/index.js
// Analytics Frontend Application Entry Point
// React 18 setup with error boundary and iframe-ready initialization

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// ================================
// ERROR BOUNDARY COMPONENT
// ================================

// Get dynamic parent origin based on current hostname
const getParentOrigin = () => {
  const parentHost = window.location.hostname;
  const parentPort = process.env.REACT_APP_TIMELINE_FRONTEND_PORT || '3010';
  return `http://${parentHost}:${parentPort}`;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Analytics App Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              color: '#dc2626', 
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              Errore Applicazione Analytics
            </h2>
            <p style={{ 
              marginBottom: '20px', 
              color: '#6b7280',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              Si è verificato un errore imprevisto nell'applicazione di analytics dei dati laboratorio.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '14px',
                color: '#dc2626'
              }}>
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <details style={{ marginTop: '10px' }}>
                    <summary>Stack Trace</summary>
                    <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = '#b91c1c'}
              onMouseOut={(e) => e.target.style.background = '#dc2626'}
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
// IFRAME COMMUNICATION SETUP
// ================================

// Listen for messages from parent window (timeline service)
window.addEventListener('message', (event) => {
  // Only accept messages from parent timeline app
  if (event.origin !== getParentOrigin()) return;
  
  console.log('📨 Analytics iframe received message:', event.data);
  
  // Handle different message types from parent
  switch (event.data.type) {
    case 'ANALYTICS_RESIZE':
      // Handle resize requests from parent
      if (event.data.height) {
        document.body.style.height = `${event.data.height}px`;
      }
      break;
      
    case 'ANALYTICS_REFRESH':
      // Handle refresh requests from parent
      window.location.reload();
      break;
      
    case 'ANALYTICS_UPDATE_CF':
      // Handle CF updates from parent (if needed)
      if (event.data.cf) {
        const url = new URL(window.location);
        url.searchParams.set('cf', event.data.cf);
        window.location.href = url.toString();
      }
      break;
      
    default:
      console.log('Unknown message type:', event.data.type);
  }
});

// Send ready message to parent window
const sendReadyMessage = () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'ANALYTICS_READY',
      source: 'analytics-iframe', 
      timestamp: new Date().toISOString()
    }, getParentOrigin());  // ✅ Timeline app origin
    console.log('📤 Analytics iframe sent ready message to parent');
  }
};

// ================================
// APPLICATION INITIALIZATION
// ================================

const initializeAnalyticsApp = () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🧪 ANALYTICS FRONTEND APPLICATION                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  🎯 FEATURES:                                                        ║
║    • Two-dropdown system (desesame → dessottoanalisi)               ║
║    • Wirgilio API integration through API Gateway                   ║
║    • Recharts visualization with anomaly detection                  ║
║    • Iframe-ready for Timeline service integration                  ║
║                                                                      ║
║  🔗 API ARCHITECTURE:                                                ║
║    Analytics Frontend → API Gateway (8080) → Analytics Service      ║
║    (Port 3011)           → Wirgilio API                            ║
║                                                                      ║
║  🧬 DATA PROCESSING:                                                 ║
║    • P/AP flags = Red (anomaly) dropdown colors                    ║
║    • N flags = Normal (green) dropdown colors                      ║
║    • Chart color based on ANY anomaly in history                   ║
║    • Shows even single data points                                 ║
║                                                                      ║
║  📊 VISUALIZATION:                                                   ║
║    • Time-series LineChart with Recharts                           ║
║    • Custom tooltips with medical data                             ║
║    • Statistics cards with anomaly percentages                     ║
║    • Professional medical interface design                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
  
  // Log environment info
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 API Gateway:', process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080');
  
  // Extract URL parameters for debugging
  const urlParams = new URLSearchParams(window.location.search);
  const cf = urlParams.get('cf');
  const doctorId = urlParams.get('doctor_id');
  
  if (cf) {
    console.log('👤 Patient CF:', cf);
    console.log('👨‍⚕️ Doctor ID:', doctorId || 'unknown');
  } else {
    console.warn('⚠️ No CF parameter found in URL');
  }
  
  // Send ready message after initialization
  setTimeout(sendReadyMessage, 1000);
};

// ================================
// SERVICE WORKER REGISTRATION
// ================================

const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('🔧 SW registered:', registration);
        })
        .catch((registrationError) => {
          console.log('❌ SW registration failed:', registrationError);
        });
    });
  }
};

// ================================
// RENDER APPLICATION
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// ================================
// POST-RENDER INITIALIZATION
// ================================

// Initialize after render
initializeAnalyticsApp();

// Register service worker
registerServiceWorker();

// Performance monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// ================================
// IFRAME RESIZE OBSERVER
// ================================

// Automatically notify parent of content height changes
if (window.parent && window.parent !== window) {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const height = entry.contentRect.height;
      window.parent.postMessage({
        type: 'ANALYTICS_HEIGHT_CHANGE',
        height: height,
        source: 'analytics-iframe'
      }, getParentOrigin());
    }
  });
  
  // Observe the root element
  setTimeout(() => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      resizeObserver.observe(rootElement);
    }
  }, 100);
}