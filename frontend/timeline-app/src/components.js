
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
import { loadAvailablePathologie, hasAvailablePathologie, getPatologieOptions } from './api';

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


export const PatientLookup = ({ onPatientFound, onPatientNotFound, onError }) => {
  const [formData, setFormData] = useState({
    cf_paziente: '',
    id_medico: 'DOC001',
    patologia: ''
  });
  const [loading, setLoading] = useState(false);
  const [patologieLoading, setPatologieLoading] = useState(true);
  const [patologieError, setPatologieError] = useState(null);
  useEffect(() => {
    const loadPathologie = async () => {
      console.log('🔄 Loading available Cronoscita from admin service...');
      setPatologieLoading(true);
      setPatologieError(null);
      
      const success = await loadAvailablePathologie();
      
      if (!success || !hasAvailablePathologie()) {
        setPatologieError('Nessuna Cronoscita configurata. Contattare l\'amministratore.');
        console.error('❌ No Cronoscita available from admin service');
      } else {
        console.log('✅ Cronoscita loaded successfully');
      }
      
      setPatologieLoading(false);
    };
    
    loadPathologie();
  }, []);  
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
          <label style={styles.label}>
            Cronoscita/Pathologie *
            {patologieLoading && <span style={{color: '#666', fontSize: '12px'}}> (Caricamento...)</span>}
          </label>
          
          {patologieError ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              ⚠️ {patologieError}
              <br />
              <small>Configurare almeno una Cronoscita nel pannello amministrativo.</small>
            </div>
          ) : (
            <select
              style={{
                ...styles.input,
                backgroundColor: patologieLoading ? '#f3f4f6' : 'white',
                cursor: patologieLoading ? 'not-allowed' : 'pointer'
              }}
              value={formData.patologia}
              onChange={(e) => setFormData({...formData, patologia: e.target.value})}
              required
              disabled={patologieLoading || patologieError}
            >
              <option value="">-- Seleziona Cronoscita --</option>
              {getPatologieOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
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

export const InnovativeTimeline = ({ appointments, patientId, doctorId, onTimelineUpdate, canScheduleNext, checkingReferto, onOpenScheduler
 }) => {
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

        {/* Future Section (Right - Clean Light Yellow Successivo Button) */}
        <div style={styles.futureSection}>
          {hasFutureAppt ? (
            // Has existing future appointment - show as info only
            <div
              style={{
                ...styles.timelinePoint,
                ...styles.futurePoint,
                cursor: 'default'
              }}
              title={`${future[0].type} - ${future[0].date}`}
            >
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
            // No future appointment - clean light yellow button
            <div
              style={{
                ...styles.timelinePoint,
                backgroundColor: canScheduleNext ? '#fef3c7' : '#e5e7eb',
                cursor: canScheduleNext ? 'pointer' : 'not-allowed',
                color: canScheduleNext ? '#92400e' : '#9ca3af',
                fontSize: '12px',
                fontWeight: '600',
                border: canScheduleNext ? '2px solid #fed7aa' : '2px solid #d1d5db',
                transition: 'all 0.3s ease'
              }}
              onClick={canScheduleNext ? onOpenScheduler : undefined}
              title={canScheduleNext ? 'Programma prossimo appuntamento' : 'Completa referto prima'}
              onMouseEnter={(e) => {
                if (canScheduleNext) {
                  e.target.style.backgroundColor = '#fde68a';
                }
              }}
              onMouseLeave={(e) => {
                if (canScheduleNext) {
                  e.target.style.backgroundColor = '#fef3c7';
                }
              }}
            >
              {checkingReferto ? 'Controllo...' : 'Successivo'}
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

const ProfessionalTabs = ({ patientId, doctorId, onRefertoSaved }) => {
  const [activeTab, setActiveTab] = useState('refertazione');
  const [referto, setReferto] = useState('');
  const [diario, setDiario] = useState('');
  const [saving, setSaving] = useState(false);
  const [refertoSaved, setRefertoSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  // Analytics iframe state - simplified (no minimize/maximize state)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [hasExistingReferto, setHasExistingReferto] = useState(false);
  const [loadingExistingReferto, setLoadingExistingReferto] = useState(false);
  const [existingRefertoData, setExistingRefertoData] = useState(null);

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
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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

  useEffect(() => {
    loadExistingReferto();
  }, [patientId, doctorId]);

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

  const loadExistingReferto = async () => {
    if (!patientId || !doctorId) return;

    setLoadingExistingReferto(true);
    try {
      const response = await timelineAPI.getTodaysReferto(patientId, doctorId);
      
      if (response.success && response.has_referto_today && response.referto) {
        // Found existing referto for today
        setHasExistingReferto(true);
        setExistingRefertoData(response.referto);
        setReferto(response.referto.testo_referto || '');
        setRefertoSaved(true);
        setSaveMessage('Referto già salvato oggi ✅');
        console.log('✅ Loaded existing referto:', response.referto);
      } else {
        // No existing referto for today
        setHasExistingReferto(false);
        setExistingRefertoData(null);
        setReferto('');
        setRefertoSaved(false);
        setSaveMessage('');
      }
    } catch (error) {
      console.error('❌ Error loading existing referto:', error);
      setHasExistingReferto(false);
      setExistingRefertoData(null);
    }
    setLoadingExistingReferto(false);
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'refertazione':
        const canSave = referto.trim().length >= 10 && !hasExistingReferto;
        const isReadOnly = hasExistingReferto || refertoSaved;

        const handleSaveReferto = async () => {
          if (!canSave) {
            setSaveMessage('Il referto deve contenere almeno 10 caratteri');
            return;
          }

          if (hasExistingReferto) {
            setSaveMessage('Referto già salvato per oggi. Non è possibile salvare nuovamente.');
            return;
          }

          setSaving(true);
          setSaveMessage('');

          try {
            const refertoData = {
              cf_paziente: patientId,
              id_medico: doctorId,
              testo_referto: referto,
              data_visita: new Date().toISOString().split('T')[0]
            };

            const response = await timelineAPI.saveReferto(refertoData);
            
            if (response.success) {
              setRefertoSaved(true);
              setHasExistingReferto(true);
              setSaveMessage('Referto salvato con successo! ✅');
              console.log('✅ Referto saved successfully:', response);
              if (onRefertoSaved) {
                onRefertoSaved();
              }
            } else {
              setSaveMessage('Errore nel salvataggio del referto');
            }
          } catch (error) {
            console.error('❌ Error saving referto:', error);
            setSaveMessage('Errore di connessione durante il salvataggio');
          }

          setSaving(false);
        };

        return (
          <div style={{...tabContentStyles.refertazione, padding: '35px', borderRadius: '16px', border: '2px solid', borderColor: tabContentStyles.refertazione.borderColor}}>
            {/* Add CSS styles */}
            <style>{sparkleStyle}</style>
            
            {/* Loading existing referto */}
            {loadingExistingReferto && (
              <div style={{
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#1d4ed8',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Caricamento referto esistente...
              </div>
            )}
            
            {/* Header with Save Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#1d4ed8'
              }}>
                Refertazione Medica
                {hasExistingReferto && (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#059669',
                    marginLeft: '10px',
                    padding: '4px 8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    Salvato Oggi
                  </span>
                )}
              </h3>

              {/* Salva Referto Button */}
              <button
                onClick={handleSaveReferto}
                disabled={!canSave || saving || hasExistingReferto}
                style={{
                  padding: '10px 20px',
                  background: hasExistingReferto
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : canSave && !saving
                      ? (refertoSaved 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)')
                      : '#e5e7eb',
                  color: (hasExistingReferto || refertoSaved || canSave) && !saving ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (canSave || hasExistingReferto) && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (canSave || hasExistingReferto) && !saving ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.3s ease',
                  minWidth: '140px',
                  justifyContent: 'center',
                  opacity: hasExistingReferto ? 0.8 : 1
                }}
              >
                {saving ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Salvando...
                  </>
                ) : hasExistingReferto ? (
                  <>
                    ✅ Già Salvato
                  </>
                ) : refertoSaved ? (
                  <>
                    ✅ Salvato
                  </>
                ) : (
                  <>
                    💾 Salva Referto
                  </>
                )}
              </button>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div style={{
                padding: '10px 15px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: (refertoSaved || hasExistingReferto) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${(refertoSaved || hasExistingReferto) ? '#10b981' : '#ef4444'}`,
                color: (refertoSaved || hasExistingReferto) ? '#059669' : '#dc2626',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {saveMessage}
              </div>
            )}

            {/* Voice Recording Button - only show if not already saved */}
            {!hasExistingReferto && (
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
                >
                  <span className="ai-sparkle">✨</span>
                  <span>🎤 Referto Vocale AI</span>
                </button>
              </div>
            )}

            {/* Referto Textarea */}
            <textarea
              value={referto}
              onChange={(e) => {
                if (!isReadOnly) {
                  setReferto(e.target.value);
                  // Reset saved state when text changes after saving
                  if (refertoSaved && e.target.value !== referto) {
                    setRefertoSaved(false);
                    setSaveMessage('');
                  }
                }
              }}
              readOnly={isReadOnly}
              placeholder={isReadOnly ? "Referto salvato - visualizzazione in sola lettura" : "Inserisci qui la refertazione medica del paziente..."}
              style={{
                width: '100%',
                height: '350px',
                padding: '20px',
                border: `2px solid ${isReadOnly ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                borderRadius: '12px',
                fontSize: '16px',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical',
                backgroundColor: isReadOnly ? 'rgba(248, 250, 252, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease',
                cursor: isReadOnly ? 'not-allowed' : 'text',
                color: isReadOnly ? '#4b5563' : '#1f2937'
              }}
              onFocus={(e) => {
                if (!isReadOnly) {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                if (!isReadOnly) {
                  e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />

            {/* Character Counter */}
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              color: isReadOnly ? '#6b7280' : canSave ? '#059669' : '#ef4444',
              fontWeight: '500',
              textAlign: 'right'
            }}>
              {referto.length} caratteri 
              {isReadOnly ? ' (referto salvato)' : canSave ? ' (minimo raggiunto ✅)' : ' (minimo 10 caratteri)'}
            </div>
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
  const [canScheduleNext, setCanScheduleNext] = useState(false);
  const [checkingReferto, setCheckingReferto] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    if (patientId && doctorId) {
      loadTimeline();
      checkCanScheduleNext();
    }
  }, [patientId, doctorId]);

  // ================================
  // SCHEDULER POSTMESSAGE HANDLING - NEW
  // ================================
  useEffect(() => {
    if (!showScheduler) return;

    const handleSchedulerMessage = (event) => {
      // Security check in production
      const allowedPorts = ['3013', '3010']; // Scheduler and Timeline ports
      if (process.env.NODE_ENV === 'production' && 
          !allowedPorts.some(port => event.origin.includes(port))) {
        return;
      }

      console.log('📩 Received message from scheduler:', event.data);

      switch (event.data.type) {
        case 'APPOINTMENT_SCHEDULED':
          console.log('✅ Appointment scheduled successfully:', event.data.data);
          
          // Show success message with Italian format
          const appointmentDate = new Date(event.data.data.appointment_date).toLocaleDateString('it-IT');
          alert(`✅ Appuntamento programmato con successo per ${appointmentDate}!\n` +
                `Esami selezionati: ${event.data.data.exam_count}`);
          
          // Refresh timeline to show new appointment
          loadTimeline();
          
          // Re-check referto status
          checkCanScheduleNext();
          
          // Close scheduler
          setShowScheduler(false);
          break;

        case 'CLOSE_SCHEDULER':
          console.log('🔒 Scheduler requested to close');
          setShowScheduler(false);
          break;

        case 'SCHEDULER_ERROR':
          console.error('❌ Scheduler error:', event.data.data);
          alert(`❌ Errore scheduler: ${event.data.data.message || 'Errore imprevisto'}`);
          break;

        default:
          console.log('📨 Unknown scheduler message:', event.data.type);
          break;
      }
    };

    window.addEventListener('message', handleSchedulerMessage);
    
    return () => {
      window.removeEventListener('message', handleSchedulerMessage);
    };
  }, [showScheduler]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await timelineAPI.getTimeline(patientId, doctorId);
      setTimeline(response);
      console.log('📋 Timeline loaded:', response); // Debug timeline data
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const checkCanScheduleNext = async () => {
    if (!patientId || !doctorId) return;
    
    setCheckingReferto(true);
    try {
      const response = await timelineAPI.checkCanScheduleNext(patientId, doctorId);
      setCanScheduleNext(response.can_schedule_next || false);
      console.log('✅ Can schedule next appointment:', response.can_schedule_next);
    } catch (error) {
      console.error('❌ Error checking referto status:', error);
      setCanScheduleNext(false);
    }
    setCheckingReferto(false);
  };

  // ================================
  // SCHEDULER URL BUILDER - NEW
  // ================================
  const buildSchedulerUrl = () => {
    if (!timeline || !patientId || !doctorId) {
      console.warn('⚠️ Missing data for scheduler URL:', {
        timeline: !!timeline,
        patientId: !!patientId,
        doctorId: !!doctorId
      });
      return 'about:blank'; // Prevent invalid URL
    }
    
    const cronoscita_id = timeline.cronoscita_id || timeline.patologia_id;
    if (!cronoscita_id) {
      console.error('❌ Missing cronoscita_id for scheduler URL');
      return 'about:blank';
    }
    
    const baseUrl = `http://${window.location.hostname}:3013`;
    const params = new URLSearchParams({
      cf_paziente: patientId,
      cronoscita_id: cronoscita_id,
      id_medico: doctorId,
      patient_name: encodeURIComponent(timeline.patient_name || `Paziente ${patientId}`),
      cronoscita_name: encodeURIComponent(timeline.patologia || 'Patologia')
    });
    
    const schedulerUrl = `${baseUrl}?${params.toString()}`;
    console.log('🔗 Scheduler URL built:', schedulerUrl);
    
    // Validate URL before returning
    try {
      new URL(schedulerUrl);
      return schedulerUrl;
    } catch (error) {
      console.error('❌ Invalid scheduler URL:', error);
      return 'about:blank';
    }
  };

  // ================================
  // SCHEDULER OPEN HANDLER - NEW
  // ================================
  const handleOpenScheduler = () => {
    if (!timeline) {
      alert('❌ Caricamento timeline in corso. Attendere...');
      return;
    }
    
    // Enhanced validation with detailed error messages
    console.log('🔍 Validating scheduler prerequisites:', {
      timeline_loaded: !!timeline,
      cronoscita_id: timeline.cronoscita_id,
      patologia_id: timeline.patologia_id,
      patologia_name: timeline.patologia,
      scheduler_available: timeline.scheduler_available,
      patient_name: timeline.patient_name
    });
    
    // Check if scheduler is explicitly disabled
    if (timeline.scheduler_available === false) {
      alert(`❌ Scheduler non disponibile:\n${timeline.scheduler_error || 'Cronoscita non configurata'}\n\nContattare l'amministratore per configurare la Cronoscita per questo paziente.`);
      return;
    }
    
    // Check for cronoscita_id (most critical)
    if (!timeline.cronoscita_id && !timeline.patologia_id) {
      alert(`❌ Impossibile aprire scheduler:\n\nCronoscita non configurata per il paziente.\nPatologia: ${timeline.patologia || 'Non specificata'}\n\n🔧 Soluzioni:\n• Contattare l'amministratore\n• Verificare configurazione Cronoscita\n• Ricontrollare registrazione paziente`);
      return;
    }
    
    // Check for patient identification
    if (!timeline.patient_name && !patientId) {
      alert('❌ Informazioni paziente incomplete. Ricaricare la timeline.');
      return;
    }
    
    // Check for pathology information
    if (!timeline.patologia) {
      console.warn('⚠️ Missing patologia name - scheduler may have limited functionality');
    }
    
    // All checks passed - prepare scheduler data
    const schedulerData = {
      cf_paziente: patientId,
      cronoscita_id: timeline.cronoscita_id || timeline.patologia_id,
      patient_name: timeline.patient_name || `Paziente ${patientId}`,
      patologia: timeline.patologia || 'Patologia non specificata',
      doctor_id: doctorId
    };
    
    console.log('📅 Opening scheduler with validated data:', schedulerData);
    
    // Show loading state briefly
    setShowScheduler(true);
    
    // Optional: Show confirmation for first-time users
    if (localStorage.getItem('scheduler_first_time') !== 'false') {
      setTimeout(() => {
        alert('💡 Scheduler Professionale:\n\n• Seleziona data con colori densità\n• Scegli esami configurati dall\'admin\n• Un solo appuntamento per patologia\n\n✅ Pronto per la programmazione!');
        localStorage.setItem('scheduler_first_time', 'false');
      }, 1000);
    }
  };

  const handleSchedulerLoadError = () => {
    console.error('❌ Scheduler iframe failed to load');
    alert('❌ Errore caricamento scheduler:\n\nIl servizio di programmazione non è disponibile.\nProvare a:\n• Ricaricare la pagina\n• Verificare connessione di rete\n• Contattare supporto tecnico');
    setShowScheduler(false);
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
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              👤
            </div>
            
            <div style={{flex: 1}}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e40af',
                lineHeight: '1.2'
              }}>
                {timeline.patient_name || `Paziente ${patientId}`}
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginTop: '6px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  fontFamily: 'Monaco, monospace',
                  background: 'rgba(107, 114, 128, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {patientId}
                </span>
                
                <span style={{
                  fontSize: '13px',
                  color: '#059669',
                  background: 'rgba(5, 150, 105, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  📋 {timeline.patologia}
                </span>
                
                <span style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Dal: {timeline.enrollment_date}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* Appointment Count */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              color: '#1e40af',
              fontWeight: '600',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              📅 {timeline.total_appointments} visite
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
        canScheduleNext={canScheduleNext}
        checkingReferto={checkingReferto}
        onOpenScheduler={handleOpenScheduler} // UPDATED - Use new handler
      />

      {/* 🔥 PROFESSIONAL TABBED SECTION */}
      <ProfessionalTabs 
        patientId={patientId} 
        doctorId={doctorId}
        onRefertoSaved={checkCanScheduleNext}
      />

      {/* ================================
          SCHEDULER IFRAME MODAL - UPDATED
          ================================ */}
      {showScheduler && (
        <>
          {/* Backdrop with fade animation */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            animation: 'fadeIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            {/* Modal Container */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              width: '95%',
              height: '90%',
              maxWidth: '1400px',
              maxHeight: '900px',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              animation: 'modalSlideUp 0.4s ease-out',
              border: '2px solid rgba(59, 130, 246, 0.2)'
            }}>
              
              {/* Modal Header - Professional styling */}
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    📅
                  </div>
                  <div>
                    <h3 style={{margin: 0, fontSize: '20px', fontWeight: '700'}}>
                      Programmazione Appuntamento
                    </h3>
                    <p style={{margin: '2px 0 0 0', fontSize: '14px', opacity: 0.9}}>
                      {timeline.patient_name} ({patientId}) • {timeline.patologia}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowScheduler(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '44px',
                    height: '44px',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Scheduler Iframe - UPDATED URL */}
              <iframe
                src={buildSchedulerUrl()}
                style={{
                  width: '100%',
                  height: 'calc(100% - 80px)',
                  border: 'none',
                  backgroundColor: '#fafafa'
                }}
                title="Scheduler Professionale"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms"
                onLoad={() => console.log('📅 Scheduler iframe loaded successfully')}
                onError={handleSchedulerLoadError}
                // Add timeout fallback
                ref={(iframe) => {
                  if (iframe) {
                    const timeout = setTimeout(() => {
                      if (iframe.contentDocument?.readyState !== 'complete') {
                        handleSchedulerLoadError();
                      }
                    }, 10000); // 10 second timeout
                    
                    iframe.onload = () => {
                      clearTimeout(timeout);
                      console.log('📅 Scheduler iframe loaded successfully');
                    };
                  }
                }}
              />

              {/* Loading State Overlay */}
              <div style={{
                position: 'absolute',
                top: '80px', // Below header
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                fontSize: '18px',
                fontWeight: '600',
                backdropFilter: 'blur(4px)',
                animation: 'fadeOut 2s ease-out forwards',
                animationDelay: '1s'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid rgba(59, 130, 246, 0.3)',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  📅 Caricamento Scheduler Professionale...
                </div>
              </div>
            </div>
          </div>

          {/* Add CSS animations */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes modalSlideUp {
              from { 
                opacity: 0; 
                transform: translateY(40px) scale(0.95); 
              }
              to { 
                opacity: 1; 
                transform: translateY(0px) scale(1); 
              }
            }
            
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; pointer-events: none; }
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}      
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