// frontend/timeline-app/src/components.js
// Componenti UI in Italiano per Sistema Sanitario ASL
// Tutti i componenti interfaccia consolidati - form di registrazione modificabile

import React, { useState, useEffect } from 'react';
import { 
  timelineAPI, 
  MEDICI, 
  PATOLOGIE, 
  TIPI_APPUNTAMENTO, 
  STATI_APPUNTAMENTO, 
  PRIORITA,
  COLORI_STATO,
  COLORI_PRIORITA,
  formatCodiceFiscale,
  validateCodiceFiscale,
  formatTelefono,
  formatDataItaliana,
  formatOrario,
  getDescrizioneStato,
  getDescrizionePriorita
} from './api';
import { styles } from './styles';

// ================================
// COMPONENTE HEADER
// ================================

export const Header = ({ serviceHealth }) => (
  <div style={styles.header}>
    <div style={styles.headerContent}>
      <h1>Servizio Timeline ASL - Interfaccia Medico</h1>
      <div style={styles.headerSubtitle}>
        Sistema di Gestione Timeline Pazienti Cronici - Regione Lazio
      </div>
    </div>
    <div style={styles.headerStatus}>
      <div style={styles.statusItem}>
        <span>Stato Servizio: </span>
        <strong style={{color: serviceHealth?.status === 'healthy' ? '#27ae60' : '#e74c3c'}}>
          {serviceHealth?.status === 'healthy' ? 'Operativo' : 'Non Disponibile'}
        </strong>
      </div>
      <div style={styles.statusItem}>
        <span>Database: </span>
        <strong style={{color: serviceHealth?.database_status === 'healthy' ? '#27ae60' : '#e74c3c'}}>
          {serviceHealth?.database_status === 'healthy' ? 'Connesso' : 'Errore Connessione'}
        </strong>
      </div>
      <div style={styles.statusItem}>
        <span>Versione: </span>
        <strong>{serviceHealth?.timestamp ? 'v2.0.0' : 'N/A'}</strong>
      </div>
      {serviceHealth?.timestamp && (
        <div style={styles.statusItem}>
          <span>Ultimo Controllo: </span>
          <strong>{new Date(serviceHealth.timestamp).toLocaleTimeString('it-IT')}</strong>
        </div>
      )}
    </div>
  </div>
);

// ================================
// COMPONENTE RICERCA PAZIENTE
// ================================

