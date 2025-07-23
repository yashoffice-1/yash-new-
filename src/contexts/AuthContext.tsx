import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/api';

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  avatarUrl?: string;
  status: 'pending' | 'verified';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      // Fetch user profile
      fetchProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await apiGet('http://localhost:3001/api/auth/profile', authToken);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        // Token might be invalid, clear it
        localStorage.removeItem('authToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Token might be invalid, clear it
      localStorage.removeItem('authToken');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiPost('http://localhost:3001/api/auth/signin', {
        email,
        password,
      });

      if (response.success && response.data?.token) {
        const authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        setUser(response.data.user);
        return { error: undefined };
      } else {
        return { error: response.error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await apiPost('http://localhost:3001/api/auth/signup', {
        email,
        password,
        firstName,
        lastName,
      });

      if (response.success && response.data?.token) {
        const authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        setUser(response.data.user);
        return { error: undefined };
      } else {
        return { error: response.error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'Sign up failed' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!token) {
      return { error: 'Not authenticated' };
    }

    try {
      const response = await apiPut('http://localhost:3001/api/auth/profile', updates, token);
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { error: undefined };
      } else {
        return { error: response.error || 'Failed to update profile' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: 'Failed to update profile' };
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 