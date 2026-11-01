// client/src/services/api.js
// API client for the React frontend

const API_BASE = 'http://localhost:5000/api';
let refreshRequest;

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('watchspace-auth-expired'));
    }
    return null;
  }
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success || !data.accessToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('watchspace-auth-expired'));
        return null;
      }
      localStorage.setItem('token', data.accessToken);
      return data.accessToken;
    }).finally(() => {
      refreshRequest = null;
    });
  }
  try {
    return await refreshRequest;
  } catch (error) {
    console.warn('[API] Token refresh failed:', error.message);
    return null;
  }
}

/**
 * Sends JSON requests to the backend and parses the responses.
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const requestWithToken = (token) => fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    let response = await requestWithToken(localStorage.getItem('token'));
    if (
      response.status === 401 &&
      !['/auth/login', '/auth/register', '/auth/refresh'].includes(endpoint)
    ) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) response = await requestWithToken(refreshedToken);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API] Could not connect to backend at ${endpoint}:`, error.message);
    return null;
  }
}

// 1. Authentication Endpoints
export const authAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  getMe: async () => {
    const res = await apiRequest('/auth/me');
    if (!res || res.success === false) return null;
    return res.user || res;
  },
  updateProfile: (profileData) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
};

// 2. Movies Catalog Endpoints
export const moviesAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiRequest(`/movies${query ? `?${query}` : ''}`);
    return res?.movies || (Array.isArray(res) ? res : []);
  },
  getById: async (id) => {
    const res = await apiRequest(`/movies/${id}`);
    return res?.movie || res;
  },
  getRecommendations: async () => {
    const res = await apiRequest('/movies/recommendations/rail');
    return res?.recommendations || (Array.isArray(res) ? res : []);
  },
  create: (movieData) =>
    apiRequest('/movies', {
      method: 'POST',
      body: JSON.stringify(movieData)
    }),
  delete: (id) =>
    apiRequest(`/movies/${id}`, {
      method: 'DELETE'
    })
};

// 3. Watch Space Endpoints
export const spacesAPI = {
  create: (spaceData) =>
    apiRequest('/spaces/create', {
      method: 'POST',
      body: JSON.stringify(spaceData)
    }),
  getByCode: (code) => apiRequest(`/spaces/${code}`),
  join: (code, participantData) =>
    apiRequest(`/spaces/${code}/join`, {
      method: 'POST',
      body: JSON.stringify(participantData)
    }),
  getMySpaces: async () => {
    const res = await apiRequest('/spaces/user/my-spaces');
    if (res?.spaces && Array.isArray(res.spaces)) return res.spaces;
    if (Array.isArray(res)) return res;
    const fallback = await apiRequest('/spaces');
    return fallback?.spaces || (Array.isArray(fallback) ? fallback : []);
  },
  getAll: async () => {
    const res = await apiRequest('/spaces');
    return res?.spaces || (Array.isArray(res) ? res : []);
  },
  delete: (code) => apiRequest(`/spaces/${code}`, { method: 'DELETE' })
};

// 4. Grounded AI Co-Pilot Endpoints
export const aiAPI = {
  ask: ({ movieId, currentTimestamp, question, coPilotLevel, roomCode }) =>
    apiRequest('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ movieId, currentTimestamp, question, coPilotLevel, roomCode })
    }),
  getSuggestions: () => apiRequest('/ai/suggestions')
};

// 5. Timeline Events & Admin Endpoints
export const timelineAPI = {
  getByMovie: async (movieId) => {
    const res = await apiRequest(`/timeline/${movieId}`);
    return res?.events || (Array.isArray(res) ? res : []);
  },
  create: (eventData) =>
    apiRequest('/timeline', {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),
  delete: (id) =>
    apiRequest(`/timeline/${id}`, {
      method: 'DELETE'
    }),
  uploadJson: (movieId, events) =>
    apiRequest('/timeline/upload-json', {
      method: 'POST',
      body: JSON.stringify({ movieId, events })
    })
};

// 6. Analytics Endpoints
export const analyticsAPI = {
  getSessionAnalytics: (spaceCode) => apiRequest(`/analytics/${spaceCode}`),
  getDashboardSummary: () => apiRequest('/analytics/dashboard/summary')
};

// 7. Admin Console Endpoints
export const adminAPI = {
  getUsers: async () => {
    const res = await apiRequest('/auth/users');
    return res?.users || (Array.isArray(res) ? res : []);
  },
  updateUserRole: (userId, role) =>
    apiRequest(`/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),
  getSpaces: async () => {
    const res = await apiRequest('/spaces');
    return res?.spaces || (Array.isArray(res) ? res : []);
  },
  terminateSpace: (code) =>
    apiRequest(`/spaces/${code}`, {
      method: 'DELETE'
    })
};