export const PatientLookup = ({ onPatientFound, onPatientNotFound, onError }) => {
  const [formData, setFormData] = useState({
    cf_paziente: '',
    id_medico: 'DOC001',
    patologia: 'diabetes_mellitus_type2'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
    setResult(null);
    
    try {
      const response = await timelineAPI.lookupPatient(
        formData.cf_paziente,
        formData.id_medico,
        formData.patologia
      );
      
      setResult(response);
      
      if (response.exists) {
        onPatientFound(response, formData);
      } else {
        onPatientNotFound(response, formData);
      }
    } catch (error) {
      const errorResult = { error: error.message, status: error.status };
      setResult(errorResult);
      onError(errorResult);
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Fase 1: Ricerca Paziente</h2>
        <p style={styles.cardDescription}>
          Inserire il codice fiscale del paziente per verificare la presenza nel sistema
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Codice Fiscale del Paziente <span style={styles.required}>*</span>
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
          <small style={styles.helpText}>
            Formato: 16 caratteri alfanumerici (AAAAAA00A00A000A)
          </small>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Medico Richiedente</label>
          <select
            value={formData.id_medico}
            onChange={(e) => setFormData({...formData, id_medico: e.target.value})}
            style={styles.select}
            disabled={loading}
          >
            {Object.entries(MEDICI).map(([id, name]) => (
              <option key={id} value={id}>{id} - {name}</option>
            ))}
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Patologia Principale</label>
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
        
        <div style={styles.buttonGroup}>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Ricerca in corso...' : 'Cerca Paziente'}
          </button>
        </div>
      </form>
      
      {result && <ResultDisplay result={result} />}
    </div>
  );
};

// ================================
// COMPONENTE REGISTRAZIONE PAZIENTE CON FORM MODIFICABILE
// ================================

export const PatientRegistration = ({ lookupResult, formData, onRegistrationSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [contactData, setContactData] = useState({
    telefono: '',
    email: ''
  });

  // Inizializza i contatti se disponibili da Wirgilio
  useEffect(() => {
    if (lookupResult?.patient_data?.demographics) {
      setContactData({
        telefono: lookupResult.patient_data.demographics.telefono || '',
        email: lookupResult.patient_data.demographics.email || ''
      });
    }
  }, [lookupResult]);

  const handleTelefonoChange = (e) => {
    setContactData({...contactData, telefono: formatTelefono(e.target.value)});
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await timelineAPI.registerPatientWithContacts(
        formData.cf_paziente,
        formData.id_medico,
        formData.patologia,
        contactData.telefono.trim() || null,
        contactData.email.trim() || null
      );
      setResult(response);
      if (response.success) {
        onRegistrationSuccess(response, formData);
      }
    } catch (error) {
      const errorResult = { error: error.message, status: error.status };
      setResult(errorResult);
      onError(errorResult);
    }
    setLoading(false);
  };

  if (!lookupResult || lookupResult.exists) return null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Fase 2: Registrazione Paziente</h2>
        <p style={styles.cardDescription}>
          Paziente trovato nell'anagrafe sanitaria ma non ancora registrato per la gestione timeline
        </p>
      </div>
      
      {lookupResult.patient_data?.demographics && (
        <>
          {/* Sezione Dati Anagrafici Non Modificabili */}
          <div style={styles.patientDataSection}>
            <h3 style={styles.sectionTitle}>
              Dati Anagrafici (Sistema Wirgilio) - <span style={styles.readOnlyLabel}>Solo Lettura</span>
            </h3>
            
            <div style={styles.readOnlySection}>
              <div style={styles.dataGrid}>
                <div style={styles.dataItem}>
                  <span style={styles.dataLabel}>Nome:</span>
                  <span style={styles.dataValue}>
                    {lookupResult.patient_data.demographics.nome}
                  </span>
                </div>
                
                <div style={styles.dataItem}>
                  <span style={styles.dataLabel}>Cognome:</span>
                  <span style={styles.dataValue}>
                    {lookupResult.patient_data.demographics.cognome}
                  </span>
                </div>
                
                <div style={styles.dataItem}>
                  <span style={styles.dataLabel}>Data di Nascita:</span>
                  <span style={styles.dataValue}>
                    {formatDataItaliana(lookupResult.patient_data.demographics.data_nascita)}
                  </span>
                </div>
                
                <div style={styles.dataItem}>
                  <span style={styles.dataLabel}>Codice Fiscale:</span>
                  <span style={styles.dataValue}>
                    {formData.cf_paziente}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sezione Contatti Modificabili */}
          <div style={styles.patientDataSection}>
            <h3 style={styles.sectionTitle}>
              Contatti - <span style={styles.editableLabel}>Modificabili dal Medico</span>
            </h3>
            <p style={styles.sectionDescription}>
              I dati di contatto possono essere inseriti o modificati dal medico curante
            </p>
            
            <div style={styles.editableSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Numero di Telefono
                </label>
                <input
                  type="tel"
                  value={contactData.telefono}
                  onChange={handleTelefonoChange}
                  placeholder="+39 123 456 7890"
                  style={styles.input}
                  disabled={loading}
                />
                <small style={styles.helpText}>
                  Formato: +39 seguito dal numero (es. +39 123 456 7890)
                </small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Indirizzo Email
                </label>
                <input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({...contactData, email: e.target.value})}
                  placeholder="paziente@example.it"
                  style={styles.input}
                  disabled={loading}
                />
                <small style={styles.helpText}>
                  Indirizzo email valido per comunicazioni sanitarie
                </small>
              </div>
            </div>
          </div>
          
          {/* Sezione Patologia */}
          <div style={styles.patientDataSection}>
            <h3 style={styles.sectionTitle}>Patologia Principale</h3>
            <div style={styles.pathologyInfo}>
              <span style={styles.pathologyLabel}>
                {PATOLOGIE[formData.patologia]}
              </span>
              <span style={styles.pathologyCode}>
                ({formData.patologia})
              </span>
            </div>
          </div>
        </>
      )}
      
      <div style={styles.registrationActions}>
        <div style={styles.confirmationBox}>
          <h4>Conferma Registrazione</h4>
          <p>
            Confermare la registrazione del paziente <strong>{formData.cf_paziente}</strong> 
            per la gestione timeline presso ASL Roma 1.
          </p>
        </div>
        
        <button 
          onClick={handleRegister} 
          disabled={loading} 
          style={styles.successButton}
        >
          {loading ? 'Registrazione in corso...' : 'Registra Paziente nel Sistema'}
        </button>
      </div>
      
      {result && <ResultDisplay result={result} />}
    </div>
  );
};

