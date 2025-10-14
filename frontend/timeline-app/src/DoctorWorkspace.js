// frontend/timeline-app/src/DoctorWorkspace.js
// Doctor Workspace - Complete with Fixed Navigation and Session Handling
// Now properly receives data from login form and shows timeline with tabs

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { timelineAPI, MEDICI } from './api';
import { 
  Header,
  PatientLookup, 
  PatientRegistration, 
  PatientTimeline, 
  ScheduleAppointment 
} from './components';
import { styles } from './styles';

// ================================
// DOCTOR SESSION MANAGEMENT HOOK
// ================================

const useDoctorSession = (doctorId) => {
  const sessionKey = `doctor_${doctorId}`;
  
  // Load initial state from session storage
  const [sessionData, setSessionData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      return saved ? JSON.parse(saved) : {
        currentView: 'lookup',
        patientData: null,
        lookupResult: null
      };
    } catch (error) {
      console.warn('Error loading doctor session:', error);
      return {
        currentView: 'lookup',
        patientData: null,
        lookupResult: null
      };
    }
  });

  // Save to session storage whenever data changes
  useEffect(() => {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log(`💾 Session saved for ${doctorId}:`, sessionData);
    } catch (error) {
      console.warn('Error saving doctor session:', error);
    }
  }, [sessionData, sessionKey, doctorId]);

  const updateSession = (updates) => {
    setSessionData(prev => {
      const newData = { ...prev, ...updates };
      console.log(`🔄 Session updated for ${doctorId}:`, newData);
      return newData;
    });
  };

  const clearSession = () => {
    console.log(`🗑️ Clearing session for ${doctorId}`);
    setSessionData({
      currentView: 'lookup',
      patientData: null,
      lookupResult: null
    });
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (error) {
      console.warn('Error clearing doctor session:', error);
    }
  };

  return {
    sessionData,
    updateSession,
    clearSession
  };
};

// ================================
// DOCTOR WORKSPACE MAIN COMPONENT
// ================================

