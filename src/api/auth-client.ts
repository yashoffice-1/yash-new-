import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Create axios instance for auth
const authClient = axios.create({
  baseURL: `${BACKEND_URL}/api/auth`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
authClient.interceptors.request.use(
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

// Response interceptor to handle auth errors
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
     
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Sign up
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    const response = await authClient.post('/signup', data);
    const result = response.data;

    if (result.success && result.data?.token) {
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  // Verify email
  verifyEmail: async (token: string): Promise<{ success: boolean; message?: string; error?: string; data?: { user: User } }> => {
    const response = await authClient.post('/verify-email', { token });
    const result = response.data;

    if (result.success && result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  // Sign in
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    const response = await authClient.post('/signin', data);
    const result = response.data;
    
    if (result.success && result.data?.token) {
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    
    return result;
  },

  // Get current user profile
  getProfile: async (): Promise<{ success: boolean; data?: { user: User }; error?: string }> => {
    const response = await authClient.get('/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data: { firstName: string; lastName: string }): Promise<{ success: boolean; data?: { user: User }; error?: string }> => {
    const response = await authClient.put('/profile', data);
    const result = response.data;
    
    if (result.success && result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    
    return result;
  },

  // Sign out
  signOut: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Get stored user
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  }
};

export default authClient; 