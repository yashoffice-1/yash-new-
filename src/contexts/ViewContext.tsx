
import { createContext, useContext, ReactNode } from 'react';

interface ViewContextType {
  isAdmin: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  // Set to false to default to user mode, or true for admin mode
  const isAdmin = false;

  return (
    <ViewContext.Provider value={{ isAdmin }}>
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
