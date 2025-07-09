
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ViewProvider } from "@/contexts/ViewContext";
import { Layout } from "@/components/layout/Layout";
import { MainContent } from "@/components/MainContent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ViewProvider>
        <Layout>
          <MainContent />
        </Layout>
        <Toaster />
        <Sonner />
      </ViewProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
