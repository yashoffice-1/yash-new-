
import { ReactNode } from "react";
import { Header } from "./Header";
import { UnverifiedUserBanner } from "@/components/auth/UnverifiedUserBanner";
import { FirstGenerationResultsModal } from "@/components/inventory/assets/FirstGenerationResultsModal";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <UnverifiedUserBanner />
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <FirstGenerationResultsModal />
    </div>
  );
}
