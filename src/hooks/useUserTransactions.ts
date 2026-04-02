import { useState, useEffect, useCallback, useRef } from 'react';
import { UserTransaction, TransactionFilters } from '@/types/userTransaction';
import * as storage from '@/services/userTransactionStorage';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';

export function useUserTransactions(filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('INITIALIZING');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const data = filters
      ? await storage.getFilteredTransactions(filters)
      : await storage.getTransactions();
    setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Resilient Realtime subscription with proper auth handling
  useEffect(() => {
    let mounted = true;

    const cleanupChannel = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const debouncedReload = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        console.log('[Realtime] Reloading transactions...');
        loadTransactions();
      }, 300);
    };

    const setupRealtimeChannel = (userId: string) => {
      // Avoid duplicate channels
      if (channelRef.current) {
        console.log('[Realtime] Channel already exists, skipping setup');
        return;
      }

      console.log('[Realtime] Setting up channel for user:', userId);

      const channel = supabase
        .channel(`transactions-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] Transaction INSERT received:', payload);
            debouncedReload();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] Transaction UPDATE received:', payload);
            debouncedReload();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] Transaction DELETE received:', payload);
            debouncedReload();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
          if (mounted) {
            setRealtimeStatus(status);
          }
        });

      channelRef.current = channel;
    };

    const initRealtime = async () => {
      // Use getSession instead of getUser - more reliable on mount
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        console.log('[Realtime] Session available on mount, setting up channel');
        setupRealtimeChannel(session.user.id);
      } else {
        console.log('[Realtime] No session on mount, waiting for auth state change');
        setRealtimeStatus('NO_SESSION');
      }
    };

    // Listen for auth state changes to handle late session availability
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Realtime] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          cleanupChannel();
          setRealtimeStatus('SIGNED_OUT');
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user?.id) {
          // If we already have a channel for this user, don't recreate
          if (!channelRef.current) {
            setupRealtimeChannel(session.user.id);
          }
        }
      }
    );

    // Initialize
    initRealtime();

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      cleanupChannel();
    };
  }, [loadTransactions]);

  const createTransaction = useCallback(async (data: Omit<UserTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction = await storage.createTransaction(data);
    await loadTransactions();
    return newTransaction;
  }, [loadTransactions]);

  const updateTransaction = useCallback(async (id: string, data: Partial<UserTransaction>) => {
    const updated = await storage.updateTransaction(id, data);
    await loadTransactions();
    return updated;
  }, [loadTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const success = await storage.deleteTransaction(id);
    if (success) await loadTransactions();
    return success;
  }, [loadTransactions]);

  const getStats = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const monthlyTransactions = transactions.filter(t => t.date >= startOfMonth);

    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const expensesByCategory = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      transactionCount: monthlyTransactions.length,
    };
  }, [transactions]);

  return {
    transactions,
    loading,
    realtimeStatus,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getStats,
    refresh: loadTransactions,
  };
}

export function useTransaction(id: string) {
  const [transaction, setTransaction] = useState<UserTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransaction() {
      const data = await storage.getTransactionById(id);
      setTransaction(data || null);
      setLoading(false);
    }
    loadTransaction();
  }, [id]);

  return { transaction, loading };
}
