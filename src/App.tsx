
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ViewProvider } from "@/contexts/ViewContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";
import { OAuthCallback } from "@/components/OAuthCallback";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import { EmailVerification } from "@/components/auth/EmailVerification";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Router>
        <TooltipProvider>
          <ViewProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route 
                path="/auth/signin" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <SignIn />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/auth/signup" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <SignUp />
                  </ProtectedRoute>
                } 
              />
              
              {/* Email Verification Route */}
              <Route 
                path="/auth/verify-email" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <EmailVerification />
                  </ProtectedRoute>
                } 
              />
              
              {/* Forgot Password Route */}
              <Route 
                path="/auth/forgot-password" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <ForgotPassword />
                  </ProtectedRoute>
                } 
              />
              
              {/* Reset Password Route */}
              <Route 
                path="/auth/reset-password" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <ResetPassword />
                  </ProtectedRoute>
                } 
              />
              
              {/* OAuth Callback Route */}
              <Route 
                path="/oauth/callback" 
                element={
                  <ProtectedRoute>
                    <OAuthCallback />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Main App Route */}
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MainContent />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect root to main app */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster />
            <Sonner />
          </ViewProvider>
        </TooltipProvider>
      </Router>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
