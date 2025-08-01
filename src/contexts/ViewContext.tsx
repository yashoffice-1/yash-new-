
import { createContext, useContext, ReactNode, useState } from 'react';
import { useAuth } from './AuthContext';

interface ViewContextType {
  isAdmin: boolean;
  isSuperadmin: boolean;
  userRole: 'user' | 'admin' | 'superadmin';
  activeTab: 'inventory' | 'library' | 'templates' | 'user' | 'social' | 'admin';
  setActiveTab: (tab: 'inventory' | 'library' | 'templates' | 'user' | 'social' | 'admin') => void;
  selectedProduct: any | null;
  setSelectedProduct: (product: any | null) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userRole = user?.role || 'user';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isSuperadmin = userRole === 'superadmin';
  const [activeTab, setActiveTab] = useState<'inventory' | 'library' | 'templates' | 'user' | 'social' | 'admin'>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  return (
    <ViewContext.Provider value={{ 
      isAdmin, 
      isSuperadmin,
      userRole,
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
