
import { createContext, useContext, useState, ReactNode } from 'react';

interface ViewContextType {
  isAdmin: boolean;
  toggleView: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(true); // Start in admin mode

  const toggleView = () => {
    setIsAdmin(prev => !prev);
  };

  return (
    <ViewContext.Provider value={{ isAdmin, toggleView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
