// frontend/timeline-app/src/index.js
// Applicazione Timeline Principale - Sistema Sanitario ASL Italiano
// Orchestrazione workflow medico pulita e professionale

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { timelineAPI } from './api';
import { Header, PatientLookup, PatientRegistration, PatientTimeline, ScheduleAppointment } from './components';
import { styles } from './styles';

// Stati Applicazione
const APP_STATES = {
  LOOKUP: 'lookup',           // Ricerca paziente
  REGISTER: 'register',       // Registrazione paziente
  TIMELINE: 'timeline',       // Visualizzazione timeline
  SCHEDULE: 'schedule'        // Programmazione appuntamento
};

// Applicazione Timeline Principale
const TimelineApp = () => {
  // Stato Applicazione
  const [currentState, setCurrentState] = useState(APP_STATES.LOOKUP);
  const [serviceHealth, setServiceHealth] = useState(null);
  
  // Stato Dati
  const [lookupResult, setLookupResult] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [currentDoctor, setCurrentDoctor] = useState('DOC001');
  const [error, setError] = useState(null);
  const [lastHealthCheck, setLastHealthCheck] = useState(null);

  // Inizializzazione applicazione
  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 30000); // Controllo ogni 30s
    return () => clearInterval(interval);
  }, []);

  const checkServiceHealth = async () => {
    try {
      const health = await timelineAPI.health();
      setServiceHealth(health);
      setLastHealthCheck(new Date().toISOString());
      
      // Rimuovi errore se il servizio è tornato operativo
      if (health.status === 'healthy' && error?.status === 0) {
        setError(null);
      }
    } catch (error) {
      setServiceHealth({ 
        status: 'unhealthy', 
        database_status: 'errore',
        error: error.message 
      });
      setLastHealthCheck(new Date().toISOString());
    }
  };

  // ================================
  // GESTORI EVENTI WORKFLOW
  // ================================

  const handlePatientFound = (result, formData) => {
    setLookupResult(result);
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentDoctor(formData.id_medico);
    setCurrentState(APP_STATES.TIMELINE);
    setError(null);
    
    console.log('Paziente trovato:', result);
  };

  const handlePatientNotFound = (result, formData) => {
    setLookupResult(result);
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentDoctor(formData.id_medico);
    setCurrentState(APP_STATES.REGISTER);
    setError(null);
    
    console.log('Paziente non trovato, registrazione richiesta:', result);
  };

  const handleRegistrationSuccess = (result, formData) => {
    setPatientData({
      cf_paziente: formData.cf_paziente,
      id_medico: formData.id_medico,
      patologia: formData.patologia
    });
    setCurrentState(APP_STATES.TIMELINE);
    setError(null);
    
    console.log('Registrazione completata:', result);
  };

  const handleScheduleAppointment = (patientId, doctorId) => {
    setCurrentState(APP_STATES.SCHEDULE);
    console.log('Avvio programmazione appuntamento per:', patientId);
  };

  const handleScheduleSuccess = () => {
    setCurrentState(APP_STATES.TIMELINE);
    console.log('Appuntamento programmato con successo');
  };

  const handleScheduleCancel = () => {
    setCurrentState(APP_STATES.TIMELINE);
    console.log('Programmazione appuntamento annullata');
  };

  const handleError = (errorData) => {
    setError(errorData);
    console.error('Errore applicazione:', errorData);
    
    // Se è un errore di rete, suggerisci controllo connessione
    if (errorData.status === 0) {
      setError({
        ...errorData,
        suggestion: 'Verificare la connessione di rete e lo stato del servizio'
      });
    }
  };

  const handleReset = () => {
    setCurrentState(APP_STATES.LOOKUP);
    setLookupResult(null);
    setPatientData(null);
    setError(null);
    
    console.log('Reset workflow applicazione');
  };

  const handleRetry = () => {
    setError(null);
    checkServiceHealth();
  };

  // ================================
  // RENDERING APPLICAZIONE
  // ================================

  return (
    <div style={styles.container}>
      <Header serviceHealth={serviceHealth} />
      
      {/* Visualizzazione Errore Globale */}
      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Navigazione Breadcrumb */}
      <BreadcrumbNavigation 
        currentState={currentState}
        patientData={patientData}
        onReset={handleReset}
      />

      {/* Workflow Applicazione */}
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
          <WorkflowActions onReset={handleReset} />
        </>
      )}

      {currentState === APP_STATES.TIMELINE && patientData && (
        <>
          <PatientTimeline
            patientId={patientData.cf_paziente}
            doctorId={patientData.id_medico}
            onScheduleAppointment={handleScheduleAppointment}
          />
          <WorkflowActions onReset={handleReset} />
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
          <WorkflowActions onReset={handleReset} />
        </>
      )}

      {/* Footer Informazioni */}
      <Footer 
        serviceHealth={serviceHealth} 
        lastHealthCheck={lastHealthCheck}
        currentState={currentState}
      />
    </div>
  );
};

