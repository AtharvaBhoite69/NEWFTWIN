import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface FinancialContextType {
  snapshot: any | null;
  healthScore: any | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshFinancialData: () => Promise<void>;
  refreshSnapshot: () => Promise<void>;
  refreshHealthScore: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshSnapshot = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getSnapshot();
      if (res.success) {
        setSnapshot(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh snapshot:', err);
    }
  }, [isAuthenticated]);

  const refreshHealthScore = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getHealthScore();
      if (res.success) {
        setHealthScore(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh health score:', err);
    }
  }, [isAuthenticated]);

  const refreshFinancialData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      await Promise.all([refreshSnapshot(), refreshHealthScore()]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshSnapshot, refreshHealthScore]);

  return (
    <FinancialContext.Provider value={{
      snapshot,
      healthScore,
      isLoading,
      lastUpdated,
      refreshFinancialData,
      refreshSnapshot,
      refreshHealthScore,
    }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial must be used within FinancialProvider');
  return context;
}
