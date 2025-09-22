// frontend/scheduler-app/src/api.js
// Scheduler Frontend API Integration
// Communicates with Scheduler Service backend via API Gateway
// All requests go through /api/scheduler/* routes

// ✅ UPDATED: All requests go through API Gateway
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL || `http://${window.location.hostname}:8080`;

// Error handling class
class SchedulerAPIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'SchedulerAPIError';
    this.status = status;
    this.details = details;
  }
}

// Generic API request handler
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
      throw new SchedulerAPIError('Risposta del server non valida', response.status);
    }
    
    if (!response.ok) {
      let errorMessage = 'Richiesta API fallita';
      let errorDetails = null;
      
      // Handle different error response formats
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
      } else if (data.validation_result && data.validation_result.message) {
        // Handle scheduler validation errors
        errorMessage = data.validation_result.message;
        errorDetails = data.validation_result;
      }
      
      throw new SchedulerAPIError(errorMessage, response.status, errorDetails);
    }
    
    return data;
  } catch (error) {
    if (error instanceof SchedulerAPIError) throw error;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new SchedulerAPIError('Impossibile connettersi al server. Verificare la connessione.', 0);
    }
    
    throw new SchedulerAPIError(`Errore di rete: ${error.message}`, 0);
  }
};

// ================================
// SCHEDULER API METHODS
// ================================

