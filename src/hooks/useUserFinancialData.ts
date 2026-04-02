import { useState, useCallback } from 'react';
import { getUserFinancialSummary, UserFinancialSummary } from '@/services/userFinancialDataService';

export function useUserFinancialData(userId: string, planLimit: number = 10) {
  const [data, setData] = useState<UserFinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const summary = await getUserFinancialSummary(userId, planLimit);
      setData(summary);
    } finally {
      setLoading(false);
    }
  }, [userId, planLimit]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    loadData,
    refresh,
  };
}
