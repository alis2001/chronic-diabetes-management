// frontend/admin-app/src/api.js
// Admin Dashboard API Client - WITH SESSION TOKEN PERSISTENCE
// Fixed version that properly stores and manages session tokens

// ================================
// SESSION STORAGE MANAGEMENT
// ================================

const SESSION_TOKEN_KEY = 'admin_session_token';
const SESSION_USER_KEY = 'admin_session_user';

export const sessionStorage = {
  // Token management
  getToken: () => {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to get token from localStorage:', error);
      return null;
    }
  },

  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(SESSION_TOKEN_KEY, token);
        console.log('✅ Session token stored');
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        console.log('🗑️ Session token removed');
      }
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  },

  // User data management  
  getUser: () => {
    try {
      const userData = localStorage.getItem(SESSION_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Failed to get user data from localStorage:', error);
      return null;
    }
  },

  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
        console.log('✅ User data stored');
      } else {
        localStorage.removeItem(SESSION_USER_KEY);
        console.log('🗑️ User data removed');
      }
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  },

  // Clear all session data
  clear: () => {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_USER_KEY);
      console.log('🧹 All session data cleared');
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  },

  // Check if session exists
  hasValidSession: () => {
    const token = sessionStorage.getToken();
    const user = sessionStorage.getUser();
    return !!(token && user);
  }
};

// ================================
// API CONFIGURATION
// ================================

// API Gateway URL configuration
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL || `http://${window.location.hostname}:8080`;


// Custom error class
export class APIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ================================
// HTTP CLIENT WITH TOKEN MANAGEMENT
// ================================

const apiRequest = async (endpoint, options = {}) => {
  try {
    // Prepare URL
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get current session token
    const token = sessionStorage.getToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Prepare request options
    const requestOptions = {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies for additional security
      ...options
    };

    console.log(`📡 API Request: ${requestOptions.method} ${url}`);
    
    // Make request
    const response = await fetch(url, requestOptions);
    
    // Handle response
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails = null;

      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError);
      }

      // Handle authentication errors
      if (response.status === 401) {
        console.warn('🚨 Authentication failed - clearing session');
        sessionStorage.clear();
        // Don't throw for auth check failures - let component handle it
        if (endpoint.includes('/auth/me')) {
          return { authenticated: false };
        }
      }

      throw new APIError(errorMessage, response.status, errorDetails);
    }

    // Parse JSON response
    const data = await response.json();
    console.log(`✅ API Response: ${requestOptions.method} ${url}`, data);
    
    return data;
    
  } catch (error) {
    console.error(`❌ API Error: ${options.method || 'GET'} ${endpoint}`, error);
    
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or other errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Impossibile connettersi al server. Verificare la connessione.', 0);
    }
    
    throw new APIError(`Errore di rete: ${error.message}`, 0);
  }
};

// ================================
// AUTHENTICATION API - WITH TOKEN PERSISTENCE
// ================================

