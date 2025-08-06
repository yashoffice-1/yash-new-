import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, User } from '@/api/clients/auth-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string }>;
  signOut: () => void;
  updateProfile: (firstName: string, lastName: string) => Promise<{ error?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed property to check if user is verified
  const isVerified = user?.emailVerified === true && user?.status === 'verified';

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authAPI.isAuthenticated()) {
          const storedUser = authAPI.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            // Token exists but no user data, fetch from server
            const response = await authAPI.getProfile();
            if (response.success && response.data?.user) {
              setUser(response.data.user);
            } else {
              authAPI.signOut();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authAPI.signOut();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.signIn({ email, password });
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return {};
      } else {
        return { error: response.error || 'Sign in failed' };
      }
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await authAPI.signUp({ email, password, firstName, lastName });
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return {};
      } else {
        return { error: response.error || 'Sign up failed' };
      }
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Sign up failed' };
    }
  };

  const signOut = () => {
    authAPI.signOut();
    setUser(null);
  };

  const updateProfile = async (firstName: string, lastName: string) => {
    try {
      const response = await authAPI.updateProfile({ firstName, lastName });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return {};
      } else {
        return { error: response.error || 'Profile update failed' };
      }
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Profile update failed' };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const response = await authAPI.resendVerification(email);
      
      if (response.success) {
        return {};
      } else {
        return { error: response.error || 'Failed to resend verification email' };
      }
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Failed to resend verification email' };
    }
  };

  const value = {
    user,
    loading,
    isVerified,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 