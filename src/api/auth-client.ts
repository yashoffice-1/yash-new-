import { createClient } from '@supabase/supabase-js';
import { apiGet, apiPost } from '@/utils/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export const authAPI = {
  // Sign up with Supabase
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            display_name: `${data.firstName} ${data.lastName}`,
            initials: `${data.firstName.charAt(0).toUpperCase()}${data.lastName.charAt(0).toUpperCase()}`,
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: authData.user?.id || '',
            email: authData.user?.email || '',
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: `${data.firstName} ${data.lastName}`,
            initials: `${data.firstName.charAt(0).toUpperCase()}${data.lastName.charAt(0).toUpperCase()}`,
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create account'
      };
    }
  },

  // Sign in with Supabase
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (authData.user) {
        // Get user profile from backend
        const profileResponse = await apiGet('http://localhost:3001/api/auth/profile');
        
        if (profileResponse.success && profileResponse.data?.user) {
          return {
            success: true,
            message: 'Signed in successfully',
            data: {
              user: profileResponse.data.user
            }
          };
        }
      }

      return {
        success: false,
        error: 'Failed to get user profile'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to sign in'
      };
    }
  },

  // Get current user profile from backend
  getProfile: async (): Promise<{ success: boolean; data?: { user: User }; error?: string }> => {
    try {
      return await apiGet('http://localhost:3001/api/auth/profile');
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get profile'
      };
    }
  },

  // Update profile via backend
  updateProfile: async (data: { firstName: string; lastName: string }): Promise<{ success: boolean; data?: { user: User }; error?: string }> => {
    try {
      return await apiPost('http://localhost:3001/api/auth/profile', data);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update profile'
      };
    }
  },

  // Sign out with Supabase
  signOut: async () => {
    await supabase.auth.signOut();
  },

  // Get current Supabase user
  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  // Get stored user from Supabase session
  getStoredUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get profile from backend
    try {
      const profileResponse = await apiGet('http://localhost:3001/api/auth/profile');
      if (profileResponse.success && profileResponse.data?.user) {
        return profileResponse.data.user;
      }
    } catch (error) {
      console.error('Failed to get profile:', error);
    }

    return null;
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }
};

export default authAPI; 