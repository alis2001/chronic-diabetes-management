// frontend/timeline-app/src/api.js
// Livello di servizio API - Versione italiana per Sistema Sanitario
// Comunicazione API centralizzata per Servizio Timeline ASL

const API_BASE_URL = process.env.REACT_APP_TIMELINE_API_URL || 'http://localhost:8001';

// Gestione errori API
class APIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

// Handler generico richieste API
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      // Se la risposta non è JSON valido
      throw new APIError('Risposta del server non valida', response.status);
    }
    
    if (!response.ok) {
      // Gestione errori strutturati dal backend
      let errorMessage = 'Richiesta API fallita';
      let errorDetails = null;
      
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.detail.message) {
          errorMessage = data.detail.message;
          errorDetails = data.detail.details;
        } else if (data.detail.error) {
          errorMessage = data.detail.error;
          errorDetails = data.detail;
        }
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }
    
    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    
    // Errori di rete o altri errori
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Impossibile connettersi al server. Verificare la connessione.', 0);
    }
    
    throw new APIError(`Errore di rete: ${error.message}`, 0);
  }
};

// API Servizio Timeline ASL
export const timelineAPI = {
  // ================================
  // CONTROLLI SISTEMA
  // ================================
  
  /**
   * Controllo stato servizio
   */
  health: () => apiRequest('/health'),
  
  // ================================
  // OPERAZIONI PAZIENTE
  // ================================
  
  /**
   * Ricerca paziente per codice fiscale
   * @param {string} cf_paziente - Codice fiscale (16 caratteri)
   * @param {string} id_medico - ID medico
   * @param {string} patologia - Tipo patologia
   */
  lookupPatient: (cf_paziente, id_medico, patologia) => 
    apiRequest('/patients/lookup', {
      method: 'POST',
      body: JSON.stringify({ cf_paziente, id_medico, patologia })
    }),
  
  /**
   * Registrazione paziente standard
   * @param {string} cf_paziente - Codice fiscale
   * @param {string} id_medico - ID medico
   * @param {string} patologia - Tipo patologia
   */
  registerPatient: (cf_paziente, id_medico, patologia) => 
    apiRequest('/patients/register', {
      method: 'POST',
      body: JSON.stringify({
        cf_paziente,
        id_medico,
        patologia,
        confirm_registration: true
      })
    }),

  /**
   * Registrazione paziente con contatti modificabili dal medico
   * @param {string} cf_paziente - Codice fiscale
   * @param {string} id_medico - ID medico
   * @param {string} patologia - Tipo patologia
   * @param {string|null} telefono - Numero telefono (modificabile)
   * @param {string|null} email - Email (modificabile)
   */
  registerPatientWithContacts: (cf_paziente, id_medico, patologia, telefono, email) => 
    apiRequest('/patients/register-with-contacts', {
      method: 'POST',
      body: JSON.stringify({
        cf_paziente,
        id_medico,
        patologia,
        telefono,
        email,
        confirm_registration: true
      })
    }),
  
  // ================================
  // OPERAZIONI TIMELINE
  // ================================
  
  /**
   * Ottieni timeline completa paziente
   * @param {string} cf_paziente - Codice fiscale
   * @param {string} id_medico - ID medico per autorizzazione
   */
  getTimeline: (cf_paziente, id_medico) => 
    apiRequest(`/timeline/${cf_paziente}?id_medico=${id_medico}`),
  
  // ================================
  // OPERAZIONI APPUNTAMENTI
  // ================================
  
  /**
   * Programma nuovo appuntamento
   * @param {Object} appointmentData - Dati appuntamento
   */
  scheduleAppointment: (appointmentData) => 
    apiRequest('/appointments/schedule', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    }),
  
  /**
   * Completa appuntamento esistente
   * @param {Object} completionData - Dati completamento
   */
  completeAppointment: (completionData) => 
    apiRequest('/appointments/complete', {
      method: 'POST',
      body: JSON.stringify(completionData)
    }),
  
  /**
   * Ottieni tipi appuntamento disponibili per paziente
   * @param {string} cf_paziente - Codice fiscale
   * @param {string} id_medico - ID medico per autorizzazione
   */
  getAvailableTypes: (cf_paziente, id_medico) => 
    apiRequest(`/appointments/available-types/${cf_paziente}?id_medico=${id_medico}`),
};

