// frontend/analytics-app/src/api.js
// Analytics API integration through API Gateway
// All requests go through Gateway (port 8080) to analytics service

const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080';

// API Error handling
class APIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

// Generic API request handler
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}${url}`, {
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

// Analytics API service
export const analyticsAPI = {
  /**
   * Get laboratory exam list for first dropdown (desesame) - WITH FILTERING
   * Through API Gateway: /api/analytics/laboratory-exams/{cf}?cronoscita_id=...
   */
  getExamList: (codiceFiscale, cronoscitaId = null) => {
    const url = `/api/analytics/laboratory-exams/${codiceFiscale}${cronoscitaId ? `?cronoscita_id=${cronoscitaId}` : ''}`;
    return apiRequest(url);
  },
  
  /**
   * Get sottanalisi list for second dropdown - WITH FILTERING
   * Through API Gateway: /api/analytics/sottanalisi/{cf}?exam_key=...&cronoscita_id=...
   */
  getSottanalisi: (codiceFiscale, examKey, cronoscitaId = null) => {
    let url = `/api/analytics/sottanalisi/${codiceFiscale}?exam_key=${encodeURIComponent(examKey)}`;
    if (cronoscitaId) {
      url += `&cronoscita_id=${cronoscitaId}`;
    }
    return apiRequest(url);
  },
  
  /**
   * Get chart data for visualization - WITH FILTERING
   * Through API Gateway: /api/analytics/chart-data/{cf}?exam_key=...&dessottoanalisi=...&cronoscita_id=...
   */
  getChartData: (codiceFiscale, examKey, dessottoanalisi, cronoscitaId = null) => {
    let url = `/api/analytics/chart-data/${codiceFiscale}?exam_key=${encodeURIComponent(examKey)}&dessottoanalisi=${encodeURIComponent(dessottoanalisi)}`;
    if (cronoscitaId) {
      url += `&cronoscita_id=${cronoscitaId}`;
    }
    return apiRequest(url);
  },

  /**
   * Get filtering information for debugging
   * Through API Gateway: /api/analytics/filtering-info?cronoscita_id=...
   */
  getFilteringInfo: (cronoscitaId = null) => {
    const url = `/api/analytics/filtering-info${cronoscitaId ? `?cronoscita_id=${cronoscitaId}` : ''}`;
    return apiRequest(url);
  }
};

// Utility functions
export const utils = {
  /**
   * Extract CF from URL parameters
   */
  getCFFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cf') || urlParams.get('codice_fiscale');
  },
  
  /**
   * Extract doctor ID from URL parameters  
   */
  getDoctorIDFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('doctor_id') || urlParams.get('id_medico') || 'unknown';
  },
  
  /**
   * Extract session token from URL parameters
   */
  getSessionTokenFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session_token') || urlParams.get('token') || '';
  },
  
  /**
   * Validate Italian fiscal code format
   */
  validateCodiceFiscale: (cf) => {
    if (!cf || typeof cf !== 'string') return false;
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return cfRegex.test(cf.toUpperCase());
  },
  
  /**
   * Format date from DD/MM/YYYY to display format
   */
  formatDate: (dateString) => {
    try {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  },
  
  /**
   * Parse date for sorting (DD/MM/YYYY to Date object)
   */
  parseDate: (dateString) => {
    try {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY -> new Date(YYYY, MM-1, DD)
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(dateString);
    } catch {
      return new Date(0); // Fallback to epoch
    }
  }
};

export default analyticsAPI;