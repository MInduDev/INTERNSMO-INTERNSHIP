// client/src/services/api.js
// API client for the React frontend

const API_BASE = 'http://localhost:5000/api';
let refreshRequest;

export function resolveAssetUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

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
    throw new Error(`Could not complete the request to ${endpoint}: ${error.message}`);
  }
}

async function multipartRequest(endpoint, formData) {
  const requestWithToken = (token) => fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  let response = await requestWithToken(localStorage.getItem('token'));
  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) response = await requestWithToken(refreshedToken);
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`Upload returned an invalid response: ${error.message}`);
  }
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || 'The upload could not be completed.');
  }
  return result;
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
    if (!res || res.success === false) throw new Error(res?.message || 'Could not load the current user');
    const user = res.user || res;
    if (!user || typeof user !== 'object') throw new Error('The current-user endpoint returned an unexpected response');
    return user;
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
    if (res?.success === false) throw new Error(res.message || 'Could not load movies');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.movies)) return res.movies;
    throw new Error('The movies endpoint returned an unexpected response');
  },
  getById: async (id) => {
    const res = await apiRequest(`/movies/${id}`);
    if (res?.success === false) throw new Error(res.message || 'Could not load movie');
    return res?.movie || res;
  },
  getRecommendations: async () => {
    const res = await apiRequest('/movies/recommendations/rail');
    if (res?.success === false) throw new Error(res.message || 'Could not load recommendations');
    if (Array.isArray(res?.recommendations)) {
      return {
        recommendations: res.recommendations,
        moreLikeThis: Array.isArray(res.moreLikeThis) ? res.moreLikeThis : [],
        method: res.method || null
      };
    }
    if (Array.isArray(res)) return { recommendations: res, moreLikeThis: [], method: null };
    throw new Error('The recommendations endpoint returned an unexpected response');
  },
  create: (movieData, posterFile, videoFile) => {
    const formData = new FormData();
    Object.entries(movieData).forEach(([key, value]) => {
      formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    });
    formData.append('poster', posterFile);
    formData.append('video', videoFile);
    return multipartRequest('/movies', formData);
  },
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
    if (res?.success === false) throw new Error(res.message || 'Could not load your Watch Spaces');
    if (res?.spaces && Array.isArray(res.spaces)) return res.spaces;
    if (Array.isArray(res)) return res;
    throw new Error('The Watch Spaces endpoint returned an unexpected response');
  },
  getAll: async () => {
    const res = await apiRequest('/spaces');
    if (res?.success === false) throw new Error(res.message || 'Could not load Watch Spaces');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.spaces)) return res.spaces;
    throw new Error('The Watch Spaces endpoint returned an unexpected response');
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
    if (res?.success === false) throw new Error(res.message || 'Could not load timeline metadata');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.events)) return res.events;
    throw new Error('The timeline endpoint returned an unexpected response');
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
    }),
  uploadSubtitle: async (file, language) => {
    const formData = new FormData();
    formData.append('subtitle', file);
    formData.append('language', language);
    const requestWithToken = (token) => fetch(`${API_BASE}/timeline/subtitle-assets`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });

    let response = await requestWithToken(localStorage.getItem('token'));
    if (response.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) response = await requestWithToken(refreshedToken);
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`Subtitle upload returned an invalid response: ${error.message}`);
    }
    if (!response.ok || !result?.success || !result.asset?.url) {
      throw new Error(result?.message || 'Could not upload the subtitle file.');
    }
    return result;
  }
};

// 6. Analytics Endpoints
export const analyticsAPI = {
  getSessionAnalytics: (spaceCode) => apiRequest(`/analytics/${spaceCode}`),
  getDashboardSummary: () => apiRequest('/analytics/dashboard/summary')
};

export const interactionsAPI = {
  getMyHistory: async () => {
    const res = await apiRequest('/interactions/my-history');
    if (res?.success === false) throw new Error(res.message || 'Could not load watch history');
    if (Array.isArray(res?.history)) return res.history;
    throw new Error('The watch history endpoint returned an unexpected response');
  },
  record: (interaction) =>
    apiRequest('/interactions', {
      method: 'POST',
      body: JSON.stringify(interaction)
    })
};

// 7. Admin Console Endpoints
export const adminAPI = {
  getUsers: async () => {
    const res = await apiRequest('/auth/users');
    if (res?.success === false) throw new Error(res.message || 'Could not load users');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.users)) return res.users;
    throw new Error('The users endpoint returned an unexpected response');
  },
  updateUserRole: (userId, role) =>
    apiRequest(`/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),
  getSpaces: async () => {
    const res = await apiRequest('/spaces');
    if (res?.success === false) throw new Error(res.message || 'Could not load Watch Spaces');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.spaces)) return res.spaces;
    throw new Error('The Watch Spaces endpoint returned an unexpected response');
  },
  terminateSpace: (code) =>
    apiRequest(`/spaces/${code}`, {
      method: 'DELETE'
    })
};