// ================================
// COSTANTI SISTEMA ITALIANO
// ================================

export const MEDICI = {
  'DOC001': 'Dr. Mario Rossi',
  'DOC002': 'Dr.ssa Laura Bianchi', 
  'DOC003': 'Dr. Giuseppe Verdi',
  'DOC004': 'Dr.ssa Anna Ferrari'
};

export const PATOLOGIE = {
  'diabetes_mellitus_type2': 'Diabete Mellito Tipo 2',
  'diabetes_mellitus_type1': 'Diabete Mellito Tipo 1',
  'diabetes_gestational': 'Diabete Gestazionale',
  'hypertension_primary': 'Ipertensione Primaria',
  'cardiovascular': 'Malattie Cardiovascolari'
};

export const TIPI_APPUNTAMENTO = {
  'visita_diabetologica': 'Visita Diabetologica',
  'laboratorio_hba1c': 'Esame HbA1c',
  'laboratorio_glicemia': 'Esami Glicemia',
  'visita_oculistica': 'Visita Oculistica',
  'test_neuropatia': 'Test Neuropatia',
  'eco_addome': 'Ecografia Addome'
};

export const STATI_APPUNTAMENTO = {
  'scheduled': 'Programmato',
  'completed': 'Completato',
  'cancelled': 'Annullato',
  'no_show': 'Non Presentato'
};

export const PRIORITA = {
  'routine': 'Routine',
  'normal': 'Normale',
  'urgent': 'Urgente',
  'emergency': 'Emergenza'
};

// Mappature per colori stato
export const COLORI_STATO = {
  'scheduled': '#3498db',
  'completed': '#27ae60',
  'cancelled': '#e74c3c',
  'no_show': '#f39c12'
};

export const COLORI_PRIORITA = {
  'routine': '#95a5a6',
  'normal': '#3498db',
  'urgent': '#f39c12',
  'emergency': '#e74c3c'
};

// ================================
// UTILITÀ HELPER
// ================================

/**
 * Formatta codice fiscale italiano
 * @param {string} cf - Codice fiscale grezzo
 * @returns {string} Codice fiscale formattato
 */
export const formatCodiceFiscale = (cf) => {
  if (!cf) return '';
  return cf.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16);
};

/**
 * Valida formato codice fiscale
 * @param {string} cf - Codice fiscale
 * @returns {boolean} True se valido
 */
export const validateCodiceFiscale = (cf) => {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf);
};

/**
 * Formatta numero telefono italiano
 * @param {string} phone - Numero grezzo
 * @returns {string} Numero formattato
 */
export const formatTelefono = (phone) => {
  if (!phone) return '';
  // Rimuovi caratteri non numerici eccetto +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Aggiungi +39 se non presente
  if (!cleaned.startsWith('+39') && !cleaned.startsWith('39')) {
    if (cleaned.startsWith('3') || cleaned.startsWith('0')) {
      cleaned = '+39' + cleaned;
    }
  }
  
  return cleaned;
};

/**
 * Formatta data in formato italiano
 * @param {string|Date} date - Data
 * @returns {string} Data formattata dd/mm/yyyy
 */
export const formatDataItaliana = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatta orario italiano
 * @param {string|Date} time - Orario
 * @returns {string} Orario formattato HH:MM
 */
export const formatOrario = (time) => {
  if (!time) return '';
  const t = new Date(time);
  if (isNaN(t.getTime())) return '';
  
  return t.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Ottieni descrizione stato in italiano
 * @param {string} status - Stato inglese
 * @returns {string} Descrizione italiana
 */
export const getDescrizioneStato = (status) => {
  return STATI_APPUNTAMENTO[status] || status;
};

/**
 * Ottieni descrizione priorità in italiano
 * @param {string} priority - Priorità inglese
 * @returns {string} Descrizione italiana
 */
export const getDescrizionePriorita = (priority) => {
  return PRIORITA[priority] || priority;
};

// Export default per compatibilità
export default timelineAPI;