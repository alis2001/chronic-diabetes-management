// frontend/timeline-app/src/components.js
// Complete Healthcare Components with STEP 2 UI Improvements
// 🔥 STEP 2: Compressed patient info, non-clickable timeline, professional tabs

import React, { useState, useEffect, useRef } from 'react';
import { 
  timelineAPI, 
  MEDICI, 
  PATOLOGIE, 
  formatCodiceFiscale,
  validateCodiceFiscale,
  formatTelefono,
  formatDataItaliana
} from './api';
import { styles } from './styles';
import DraggableIframeModal from './components/DraggableIframeModal';

// ================================
// CLEAN HEADER
// ================================

export const Header = ({ serviceHealth }) => (
  <div style={styles.header}>
    <div style={styles.headerContent}>
      <h1>Timeline Paziente</h1>
      <p style={{margin: '5px 0 0 0', fontSize: '16px', opacity: 0.9, fontWeight: '400'}}>
        Sistema Gestione Visite Mediche
      </p>
    </div>
  </div>
);

// ================================
// PATIENT LOOKUP
// ================================

// Replace your existing PatientLookup component in components.js with this:

// Updated PatientLookup component - replace the createBackendSession function:

export const PatientLookup = ({ onPatientFound, onPatientNotFound, onError }) => {
  const [formData, setFormData] = useState({
    cf_paziente: '',
    id_medico: 'DOC001',
    patologia: 'diabetes_mellitus_type2'
  });
  const [loading, setLoading] = useState(false);

  // Session management - NOW USES API GATEWAY
  const createBackendSession = async (loginData) => {
    // Use API Gateway instead of direct Timeline Service
    const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || `http://${window.location.hostname}:8080`;

    
    console.log('🚀 Creating backend session via Gateway with:', loginData);
    
    const body = new FormData();
    body.append('cf_paziente', loginData.cf_paziente);
    body.append('id_medico', loginData.id_medico);
    body.append('patologia', loginData.patologia);

    try {
        const response = await fetch(`${API_BASE}/api/session/login`, {
        method: 'POST',
        body,
        credentials: 'include'
        });

        console.log('📡 Session API Response (via Gateway):', response.status, response.statusText);

        const data = await response.json();
        console.log('📊 Session API Data (via Gateway):', data);
        
        if (!response.ok || !data.success) {
        throw new Error(data.error || `API Error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Session creation failed:', error);
        throw error;
    }
  };

  const handleCodiceFiscaleChange = (e) => {
    const formatted = formatCodiceFiscale(e.target.value);
    setFormData({...formData, cf_paziente: formatted});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cf_paziente.trim()) {
      alert('Inserire il codice fiscale');
      return;
    }
    
    if (!validateCodiceFiscale(formData.cf_paziente)) {
      alert('Formato codice fiscale non valido');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Create backend session via Gateway
      await createBackendSession(formData);
      console.log('✅ Backend session created via Gateway for doctor:', formData.id_medico);
      
      // 2. Then do the existing patient lookup (also via Gateway)
      const response = await timelineAPI.lookupPatient(
        formData.cf_paziente,
        formData.id_medico,
        formData.patologia
      );
      
      if (response.exists) {
        onPatientFound(response, formData);
      } else {
        onPatientNotFound(response, formData);
      }
    } catch (error) {
      console.error('❌ Error in patient lookup with session:', error);
      onError({ error: error.message, status: error.status });
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Ricerca Paziente</h2>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Codice Fiscale <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.cf_paziente}
            onChange={handleCodiceFiscaleChange}
            placeholder="RSSMRA80A01H501U"
            style={styles.input}
            maxLength="16"
            required
            disabled={loading}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Medico</label>
          <select
            value={formData.id_medico}
            onChange={(e) => setFormData({...formData, id_medico: e.target.value})}
            style={styles.select}
            disabled={loading}
          >
            {Object.entries(MEDICI).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Patologia</label>
          <select
            value={formData.patologia}
            onChange={(e) => setFormData({...formData, patologia: e.target.value})}
            style={styles.select}
            disabled={loading}
          >
            {Object.entries(PATOLOGIE).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Ricerca...' : 'Cerca Paziente'}
        </button>
      </form>
    </div>
  );
};

// ================================
// PATIENT REGISTRATION - MANDATORY FIELDS
// ================================

export const PatientRegistration = ({ lookupResult, formData, onRegistrationSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState({
    telefono: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (lookupResult?.patient_data?.demographics) {
      setContactData({
        telefono: lookupResult.patient_data.demographics.telefono || '',
        email: lookupResult.patient_data.demographics.email || ''
      });
    }
  }, [lookupResult]);

  const validateForm = () => {
    const errors = {};
    
    if (!contactData.telefono.trim()) {
      errors.telefono = 'Numero di telefono obbligatorio';
    }
    
    if (!contactData.email.trim()) {
      errors.email = 'Indirizzo email obbligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      errors.email = 'Formato email non valido';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTelefonoChange = (e) => {
    setContactData({...contactData, telefono: formatTelefono(e.target.value)});
    if (validationErrors.telefono) {
      setValidationErrors({...validationErrors, telefono: ''});
    }
  };

  const handleEmailChange = (e) => {
    setContactData({...contactData, email: e.target.value});
    if (validationErrors.email) {
      setValidationErrors({...validationErrors, email: ''});
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await timelineAPI.registerPatientWithContacts(
        formData.cf_paziente,
        formData.id_medico,
        formData.patologia,
        contactData.telefono.trim(),
        contactData.email.trim()
      );
      if (response.success) {
        onRegistrationSuccess(response, formData);
      }
    } catch (error) {
      onError({ error: error.message, status: error.status });
    }
    setLoading(false);
  };

  if (!lookupResult || lookupResult.exists) return null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Registrazione Paziente</h2>
      </div>
      
      {lookupResult.patient_data?.demographics && (
        <>
          <div style={styles.registrationSection}>
            <h3 style={styles.sectionTitle}>
              Dati Anagrafici <span style={styles.readOnlyLabel}>Non modificabili</span>
            </h3>
            
            <div style={styles.patientInfoGrid}>
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Nome:</span>
                <span style={styles.patientInfoValue}>
                  {lookupResult.patient_data.demographics.nome}
                </span>
              </div>
              
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Cognome:</span>
                <span style={styles.patientInfoValue}>
                  {lookupResult.patient_data.demographics.cognome}
                </span>
              </div>
              
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Data Nascita:</span>
                <span style={styles.patientInfoValue}>
                  {formatDataItaliana(lookupResult.patient_data.demographics.data_nascita)}
                </span>
              </div>
              
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Codice Fiscale:</span>
                <span style={styles.patientInfoValue}>
                  {formData.cf_paziente}
                </span>
              </div>
            </div>
          </div>
          
          <div style={styles.registrationSection}>
            <h3 style={styles.sectionTitle}>
              Contatti <span style={styles.editableLabel}>Obbligatori</span>
            </h3>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Numero Telefono <span style={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  value={contactData.telefono}
                  onChange={handleTelefonoChange}
                  placeholder="+39 123 456 7890"
                  style={{
                    ...styles.input,
                    borderColor: validationErrors.telefono ? '#ff3b30' : '#d1d5db'
                  }}
                  disabled={loading}
                  required
                />
                {validationErrors.telefono && (
                  <span style={{color: '#ff3b30', fontSize: '14px', fontWeight: '500'}}>
                    {validationErrors.telefono}
                  </span>
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  value={contactData.email}
                  onChange={handleEmailChange}
                  placeholder="paziente@example.it"
                  style={{
                    ...styles.input,
                    borderColor: validationErrors.email ? '#ff3b30' : '#d1d5db'
                  }}
                  disabled={loading}
                  required
                />
                {validationErrors.email && (
                  <span style={{color: '#ff3b30', fontSize: '14px', fontWeight: '500'}}>
                    {validationErrors.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      <button 
        onClick={handleRegister} 
        disabled={loading || !contactData.telefono.trim() || !contactData.email.trim()} 
        style={
          loading || !contactData.telefono.trim() || !contactData.email.trim() 
            ? styles.disabledButton 
            : styles.successButton
        }
      >
        {loading ? 'Registrazione...' : 'Registra Paziente'}
      </button>
    </div>
  );
};

// ================================
// 🔥 STEP 2: NON-CLICKABLE TIMELINE WITH SUCCESSIVO
// ================================

export const InnovativeTimeline = ({ appointments, patientId, doctorId, onTimelineUpdate }) => {
  const pastScrollRef = useRef(null);

  // FIXED: Proper date-based appointment organization
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const organizeAppointments = (appointments) => {
    const past = [];
    const todayAppts = [];
    const future = [];
    
    appointments.forEach(apt => {
      const aptDate = new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      
      if (aptDate < today) {
        past.push(apt);
      } else if (aptDate.getTime() === today.getTime()) {
        todayAppts.push(apt);
      } else {
        future.push(apt);
      }
    });
    
    return { 
      past: past.sort((a, b) => new Date(a.date) - new Date(b.date)), 
      today: todayAppts, 
      future: future.sort((a, b) => new Date(a.date) - new Date(b.date))
    };
  };

  const { past, today: todayAppts, future } = organizeAppointments(appointments);
  const displayPastAppts = past.slice(-10); // Show last 10
  const hasFutureAppt = future.length > 0;
  const hasTodayAppt = todayAppts.length > 0;

  const scrollLeft = () => {
    if (pastScrollRef.current) {
      pastScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (pastScrollRef.current) {
      pastScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div style={styles.timelineContainer}>
      
      <div style={styles.timelineWrapper}>
        <div style={styles.timelineLine} />
        
        {/* Past Appointments Section (Left - Scrollable) */}
        <div style={styles.pastSection}>
          {displayPastAppts.length > 5 && (
            <div 
              style={{...styles.scrollIndicator, ...styles.leftScrollIndicator}}
              onClick={scrollLeft}
              title="Scorri per vedere più visite passate"
            >
              ←
            </div>
          )}
          
          <div 
            ref={pastScrollRef}
            className="past-scroll-container"
            style={styles.pastScrollContainer}
          >
            {displayPastAppts.map((appointment, index) => (
              <div
                key={appointment.appointment_id || index}
                style={{
                  ...styles.timelinePoint,
                  ...styles.pastPoint,
                  cursor: 'default' // 🔥 NON-CLICKABLE
                }}
                title={`${appointment.type} - ${appointment.date}`}
              >
                {index + 1}
                <div style={{
                  ...styles.pointLabel,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  borderColor: '#c4b5fd'
                }}>
                  {appointment.date}
                </div>
              </div>
            ))}
          </div>
          
          {displayPastAppts.length > 5 && (
            <div 
              style={{...styles.scrollIndicator, right: '10px'}}
              onClick={scrollRight}
              title="Scorri per vedere altre visite"
            >
              →
            </div>
          )}
        </div>

        {/* Today Section (Center - Always Present) */}
        <div style={styles.todaySection}>
          <div
            style={{
              ...styles.timelinePoint,
              ...styles.todayPoint,
              cursor: 'default' // 🔥 NON-CLICKABLE
            }}
            title="Visita di oggi"
          >
            OGGI
            <div style={{
              ...styles.pointLabel,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              borderColor: '#6ee7b7',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {today.toLocaleDateString('it-IT')}
            </div>
          </div>
        </div>

        {/* Future Section (Right - Only One Appointment) */}
        <div style={styles.futureSection}>
          {hasFutureAppt ? (
            <div
              style={{
                ...styles.timelinePoint,
                ...styles.futurePoint,
                cursor: 'default' // 🔥 NON-CLICKABLE
              }}
              title={`${future[0].type} - ${future[0].date}`}
            >
              {/* 🔥 CHANGED FROM "NEXT" TO "Successivo" */}
              Successivo
              <div style={{
                ...styles.pointLabel,
                backgroundColor: 'rgba(107, 114, 128, 0.1)',
                color: '#4b5563',
                borderColor: '#d1d5db'
              }}>
                {future[0].date}
              </div>
            </div>
          ) : (
            <div style={{
              ...styles.timelinePoint,
              backgroundColor: '#e5e7eb',
              cursor: 'default',
              color: '#9ca3af',
              fontSize: '10px'
            }}>
              Successivo
              <div style={{
                ...styles.pointLabel,
                backgroundColor: 'rgba(156, 163, 175, 0.1)',
                color: '#9ca3af',
                borderColor: '#e5e7eb'
              }}>
                Nessun appuntamento
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Legend */}
      <div style={{
        display: 'flex', 
        justifyContent: 'center',
        gap: '40px',
        marginTop: '40px',
        fontSize: '16px',
        fontWeight: '500'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            backgroundColor: '#8b5cf6'
          }} />
          <span style={{color: '#8b5cf6'}}>Visite Passate</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            backgroundColor: '#10b981'
          }} />
          <span style={{color: '#059669'}}>Oggi</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            backgroundColor: '#6b7280'
          }} />
          <span style={{color: '#4b5563'}}>Successivo</span>
        </div>
      </div>
    </div>
  );
};

// ================================
// 🔥 STEP 2: PROFESSIONAL TABBED SECTION
// ================================

// REPLACE the ProfessionalTabs component in frontend/timeline-app/src/components.js with this:

// COMPLETE ProfessionalTabs component - Replace the entire component in your components.js file

const ProfessionalTabs = ({ patientId, doctorId }) => {
  const [activeTab, setActiveTab] = useState('refertazione');
  const [referto, setReferto] = useState('');
  const [diario, setDiario] = useState('');
  
  // Analytics iframe state - simplified (no minimize/maximize state)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // CSS animation for AI sparkles
  const sparkleStyle = `
    @keyframes sparkle-pulse {
      0% { 
        transform: scale(1) rotate(0deg); 
        opacity: 1; 
      }
      50% { 
        transform: scale(1.2) rotate(180deg); 
        opacity: 0.8; 
      }
      100% { 
        transform: scale(1) rotate(360deg); 
        opacity: 1; 
      }
    }
    .ai-sparkle { 
      animation: sparkle-pulse 2s ease-in-out infinite;
      display: inline-block;
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
    }
  `;

  const tabs = [
    { id: 'refertazione', label: 'Refertazione', icon: '📄', color: '#3b82f6' },
    { id: 'diario', label: 'Diario Clinico', icon: '📝', color: '#10b981' },
    { id: 'esami', label: 'Esami Laboratorio', icon: '🧪', color: '#f59e0b' }
  ];

  const tabContentStyles = {
    refertazione: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 197, 253, 0.1) 100%)',
      borderColor: 'rgba(59, 130, 246, 0.2)'
    },
    diario: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(110, 231, 183, 0.1) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    esami: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.1) 100%)',
      borderColor: 'rgba(245, 158, 11, 0.2)'
    }
  };

  // Handle tab switching - auto-load analytics for esami tab
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'esami' && !analyticsLoaded) {
      setAnalyticsLoaded(true);
    }
  };

  const handleVoiceRecording = async () => {
    try {
      console.log('🎤 Starting voice recording workflow...');
      
      if (!doctorId || !patientId) {
        alert('Errore: Dati sessione mancanti. Ricarica la pagina.');
        return;
      }

      console.log('📡 Creating Melody workflow...');

      const requestData = {
        doctor_id: doctorId,
        patient_cf: patientId,
        return_url: window.location.href, // This URL will bring doctor back to chronic platform
        platform: 'chronic'
      };

      const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE}/api/timeline/melody/create-voice-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Melody workflow creation failed:', errorData);
        
        if (response.status === 503) {
          alert('⚠️ Servizio Melody temporaneamente non disponibile. Riprova tra qualche minuto.');
        } else {
          alert(`❌ Errore durante la creazione del workflow Melody: ${errorData.detail || 'Errore sconosciuto'}`);
        }
        return;
      }

      const workflowData = await response.json();
      console.log('✅ Melody workflow created:', workflowData);

      if (workflowData.success && workflowData.workflow_url) {
        console.log('🚀 Navigating to Melody workflow in same tab:', workflowData.workflow_url);
        
        // FIXED: Navigate to Melody in the same tab (not new window)
        window.location.href = workflowData.workflow_url;
        
      } else {
        alert('❌ Errore nella risposta del servizio Melody.');
      }

    } catch (error) {
      console.error('❌ Voice recording error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('❌ Errore di connessione. Verifica la connessione di rete.');
      } else {
        alert('❌ Errore durante l\'avvio del workflow vocale.');
      }
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'refertazione':
        return (
          <div style={{...tabContentStyles.refertazione, padding: '35px', borderRadius: '16px', border: '2px solid', borderColor: tabContentStyles.refertazione.borderColor}}>
            {/* Add CSS styles */}
            <style>{sparkleStyle}</style>
            
            <div style={{marginBottom: '25px'}}>
              <button
                onClick={handleVoiceRecording}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  marginBottom: '20px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                {/* CHANGED: AI Sparkle instead of microphone */}
                <span className="ai-sparkle">✨</span>
                Registrazione Vocale AI
              </button>
            </div>
            
            <textarea
              value={referto}
              onChange={(e) => setReferto(e.target.value)}
              placeholder="Inserisci le note del referto medico..."
              style={{
                width: '100%',
                height: '400px',
                padding: '20px',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        );

      case 'diario':
        return (
          <div style={{...tabContentStyles.diario, padding: '35px', borderRadius: '16px', border: '2px solid', borderColor: tabContentStyles.diario.borderColor}}>
            <textarea
              value={diario}
              onChange={(e) => setDiario(e.target.value)}
              placeholder="Diario clinico del paziente..."
              style={{
                width: '100%',
                height: '400px',
                padding: '20px',
                border: '2px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        );

      case 'esami':
        return (
          <div style={{...tabContentStyles.esami, padding: '0', overflow: 'hidden'}}>
            {analyticsLoaded ? (
              <EmbeddedAnalyticsWindow 
                patientId={patientId}
                doctorId={doctorId}
              />
            ) : (
              // Loading state
              <div style={{
                height: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                🧪 Caricamento Analytics...
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '24px',
      padding: '0',
      margin: '30px 0',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      overflow: 'hidden'
    }}>
      {/* Tab Headers */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid rgba(0, 0, 0, 0.05)',
        background: 'rgba(248, 250, 252, 0.8)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            style={{
              flex: 1,
              padding: '20px 25px',
              border: 'none',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)'
                : 'transparent',
              color: activeTab === tab.id ? '#1d1d1f' : '#6b7280',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span style={{fontSize: '18px'}}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{padding: activeTab === 'esami' ? '0' : '35px'}}>
        {renderTabContent()}
      </div>
    </div>
  );
};


const EmbeddedAnalyticsWindow = ({ 
  patientId, 
  doctorId 
}) => {
  const analyticsHost = window.location.hostname;
  const analyticsPort = process.env.REACT_APP_ANALYTICS_FRONTEND_PORT || '3011';
  const analyticsUrl = `http://${analyticsHost}:${analyticsPort}?cf=${patientId}&doctor_id=${doctorId}&embedded=true`;
  
  return (
    <div style={{
      height: '800px', // Large size by default
      position: 'relative',
      background: 'transparent',
      borderRadius: '0px', // No border radius for seamless integration
      overflow: 'hidden'
    }}>
      {/* NO HEADER BAR - NO WINDOW CONTROLS */}
      
      {/* Direct iframe - no wrapper */}
      <iframe
        src={analyticsUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent'
        }}
        title="Analytics Laboratorio"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </div>
  );
};


// ================================
// 🔥 STEP 2: UPDATED PATIENT TIMELINE - COMPRESSED INFO + TABS
// ================================

export const PatientTimeline = ({ patientId, doctorId, onScheduleAppointment }) => {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (patientId && doctorId) {
      loadTimeline();
    }
  }, [patientId, doctorId]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await timelineAPI.getTimeline(patientId, doctorId);
      setTimeline(response);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loadingState}>
          <p>Caricamento timeline...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.errorState}>
          <p>Errore: {error}</p>
          <button onClick={loadTimeline} style={styles.secondaryButton}>
            Riprova
          </button>
        </div>
      </div>
    );
  }
  
  if (!timeline) return null;

  const allAppointments = [
    ...timeline.precedenti,
    ...timeline.oggi,
    ...timeline.successivo
  ];

  return (
    <div style={styles.card}>
      
      {/* 🔥 COOL COMPRESSED PATIENT BAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(245, 158, 11, 0.1) 100%)',
        padding: '20px 30px',
        borderRadius: '16px',
        marginBottom: '25px',
        border: '2px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Patient Name - Main Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flex: 1,
            minWidth: '200px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}>
              {(timeline.patient_name || timeline.patient_id).charAt(0)}
            </div>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1d1d1f',
                marginBottom: '2px'
              }}>
                {timeline.patient_name || timeline.patient_id}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                CF: {timeline.patient_id}
              </div>
            </div>
          </div>

          {/* Condition & Visits - Secondary Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px',
            fontSize: '14px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <span style={{fontSize: '16px'}}>🩺</span>
              <div>
                <div style={{fontWeight: '600', color: '#059669'}}>
                  {PATOLOGIE[timeline.patologia] || timeline.patologia}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <span style={{fontSize: '16px'}}>📊</span>
              <div>
                <div style={{fontWeight: '600', color: '#d97706'}}>
                  {timeline.total_appointments} Visite
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <InnovativeTimeline 
        appointments={allAppointments}
        patientId={patientId}
        doctorId={doctorId}
        onTimelineUpdate={loadTimeline}
      />

      {/* 🔥 PROFESSIONAL TABBED SECTION */}
      <ProfessionalTabs patientId={patientId} doctorId={doctorId} />

      {/* 🔥 REMOVED SCHEDULE APPOINTMENT BUTTON */}
    </div>
  );
};

