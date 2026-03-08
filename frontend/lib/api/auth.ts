/**
 * Authentication API functions
 */
import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    user_type: string;
  };
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  user_type: string;
  phone?: string;
  two_factor_enabled: boolean;
  created_at: string;
  last_login?: string;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/admin/auth/login', credentials);
  return response.data;
}

/**
 * Logout - revoke current session
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/admin/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/api/admin/auth/me');
  return response.data;
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string): Promise<{ access_token: string }> {
  const response = await apiClient.post('/api/admin/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await apiClient.post('/api/admin/auth/reset-password', { email });
  return response.data;
}