export const authAPI = {
  // Sign up new admin user
  signUp: async (userData) => {
    return await apiRequest('/api/admin/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Verify email with 6-digit code  
  verifyEmail: async (verificationData) => {
    return await apiRequest('/api/admin/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  },

  // Request login (sends code to email)
  requestLoginCode: async (loginData) => {
    return await apiRequest('/api/admin/auth/login-request', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
  },

  // Login with email code - STORES SESSION TOKEN
  login: async (loginData) => {
    const response = await apiRequest('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    // ✅ FIXED: Store session token and user data after successful login
    if (response.success && response.access_token && response.user_info) {
      sessionStorage.setToken(response.access_token);
      sessionStorage.setUser(response.user_info);
      console.log('🔐 Login successful - session stored');
    }

    return response;
  },

  // Resend verification code
  resendCode: async (resendData) => {
    return await apiRequest('/api/admin/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify(resendData)
    });
  },

  // Check current session - USES STORED TOKEN
  checkSession: async () => {
    // First check if we have local session data
    if (!sessionStorage.hasValidSession()) {
      console.log('ℹ️ No local session found');
      return { authenticated: false };
    }

    try {
      // Validate session with server
      const response = await apiRequest('/api/admin/auth/me');
      
      if (response.authenticated && response.user) {
        // Update stored user data in case it changed
        sessionStorage.setUser(response.user);
        console.log('✅ Session validated with server');
        return response;
      } else {
        console.log('❌ Server session invalid');
        sessionStorage.clear();
        return { authenticated: false };
      }
    } catch (error) {
      console.warn('Session check failed:', error);
      sessionStorage.clear();
      return { authenticated: false };
    }
  },

  // Logout - CLEARS STORED TOKEN
  logout: async () => {
    try {
      // Try to logout on server
      await apiRequest('/api/admin/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local session
      sessionStorage.clear();
      console.log('👋 Logout complete - session cleared');
    }

    return { success: true };
  },

  // Health check
  health: async () => {
    return await apiRequest('/api/admin/health');
  },

  // Get current user data from local storage
  getCurrentUser: () => {
    return sessionStorage.getUser();
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return sessionStorage.hasValidSession();
  }
};

// ================================
// ADMIN DASHBOARD API - REAL DATA ENDPOINTS + GENERIC HTTP METHODS
// ================================

export const adminAPI = {
  // System overview with real data
  getSystemOverview: async () => {
    return await apiRequest('/api/admin/dashboard/overview');
  },

  // Patient statistics (legacy)
  getPatientStats: async () => {
    return await apiRequest('/api/admin/dashboard/patients/stats');
  },

  // Doctor activity (legacy)
  getDoctorActivity: async () => {
    return await apiRequest('/api/admin/dashboard/doctors/activity');
  },

  // Service health (legacy)
  getServiceHealth: async () => {
    return await apiRequest('/api/admin/dashboard/system/health');
  },

  // NEW: Get complete patients list with enrollment info
  getPatientsList: async () => {
    return await apiRequest('/api/admin/dashboard/patients/list');
  },

  // NEW: Get complete doctors list with activity data
  getDoctorsList: async () => {
    return await apiRequest('/api/admin/dashboard/doctors/list');
  },

  // NEW: Get complete visits list with patient and doctor info
  getVisitsList: async () => {
    return await apiRequest('/api/admin/dashboard/visits/list');
  },

  getLaboratorioOptions: async () => {
    return await apiRequest('/api/admin/dashboard/laboratorio/catalogo-for-mapping');
  },

  // ================================
  // GENERIC HTTP METHODS - FIXES THE "adminAPI.get is not a function" ERROR
  // ================================

  // Generic GET method
  get: async (endpoint) => {
    return await apiRequest(`/api/admin${endpoint}`);
  },

  // Generic POST method
  post: async (endpoint, data) => {
    return await apiRequest(`/api/admin${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Generic PUT method
  put: async (endpoint, data) => {
    return await apiRequest(`/api/admin${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Generic DELETE method
  delete: async (endpoint) => {
    return await apiRequest(`/api/admin${endpoint}`, {
      method: 'DELETE'
    });
  },

  // Generic PATCH method
  patch: async (endpoint, data) => {
    return await apiRequest(`/api/admin${endpoint}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // ================================
  // LABORATORIO SPECIFIC ENDPOINTS (Optional - but cleaner to use)
  // ================================

  // Get laboratorio overview
  getLaboratorioOverview: async () => {
    return await apiRequest('/api/admin/dashboard/laboratorio/overview');
  },

  // Get exam catalog
  getExamCatalog: async () => {
    return await apiRequest('/api/admin/dashboard/laboratorio/catalogo');
  },

  // Create exam catalog entry
  createExamCatalog: async (examData) => {
    return await apiRequest('/api/admin/dashboard/laboratorio/catalogo', {
      method: 'POST',
      body: JSON.stringify(examData)
    });
  },

  // Get exam mappings
  getExamMappings: async () => {
    return await apiRequest('/api/admin/dashboard/laboratorio/mappings');
  },

  // Create exam mapping
  createExamMapping: async (mappingData) => {
    return await apiRequest('/api/admin/dashboard/laboratorio/mappings', {
      method: 'POST',
      body: JSON.stringify(mappingData)
    });
  },

  // Delete exam catalog entry
  deleteExamCatalog: async (codiceCatalogo) => {
    return await apiRequest(`/api/admin/dashboard/laboratorio/catalogo/${codiceCatalogo}`, {
      method: 'DELETE'
    });
  },

  // Update exam catalog entry
  updateExamCatalog: async (codiceCatalogo, updates) => {
    return await apiRequest(`/api/admin/dashboard/laboratorio/catalogo/${codiceCatalogo}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
};

// ================================
// INTEGRATION WITH OTHER SERVICES
// ================================

export const integrationAPI = {
  // Timeline service integration
  getTimelineStats: async () => {
    return await apiRequest('/api/timeline/stats');
  },

  // Analytics service integration  
  getAnalyticsData: async () => {
    return await apiRequest('/api/analytics/dashboard');
  },

  // Scheduler service integration
  getSchedulerStatus: async () => {
    return await apiRequest('/api/scheduler/status');
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const apiUtils = {
  // Format error message for display
  formatError: (error) => {
    if (error instanceof APIError) {
      return error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Si è verificato un errore imprevisto';
  },

  // Check if error is authentication related
  isAuthError: (error) => {
    return error instanceof APIError && error.statusCode === 401;
  },

  // Check if error is network related
  isNetworkError: (error) => {
    return error instanceof APIError && error.statusCode === 0;
  }
};

// Export session storage for direct access if needed
export { sessionStorage as session };

// ================================
// DEBUGGING UTILITIES (Development Only)
// ================================

if (process.env.NODE_ENV === 'development') {
  // Expose API utilities to window for debugging
  window.adminAPI = {
    auth: authAPI,
    admin: adminAPI,
    session: sessionStorage,
    utils: apiUtils
  };

  console.log('🔧 Development Mode: API utilities available at window.adminAPI');
}