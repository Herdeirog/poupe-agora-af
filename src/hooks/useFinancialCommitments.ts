/**
 * Hook for managing financial commitments
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getCommitments, 
  createCommitment, 
  updateCommitment, 
  deleteCommitment,
  CommitmentStats,
  getCommitmentStats,
  registerPayment as registerPaymentService,
  getCommitmentWithHistory,
} from '@/services/commitmentStorage';
import { FinancialCommitment, CommitmentStatus } from '@/types/financialCommitment';
import { parseISO, isBefore, startOfDay } from 'date-fns';

export function useFinancialCommitments() {
  const [commitments, setCommitments] = useState<FinancialCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CommitmentStats | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCommitments();
      setCommitments(data);
      const statsData = await getCommitmentStats();
      setStats(statsData);
    } catch (e) {
      setError('Erro ao carregar compromissos');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-update overdue status
  const checkAndUpdateOverdue = useCallback(async () => {
    const today = startOfDay(new Date());
    let hasUpdates = false;

    for (const commitment of commitments) {
      if (commitment.status !== 'pending') continue;
      
      const dueDate = startOfDay(parseISO(commitment.date));
      if (isBefore(dueDate, today)) {
        await updateCommitment(commitment.id, { status: 'overdue' });
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await refresh();
    }
  }, [commitments, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (commitments.length > 0) {
      checkAndUpdateOverdue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments.length]);

  const handleCreate = useCallback(async (
    data: Omit<FinancialCommitment, 'id' | 'createdAt' | 'userId'>
  ) => {
    const result = await createCommitment(data);
    if (result) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const handleUpdate = useCallback(async (
    id: string, 
    data: Partial<FinancialCommitment>
  ) => {
    const result = await updateCommitment(id, data);
    if (result) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteCommitment(id);
    if (result) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const markAsCompleted = useCallback(async (id: string) => {
    return handleUpdate(id, { status: 'completed' as CommitmentStatus });
  }, [handleUpdate]);

  const registerPayment = useCallback(async (
    commitmentId: string,
    paymentData: { paidAt: Date; amount: number }
  ) => {
    const result = await registerPaymentService(commitmentId, paymentData);
    if (result) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const fetchCommitmentWithHistory = useCallback(async (commitmentId: string) => {
    return getCommitmentWithHistory(commitmentId);
  }, []);

  return {
    commitments,
    loading,
    error,
    stats,
    createCommitment: handleCreate,
    updateCommitment: handleUpdate,
    deleteCommitment: handleDelete,
    markAsCompleted,
    registerPayment,
    fetchCommitmentWithHistory,
    refresh,
  };
}
