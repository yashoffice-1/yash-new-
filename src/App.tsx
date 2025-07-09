
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ViewProvider } from "@/contexts/ViewContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";
import { XManage } from "@/pages/XManage";
import { Auth } from "@/pages/Auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <ViewProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/x-manage" element={<XManage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <MainContent />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster />
            <Sonner />
          </ViewProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
