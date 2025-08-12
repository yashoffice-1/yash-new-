import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeneratedAsset } from '@/types/inventory';

interface GenerationContextType {
  globalGenerationResults: GeneratedAsset[];
  addGenerationResult: (result: GeneratedAsset) => void;
  clearGenerationResults: () => void;
  removeGenerationResult: (id: string) => void;
  showGlobalResultsModal: boolean;
  setShowGlobalResultsModal: (show: boolean) => void;
  showFirstModal: boolean;
  setShowFirstModal: (show: boolean) => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [globalGenerationResults, setGlobalGenerationResults] = useState<GeneratedAsset[]>([]);
  const [showGlobalResultsModal, setShowGlobalResultsModal] = useState(false);
  const [showFirstModal, setShowFirstModal] = useState(false);

  const addGenerationResult = (result: GeneratedAsset) => {
    console.log('=== ADDING GENERATION RESULT ===');
    console.log('Result to add:', result);
    console.log('Result type:', typeof result);
    console.log('Result has id:', !!result.id);
    console.log('Result has type:', !!result.type);
    
    if (!result || !result.id || !result.type) {
      console.error('Invalid result format:', result);
      return;
    }
    
    setGlobalGenerationResults(prev => {
      console.log('Previous results:', prev);
      const newResults = [result, ...prev];
      console.log('New results array:', newResults);
      return newResults;
    });
    
    // Automatically open the modal when results are added
    setShowFirstModal(true);
    console.log('=== FINISHED ADDING RESULT ===');
  };

  const clearGenerationResults = () => {
    setGlobalGenerationResults([]);
    setShowGlobalResultsModal(false);
    setShowFirstModal(false);
  };

  const removeGenerationResult = (id: string) => {
    setGlobalGenerationResults(prev => prev.filter(result => result.id !== id));
  };

  return (
    <GenerationContext.Provider value={{
      globalGenerationResults,
      addGenerationResult,
      clearGenerationResults,
      removeGenerationResult,
      showGlobalResultsModal,
      setShowGlobalResultsModal,
      showFirstModal,
      setShowFirstModal
    }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}