export const schedulerAPI = {
  
  // ================================
  // HEALTH CHECK
  // ================================
  
  /**
   * Check scheduler service health
   */
  health: () => apiRequest('/api/scheduler/health'),
  
  /**
   * Get service information
   */
  serviceInfo: () => apiRequest('/api/scheduler/service-info'),

  // ================================
  // SCHEDULING VALIDATION
  // ================================
  
  /**
   * Check if patient can schedule appointment (CRITICAL - prevents duplicate appointments)
   * @param {string} cf_paziente - Patient fiscal code
   * @param {string} cronoscita_id - Cronoscita pathology ID
   */
  checkSchedulingPermission: (cf_paziente, cronoscita_id) => 
    apiRequest('/api/scheduler/validation/check-scheduling-permission', {
      method: 'POST',
      body: JSON.stringify({ cf_paziente, cronoscita_id })
    }),

  // ================================
  // COMPLETE SCHEDULING DATA
  // ================================
  
  /**
   * Get complete scheduling data (MAIN ENDPOINT for scheduler interface)
   * Returns: validation + available exams + doctor density
   * @param {string} cf_paziente - Patient fiscal code  
   * @param {string} cronoscita_id - Cronoscita pathology ID
   * @param {string} id_medico - Doctor ID
   * @param {number} days_ahead - Days to show (default: 30)
   */
  getSchedulingData: (cf_paziente, cronoscita_id, id_medico, days_ahead = 30) => 
    apiRequest(`/api/scheduler/scheduling-data/${cf_paziente}?cronoscita_id=${cronoscita_id}&id_medico=${id_medico}&days_ahead=${days_ahead}`),

  // ================================
  // APPOINTMENT SCHEDULING
  // ================================
  
  /**
   * Schedule new appointment with full validation
   * @param {Object} appointmentData - Appointment data
   * @param {string} appointmentData.cf_paziente - Patient fiscal code
   * @param {string} appointmentData.id_medico - Doctor ID
   * @param {string} appointmentData.cronoscita_id - Cronoscita ID
   * @param {string} appointmentData.appointment_date - Date (YYYY-MM-DD)
   * @param {Array} appointmentData.selected_exam_mappings - Array of exam mapping IDs
   * @param {string} appointmentData.notes - Optional notes
   * @param {string} created_by_doctor - Doctor creating the appointment
   */
  scheduleAppointment: (appointmentData, created_by_doctor) => 
    apiRequest(`/api/scheduler/appointments/schedule?created_by_doctor=${created_by_doctor}`, {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    }),

  // ================================
  // DOCTOR DENSITY VISUALIZATION
  // ================================
  
  /**
   * Get doctor's appointment density with visual color gradients
   * @param {string} id_medico - Doctor ID
   * @param {string} start_date - Start date (YYYY-MM-DD)
   * @param {string} end_date - End date (YYYY-MM-DD)
   */
  getDoctorDensity: (id_medico, start_date, end_date) => 
    apiRequest(`/api/scheduler/density/doctor/${id_medico}?start_date=${start_date}&end_date=${end_date}`),

  /**
   * Get quick density overview for doctor (simplified)
   * @param {string} id_medico - Doctor ID
   * @param {number} days_ahead - Days to analyze (default: 14)
   */
  getQuickDensityOverview: (id_medico, days_ahead = 14) => 
    apiRequest(`/api/scheduler/density/doctor/${id_medico}/quick?days_ahead=${days_ahead}`),

  // ================================
  // EXAM SELECTION
  // ================================
  
  /**
   * Get available exams for scheduling from admin configuration
   * Only returns exams with visualizza_nel_referto = "S" and is_active = true
   * @param {string} cronoscita_id - Cronoscita pathology ID
   */
  getAvailableExams: (cronoscita_id) => 
    apiRequest(`/api/scheduler/exams/${cronoscita_id}`),

  /**
   * Get exam selection summary (counts and structure info)
   * @param {string} cronoscita_id - Cronoscita pathology ID
   */
  getExamSummary: (cronoscita_id) => 
    apiRequest(`/api/scheduler/exams/${cronoscita_id}/summary`),

  // ================================
  // INTEGRATION STATUS
  // ================================
  
  /**
   * Check timeline service integration status
   */
  checkTimelineIntegration: () => 
    apiRequest('/api/scheduler/integration/timeline-status'),

  // ================================
  // UTILITY METHODS
  // ================================
  
  /**
   * Format date for Italian display
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {string} - Formatted Italian date
   */
  formatItalianDate: (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateStr;
    }
  },

  /**
   * Generate date options for next N days
   * @param {number} days - Number of days to generate
   * @returns {Array} - Array of date options
   */
  generateDateOptions: (days = 30) => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const displayStr = date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      });
      
      dates.push({
        value: dateStr,
        label: displayStr,
        dayName: date.toLocaleDateString('it-IT', { weekday: 'long' }),
        dayOfWeek: date.getDay()
      });
    }
    
    return dates;
  },

  /**
   * Get density color class based on appointment count
   * @param {number} appointmentCount - Number of appointments
   * @returns {string} - CSS class name
   */
  getDensityColorClass: (appointmentCount) => {
    if (appointmentCount === 0) return 'density-very-low';
    if (appointmentCount <= 2) return 'density-low';
    if (appointmentCount <= 5) return 'density-medium';
    if (appointmentCount <= 8) return 'density-high';
    return 'density-very-high';
  },

  /**
   * Get density description in Italian
   * @param {number} appointmentCount - Number of appointments
   * @returns {string} - Italian description
   */
  getDensityDescription: (appointmentCount) => {
    if (appointmentCount === 0) return 'Molto Libero';
    if (appointmentCount <= 2) return 'Libero';
    if (appointmentCount <= 5) return 'Moderato';
    if (appointmentCount <= 8) return 'Occupato';
    return 'Molto Occupato';
  },

  // ================================
  // IFRAME COMMUNICATION HELPERS
  // ================================
  
  /**
   * Send message to parent timeline service
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  sendMessageToParent: (type, data = {}) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type, data }, '*');
    }
  },

  /**
   * Notify parent of successful appointment scheduling
   * @param {Object} appointmentData - Scheduled appointment data
   */
  notifyAppointmentScheduled: (appointmentData) => {
    schedulerAPI.sendMessageToParent('APPOINTMENT_SCHEDULED', appointmentData);
  },

  /**
   * Request parent to close scheduler iframe
   * @param {boolean} success - Whether operation was successful
   */
  requestCloseScheduler: (success = false) => {
    schedulerAPI.sendMessageToParent('CLOSE_SCHEDULER', { success });
  },

  /**
   * Get patient data from URL parameters (set by Timeline service)
   * @returns {Object} - Patient data object
   */
  getPatientDataFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      cf_paziente: urlParams.get('cf_paziente'),
      cronoscita_id: urlParams.get('cronoscita_id'),
      id_medico: urlParams.get('id_medico'),
      patient_name: urlParams.get('patient_name') ? 
        decodeURIComponent(urlParams.get('patient_name')) : '',
      cronoscita_name: urlParams.get('cronoscita_name') ? 
        decodeURIComponent(urlParams.get('cronoscita_name')) : ''
    };
  },

  // ================================
  // ERROR HANDLING HELPERS
  // ================================
  
  /**
   * Check if error is due to duplicate appointment
   * @param {Error} error - API error
   * @returns {boolean} - True if duplicate appointment error
   */
  isDuplicateAppointmentError: (error) => {
    return error instanceof SchedulerAPIError && 
           error.status === 409 && 
           error.details && 
           error.details.error_type === 'DUPLICATE_FUTURE_APPOINTMENT';
  },

  /**
   * Check if error is due to validation failure
   * @param {Error} error - API error  
   * @returns {boolean} - True if validation error
   */
  isValidationError: (error) => {
    return error instanceof SchedulerAPIError && 
           error.status >= 400 && error.status < 500;
  },

  /**
   * Get user-friendly error message in Italian
   * @param {Error} error - API error
   * @returns {string} - Formatted error message
   */
  getErrorMessage: (error) => {
    if (!(error instanceof SchedulerAPIError)) {
      return 'Errore imprevisto. Riprovare.';
    }

    // Handle specific error types
    if (error.status === 409) {
      return error.message; // Already in Italian from backend
    }
    
    if (error.status === 404) {
      return 'Risorsa non trovata. Verificare i dati inseriti.';
    }
    
    if (error.status === 400) {
      return error.message || 'Dati non validi. Verificare le informazioni inserite.';
    }
    
    if (error.status >= 500) {
      return 'Errore del server. Contattare l\'assistenza tecnica.';
    }
    
    if (error.status === 0) {
      return 'Impossibile connettersi al server. Verificare la connessione di rete.';
    }
    
    return error.message || 'Errore durante l\'operazione. Riprovare.';
  }
};

// Export error class for external use
export { SchedulerAPIError };

// Default export
export default schedulerAPI;

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('📅 Scheduler API initialized');
  console.log('🔗 API Gateway URL:', API_BASE_URL);
  console.log('🌐 Available endpoints:');
  console.log('  • GET /api/scheduler/scheduling-data/{cf_paziente}');
  console.log('  • POST /api/scheduler/appointments/schedule');
  console.log('  • GET /api/scheduler/density/doctor/{id_medico}');
  console.log('  • GET /api/scheduler/exams/{cronoscita_id}');
  console.log('  • POST /api/scheduler/validation/check-scheduling-permission');
}