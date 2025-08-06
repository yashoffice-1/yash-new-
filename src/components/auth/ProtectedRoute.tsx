import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/UI_Elements/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/signin' 
}: ProtectedRouteProps) {
  const { user, loading, isVerified } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <Loading className="min-h-screen" />;
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is authenticated but not verified, block access to protected routes
  if (requireAuth && user && !isVerified) {
    return <Navigate to="/auth/verify-email" replace />;
  }

  // If authentication is not required and user is authenticated (e.g., for auth pages)
  if (!requireAuth && user && isVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 