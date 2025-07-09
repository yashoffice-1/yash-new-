
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { ViewProvider } from "@/contexts/ViewContext";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";
import { XManage } from "@/pages/XManage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <ViewProvider>
          <Routes>
            <Route path="/x-manage" element={<XManage />} />
            <Route path="/*" element={
              <Layout>
                <MainContent />
              </Layout>
            } />
          </Routes>
          <Toaster />
          <Sonner />
        </ViewProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
