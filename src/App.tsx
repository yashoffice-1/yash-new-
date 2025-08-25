
import { Toaster } from "@/components/ui/feedback/toaster";
import { Toaster as Sonner } from "@/components/ui/feedback/sonner";
import { TooltipProvider } from "@/components/ui/overlays/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ViewProvider } from "@/contexts/ViewContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/user/MainContent";
import { OAuthCallback } from "@/components/auth/OAuthCallback";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import { EmailVerification } from "@/components/auth/EmailVerification";
import { ShopifyCallback } from "@/pages/auth/ShopifyCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <TooltipProvider>
            <ViewProvider>
              <GenerationProvider>
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
              
              {/* Shopify Callback Route */}
              <Route 
                path="/auth/shopify/callback" 
                element={
                  <ProtectedRoute>
                    <ShopifyCallback />
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
            </GenerationProvider>
            <Toaster />
            <Sonner />
          </ViewProvider>
        </TooltipProvider>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
