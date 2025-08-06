import { authClient } from '../shared/axios-config';
import type { User, AuthResponse, SignUpData, SignInData } from '../types';

export const authAPI = {
  // Sign up
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    const response = await authClient.post('/signup', data);
    const result = response.data;

    // Don't store token on signup - user needs to verify email first
    if (result.success && result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  // Verify email
  verifyEmail: async (token: string): Promise<{ success: boolean; message?: string; error?: string; data?: { user: User; token: string } }> => {
    const response = await authClient.post('/verify-email', { token });
    const result = response.data;

    if (result.success && result.data?.user && result.data?.token) {
      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }

    return result;
  },

  // Resend verification email
  resendVerification: async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await authClient.post('/resend-verification', { email });
    return response.data;
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

  // Forgot password
  forgotPassword: async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await authClient.post('/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await authClient.post('/reset-password', { token, password });
    return response.data;
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

 