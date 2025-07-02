
import { createContext, useContext, ReactNode, useState } from 'react';

interface ViewContextType {
  isAdmin: boolean;
  activeTab: 'inventory' | 'library' | 'templates' | 'user';
  setActiveTab: (tab: 'inventory' | 'library' | 'templates' | 'user') => void;
  selectedProduct: any | null;
  setSelectedProduct: (product: any | null) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  // Set to false to default to user mode, or true for admin mode
  const isAdmin = false;
  const [activeTab, setActiveTab] = useState<'inventory' | 'library' | 'templates' | 'user'>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  return (
    <ViewContext.Provider value={{ 
      isAdmin, 
      activeTab, 
      setActiveTab, 
      selectedProduct, 
      setSelectedProduct 
    }}>
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
