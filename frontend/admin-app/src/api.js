// frontend/admin-app/src/api.js
// API Service for Admin Authentication - Using API Gateway
// ALL requests go through Gateway (port 8080) following project architecture

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

// Generic API request handler - USES GATEWAY
const apiRequest = async (url, options = {}) => {
  try {
    // ✅ ALL requests go through API Gateway
    const response = await fetch(`${API_GATEWAY_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for session cookies
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
      
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.detail.message) {
          errorMessage = data.detail.message;
        }
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      throw new APIError(errorMessage, response.status, data.detail);
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

// ================================
// AUTHENTICATION API - VIA GATEWAY
// ================================

export const authAPI = {
  // Sign up new admin user - ✅ Goes through Gateway
  signUp: async (userData) => {
    return await apiRequest('/api/admin/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Verify email with 6-digit code - ✅ Via Gateway  
  verifyEmail: async (verificationData) => {
    return await apiRequest('/api/admin/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  },

  // Request login (sends code to email) - ✅ Via Gateway
  requestLoginCode: async (loginData) => {
    return await apiRequest('/api/admin/auth/login-request', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
  },

  // Login with email code - ✅ Via Gateway
  login: async (loginData) => {
    return await apiRequest('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
  },

  // Resend verification code - ✅ Via Gateway
  resendCode: async (resendData) => {
    return await apiRequest('/api/admin/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify(resendData)
    });
  },

  // Check current session - ✅ Via Gateway
  checkSession: async () => {
    return await apiRequest('/api/admin/auth/me');
  },

  // Logout - ✅ Via Gateway
  logout: async () => {
    return await apiRequest('/api/admin/auth/logout', {
      method: 'POST'
    });
  },

  // Health check - ✅ Via Gateway (for admin service)
  health: async () => {
    return await apiRequest('/api/admin/health');
  }
};

// ================================
// ADMIN DASHBOARD API - VIA GATEWAY  
// ================================

export const adminAPI = {
  // System overview - ✅ Via Gateway
  getSystemOverview: async () => {
    return await apiRequest('/api/admin/dashboard/overview');
  },

  // Patient statistics - ✅ Via Gateway
  getPatientStats: async () => {
    return await apiRequest('/api/admin/dashboard/patients/stats');
  },

  // Doctor activity - ✅ Via Gateway
  getDoctorActivity: async () => {
    return await apiRequest('/api/admin/dashboard/doctors/activity');
  },

  // Service health - ✅ Via Gateway
  getServiceHealth: async () => {
    return await apiRequest('/api/admin/dashboard/system/health');
  }
};

// ================================
// INTEGRATION WITH EXISTING SERVICES - VIA GATEWAY
// ================================

export const integrationAPI = {
  // Timeline service integration - ✅ Via Gateway
  getTimelineStats: async () => {
    return await apiRequest('/api/timeline/stats');
  },

  // Analytics service integration - ✅ Via Gateway  
  getAnalyticsData: async () => {
    return await apiRequest('/api/analytics/dashboard');
  },

  // Scheduler service integration - ✅ Via Gateway
  getSchedulerStats: async () => {
    return await apiRequest('/api/scheduler/stats');
  },

  // Gateway health check - ✅ Direct to Gateway
  getGatewayHealth: async () => {
    return await apiRequest('/health');
  }
};

export default authAPI;

// ================================
// GATEWAY INFO FOR DEBUGGING
// ================================

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    📡 ADMIN API GATEWAY INTEGRATION                ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  🔗 GATEWAY URL: ${API_GATEWAY_URL}                           ║
║                                                                    ║
║  📋 API ROUTES (All via Gateway):                                  ║
║    /api/admin/auth/*          → Admin Authentication              ║
║    /api/admin/dashboard/*     → Admin Dashboard                   ║
║    /api/timeline/*            → Timeline Service                  ║
║    /api/analytics/*           → Analytics Service                 ║  
║    /api/scheduler/*           → Scheduler Service                 ║
║                                                                    ║
║  ✅ CONSISTENT WITH PROJECT ARCHITECTURE                          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);