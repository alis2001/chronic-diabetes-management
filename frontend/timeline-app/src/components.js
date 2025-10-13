
import React, { useState, useEffect, useRef } from 'react';
import { ProgressBar, Step } from "react-step-progress-bar";
import "react-step-progress-bar/styles.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
      setPatologieError('Nessuna Cronicità configurata. Contattare l\'amministratore.');
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
    
    if (!formData.patologia) {
      alert('Selezionare una Cronicità');
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Create backend session via Gateway
      await createBackendSession(formData);
      console.log('✅ Backend session created via Gateway for doctor:', formData.id_medico);
      
      // 2. Multi-Cronoscita patient lookup with STRICT validation
      console.log('📋 Multi-Cronoscita patient lookup request:', formData);
      const response = await timelineAPI.lookupPatient(
        formData.cf_paziente,
        formData.id_medico,
        formData.patologia
      );
      
      console.log('📊 Multi-Cronoscita patient lookup response:', response);
      
      if (response.exists) {
        // ✅ CRITICAL: Validate cronoscita matches EXACTLY
        const selectedCronoscita = formData.patologia.trim();
        const foundCronoscita = response.patient_data?.patologia?.trim() || '';
        
        if (selectedCronoscita.toUpperCase() !== foundCronoscita.toUpperCase()) {
          console.error('🚨 FRONTEND CRONOSCITA MISMATCH PREVENTION:', {
            selected: selectedCronoscita,
            found: foundCronoscita,
            cf: formData.cf_paziente
          });
          
          alert(`❌ MISMATCH CRONICITÀ RILEVATO:

Cronicità selezionata: "${selectedCronoscita}"
Cronicità nel sistema: "${foundCronoscita}"

🔄 Il paziente risulta registrato per "${foundCronoscita}".
Selezionare la cronicità corretta e riprovare.`);
          
          setLoading(false);
          return;
        }
        
        // Patient found in correct Cronoscita - show timeline
        console.log('✅ Patient registered in CORRECT Cronoscita:', formData.patologia);
        onPatientFound(response, formData);
        
      } else if (response.patient_data?.can_reuse_contacts) {
        // ✅ Patient exists in OTHER Cronoscita - simplified registration
        console.log('📋 Patient exists in other Cronoscita - enabling simplified registration');
        console.log('🔄 Existing enrollments:', response.patient_data.existing_enrollments);
        
        const confirmMessage = `🏥 PAZIENTE TROVATO IN ALTRA CRONICITÀ

  Paziente: ${formData.cf_paziente}
  Cronicità esistente: ${response.patient_data.existing_enrollments?.[0] || 'Sconosciuta'}
  Cronicità richiesta: ${PATOLOGIE[formData.patologia] || formData.patologia}

  📞 I contatti salvati verranno riutilizzati automaticamente.

  ✅ Procedere con registrazione semplificata?`;
        
        if (window.confirm(confirmMessage)) {
          try {
            // Show registration progress
            alert('⏳ Registrazione automatica in corso...');
            
            const registrationResponse = await timelineAPI.registerPatient(
              formData.cf_paziente,
              formData.id_medico,
              formData.patologia
            );
            
            console.log('✅ Auto-registration successful:', registrationResponse);
            
            // Now lookup the newly registered patient with validation
            const newLookupResponse = await timelineAPI.lookupPatient(
              formData.cf_paziente,
              formData.id_medico,
              formData.patologia
            );
            
            // ✅ VALIDATE newly registered patient cronoscita
            const newFoundCronoscita = newLookupResponse.patient_data?.patologia?.trim() || '';
            if (formData.patologia.trim().toUpperCase() !== newFoundCronoscita.toUpperCase()) {
              throw new Error(`Registrazione fallita: cronoscita mismatch dopo registrazione`);
            }
            
            alert('✅ Paziente registrato con successo nella nuova Cronicità!');
            onPatientFound(newLookupResponse, formData);
            
          } catch (autoRegError) {
            console.error('❌ Auto-registration failed:', autoRegError);
            alert(`❌ Errore registrazione automatica: ${autoRegError.message || 'Errore sconosciuto'}\n\nProcedere con registrazione manuale.`);
            onPatientNotFound(response, formData);
          }
        } else {
          // User canceled - still show registration form
          onPatientNotFound(response, formData);
        }
        
      } else {
        // ✅ Completely new patient or patient found in Wirgilio but not registered
        console.log('📋 Patient not registered in any Cronoscita - new registration needed');
        onPatientNotFound(response, formData);
      }
      
    } catch (error) {
      console.error('❌ Patient lookup error:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
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
            Cronicità *
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
              <small>Configurare almeno una Cronicità nel pannello amministrativo.</small>
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
              <option value="">-- Seleziona Cronicità --</option>
              {getPatologieOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Multi-Cronoscita Selected Info */}
        {formData.patologia && (
          <div style={{
            background: '#e8f4fd',
            border: '1px solid #b8daff',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🏥</span>
              <strong style={{ color: '#0066cc', fontSize: '16px' }}>Cronicità Selezionata</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: '600' }}>
              {PATOLOGIE[formData.patologia] || formData.patologia}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              💡 Il paziente verrà cercato/registrato specificamente per questa Cronicità
            </div>
          </div>
        )}

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
// 🔥 PROFESSIONAL TIMELINE USING react-step-progress-bar (Highly Customizable)
// Layout: Past (max 5) → OGGI (center, large) → SUCCESSIVO (right)
// ================================

export const InnovativeTimeline = ({ appointments, patientId, doctorId, onTimelineUpdate, canScheduleNext, checkingReferto, onOpenScheduler }) => {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [pastScrollOffset, setPastScrollOffset] = useState(0);

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
      past: past.sort((a, b) => new Date(a.date) - new Date(b.date)), // Oldest to newest
      today: todayAppts, 
      future: future.sort((a, b) => new Date(a.date) - new Date(b.date))
    };
  };

  const { past, today: todayAppts, future } = organizeAppointments(appointments);
  const hasFutureAppt = future.length > 0;
  
  console.log('🔍 Timeline Organization:', {
    total_appointments: appointments?.length || 0,
    past_count: past.length,
    today_count: todayAppts.length, 
    future_count: future.length,
    hasFutureAppt: hasFutureAppt
  });

  // 3-POINT SLIDING WINDOW APPROACH
  // Page 0 (default/rightmost): [Latest Past] - [OGGI] - [SUCCESSIVO]
  // Page 1: [Past #14] - [Past #13] - [Past #12] (3 past appointments)
  // Page 2: [Past #11] - [Past #10] - [Past #9] (3 past appointments)
  // etc.
  
  const POINTS_PER_PAGE = 3;
  const currentPage = pastScrollOffset; // Use as page number instead of offset
  
  // Calculate total pages: 1 for default view + pages for remaining past appointments
  // If we have 15 past: Page 0 shows 1, leaving 14. 14/3 = 5 pages (rounded up)
  const remainingPastAfterDefault = Math.max(0, past.length - 1);
  const totalPages = 1 + Math.ceil(remainingPastAfterDefault / POINTS_PER_PAGE);
  
  // Determine what to show based on current page
  const isDefaultView = currentPage === 0;
  
  let visiblePoints = [];
  if (isDefaultView) {
    // Show: Latest Past + OGGI + SUCCESSIVO
    if (past.length > 0) {
      visiblePoints = [
        { type: 'past', data: past[past.length - 1], index: past.length - 1 },
        { type: 'oggi', data: todayAppts },
        { type: hasFutureAppt ? 'future' : 'successivo', data: hasFutureAppt ? future[0] : null }
      ];
    } else {
      // No past appointments
      visiblePoints = [
        { type: 'oggi', data: todayAppts },
        { type: hasFutureAppt ? 'future' : 'successivo', data: hasFutureAppt ? future[0] : null }
      ];
    }
  } else {
    // Show: 3 past appointments (OLDEST on LEFT, NEWEST on RIGHT)
    // Page 1: indices 11, 12, 13 (left→right = older→newer)
    // Page 2: indices 8, 9, 10
    // Page 3: indices 5, 6, 7
    
    // Calculate the HIGHEST index for this page (rightmost/newest on the page)
    const highestIdx = past.length - 2 - ((currentPage - 1) * POINTS_PER_PAGE);
    
    // Calculate the LOWEST index for this page (leftmost/oldest on the page)
    const lowestIdx = Math.max(0, highestIdx - (POINTS_PER_PAGE - 1));
    
    // Add appointments from OLDEST (left) to NEWEST (right)
    for (let idx = lowestIdx; idx <= highestIdx && idx < past.length; idx++) {
      visiblePoints.push({ type: 'past', data: past[idx], index: idx });
    }
  }

  // Navigation
  const canScrollLeft = currentPage < totalPages - 1 && past.length > 1;
  const canScrollRight = currentPage > 0;

  const handleScrollLeft = () => {
    if (canScrollLeft) {
      setPastScrollOffset(currentPage + 1);
    }
  };

  const handleScrollRight = () => {
    if (canScrollRight) {
      setPastScrollOffset(currentPage - 1);
    }
  };

  // Handle date selection to jump to specific page
  const handleDateSelect = (e) => {
    const selectedDateStr = e.target.value; // YYYY-MM-DD format
    
    // Only process if we have a complete date string (YYYY-MM-DD format)
    if (!selectedDateStr || selectedDateStr.length !== 10) return;
    
    const selectedDate = new Date(selectedDateStr);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (isNaN(selectedDate)) return;
    
    // If date is today or future, go to default view
    const todayCheck = new Date(today);
    todayCheck.setHours(0, 0, 0, 0);
    if (selectedDate >= todayCheck) {
      setPastScrollOffset(0);
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Find appointment with EXACT matching date
    let exactIndex = -1;
    
    past.forEach((apt, index) => {
      const aptDate = new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      
      // Check if dates match exactly
      if (aptDate.getTime() === selectedDate.getTime()) {
        exactIndex = index;
      }
    });
    
    // If no exact match found, don't navigate - just silently ignore
    if (exactIndex === -1) {
      console.log('No appointment found for date:', selectedDateStr);
      e.target.value = ''; // Clear the input
      return;
    }
    
    console.log('Found appointment at index:', exactIndex, 'out of', past.length);
    
    // If it's the most recent past appointment (last in array), go to default view
    if (exactIndex === past.length - 1) {
      console.log('Most recent appointment - going to default view');
      setPastScrollOffset(0);
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Calculate which page contains this appointment
    // past array is sorted oldest to newest: [0, 1, 2, ..., past.length-1]
    // Page 0 (default): shows past[past.length-1] + OGGI + SUCCESSIVO
    // Page 1: shows past[past.length-2], past[past.length-3], past[past.length-4]
    // Page 2: shows past[past.length-5], past[past.length-6], past[past.length-7]
    
    // How many positions from the end?
    const positionsFromEnd = past.length - 1 - exactIndex;
    
    if (positionsFromEnd === 0) {
      // Most recent - default view
      console.log('Positions from end: 0 - default view');
      setPastScrollOffset(0);
    } else {
      // Calculate page number
      // positionsFromEnd 1 -> not on any page (this is shown in default view)
      // positionsFromEnd 2,3,4 -> page 1
      // positionsFromEnd 5,6,7 -> page 2
      const page = Math.ceil((positionsFromEnd - 1) / POINTS_PER_PAGE);
      console.log('Positions from end:', positionsFromEnd, '-> Page:', page);
      setPastScrollOffset(Math.min(page, totalPages - 1));
    }
    
    // Clear the input after navigation
    e.target.value = '';
  };

  return (
    <div style={{
      padding: '50px 30px',
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      marginBottom: '30px'
    }}>
      {/* Navigation arrows for past appointments */}
      {past.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '700px',
          margin: '0 auto 30px auto',
          gap: '20px'
        }}>
          <button
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid #e5e7eb',
              background: canScrollLeft ? 'white' : '#f3f4f6',
              color: canScrollLeft ? '#3b82f6' : '#9ca3af',
              fontSize: '16px',
              fontWeight: '700',
              cursor: canScrollLeft ? 'pointer' : 'not-allowed',
              boxShadow: canScrollLeft ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Più Vecchie
          </button>
          
          {/* Custom Date Picker with purple appointment dates */}
          <DatePicker
            selected={null}
            onChange={(date) => {
              if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                handleDateSelect({ target: { value: dateStr } });
              }
            }}
            highlightDates={[{
              "react-datepicker__day--highlighted-custom-1": past.map(apt => new Date(apt.date))
            }]}
            minDate={past.length > 0 ? new Date(past[0].date) : null}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            locale="it"
            placeholderText="Seleziona data"
            className="custom-datepicker"
            calendarClassName="custom-calendar"
            wrapperClassName="datepicker-wrapper"
            customInput={
              <input
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '2px solid white',
                  background: 'white',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  outline: 'none',
                  minWidth: '150px',
                  textAlign: 'center'
                }}
              />
            }
          />
          
          <button
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid #e5e7eb',
              background: canScrollRight ? 'white' : '#f3f4f6',
              color: canScrollRight ? '#3b82f6' : '#9ca3af',
              fontSize: '16px',
              fontWeight: '700',
              cursor: canScrollRight ? 'pointer' : 'not-allowed',
              boxShadow: canScrollRight ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Più Recenti →
          </button>
        </div>
      )}

      {/* react-step-progress-bar library - CUSTOM LAYOUT */}
      <div style={{
        width: '90%',
        margin: '0 auto',
        minHeight: '280px',
        padding: '40px 40px',
        position: 'relative'
      }}>
        <ProgressBar
          percent={isDefaultView ? 50 : 100}
          filledBackground={isDefaultView ? "linear-gradient(to right, #8b5cf6, #10b981)" : "linear-gradient(to right, #8b5cf6, #a855f7)"}
          height={10}
          unfilledBackground={isDefaultView ? "linear-gradient(to right, #10b981, #f59e0b)" : "#e5e7eb"}
        >
          {/* Render 3-point sliding window */}
          {visiblePoints.map((point, pointIndex) => {
            // Calculate even spacing based on number of points
            const numPoints = visiblePoints.length;
            let position;
            
            if (numPoints === 3) {
              position = 20 + (pointIndex * 30); // 20%, 50%, 80%
            } else if (numPoints === 2) {
              position = 33 + (pointIndex * 34); // 33%, 67%
            } else {
              // Single point - ALWAYS centered at 50%
              position = 50;
            }

            // OGGI gets center treatment
            const isOggi = point.type === 'oggi';
            const isPast = point.type === 'past';
            const isSuccessivo = point.type === 'successivo';
            const isFuture = point.type === 'future';

            // For OGGI in default view with 3 points, force absolute center position
            if (isOggi && isDefaultView && numPoints === 3) {
              position = 50;
            }

            const pointKey = point.type === 'past' ? `past-${point.index}` : point.type;

            return (
              <Step key={pointKey} position={position}>
                {({ accomplished }) => (
                  isOggi ? (
                    // OGGI BUTTON - LARGEST, GREEN
                    <div style={{ 
                      position: isDefaultView ? 'absolute' : 'relative',
                      left: isDefaultView ? '50%' : 'auto',
                      transform: isDefaultView ? 'translateX(-50%)' : 'none',
                      top: '-55px',
                      textAlign: 'center',
                      zIndex: 50
                    }}
                      onMouseEnter={() => setHoveredStep('oggi')}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      {/* OGGI dot - LARGEST */}
                      <div style={{
                        width: '110px',
                        height: '110px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: '900',
                        boxShadow: '0 12px 35px rgba(16, 185, 129, 0.7)',
                        cursor: 'default',
                        border: '6px solid white',
                        transform: hoveredStep === 'oggi' ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        zIndex: 50
                      }}>
                        OGGI
                      </div>
                      {/* OGGI date below - CLICKABLE BUTTON to return to default view */}
                      <button
                        onClick={() => setPastScrollOffset(0)}
                        style={{
                          position: 'absolute',
                          top: '125px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          padding: '10px 18px',
                          backgroundColor: 'white',
                          borderRadius: '10px',
                          border: '2px solid #10b981',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#10b981',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f0fdf4';
                          e.target.style.transform = 'translateX(-50%) scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'white';
                          e.target.style.transform = 'translateX(-50%) scale(1)';
                        }}
                        title="Clicca per tornare alla vista corrente"
                      >
                        {today.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </button>
                    </div>
                  ) : isPast ? (
                    // PAST APPOINTMENT BUTTON
                    <div style={{ position: 'relative', textAlign: 'center' }}
                      onMouseEnter={() => setHoveredStep(`past-${point.index}`)}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      {/* Past appointment dot with DATE + YEAR */}
                      <div style={{
                        width: isDefaultView ? '75px' : '80px',
                        height: isDefaultView ? '75px' : '80px',
                        borderRadius: '50%',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxShadow: '0 6px 18px rgba(139, 92, 246, 0.45)',
                        cursor: 'pointer',
                        border: '5px solid white',
                        transform: hoveredStep === `past-${point.index}` ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        zIndex: 20,
                        lineHeight: '1.1'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: '800' }}>
                          {new Date(point.data.date).toLocaleDateString('it-IT', { day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '600', opacity: 0.95 }}>
                          {new Date(point.data.date).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', opacity: 1, marginTop: '2px' }}>
                          {new Date(point.data.date).getFullYear()}
                        </div>
                      </div>
                    </div>
                  ) : isFuture ? (
                    // FUTURE APPOINTMENT - GREEN CHECK
                    <div style={{ position: 'relative', textAlign: 'center' }}
                      onMouseEnter={() => setHoveredStep('future')}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      <div style={{
                        width: '75px',
                        height: '75px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: '700',
                        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.5)',
                        cursor: 'default',
                        border: '5px solid white',
                        transform: hoveredStep === 'future' ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        zIndex: 20
                      }}>
                        ✓
                      </div>
                      {/* Future appointment date below - Italian format */}
                      <div style={{
                        position: 'absolute',
                        top: '90px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '10px 18px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        border: '2px solid #22c55e',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#22c55e',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}>
                        {new Date(point.data.date).toLocaleDateString('it-IT', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        }).toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    // SUCCESSIVO BUTTON (schedulable or locked)
                    <div style={{ position: 'relative', textAlign: 'center' }}
                      onMouseEnter={() => setHoveredStep('successivo')}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      {canScheduleNext ? (
                        // YELLOW SCHEDULABLE
                        <>
                          <div
                            onClick={onOpenScheduler}
                            style={{
                              width: '75px',
                              height: '75px',
                              borderRadius: '50%',
                              backgroundColor: '#fbbf24',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '30px',
                              fontWeight: '700',
                              boxShadow: '0 8px 24px rgba(251, 191, 36, 0.6)',
                              cursor: 'pointer',
                              border: '5px solid white',
                              transform: hoveredStep === 'successivo' ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              zIndex: 20
                            }}
                            title="Clicca per programmare appuntamento"
                          >
                            📅
                          </div>
                          <div style={{
                            position: 'absolute',
                            top: '90px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            minWidth: '140px',
                            padding: '14px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '2px solid #fbbf24',
                            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.35)',
                            fontSize: '12px',
                            color: '#374151',
                            lineHeight: '1.5',
                            transition: 'all 0.2s ease'
                          }}>
                            <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '6px', fontSize: '14px' }}>
                              Successivo
                            </div>
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                              ✅ Disponibile
                            </div>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                              Clicca per programmare
                            </div>
                          </div>
                        </>
                      ) : (
                        // GREY LOCKED
                        <>
                          <div style={{
                            width: '75px',
                            height: '75px',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            color: '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '30px',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                            cursor: 'not-allowed',
                            border: '5px solid white',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            zIndex: 20
                          }}>
                            🔒
                          </div>
                          <div style={{
                            position: 'absolute',
                            top: '90px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            minWidth: '180px',
                            maxWidth: '220px',
                            padding: '12px 14px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '2px solid #d1d5db',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            fontSize: '11px',
                            color: '#6b7280',
                            lineHeight: '1.4',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '10px', fontStyle: 'italic' }}>
                              Completa e salva il referto per abilitare il prossimo appuntamento
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                )}
              </Step>
            );
          })}
        </ProgressBar>
      </div>

      {/* Timeline Legend */}
      <div style={{
        display: 'flex', 
        justifyContent: 'center',
        gap: '40px',
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            backgroundColor: '#8b5cf6'
          }} />
          <span style={{color: '#6b7280'}}>Visite Passate ({past.length})</span>
        </div>
        
        {/* OGGI as HOME button - enlarged and prominent */}
        <button
          onClick={() => setPastScrollOffset(0)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: '2px solid #10b981',
            cursor: 'pointer',
            padding: '12px 24px',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            fontSize: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
          title="Clicca per tornare alla vista corrente"
        >
          <span style={{color: 'white', fontWeight: '800', fontSize: '16px'}}>🏠 OGGI</span>
        </button>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            backgroundColor: hasFutureAppt ? '#22c55e' : (canScheduleNext ? '#fbbf24' : '#9ca3af')
          }} />
          <span style={{color: '#6b7280'}}>
            {hasFutureAppt ? 'Programmato' : (canScheduleNext ? 'Disponibile' : 'Bloccato')}
          </span>
        </div>
      </div>
    </div>
  );
};

// ================================
// 🔥 STEP 2: PROFESSIONAL TABBED SECTION
// ================================

const ProfessionalTabs = ({ patientId, doctorId, patologia, onRefertoSaved, onDirtyStateChange, hasFutureAppointment }) => {
  const [activeTab, setActiveTab] = useState('refertazione');
  const [referto, setReferto] = useState('');
  const [diario, setDiario] = useState('');
  const [saving, setSaving] = useState(false);
  const [refertoSaved, setRefertoSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [diarioLoaded, setDiarioLoaded] = useState(false);
  // Analytics iframe state - simplified (no minimize/maximize state)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [hasExistingReferto, setHasExistingReferto] = useState(false);
  const [loadingExistingReferto, setLoadingExistingReferto] = useState(false);
  const [existingRefertoData, setExistingRefertoData] = useState(null);
  const [savedRefertoText, setSavedRefertoText] = useState(''); // Track last saved version
  const [isDirty, setIsDirty] = useState(false); // Track if modified after save
  const [currentRefertoId, setCurrentRefertoId] = useState(null); // Track referto_id for updates

  // Notify parent when dirty state changes (only when it changes, not on every render)
  useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isDirty);
    }
  }, [isDirty]); // Remove onDirtyStateChange from dependencies to prevent infinite loop

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
    if (tabId === 'diario' && !diarioLoaded) {
      setDiarioLoaded(true);
    }
  };

  useEffect(() => {
    if (patientId && doctorId && patologia) {
      loadExistingReferto();
    } else {
      console.warn('⚠️ ProfessionalTabs: Missing required props for loadExistingReferto');
    }
  }, [patientId, doctorId, patologia]);

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
    if (!patientId || !doctorId || !patologia) {
      console.warn('⚠️ Missing data for referto loading:', {
        patientId: !!patientId,
        doctorId: !!doctorId,
        patologia: !!patologia
      });
      return;
    }

    setLoadingExistingReferto(true);
    try {
      console.log('🔍 Loading existing referto with cronoscita context:', {
        cf_paziente: patientId,
        id_medico: doctorId,
        patologia: patologia
      });

      // ✅ FIXED: Pass patologia parameter to get cronoscita-specific referto
      const response = await timelineAPI.getTodaysReferto(patientId, doctorId, patologia);
      
      if (response.success && response.has_referto_today && response.referto) {
        // Found existing referto for today in this cronoscita
        const loadedText = response.referto.testo_referto || '';
        setHasExistingReferto(true);
        setExistingRefertoData(response.referto);
        setReferto(loadedText);
        setSavedRefertoText(loadedText); // Track the saved version
        setCurrentRefertoId(response.referto.referto_id); // Save referto_id for updates
        setRefertoSaved(true);
        setIsDirty(false); // Not dirty when just loaded
        console.log('✅ Loaded existing referto for cronoscita:', {
          cronoscita: patologia,
          referto_id: response.referto.referto_id
        });
      } else {
        // No existing referto for today in this cronoscita
        setHasExistingReferto(false);
        setExistingRefertoData(null);
        setReferto('');
        setSavedRefertoText('');
        setCurrentRefertoId(null); // Reset referto_id
        setRefertoSaved(false);
        setIsDirty(false);
        setSaveMessage('');
        console.log('ℹ️ No existing referto found for today in cronoscita:', patologia);
      }
    } catch (error) {
      console.error('❌ Error loading existing referto:', error);
      setHasExistingReferto(false);
      setExistingRefertoData(null);
      
      // Don't show error to user for missing referto - this is expected behavior
      if (!error.message?.includes('404') && !error.message?.includes('not found')) {
        console.warn('⚠️ Unexpected error loading referto:', error.message);
      }
    }
    setLoadingExistingReferto(false);
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'refertazione':
        // 🔥 NEW LOGIC: Allow editing until future appointment exists
        // isReadOnly: Lock editing ONLY if future appointment is scheduled
        // canSave: Can save if there's content AND (no existing referto OR referto has been modified)
        const isReadOnly = hasFutureAppointment; // Lock only when future appointment exists
        const canSave = !isReadOnly && referto.trim().length > 0; // Can save if not locked and has content

        const handleSaveReferto = async () => {
          // Allow re-saving as long as no future appointment exists
          if (!canSave) {
            setSaveMessage('Referto vuoto. Inserisci del testo per salvare.');
            return;
          }

          setSaving(true);
          setSaveMessage('');

          try {
            // ✅ CRITICAL FIX: Include patologia (cronoscita) in referto data
            const refertoData = {
              cf_paziente: patientId,
              id_medico: doctorId,
              testo_referto: referto,
              data_visita: new Date().toISOString().split('T')[0],
              
              // ✅ THIS WAS MISSING - CAUSES 422 ERROR!
              patologia: patologia,  // Add cronoscita context from workspace
              
              // ✅ CRITICAL: Pass referto_id if updating existing referto
              referto_id: currentRefertoId  // This makes backend UPDATE instead of CREATE
            };

            console.log('💾 Saving referto with cronoscita context:', {
              cf_paziente: patientId,
              cronoscita: patologia,
              text_length: referto.length,
              is_update: hasExistingReferto,
              referto_id: currentRefertoId
            });

            const response = await timelineAPI.saveReferto(refertoData);
            
            if (response.success) {
              setRefertoSaved(true);
              setHasExistingReferto(true);
              setSavedRefertoText(referto); // Save the current version
              setIsDirty(false); // Mark as clean
              
              // If this was a new referto, save the returned ID
              if (!currentRefertoId && response.referto_id) {
                setCurrentRefertoId(response.referto_id);
                console.log('📝 New referto created with ID:', response.referto_id);
              }
              
              setSaveMessage(''); // Clear any messages
              console.log('✅ Referto saved successfully with cronoscita:', response);
              
              if (onRefertoSaved) {
                onRefertoSaved();
              }
            } else {
              setSaveMessage(`Errore: ${response.message || 'Salvataggio fallito'}`);
            }
          } catch (error) {
            console.error('❌ Error saving referto:', error);
            
            // Better error messaging based on error type
            if (error.message?.includes('422') || error.message?.includes('Unprocessable')) {
              setSaveMessage('❌ Errore validazione dati. Verificare cronoscita selezionata.');
            } else if (error.message?.includes('cronoscita') || error.message?.includes('Cronoscita')) {
              setSaveMessage('❌ Errore cronicità. Riselezionare cronicità corretta.');
            } else {
              setSaveMessage('❌ Errore di connessione durante il salvataggio');
            }
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
              </h3>

              {/* Salva Referto Button */}
              <button
                onClick={handleSaveReferto}
                disabled={!canSave || saving}
                style={{
                  padding: '10px 20px',
                  background: canSave && !saving
                    ? (isDirty 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' // Orange if modified
                        : (hasExistingReferto 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Green if saved and clean
                            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)')) // Blue if new
                    : '#e5e7eb',
                  color: canSave && !saving ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: canSave && !saving ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.3s ease',
                  minWidth: '160px',
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
                ) : isDirty ? (
                  <>
                    💾 Salva Modifiche
                  </>
                ) : hasExistingReferto ? (
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

            {/* Voice Recording Button - show if editable (no future appointment) */}
            {!isReadOnly && (
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
                  const newValue = e.target.value;
                  setReferto(newValue);
                  
                  // Track dirty state: check if current text differs from saved version
                  if (hasExistingReferto && newValue !== savedRefertoText) {
                    setIsDirty(true);
                    setSaveMessage(''); // No message shown
                  } else if (hasExistingReferto && newValue === savedRefertoText) {
                    setIsDirty(false);
                    setSaveMessage('');
                  }
                }
              }}
              readOnly={isReadOnly}
              placeholder={isReadOnly ? "🔒 Referto bloccato - Il prossimo appuntamento è stato programmato" : "Inserisci qui la refertazione medica del paziente..."}
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

            {/* Character Counter - REMOVED per user request */}
            {/* User doesn't want character count display */}
          </div>
        );

      case 'diario':
        return (
          <div style={{...tabContentStyles.diario, padding: '0', overflow: 'hidden'}}>
            {diarioLoaded ? (
              <EmbeddedDiarioWindow 
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
                color: '#10b981',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                📝 Caricamento Diario Clinico...
              </div>
            )}
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

const EmbeddedDiarioWindow = ({ 
  patientId, 
  doctorId 
}) => {
  const diarioHost = window.location.hostname;
  const diarioPort = process.env.REACT_APP_DIARIO_FRONTEND_PORT || '3014';
  const diarioUrl = `http://${diarioHost}:${diarioPort}?cf=${patientId}&doctor_id=${doctorId}&embedded=true`;
  
  return (
    <div style={{
      height: '800px', // Same size as analytics iframe
      position: 'relative',
      background: 'transparent',
      borderRadius: '0px',
      overflow: 'hidden'
    }}>
      {/* Direct iframe - no wrapper */}
      <iframe
        src={diarioUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent'
        }}
        title="Diario Clinico"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </div>
  );
};

// ================================
// 🔥 STEP 2: UPDATED PATIENT TIMELINE - COMPRESSED INFO + TABS
// ================================

export const PatientTimeline = ({ patientId, doctorId, patologia, onScheduleAppointment }) => {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canScheduleNext, setCanScheduleNext] = useState(false);
  const [checkingReferto, setCheckingReferto] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [refertoHasUnsavedChanges, setRefertoHasUnsavedChanges] = useState(false);

  // Handle referto dirty state changes - SIMPLIFIED to prevent infinite loop
  const handleRefertoStateChange = (isDirty) => {
    setRefertoHasUnsavedChanges(isDirty);
    // Don't call checkCanScheduleNext here - it causes infinite loops
    // Instead, just disable scheduling if dirty
    if (isDirty) {
      setCanScheduleNext(false);
    }
    // When saved (not dirty), the onRefertoSaved callback will handle re-checking
  };

  useEffect(() => {
    if (patientId && doctorId) {
      console.log('🏥 Timeline loading for specific Cronoscita:', { patientId, doctorId, patologia });
      loadTimelineForCronoscita();
      checkCanScheduleNext();
    }
  }, [patientId, doctorId, patologia]);

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
          
          // Simple refresh - no polling needed since we fixed the root cause
          loadTimelineForCronoscita().then(() => {
            checkCanScheduleNext();
          });
          
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

    // ================================
    // NEW: APPOINTMENT COMPLETION HANDLER WITH LOADING STATE
    // ================================

    window.addEventListener('message', handleSchedulerMessage);
    
    return () => {
      window.removeEventListener('message', handleSchedulerMessage);
    };
  }, [showScheduler]);

  const loadTimelineForCronoscita = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📋 Loading timeline for Cronoscita...', { patientId, doctorId, patologia });
      
      if (!patologia) {
        throw new Error('❌ Cronoscita parameter missing - cannot load timeline');
      }
      
      const timelineData = await timelineAPI.getTimeline(patientId, doctorId, patologia);
      console.log('📊 Timeline response received:', timelineData);
      console.log('🔍 Patologia details:', {
        technical: timelineData.patologia,
        display: timelineData.patologia_display,
        requested: patologia
      });
      
      const returnedCronoscita = timelineData.patologia?.trim() || '';
      const requestedCronoscita = patologia?.trim() || '';
      
      if (returnedCronoscita.toUpperCase() !== requestedCronoscita.toUpperCase()) {
        console.error('🚨 FRONTEND TIMELINE CRONOSCITA MISMATCH:', {
          requested: requestedCronoscita,
          returned: returnedCronoscita,
          patient: patientId
        });
        
        const errorMessage = `❌ MISMATCH CRONICITÀ NELLA TIMELINE:

Cronicità richiesta: "${requestedCronoscita}"
Cronicità nei dati: "${returnedCronoscita}"

🔄 Il paziente risulta registrato per "${returnedCronoscita}".
Ricaricare la pagina e selezionare la cronicità corretta.`;
        
        setError(errorMessage);
        alert(errorMessage);
        return;
      }
      
      console.log('✅ Timeline cronoscita validation PASSED:', returnedCronoscita);
      setTimeline(timelineData);
      console.log('🔍 DEBUG Timeline Data:', {
        precedenti: timelineData.precedenti?.length || 0,
        oggi: timelineData.oggi?.length || 0,
        successivo: timelineData.successivo?.length || 0,
        successivo_data: timelineData.successivo,
        total_appointments: timelineData.total_appointments
      });
      // Validate timeline has Cronoscita context
      if (!timelineData.cronoscita_id && !timelineData.patologia_id) {
        console.warn('⚠️ Timeline missing cronoscita context - scheduler may be limited');
      }
      
    } catch (error) {
      console.error('❌ Timeline loading error:', error);
      
      if (error.message?.includes('CRONOSCITA MISMATCH') || error.message?.includes('cronoscita') || error.message?.includes('Cronoscita')) {
        setError(`❌ ERRORE CRONICITÀ: ${error.message}`);
        alert(`❌ ERRORE CRONICITÀ:\n\n${error.message}\n\n🔄 Selezionare la cronicità corretta e riprovare.`);
      } else {
        setError(error.message || 'Errore caricamento timeline');
      }
    }
    setLoading(false);
  };

  const checkCanScheduleNext = async () => {
    if (!patientId || !doctorId) return;
    
    // ✅ CRONOSCITA VALIDATION: Ensure we have cronoscita context
    if (!patologia && !timeline?.patologia) {
      console.warn('⚠️ Missing cronoscita context for scheduling check');
      setCanScheduleNext(false);
      return;
    }
    
    // Use patologia from props or timeline context
    const cronoscitaName = patologia || timeline?.patologia;
    const cronoscitaId = timeline?.cronoscita_id || null;
    
    setCheckingReferto(true);
    try {
      console.log('🔍 Checking can schedule next with cronoscita:', {
        patientId,
        doctorId,
        cronoscita: cronoscitaName,
        cronoscita_id: cronoscitaId
      });
      
      // ✅ COMPLETE API CALL: Include cronoscita parameters
      const response = await timelineAPI.checkCanScheduleNext(
        patientId, 
        doctorId, 
        cronoscitaName, 
        cronoscitaId
      );
      
      setCanScheduleNext(response.can_schedule_next || false);
      
      console.log('✅ Can schedule next result:', {
        can_schedule: response.can_schedule_next,
        message: response.message,
        cronoscita: response.cronoscita,
        validation_details: response.validation_details
      });
      
      // ✅ ENHANCED LOGGING: Show why scheduling is blocked/allowed
      if (!response.can_schedule_next && response.message) {
        console.log('🚫 Scheduling blocked:', response.message);
      }
      
    } catch (error) {
      console.error('❌ Error checking referto status with cronoscita:', error);
      
      // Enhanced error handling
      if (error.message?.includes('patologia') || error.message?.includes('cronoscita')) {
        console.error('🚨 Cronoscita validation error - timeline context may be incomplete');
      }
      
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
    
    console.log('🔍 Validating scheduler prerequisites for Cronoscita:', {
      timeline_loaded: !!timeline,
      cronoscita_id: timeline.cronoscita_id,
      patologia_id: timeline.patologia_id,
      patologia_name: timeline.patologia,
      selected_patologia: patologia, // ✅ Current selection
      cronoscita_match: timeline.patologia === patologia,
      scheduler_available: timeline.scheduler_available,
      patient_name: timeline.patient_name
    });

    // ✅ Validate Cronoscita context match
    if (patologia && timeline.patologia !== patologia) {
      alert(`❌ Mismatch Cronicità:

    Timeline mostra: ${PATOLOGIE[timeline.patologia] || timeline.patologia}
    Cronicità selezionata: ${PATOLOGIE[patologia] || patologia}

    🔄 Ricaricare la pagina e selezionare la Cronicità corretta.`);
      return;
    }
    
    // Check if scheduler is explicitly disabled
    if (timeline.scheduler_available === false) {
      alert(`❌ Scheduler non disponibile:\n${timeline.scheduler_error || 'Cronicità non configurata'}\n\nContattare l'amministratore per configurare la Cronicità per questo paziente.`);
      return;
    }
    
    // Check for cronoscita_id (most critical)
    if (!timeline.cronoscita_id && !timeline.patologia_id) {
      alert(`❌ Impossibile aprire scheduler:\n\nCronicità non configurata per il paziente.\nPatologia: ${timeline.patologia || 'Non specificata'}\n\n🔧 Soluzioni:\n• Contattare l'amministratore\n• Verificare configurazione Cronicità\n• Ricontrollare registrazione paziente`);
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
        alert('💡 Scheduler Professionale:\n\n• Seleziona data con colori densità\n• Scegli esami configurati dall\'admin\n• Un solo appuntamento per cronicità\n\n✅ Pronto per la programmazione!');
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
          <button onClick={loadTimelineForCronoscita} style={styles.secondaryButton}>
            Riprova
          </button>
        </div>
      </div>
    );
  }
  
  if (!timeline) return null;

  const allAppointments = (() => {
    if (!timeline) return [];
    
    const appointments = [];
    
    // Add past appointments (precedenti)
    if (timeline.precedenti && Array.isArray(timeline.precedenti)) {
      timeline.precedenti.forEach(apt => {
        appointments.push({
          ...apt,
          date: apt.date || apt.appointment_date || apt.scheduled_date,
          type: apt.type || apt.appointment_type || 'Visita',
          status: apt.status || 'completed'
        });
      });
    }
    
    // Add today's appointments (oggi)
    if (timeline.oggi && Array.isArray(timeline.oggi)) {
      timeline.oggi.forEach(apt => {
        appointments.push({
          ...apt,
          date: apt.date || apt.appointment_date || apt.scheduled_date,
          type: apt.type || apt.appointment_type || 'Visita',
          status: apt.status || 'scheduled'
        });
      });
    }
    
    // Add future appointments (successivo) - CRITICAL FOR GREEN BUTTON
    if (timeline.successivo && Array.isArray(timeline.successivo)) {
      timeline.successivo.forEach(apt => {
        appointments.push({
          ...apt,
          date: apt.date || apt.appointment_date || apt.scheduled_date,
          type: apt.type || apt.appointment_type || 'Visita',
          status: apt.status || 'scheduled'
        });
      });
    }
    
    console.log('🔍 DEBUG: Processed appointments for timeline:', {
      total_appointments: appointments.length,
      precedenti_count: timeline.precedenti?.length || 0,
      oggi_count: timeline.oggi?.length || 0,
      successivo_count: timeline.successivo?.length || 0,
      sample_future_appointment: timeline.successivo?.[0] || null
    });
    
    return appointments;
  })();

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
                  🏥 {timeline.patologia_display || timeline.patologia}
                </span>

                {/* ✅ Multi-Cronoscita Status Indicator */}
                {patologia && timeline.patologia !== patologia && (
                  <span style={{
                    fontSize: '12px',
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}>
                    ⚠️ Mismatch Cronicità
                  </span>
                )}
                
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
        onTimelineUpdate={loadTimelineForCronoscita}
        canScheduleNext={canScheduleNext}
        checkingReferto={checkingReferto}
        onOpenScheduler={handleOpenScheduler} // UPDATED - Use new handler
      />

      <ProfessionalTabs 
        patientId={patientId} 
        doctorId={doctorId}
        patologia={patologia}
        onRefertoSaved={checkCanScheduleNext}
        onDirtyStateChange={handleRefertoStateChange}
        hasFutureAppointment={timeline?.successivo && timeline.successivo.length > 0}
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
                      {timeline.patient_name} ({patientId}) • {timeline.patologia_display || timeline.patologia}
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
                    }, 300000);
                    
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