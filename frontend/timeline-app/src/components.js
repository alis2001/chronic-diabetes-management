// frontend/timeline-app/src/components.js
// Complete Healthcare Components with Fixed Timeline Logic & Apple-Style Modals

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
    patologia: 'diabetes_mellitus_type2'
  });
  const [loading, setLoading] = useState(false);

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
// INNOVATIVE SCROLLABLE TIMELINE WITH FIXED LOGIC
// ================================

export const InnovativeTimeline = ({ appointments, patientId, doctorId, onTimelineUpdate }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalType, setNoteModalType] = useState(null);
  const [noteModalData, setNoteModalData] = useState(null);
  const [currentNotes, setCurrentNotes] = useState('');
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

  const handlePastAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleTodayClick = () => {
    if (hasTodayAppt) {
      setNoteModalType('today');
      setNoteModalData(todayAppts[0]);
      setCurrentNotes(todayAppts[0].notes || '');
    } else {
      // Create today's appointment note template
      setNoteModalType('today');
      setNoteModalData({
        date: today.toLocaleDateString('it-IT'),
        type: 'Visita di Oggi'
      });
      setCurrentNotes('');
    }
    setShowNoteModal(true);
  };

  const handleFutureClick = () => {
    if (hasFutureAppt) {
      setNoteModalType('future');
      setNoteModalData(future[0]);
      setCurrentNotes(future[0].notes || '');
      setShowNoteModal(true);
    }
  };

  const handleSaveNotes = async () => {
    try {
      // Mock API call - replace with actual implementation
      console.log(`Saving ${noteModalType} notes:`, currentNotes);
      alert(`Note salvate per ${noteModalType === 'today' ? 'oggi' : 'appuntamento futuro'}!`);
      
      // Trigger timeline update
      if (onTimelineUpdate) {
        onTimelineUpdate();
      }
    } catch (error) {
      alert('Errore nel salvare le note');
    }
    
    setShowNoteModal(false);
  };

  const handleCancelFutureAppointment = async () => {
    if (window.confirm('Sei sicuro di voler cancellare questo appuntamento futuro?')) {
      try {
        // Mock API call - replace with actual implementation
        console.log('Cancelling future appointment:', noteModalData.appointment_id);
        alert('Appuntamento cancellato!');
        
        // Trigger timeline update
        if (onTimelineUpdate) {
          onTimelineUpdate();
        }
        
        setShowNoteModal(false);
      } catch (error) {
        alert('Errore nella cancellazione');
      }
    }
  };

  return (
    <div style={styles.timelineContainer}>
      <h3 style={{
        textAlign: 'center', 
        marginBottom: '40px', 
        color: '#1d1d1f',
        fontSize: '28px',
        fontWeight: '700',
        letterSpacing: '-0.02em'
      }}>
        Timeline Visite Mediche
      </h3>
      
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
                  ...styles.pastPoint
                }}
                onClick={() => handlePastAppointmentClick(appointment)}
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
              ...styles.todayPoint
            }}
            onClick={handleTodayClick}
            title="Visita di oggi - Clicca per aggiungere note"
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
                ...styles.futurePoint
              }}
              onClick={handleFutureClick}
              title={`${future[0].type} - ${future[0].date} - Clicca per gestire`}
            >
              NEXT
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
              ':hover': {}
            }}>
              ---
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
          <span style={{color: '#4b5563'}}>Prossimo</span>
        </div>
      </div>

      {/* Past Appointment Detail Modal */}
      {selectedAppointment && (
        <PastAppointmentModal 
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* Note Writing Modal */}
      {showNoteModal && (
        <AppleNoteModal
          type={noteModalType}
          appointmentData={noteModalData}
          notes={currentNotes}
          setNotes={setCurrentNotes}
          onSave={handleSaveNotes}
          onClose={() => setShowNoteModal(false)}
          onCancelAppointment={noteModalType === 'future' ? handleCancelFutureAppointment : null}
        />
      )}
    </div>
  );
};

// ================================
// APPLE-INSPIRED NOTE MODAL
// ================================

