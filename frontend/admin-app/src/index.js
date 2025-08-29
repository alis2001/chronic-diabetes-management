// frontend/admin-app/src/index.js
// Healthcare Admin Dashboard - Complete Application with Authentication
// Entry point for Gesan Healthcare admin system

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AuthApp from './AuthApp';
import { authAPI } from './api';

// ================================
// ADMIN DASHBOARD (Post-Authentication)
// ================================

const AdminDashboard = ({ user, onLogout }) => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    try {
      const health = await authAPI.health();
      setSystemHealth(health);
    } catch (error) {
      console.warn('Could not load system health:', error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    onLogout();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '2rem' }}>🏥</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                Dashboard Amministrativo ASL
              </h1>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>
                Sistema Gestione Diabetes Cronico
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600' }}>
                {user.nome} {user.cognome}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {user.role} • {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.9)'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Welcome Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '15px',
            margin: 0
          }}>
            Benvenuto/a {user.nome}!
          </h2>
          <p style={{
            fontSize: '1.2rem',
            opacity: 0.9,
            marginBottom: '10px'
          }}>
            Accesso al dashboard amministrativo completato con successo
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.3)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            ✅ Sistema Operativo
          </div>
        </div>

        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Account Info */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '30px',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              👤 Informazioni Account
            </h3>
            <div style={{ lineHeight: '1.8' }}>
              <div><strong>Nome:</strong> {user.nome} {user.cognome}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Ruolo:</strong> {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</div>
              <div><strong>Username:</strong> {user.username}</div>
            </div>
          </div>

          {/* System Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '30px',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '1.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ⚙️ Stato Sistema
            </h3>
            {loading ? (
              <p>Caricamento...</p>
            ) : systemHealth ? (
              <div style={{ lineHeight: '1.8' }}>
                <div><strong>Servizio:</strong> {systemHealth.service}</div>
                <div><strong>Stato:</strong> {systemHealth.status}</div>
                <div><strong>Porta:</strong> {systemHealth.port}</div>
                <div style={{ 
                  marginTop: '15px',
                  padding: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  Sistema amministrativo operativo
                </div>
              </div>
            ) : (
              <p style={{ opacity: 0.8 }}>Informazioni non disponibili</p>
            )}
          </div>
        </div>

        {/* Coming Soon */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '30px',
          textAlign: 'center',
          color: 'white',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>
            🚧 Dashboard in Sviluppo
          </h3>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Le funzionalità complete del dashboard amministrativo saranno disponibili a breve:
          </p>
          <div style={{
            marginTop: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px'
          }}>
            {['Gestione Utenti', 'Monitor Sistema', 'Report Analytics', 'Configurazione'].map(feature => (
              <div key={feature} style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px'
              }}>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================
// MAIN APPLICATION COMPONENT
// ================================

const AdminApp = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Initialize app
  useEffect(() => {
    console.log('🚀 Admin App initializing...');
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      setInitializing(false);
    }, 100);
  }, []);

  const handleAuthSuccess = (userData) => {
    console.log('🎉 Authentication successful:', userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    console.log('👋 User logged out');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Show loading while initializing
  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏥</div>
          <h2>Caricamento Sistema...</h2>
        </div>
      </div>
    );
  }

  // Show dashboard if authenticated, otherwise show auth
  return isAuthenticated && user ? (
    <AdminDashboard user={user} onLogout={handleLogout} />
  ) : (
    <AuthApp onAuthSuccess={handleAuthSuccess} />
  );
};

// ================================
// ERROR BOUNDARY
// ================================

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Admin Dashboard Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
          padding: '20px'
        }}>
          <div style={{ 
            textAlign: 'center', 
            maxWidth: '600px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '40px',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ marginBottom: '20px' }}>Errore Admin Dashboard</h1>
            <p style={{ marginBottom: '30px', opacity: 0.9 }}>
              Si è verificato un errore nell'applicazione amministrativa.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                <strong>Error:</strong> {this.state.error && this.state.error.toString()}
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '15px 30px',
                background: 'white',
                color: '#dc2626',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
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
// APPLICATION BOOTSTRAP
// ================================

// Render Application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AdminErrorBoundary>
    <AdminApp />
  </AdminErrorBoundary>
);

// Log startup
console.log(`
╔════════════════════════════════════════════════════════════════════╗
║            🏥 GESAN ADMIN DASHBOARD STARTED                        ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  🎯 FEATURES:                                                      ║
║    • @gesan.it email authentication                               ║
║    • 6-digit email verification                                   ║
║    • Professional Italian interface                               ║
║    • API Gateway integration                                      ║
║                                                                    ║
║  🔗 INTEGRATION:                                                   ║
║    • Gateway: ${process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080'} ║
║    • Admin Backend: ${process.env.REACT_APP_ADMIN_API_URL || 'http://localhost:8084'} ║
║                                                                    ║
║  🏢 TARGET: Gesan Healthcare Administrators                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production Admin Dashboard Ready');
} else {
  console.log('🔧 Development Admin Dashboard - Full Debug Mode');
}