// ================================
// COMPONENTE TIMELINE PAZIENTE
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
          <p>Caricamento timeline paziente...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.errorState}>
          <h3>Errore Caricamento Timeline</h3>
          <p style={styles.errorText}>{error}</p>
          <button onClick={loadTimeline} style={styles.secondaryButton}>
            Riprova
          </button>
        </div>
      </div>
    );
  }
  
  if (!timeline) return null;

  return (
    <div style={styles.card}>
      <div style={styles.timelineHeader}>
        <div style={styles.timelineTitle}>
          <h2>Fase 3: Timeline Paziente</h2>
          <button onClick={loadTimeline} style={styles.refreshButton}>
            Aggiorna Timeline
          </button>
        </div>
      </div>
      
      {/* Informazioni Paziente */}
      <div style={styles.patientInfo}>
        <div style={styles.patientInfoGrid}>
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Paziente:</span>
            <span style={styles.patientInfoValue}>
              {timeline.patient_name || timeline.patient_id}
            </span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Codice Fiscale:</span>
            <span style={styles.patientInfoValue}>{timeline.patient_id}</span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Patologia:</span>
            <span style={styles.patientInfoValue}>
              {PATOLOGIE[timeline.patologia] || timeline.patologia}
            </span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Data Registrazione:</span>
            <span style={styles.patientInfoValue}>{timeline.enrollment_date}</span>
          </div>
          
          <div style={styles.patientInfoItem}>
            <span style={styles.patientInfoLabel}>Totale Appuntamenti:</span>
            <span style={styles.patientInfoValue}>{timeline.total_appointments}</span>
          </div>
        </div>
      </div>

      {/* Grid Timeline */}
      <div style={styles.timelineGrid}>
        <AppointmentSection 
          title="Appuntamenti Precedenti" 
          appointments={timeline.precedenti} 
          type="past" 
        />
        <AppointmentSection 
          title="Appuntamenti Odierni" 
          appointments={timeline.oggi} 
          type="today" 
        />
        <AppointmentSection 
          title="Appuntamenti Futuri" 
          appointments={timeline.successivo} 
          type="future" 
        />
      </div>

      {/* Azioni Timeline */}
      <div style={styles.timelineActions}>
        <button 
          onClick={() => onScheduleAppointment(timeline.patient_id, doctorId)} 
          style={styles.primaryButton}
        >
          Programma Nuovo Appuntamento
        </button>
        
        <button onClick={loadTimeline} style={styles.secondaryButton}>
          Aggiorna Timeline
        </button>
      </div>
    </div>
  );
};

// ================================
// COMPONENTE SEZIONE APPUNTAMENTI
// ================================

const AppointmentSection = ({ title, appointments, type }) => (
  <div style={{...styles.appointmentSection, ...styles[`${type}Section`]}}>
    <div style={styles.sectionHeader}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      <span style={styles.appointmentCount}>({appointments.length})</span>
    </div>
    
    <div style={styles.appointmentList}>
      {appointments.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Nessun appuntamento</p>
        </div>
      ) : (
        appointments.map((apt, index) => (
          <AppointmentItem key={index} appointment={apt} />
        ))
      )}
    </div>
  </div>
);

// ================================
// COMPONENTE SINGOLO APPUNTAMENTO
// ================================

