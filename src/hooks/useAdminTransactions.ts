
import { useState, useEffect, useCallback } from 'react';
import { AdminTransaction } from '@/types/adminTransaction';
import {
  getAdminTransactions,
  getAdminTransactionById
} from '@/services/adminTransactionStorage';

export function useAdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const updateTransaction = useCallback(async (id: string, data: Partial<AdminTransaction>) => {
    // Note: Transaction updates should be handled carefully
    await refreshTransactions();
  }, [refreshTransactions]);

  const getById = useCallback(async (id: string) => {
    return await getAdminTransactionById(id);
  }, []);

  const metrics = {
    total: transactions.length,
    receitas: transactions.filter(t => t.type === 'receita').length,
    despesas: transactions.filter(t => t.type === 'despesa').length,
    totalReceitas: transactions
      .filter(t => t.type === 'receita' && t.status === 'confirmada')
      .reduce((acc, t) => acc + t.amount, 0),
    totalDespesas: transactions
      .filter(t => t.type === 'despesa' && t.status === 'confirmada')
      .reduce((acc, t) => acc + t.amount, 0),
  };

  return {
    transactions,
    loading,
    refreshTransactions,
    updateTransaction,
    getById,
    metrics,
  };
}
