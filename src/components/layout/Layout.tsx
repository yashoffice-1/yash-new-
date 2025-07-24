
import { ReactNode } from "react";
import { Header } from "./Header";
import { UnverifiedUserBanner } from "@/components/auth/UnverifiedUserBanner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <UnverifiedUserBanner />
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
