/**
 * API Client
 * Axios instance configured for the backend API
 */
import axios from 'axios';

let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
if (rawUrl.endsWith('/api')) rawUrl = rawUrl.slice(0, -4);
if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
if (!rawUrl.startsWith('http')) rawUrl = `https://${rawUrl}`;
const API_BASE_URL = rawUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const isAdmin = !!localStorage.getItem('admin_token');
        if (refreshToken) {
          const refreshEndpoint = isAdmin
            ? `${API_BASE_URL}/api/admin/auth/refresh`
            : `${API_BASE_URL}/api/client/auth/refresh`;

          const response = await axios.post(refreshEndpoint, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          if (isAdmin) localStorage.setItem('admin_token', access_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