export const DoctorWorkspace = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Doctor session management
  const { sessionData, updateSession, clearSession } = useDoctorSession(doctorId);
  
  // Application state
  const [serviceHealth, setServiceHealth] = useState(null);
  const [error, setError] = useState(null);
  const [currentPatientName, setCurrentPatientName] = useState(null);

  // Validate doctor exists
  const doctorInfo = MEDICI[doctorId];
  
  // Handle navigation state data (FROM LOGIN FORM)
  useEffect(() => {
    const navigationState = location.state;
    if (navigationState?.shouldUpdateSession && navigationState.patientData) {
      console.log('📥 Receiving data from login form:', navigationState.patientData);
      
      updateSession({
        currentView: navigationState.lookupResult?.exists ? 'timeline' : 'register',
        patientData: navigationState.patientData,
        lookupResult: navigationState.lookupResult
      });
      
      // Clear the navigation state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, updateSession, navigate, location.pathname]);
  
  useEffect(() => {
    if (!doctorInfo) {
      console.warn(`❌ Invalid doctor ID: ${doctorId}`);
      navigate('/');
      return;
    }
    
    console.log(`👨‍⚕️ Doctor workspace loaded: ${doctorInfo} (${doctorId})`);
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 45000);
    return () => clearInterval(interval);
  }, [doctorId, doctorInfo, navigate]);

  const checkServiceHealth = async () => {
    try {
      const health = await timelineAPI.health();
      setServiceHealth(health);
      
      if (health.status === 'healthy' && error?.status === 0) {
        setError(null);
      }
    } catch (error) {
      setServiceHealth({ 
        status: 'unhealthy', 
        database_status: 'errore',
        error: error.message 
      });
    }
  };

  // ================================
  // EVENT HANDLERS WITH SESSION MANAGEMENT
  // ================================

  const handlePatientFound = (result, formData) => {
    const patientData = {
      cf_paziente: formData.cf_paziente,
      id_medico: doctorId, // Use URL doctor ID
      patologia: formData.patologia
    };

    updateSession({
      currentView: 'timeline',
      patientData: patientData,
      lookupResult: result
    });
    
    navigate(`/doctor/${doctorId}/timeline/${formData.cf_paziente}`);
    setError(null);
    
    console.log(`✅ ${doctorInfo} - Patient found:`, formData.cf_paziente);
  };

  const handlePatientNotFound = (result, formData) => {
    const patientData = {
      cf_paziente: formData.cf_paziente,
      id_medico: doctorId, // Use URL doctor ID
      patologia: formData.patologia
    };

    updateSession({
      currentView: 'register',
      patientData: patientData,
      lookupResult: result
    });
    
    navigate(`/doctor/${doctorId}/register/${formData.cf_paziente}`);
    setError(null);
    
    console.log(`⚠️ ${doctorInfo} - Patient not found, registration required:`, formData.cf_paziente);
  };

  const handleRegistrationSuccess = (result, formData) => {
    const patientData = {
      cf_paziente: formData.cf_paziente,
      id_medico: doctorId,
      patologia: formData.patologia
    };

    updateSession({
      currentView: 'timeline',
      patientData: patientData
    });
    
    navigate(`/doctor/${doctorId}/timeline/${formData.cf_paziente}`);
    setError(null);
    
    console.log(`✅ ${doctorInfo} - Registration successful:`, formData.cf_paziente);
  };

  const handleScheduleAppointment = (patientId, doctorId) => {
    console.log('🏥 Schedule appointment for Cronoscita:', sessionData.patientData?.patologia);
    navigate(`/doctor/${doctorId}/schedule/${patientId}`);
    console.log(`📅 ${doctorInfo} - Starting appointment scheduling for:`, patientId);
  };

  const handleScheduleSuccess = () => {
    const patientId = sessionData.patientData?.cf_paziente;
    if (patientId) {
      navigate(`/doctor/${doctorId}/timeline/${patientId}`);
      console.log(`✅ ${doctorInfo} - Appointment scheduled, returning to timeline`);
    }
  };

  const handleScheduleCancel = () => {
    const patientId = sessionData.patientData?.cf_paziente;
    if (patientId) {
      navigate(`/doctor/${doctorId}/timeline/${patientId}`);
      console.log(`❌ ${doctorInfo} - Appointment scheduling cancelled`);
    }
  };

  const handleError = (errorData) => {
    setError(errorData);
    console.error(`🚨 ${doctorInfo} - Error:`, errorData);
    
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
    clearSession();
    navigate(`/doctor/${doctorId}/lookup`);
    setError(null);
    console.log(`🔄 ${doctorInfo} - Workspace reset to lookup`);
  };

  const handleRetry = () => {
    setError(null);
    checkServiceHealth();
    console.log(`🔄 ${doctorInfo} - Retrying operation`);
  };

  // Redirect invalid doctor
  if (!doctorInfo) {
    return null; // Will redirect in useEffect
  }

  // ================================
  // ERROR DISPLAY COMPONENT
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
            <span style={{fontSize: '20px', color: '#ff3b30'}}>⚠️</span>
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
  // ACTION BUTTONS COMPONENT
  // ================================

  const ActionButtons = () => (
    <div style={{
      textAlign: 'center',
      marginTop: '30px',
      padding: '20px'
    }}>
      <button 
        onClick={() => navigate(`/doctor/${doctorId}/lookup`)}
        style={styles.secondaryButton}
      >
        Nuova Ricerca Paziente
      </button>
      {' '}
      <button 
        onClick={() => window.location.reload()} 
        style={styles.primaryButton}
      >
        Ricarica Applicazione
      </button>
    </div>
  );

  // ================================
  // SESSION ERROR COMPONENT
  // ================================

  const SessionError = ({ message }) => (
    <div style={styles.card}>
      <div style={styles.errorState}>
        <p>{message}</p>
        <div style={{display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px'}}>
          <button onClick={handleReset} style={styles.primaryButton}>
            Torna alla Ricerca
          </button>
          <button onClick={() => navigate('/')} style={styles.secondaryButton}>
            Home
          </button>
        </div>
      </div>
    </div>
  );

  // ================================
  // RENDER DOCTOR WORKSPACE
  // ================================

  return (
    <div style={styles.container}>
      {/* Original Header */}
      <Header 
        serviceHealth={serviceHealth}
        patientName={currentPatientName}
      />
      
      {/* Global Error Display */}
      {error && (
        <AppleErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Doctor Workspace Routes */}
      <Routes>
        {/* Patient Lookup */}
        <Route path="/lookup" element={
          <PatientLookup
            onPatientFound={handlePatientFound}
            onPatientNotFound={handlePatientNotFound}
            onError={handleError}
          />
        } />

        {/* Patient Registration */}
        <Route path="/register/:patientId" element={
          sessionData.lookupResult && sessionData.patientData ? (
            <>
              <PatientRegistration
                lookupResult={sessionData.lookupResult}
                formData={sessionData.patientData}
                onRegistrationSuccess={handleRegistrationSuccess}
                onError={handleError}
              />
              <ActionButtons />
            </>
          ) : (
            <SessionError message="Dati registrazione non trovati nella sessione. Inizia dalla ricerca paziente." />
          )
        } />

        {/* Patient Timeline - YOUR PROFESSIONAL TIMELINE WITH TABS */}
        <Route path="/timeline/:patientId" element={
          sessionData.patientData ? (
            <>
              <PatientTimeline
                patientId={sessionData.patientData.cf_paziente}
                doctorId={doctorId}
                patologia={sessionData.patientData.patologia} // ✅ Pass Cronoscita context
                onScheduleAppointment={handleScheduleAppointment}
                onPatientNameLoad={setCurrentPatientName}
              />
              <ActionButtons />
            </>
          ) : (
            <SessionError message="Dati paziente non trovati nella sessione. Inizia dalla ricerca paziente." />
          )
        } />

        {/* Schedule Appointment */}
        <Route path="/schedule/:patientId" element={
          sessionData.patientData ? (
            <ScheduleAppointment
              patientId={sessionData.patientData.cf_paziente}
              doctorId={doctorId}
              onSuccess={handleScheduleSuccess}
              onCancel={handleScheduleCancel}
            />
          ) : (
            <SessionError message="Dati paziente non trovati nella sessione. Inizia dalla ricerca paziente." />
          )
        } />

        {/* Default route - goes to lookup if no patient data, or timeline if has data */}
        <Route path="/" element={
          sessionData.patientData ? (
            <PatientTimeline
              patientId={sessionData.patientData.cf_paziente}
              doctorId={doctorId}
              patologia={sessionData.patientData.patologia} // ✅ Pass Cronoscita context
              onScheduleAppointment={handleScheduleAppointment}
              onPatientNameLoad={setCurrentPatientName}
            />
          ) : (
            <PatientLookup
              onPatientFound={handlePatientFound}
              onPatientNotFound={handlePatientNotFound}
              onError={handleError}
            />
          )
        } />

        {/* Catch all - debug route */}
        <Route path="*" element={
          <div style={styles.card}>
            <h2>🔍 Route Debug</h2>
            <p><strong>URL:</strong> {location.pathname}</p>
            <p><strong>Has Session Data:</strong> {sessionData.patientData ? 'Yes' : 'No'}</p>
            <button onClick={() => navigate(`/doctor/${doctorId}/lookup`)} style={styles.primaryButton}>
              Go to Patient Lookup
            </button>
          </div>
        } />
      </Routes>
    </div>
  );
};