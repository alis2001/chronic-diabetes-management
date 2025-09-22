import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// ================================
// MAIN SCHEDULER APPLICATION
// ================================

const SchedulerApp = () => {
  // URL Parameters
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  
  // Component state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patient = urlParams.get('patient');
    const doctor = urlParams.get('doctor');
    
    if (patient && doctor) {
      setPatientId(patient);
      setDoctorId(doctor);
      console.log('✅ Scheduler initialized for:', { patient, doctor });
    } else {
      setError('Parametri paziente o medico mancanti');
      console.error('❌ Missing patient or doctor parameters');
    }
    
    setLoading(false);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <h2 style={styles.loadingText}>Caricamento Scheduler Professionale...</h2>
          <p style={styles.loadingSubtext}>Inizializzazione sistema programmazione appuntamenti</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Errore Configurazione</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button 
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Ricarica Applicazione
          </button>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>📅</div>
          <div style={styles.headerText}>
            <h1 style={styles.headerTitle}>Programmazione Appuntamento</h1>
            <p style={styles.headerSubtitle}>
              Paziente: <strong>{patientId}</strong> • Medico: <strong>{doctorId}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.schedulerCard}>
          <h2 style={styles.cardTitle}>🏥 Sistema Programmazione ASL</h2>
          <p style={styles.cardDescription}>
            Seleziona data, ora ed esami per il prossimo appuntamento del paziente.
          </p>
          
          {/* Placeholder for scheduler components */}
          <div style={styles.placeholderContent}>
            <div style={styles.placeholderIcon}>⚡</div>
            <h3 style={styles.placeholderTitle}>Scheduler in Sviluppo</h3>
            <p style={styles.placeholderText}>
              Componenti di programmazione appuntamenti verranno implementati nel prossimo step
            </p>
            <div style={styles.contextInfo}>
              <strong>Contesto Sessione:</strong><br/>
              Paziente CF: {patientId}<br/>
              Medico ID: {doctorId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