// ================================
// COMPONENTI SUPPORTO
// ================================

// Componente Visualizzazione Errore
const ErrorDisplay = ({ error, onRetry, onDismiss }) => (
  <div style={{
    ...styles.resultBox,
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    marginBottom: '20px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>
          Errore Sistema
        </h4>
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>Messaggio:</strong> {error.error}
        </p>
        {error.status && (
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Codice:</strong> {error.status}
          </p>
        )}
        {error.suggestion && (
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666' }}>
            <strong>Suggerimento:</strong> {error.suggestion}
          </p>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {error.status === 0 && (
          <button onClick={onRetry} style={styles.secondaryButton}>
            Riprova
          </button>
        )}
        <button 
          onClick={onDismiss} 
          style={{ 
            ...styles.secondaryButton, 
            padding: '5px 10px',
            fontSize: '12px'
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  </div>
);

// Componente Navigazione Breadcrumb
const BreadcrumbNavigation = ({ currentState, patientData, onReset }) => {
  const getStepName = (state) => {
    switch(state) {
      case APP_STATES.LOOKUP: return '1. Ricerca Paziente';
      case APP_STATES.REGISTER: return '2. Registrazione';
      case APP_STATES.TIMELINE: return '3. Timeline';
      case APP_STATES.SCHEDULE: return '4. Programmazione';
      default: return 'Sconosciuto';
    }
  };

  const getStepDescription = (state) => {
    switch(state) {
      case APP_STATES.LOOKUP: return 'Ricerca paziente per codice fiscale';
      case APP_STATES.REGISTER: return 'Registrazione nel sistema timeline';
      case APP_STATES.TIMELINE: return 'Visualizzazione timeline appuntamenti';
      case APP_STATES.SCHEDULE: return 'Programmazione nuovo appuntamento';
      default: return '';
    }
  };

  return (
    <div style={styles.breadcrumbContainer}>
      <div style={styles.breadcrumbTrail}>
        <span style={currentState === APP_STATES.LOOKUP ? styles.activeBreadcrumb : styles.breadcrumbItem}>
          Ricerca
        </span>
        <span style={styles.breadcrumbSeparator}>→</span>
        <span style={[APP_STATES.REGISTER, APP_STATES.TIMELINE, APP_STATES.SCHEDULE].includes(currentState) ? styles.activeBreadcrumb : styles.breadcrumbItem}>
          {patientData ? 'Gestione' : 'Registrazione'}
        </span>
        <span style={styles.breadcrumbSeparator}>→</span>
        <span style={[APP_STATES.TIMELINE, APP_STATES.SCHEDULE].includes(currentState) ? styles.activeBreadcrumb : styles.breadcrumbItem}>
          Timeline
        </span>
        {currentState === APP_STATES.SCHEDULE && (
          <>
            <span style={styles.breadcrumbSeparator}>→</span>
            <span style={styles.activeBreadcrumb}>Programmazione</span>
          </>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
            {getStepName(currentState)}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            {getStepDescription(currentState)}
          </div>
        </div>
        
        {patientData && (
          <div style={styles.patientBadge}>
            <strong>Paziente Corrente:</strong> {patientData.cf_paziente} | 
            <strong> Medico:</strong> {patientData.id_medico}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Azioni Workflow
const WorkflowActions = ({ onReset }) => (
  <div style={styles.workflowActions}>
    <h4>Azioni Workflow</h4>
    <p style={{ color: '#6c757d', marginBottom: '20px' }}>
      Gestione del flusso di lavoro corrente
    </p>
    
    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button onClick={onReset} style={styles.secondaryButton}>
        Nuovo Paziente
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

// Componente Footer
const Footer = ({ serviceHealth, lastHealthCheck, currentState }) => (
  <footer style={styles.footer}>
    <div style={styles.footerContent}>
      <h3 style={{ marginTop: 0 }}>Servizio Timeline ASL - Sistema Sanitario Regione Lazio</h3>
      <p>Interfaccia medico professionale per gestione timeline pazienti cronici</p>
      
      <div style={styles.footerLinks}>
        <a 
          href="http://localhost:8001/docs" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={styles.footerLink}
        >
          Documentazione API
        </a>
        <a 
          href="http://localhost:8081" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={styles.footerLink}
        >
          MongoDB Admin
        </a>
        <a 
          href="http://localhost:8082" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={styles.footerLink}
        >
          Redis Admin
        </a>
        <a 
          href="http://localhost:8001/health" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={styles.footerLink}
        >
          Stato Servizio
        </a>
      </div>
      
      <div style={styles.serviceStatus}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Stato Sistema:</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>
            Servizio: <strong style={{ color: serviceHealth?.status === 'healthy' ? '#27ae60' : '#e74c3c' }}>
              {serviceHealth?.status === 'healthy' ? 'Operativo' : 'Non Disponibile'}
            </strong>
          </span>
          <span>
            Database: <strong style={{ color: serviceHealth?.database_status === 'healthy' ? '#27ae60' : '#e74c3c' }}>
              {serviceHealth?.database_status === 'healthy' ? 'Connesso' : 'Errore'}
            </strong>
          </span>
          <span>
            Stato Workflow: <strong>{getWorkflowDescription(currentState)}</strong>
          </span>
        </div>
        
        {lastHealthCheck && (
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            Ultimo controllo: {new Date(lastHealthCheck).toLocaleString('it-IT')}
          </div>
        )}
        
        <div style={{ marginTop: '10px', fontSize: '11px' }}>
          Timeline Service v2.0.0 - Build {new Date().toISOString().split('T')[0]}
        </div>
      </div>
    </div>
  </footer>
);

// ================================
// FUNZIONI UTILITÀ
// ================================

const getWorkflowDescription = (state) => {
  switch(state) {
    case APP_STATES.LOOKUP: return 'Ricerca in corso';
    case APP_STATES.REGISTER: return 'Registrazione';
    case APP_STATES.TIMELINE: return 'Gestione timeline';
    case APP_STATES.SCHEDULE: return 'Programmazione appuntamento';
    default: return 'Sconosciuto';
  }
};

// Gestione errori globale
window.addEventListener('unhandledrejection', event => {
  console.error('Errore non gestito:', event.reason);
});

window.addEventListener('error', event => {
  console.error('Errore JavaScript:', event.error);
});

// Applicazione stili aggiuntivi al container root
const additionalStyles = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f8f9fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  * {
    box-sizing: border-box;
  }
  
  input:focus,
  select:focus,
  textarea:focus {
    border-color: #3498db !important;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  /* Scrollbar personalizzata */
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
`;

// Inserisci stili nel DOM
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// ================================
// INIZIALIZZAZIONE REACT
// ================================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TimelineApp />);

// Log inizializzazione
console.log('Timeline Service - Applicazione ASL avviata');
console.log('Versione: 2.0.0');
console.log('Ambiente: Sviluppo');
console.log('API Base URL:', process.env.REACT_APP_TIMELINE_API_URL || 'http://localhost:8001');