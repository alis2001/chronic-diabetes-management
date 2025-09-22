// frontend/timeline-app/src/api.js
// Livello di servizio API - UPDATED to use API Gateway
// Tutte le richieste ora passano attraverso il Gateway (porta 8080)

// ✅ UPDATED: All requests now go through API Gateway
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL || `http://${window.location.hostname}:8080`;

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
      throw new APIError('Risposta del server non valida', response.status);
    }
    
    if (!response.ok) {
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
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      throw new APIError(errorMessage, response.status, errorDetails);
    }
    
    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Impossibile connettersi al Gateway API. Verificare la connessione.', 0);
    }
    
    throw new APIError(`Errore di rete: ${error.message}`, 0);
  }
};

// API Servizio Timeline ASL - UPDATED routes
export const timelineAPI = {
  // ================================
  // CONTROLLI SISTEMA
  // ================================
  
  /**
   * Controllo stato servizio - attraverso Gateway
   */
  health: () => apiRequest('/health'),
  
  /**
   * Informazioni Gateway 
   */
  gatewayInfo: () => apiRequest('/'),
  
  // ================================
  // OPERAZIONI PAZIENTE - UPDATED ROUTES
  // ================================
  
  /**
   * Ricerca paziente per codice fiscale
   * ✅ UPDATED: /api/timeline/patients/lookup
   */
  lookupPatient: (cf_paziente, id_medico, patologia) => 
    apiRequest('/api/timeline/patients/lookup', {
      method: 'POST',
      body: JSON.stringify({ cf_paziente, id_medico, patologia })
    }),
  
  /**
   * Registrazione paziente standard
   * ✅ UPDATED: /api/timeline/patients/register
   */

  createVoiceWorkflow: (data) => 
    apiRequest('/api/timeline/melody/create-voice-workflow', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  registerPatient: (cf_paziente, id_medico, patologia) => 
    apiRequest('/api/timeline/patients/register', {
      method: 'POST',
      body: JSON.stringify({
        cf_paziente,
        id_medico,
        patologia,
        confirm_registration: true
      })
    }),

  /**
   * Registrazione paziente con contatti modificabili
   * ✅ UPDATED: /api/timeline/patients/register-with-contacts
   */
  registerPatientWithContacts: (cf_paziente, id_medico, patologia, telefono, email) => 
    apiRequest('/api/timeline/patients/register-with-contacts', {
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
  // OPERAZIONI TIMELINE - UPDATED ROUTES
  // ================================
  
  /**
   * Ottieni timeline completa paziente
   * ✅ UPDATED: /api/timeline/timeline/{cf_paziente}
   */
  getTimeline: (cf_paziente, id_medico) => 
    apiRequest(`/api/timeline/timeline/${cf_paziente}?id_medico=${id_medico}`),
  
  // ================================
  // OPERAZIONI APPUNTAMENTI - UPDATED ROUTES
  // ================================
  
  /**
   * Programma nuovo appuntamento
   * ✅ UPDATED: /api/timeline/appointments/schedule
   */
  scheduleAppointment: (appointmentData) => 
    apiRequest('/api/timeline/appointments/schedule', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    }),
  
  /**
   * Completa appuntamento esistente
   * ✅ UPDATED: /api/timeline/appointments/complete
   */
  completeAppointment: (completionData) => 
    apiRequest('/api/timeline/appointments/complete', {
      method: 'POST',
      body: JSON.stringify(completionData)
    }),
  
  /**
   * Ottieni tipi appuntamento disponibili per paziente
   * ✅ UPDATED: /api/timeline/appointments/available-types/{cf_paziente}
   */
  getAvailableTypes: (cf_paziente, id_medico) => 
    apiRequest(`/api/timeline/appointments/available-types/${cf_paziente}?id_medico=${id_medico}`),

  saveReferto: async (refertoData) => {
    const response = await apiRequest('/referti/save', {
      method: 'POST',
      body: JSON.stringify({
        cf_paziente: refertoData.cf_paziente,
        id_medico: refertoData.id_medico,
        appointment_id: refertoData.appointment_id || null,
        testo_referto: refertoData.testo_referto,
        diagnosi: refertoData.diagnosi || null,
        terapia_prescritta: refertoData.terapia_prescritta || null,
        note_medico: refertoData.note_medico || null,
        data_visita: refertoData.data_visita || new Date().toISOString().split('T')[0]
      })
    });
    return response;
  },

  checkCanScheduleNext: async (cf_paziente, id_medico) => {
    const params = new URLSearchParams({ id_medico });
    const response = await apiRequest(`/referti/can-schedule/${cf_paziente}?${params}`);
    return response;
  },

  getPatientReferti: async (cf_paziente, id_medico) => {
    const params = new URLSearchParams({ id_medico });
    const response = await apiRequest(`/referti/patient/${cf_paziente}?${params}`);
    return response;
  },

  getTodaysReferto: async (cf_paziente, id_medico) => {
    const params = new URLSearchParams({ id_medico });
    const response = await apiRequest(`/referti/today/${cf_paziente}?${params}`);
    return response;
  }
};

// ================================
// COSTANTI SISTEMA ITALIANO (unchanged)
// ================================

export const MEDICI = {
  'DOC001': 'Dr. Mario Rossi',
  'DOC002': 'Dr.ssa Laura Bianchi', 
  'DOC003': 'Dr. Giuseppe Verdi',
  'DOC004': 'Dr.ssa Anna Ferrari'
};

export let PATOLOGIE = {};

// Function to load pathologie from Timeline service (which gets them from admin service)
export const loadAvailablePathologie = async () => {
  try {
    console.log('📡 Loading available pathologie from Timeline service...');
    
    const API_BASE = process.env.REACT_APP_API_GATEWAY_URL || `http://${window.location.hostname}:8080`;
    
    const response = await fetch(`${API_BASE}/api/timeline/available-pathologie`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.pathologie_options) {
      PATOLOGIE = data.pathologie_options;
      console.log('✅ Pathologie loaded:', Object.keys(PATOLOGIE).length, 'options');
      console.log('📋 Available pathologie:', PATOLOGIE);
      return true;
    } else {
      console.warn('⚠️ No pathologie available:', data.message);
      PATOLOGIE = {};
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error loading pathologie:', error);
    // Fallback to empty - no pathologie available
    PATOLOGIE = {};
    return false;
  }
};

// Helper function to check if pathologie are available
export const hasAvailablePathologie = () => {
  return Object.keys(PATOLOGIE).length > 0;
};

// Helper function to get pathologie list as array for dropdown
export const getPatologieOptions = () => {
  return Object.entries(PATOLOGIE).map(([code, display]) => ({
    value: code,
    label: display
  }));
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

// Mappature per colori stato (unchanged)
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
// UTILITÀ HELPER (unchanged)
// ================================

export const formatCodiceFiscale = (cf) => {
  if (!cf) return '';
  return cf.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16);
};

export const validateCodiceFiscale = (cf) => {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf);
};

export const formatTelefono = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+39') && !cleaned.startsWith('39')) {
    if (cleaned.startsWith('3') || cleaned.startsWith('0')) {
      cleaned = '+39' + cleaned;
    }
  }
  
  return cleaned;
};

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

export const getDescrizioneStato = (status) => {
  return STATI_APPUNTAMENTO[status] || status;
};

export const getDescrizionePriorita = (priority) => {
  return PRIORITA[priority] || priority;
};

// Export default per compatibilità
export default timelineAPI;