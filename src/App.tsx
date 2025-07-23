
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
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";

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
              <Route 
                path="/auth/forgot-password" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <ForgotPassword />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/auth/reset-password" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <ResetPassword />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/auth/verify-email" 
                element={
                  <ProtectedRoute requireAuth={true} requireEmailVerification={false}>
                    <VerifyEmail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Main App Route - Requires both auth and email verification */}
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute requireAuth={true} requireEmailVerification={true}>
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
