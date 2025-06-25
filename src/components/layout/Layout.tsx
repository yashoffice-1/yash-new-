
import { Header } from "./Header";
import { useView } from "@/contexts/ViewContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAdmin } = useView();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className={`container mx-auto px-4 py-6 ${isAdmin ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {children}
      </main>
    </div>
  );
}
