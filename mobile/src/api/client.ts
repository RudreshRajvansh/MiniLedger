import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}

// Request interceptor: attaches Bearer token if user is authenticated
apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Response interceptor: automatically handles 401 Unauthorized by logging out
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    if (error.response?.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    return Promise.reject(error);
  },
);

/**
 * Extracts a friendly error message from an Axios error or the backend error response.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error;
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your network connection.';
    }
    if (!error.response) {
      return 'Cannot reach the server. Is the backend running?';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