const AppleNoteModal = ({ type, appointmentData, notes, setNotes, onSave, onClose, onCancelAppointment }) => {
  const isToday = type === 'today';
  const isFuture = type === 'future';
  
  const title = isToday 
    ? 'Note per la Visita di Oggi' 
    : `Note per ${appointmentData?.type || 'Prossimo Appuntamento'}`;
    
  const subtitle = isToday
    ? `Data: ${new Date().toLocaleDateString('it-IT')}`
    : `Data: ${appointmentData?.date} ${appointmentData?.time ? `alle ${appointmentData.time}` : ''}`;

  const placeholder = isToday 
    ? "Inserisci note sulla visita odierna: osservazioni cliniche, diagnosi, prescrizioni, raccomandazioni per il paziente..."
    : "Inserisci note preparatorie per il prossimo appuntamento: controlli da effettuare, focus della visita, promemoria...";

  return (
    <div style={styles.noteModal} onClick={onClose}>
      <div style={styles.noteModalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.noteModalHeader}>
          <button style={styles.appleCloseButton} onClick={onClose}>×</button>
          <h3 style={styles.noteModalTitle}>{title}</h3>
          <p style={styles.noteModalSubtitle}>{subtitle}</p>
        </div>

        <div style={styles.noteModalBody}>
          {isFuture && (
            <div style={styles.futureAppointmentWarning}>
              📅 Puoi modificare o cancellare questo appuntamento futuro
            </div>
          )}
          
          <label style={{...styles.label, marginBottom: '15px'}}>
            {isToday ? 'Note della visita:' : 'Note preparatorie:'}
          </label>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={placeholder}
            style={styles.appleNoteTextarea}
            maxLength={1000}
            autoFocus
          />
          
          <div style={styles.characterCounter}>
            {notes.length}/1000 caratteri
          </div>
        </div>

        <div style={styles.noteModalFooter}>
          <button 
            style={styles.appleCancelButton}
            onClick={onClose}
          >
            Annulla
          </button>
          
          {isFuture && onCancelAppointment && (
            <button 
              style={styles.appleCancelAppointmentButton}
              onClick={onCancelAppointment}
            >
              Cancella Appuntamento
            </button>
          )}
          
          <button 
            style={styles.appleSaveButton}
            onClick={onSave}
            disabled={!notes.trim()}
          >
            Salva Note
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================
// PAST APPOINTMENT MODAL (Read-Only)
// ================================

const PastAppointmentModal = ({ appointment, onClose }) => {
  return (
    <div style={styles.noteModal} onClick={onClose}>
      <div style={styles.noteModalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.noteModalHeader}>
          <button style={styles.appleCloseButton} onClick={onClose}>×</button>
          <h3 style={{
            ...styles.noteModalTitle,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            {appointment.type}
          </h3>
          <p style={styles.noteModalSubtitle}>
            Completata il {appointment.date} {appointment.time ? `alle ${appointment.time}` : ''}
          </p>
        </div>

        <div style={styles.noteModalBody}>
          <div style={{marginBottom: '25px'}}>
            <div style={styles.patientInfoGrid}>
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Stato:</span>
                <span style={{
                  ...styles.patientInfoValue,
                  color: '#10b981'
                }}>
                  Completata
                </span>
              </div>
              
              <div style={styles.patientInfoItem}>
                <span style={styles.patientInfoLabel}>Priorità:</span>
                <span style={styles.patientInfoValue}>
                  {appointment.priority || 'Normale'}
                </span>
              </div>
              
              {appointment.location && (
                <div style={styles.patientInfoItem}>
                  <span style={styles.patientInfoLabel}>Luogo:</span>
                  <span style={styles.patientInfoValue}>{appointment.location}</span>
                </div>
              )}
            </div>
          </div>

          <label style={{...styles.label, marginBottom: '15px'}}>
            Note della Visita:
          </label>
          <div style={{
            padding: '24px',
            backgroundColor: 'rgba(139, 92, 246, 0.05)',
            borderRadius: '16px',
            border: '2px solid rgba(139, 92, 246, 0.1)',
            minHeight: '150px',
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#1d1d1f',
            fontFamily: 'inherit'
          }}>
            {appointment.notes || 'Nessuna nota disponibile per questa visita.'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================
// PATIENT TIMELINE - UPDATED WITH FUTURE APPOINTMENT LOGIC
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

  // FIXED: Check if future appointment slot is occupied
  const hasFutureAppointment = timeline.successivo && timeline.successivo.length > 0;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Timeline Paziente</h2>
      </div>
      
      <div style={styles.patientInfo}>
        <div style={styles.patientInfoGrid}>
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Paziente:</span>
            <span style={styles.patientInfoValue}>
              {timeline.patient_name || timeline.patient_id}
            </span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Patologia:</span>
            <span style={styles.patientInfoValue}>
              {PATOLOGIE[timeline.patologia] || timeline.patologia}
            </span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Totale Visite:</span>
            <span style={styles.patientInfoValue}>{timeline.total_appointments}</span>
          </div>
        </div>
      </div>

      <InnovativeTimeline 
        appointments={allAppointments}
        patientId={patientId}
        doctorId={doctorId}
        onTimelineUpdate={loadTimeline}
      />

      <div style={{textAlign: 'center', marginTop: '30px'}}>
        {/* FIXED: Disable button if future appointment exists */}
        {hasFutureAppointment ? (
          <div>
            <button style={styles.disabledButton} disabled title="È già presente un appuntamento futuro">
              Appuntamento Già Programmato
            </button>
            <p style={{
              marginTop: '10px',
              fontSize: '14px',
              color: '#86868b',
              textAlign: 'center'
            }}>
              Solo un appuntamento futuro alla volta è consentito.<br />
              Gestisci l'appuntamento esistente prima di crearne uno nuovo.
            </p>
          </div>
        ) : (
          <button 
            onClick={() => onScheduleAppointment(timeline.patient_id, doctorId)} 
            style={styles.primaryButton}
          >
            Programma Nuovo Appuntamento
          </button>
        )}
      </div>
    </div>
  );
};

// ================================
// SCHEDULE APPOINTMENT - UPDATED FOR FUTURE SLOT
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