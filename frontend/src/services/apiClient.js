import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : rawBaseUrl.endsWith('/')
  ? `${rawBaseUrl}api/v1`
  : rawBaseUrl.startsWith('http')
  ? `${rawBaseUrl}/api/v1`
  : rawBaseUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000, // 15-second timeout for serverless endpoints
  headers: {
    'Content-Type': 'application/json'
  }
});

let inMemoryToken = null;

export const setAccessToken = (token) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (token) {
      sessionStorage.setItem('aurora_access_token', token);
    } else {
      sessionStorage.removeItem('aurora_access_token');
    }
  }
};

export const getAccessToken = () => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const sessionToken = sessionStorage.getItem('aurora_access_token');
    if (sessionToken) {
      inMemoryToken = sessionToken;
      return sessionToken;
    }
  }
  return null;
};

export const getGuestId = () => {
  if (typeof window === 'undefined') return null;
  let guestId = localStorage.getItem('aurora_guest_id');
  if (!guestId && typeof document !== 'undefined') {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)guest_id=([^;]+)/);
    if (cookieMatch && cookieMatch[1]) {
      guestId = decodeURIComponent(cookieMatch[1]);
      localStorage.setItem('aurora_guest_id', guestId);
    }
  }
  if (!guestId) {
    guestId = 'gst_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).substring(2, 15));
    localStorage.setItem('aurora_guest_id', guestId);
  }
  return guestId;
};

export const setGuestId = (id) => {
  if (typeof window !== 'undefined' && id) {
    localStorage.setItem('aurora_guest_id', id);
  }
};

export const clearGuestId = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aurora_guest_id');
  }
};

// Request interceptor: inject access token and guest session identifier
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof window !== 'undefined') {
      const guestId = getGuestId();
      if (guestId) {
        config.headers['x-guest-id'] = guestId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically rotate and refresh session on 401
apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined' && response.headers?.['x-guest-id']) {
      localStorage.setItem('aurora_guest_id', response.headers['x-guest-id']);
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop if refresh endpoint itself failed
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data?.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          processQueue(new Error('Failed to refresh token'), null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        setAccessToken(null);
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle network disconnection or request timeouts cleanly
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const networkError = {
        success: false,
        statusCode: isTimeout ? 504 : 503,
        code: isTimeout ? 'GATEWAY_TIMEOUT' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'Network request timed out. Please check your internet connection and retry.'
          : 'Unable to connect to the server. Please verify your internet connection.',
        isNetworkError: true
      };
      return Promise.reject(networkError);
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;

