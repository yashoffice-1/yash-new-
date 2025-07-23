import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEmailVerification?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireEmailVerification = true,
  redirectTo = '/auth/signin' 
}: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <Loading className="min-h-screen" />;
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If email verification is required and user is not verified
  if (requireAuth && requireEmailVerification && user && !isEmailVerified) {
    return <Navigate to="/auth/verify-email" state={{ from: location }} replace />;
  }

  // If authentication is not required and user is authenticated (e.g., for auth pages)
  if (!requireAuth && user && isEmailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 