const AppointmentItem = ({ appointment }) => (
  <div style={{
    ...styles.appointmentItem, 
    ...styles[`${appointment.status}Status`],
    borderLeft: `4px solid ${COLORI_STATO[appointment.status] || '#bdc3c7'}`
  }}>
    <div style={styles.appointmentHeader}>
      <span style={styles.appointmentDate}>
        {appointment.date} alle {appointment.time}
      </span>
      <span style={{
        ...styles.appointmentStatus,
        color: COLORI_STATO[appointment.status] || '#7f8c8d'
      }}>
        {getDescrizioneStato(appointment.status)}
      </span>
    </div>
    
    <div style={styles.appointmentType}>
      {appointment.type}
    </div>
    
    <div style={styles.appointmentMeta}>
      <span style={{
        ...styles.appointmentPriority,
        color: COLORI_PRIORITA[appointment.priority] || '#7f8c8d'
      }}>
        Priorità: {getDescrizionePriorita(appointment.priority)}
      </span>
      
      {appointment.location && (
        <span style={styles.appointmentLocation}>
          📍 {appointment.location}
        </span>
      )}
    </div>
    
    {appointment.notes && (
      <div style={styles.appointmentNotes}>
        <strong>Note:</strong> {appointment.notes}
      </div>
    )}
  </div>
);

// ================================
// COMPONENTE PROGRAMMAZIONE APPUNTAMENTO
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
  const [result, setResult] = useState(null);

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
      console.error('Errore caricamento tipi appuntamento:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await timelineAPI.scheduleAppointment({
        cf_paziente: patientId,
        id_medico: doctorId,
        appointment_type: formData.appointment_type,
        suggested_date: formData.suggested_date,
        priority: formData.priority,
        notes: formData.notes
      });
      setResult(response);
      if (response.success) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2>Fase 4: Programmazione Appuntamento</h2>
        <p style={styles.cardDescription}>
          Programmare un nuovo appuntamento per il paziente {patientId}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Tipo di Appuntamento <span style={styles.required}>*</span>
          </label>
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
          <label style={styles.label}>
            Data Suggerita <span style={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={formData.suggested_date}
            onChange={(e) => setFormData({...formData, suggested_date: e.target.value})}
            style={styles.input}
            min={getMinDate()}
            required
            disabled={loading}
          />
          <small style={styles.helpText}>
            Data approssimativa richiesta dal medico
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Priorità</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            style={styles.select}
            disabled={loading}
          >
            {Object.entries(PRIORITA).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Note del Medico</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            style={styles.textarea}
            placeholder="Indicazioni specifiche per questo appuntamento..."
            disabled={loading}
            maxLength={500}
          />
          <small style={styles.helpText}>
            Massimo 500 caratteri
          </small>
        </div>

        <div style={styles.buttonGroup}>
          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Programmazione in corso...' : 'Programma Appuntamento'}
          </button>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>
            Annulla
          </button>
        </div>
      </form>

      {result && <ResultDisplay result={result} />}
    </div>
  );
};

// ================================
// COMPONENTE VISUALIZZAZIONE RISULTATI (RIUSABILE)
// ================================

const ResultDisplay = ({ result }) => (
  <div style={{
    ...styles.resultBox,
    backgroundColor: result.error ? '#ffebee' : result.success ? '#e8f5e8' : '#fff3cd',
    borderColor: result.error ? '#f44336' : result.success ? '#4caf50' : '#ffc107'
  }}>
    <h4 style={styles.resultTitle}>Risultato Operazione:</h4>
    
    {result.error && (
      <div style={styles.errorResult}>
        <p><strong>Errore:</strong> {result.error}</p>
        {result.status && <p><strong>Codice:</strong> {result.status}</p>}
      </div>
    )}
    
    {!result.error && (
      <div style={styles.successResult}>
        <p>
          <strong>Stato:</strong> {' '}
          {result.success !== undefined ? 
            (result.success ? 'Operazione Completata' : 'Operazione Fallita') : 
            result.exists ? 'Paziente Trovato' : 'Paziente Non Trovato'
          }
        </p>
        <p><strong>Messaggio:</strong> {result.message}</p>
        
        {result.patient_id && (
          <p><strong>ID Paziente:</strong> {result.patient_id}</p>
        )}
        
        {result.appointment_id && (
          <p><strong>ID Appuntamento:</strong> {result.appointment_id}</p>
        )}
        
        {result.enrollment_date && (
          <p><strong>Data Registrazione:</strong> {formatDataItaliana(result.enrollment_date)}</p>
        )}
      </div>
    )}
  </div>
);

// ================================
// ESPORTAZIONI
// ================================

export default {
  Header,
  PatientLookup,
  PatientRegistration,
  PatientTimeline,
  ScheduleAppointment,
  ResultDisplay
};