// ================================
// SCHEDULE APPOINTMENT - UNCHANGED (keeping for now)
// ================================

export const ScheduleAppointment = ({ patientId, doctorId, onSuccess, onCancel }) => {
  const [availableTypes, setAvailableTypes] = useState([]);
  const [formData, setFormData] = useState({
    appointment_type: '',
    suggested_date: '',
    priority: 'normal',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableTypes();
    setFormData(prev => ({
      ...prev,
      suggested_date: getMinDate()
    }));
  }, [patientId, doctorId]);

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const loadAvailableTypes = async () => {
    try {
      const response = await timelineAPI.getAvailableTypes(patientId, doctorId);
      setAvailableTypes(response.available_appointment_types || []);
      if (response.available_appointment_types?.length > 0) {
        setFormData(prev => ({
          ...prev, 
          appointment_type: response.available_appointment_types[0].type
        }));
      }
    } catch (error) {
      console.error('Errore caricamento tipi:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await timelineAPI.scheduleAppointment({
        cf_paziente: patientId,
        id_medico: doctorId,
        appointment_type: formData.appointment_type,
        suggested_date: formData.suggested_date,
        priority: formData.priority,
        notes: formData.notes
      });
      alert('Appuntamento programmato con successo!');
      onSuccess();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Nuovo Appuntamento</h2>
        <p style={{color: '#86868b', margin: '10px 0 0 0', fontSize: '16px'}}>
          L'appuntamento verrà inserito nel slot futuro della timeline
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Tipo Appuntamento</label>
          <select
            value={formData.appointment_type}
            onChange={(e) => setFormData({...formData, appointment_type: e.target.value})}
            style={styles.select}
            required
            disabled={loading}
          >
            {availableTypes.map(type => (
              <option key={type.type} value={type.type}>
                {type.description}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Data Appuntamento</label>
          <input
            type="date"
            value={formData.suggested_date}
            onChange={(e) => setFormData({...formData, suggested_date: e.target.value})}
            style={styles.input}
            min={getMinDate()}
            required
            disabled={loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Note Preparatorie</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            style={styles.textarea}
            placeholder="Note per l'appuntamento futuro..."
            disabled={loading}
          />
        </div>

        <div style={{display: 'flex', gap: '15px'}}>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Creazione...' : 'Crea Appuntamento'}
          </button>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
};