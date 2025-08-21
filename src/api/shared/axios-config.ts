import axios from 'axios';

// Backend API configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Create base axios instance with default configuration
export const createApiClient = (baseURL?: string, timeout?: number) => {
  const client = axios.create({
    baseURL: baseURL || `${BACKEND_URL}/api`,
    timeout: timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for adding auth tokens
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // Check if we're not already on a login page to avoid infinite redirects
        if (!window.location.pathname.includes('/auth/')) {
          window.location.href = '/auth/signin';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Default API client
export const apiClient = createApiClient();

// Auth-specific client with shorter timeout
export const authClient = createApiClient(`${BACKEND_URL}/api/auth`, 10000);

// Asset-specific client with longer timeout for Cloudinary uploads
export const assetClient = createApiClient(`${BACKEND_URL}/api`, 120000); // 2 minutes timeout

// Generation-specific client with longer timeout
export const generationClient = createApiClient(`${BACKEND_URL}/api`, undefined);

// Analytics-specific client with longer timeout for complex queries
export const analyticsClient = createApiClient(`${BACKEND_URL}/api`, 60000); // 60 seconds timeout

// Helper function for manual auth headers (for special cases)
export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
