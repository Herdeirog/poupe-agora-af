import { useState, useEffect, useCallback } from 'react';
import { AdminSubscription, SubscriptionPayment } from '@/types/adminSubscription';
import { addDays, isAfter, isBefore } from 'date-fns';
import {
  getSubscriptions,
  updateSubscription as updateSubscriptionStorage,
  getSubscriptionById,
  addPayment as addPaymentStorage,
  createSubscription as createSubscriptionStorage,
  getUsersWithoutSubscription as getUsersWithoutSubscriptionStorage,
  getExpiringSubscriptions as getExpiringSubscriptionsStorage,
} from '@/services/adminSubscriptionStorage';

export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const updateSubscription = useCallback(async (id: string, data: Partial<AdminSubscription>) => {
    await updateSubscriptionStorage(id, data);
    await refreshSubscriptions();
  }, [refreshSubscriptions]);

  const createSubscription = useCallback(async (data: {
    userId: string;
    plan: string;
    status: string;
    origin: string;
    amount: number;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    trialEndsAt?: string;
    observacoes?: string;
  }) => {
    const result = await createSubscriptionStorage(data);
    if (result) await refreshSubscriptions();
    return result;
  }, [refreshSubscriptions]);

  const getUsersWithoutSubscription = useCallback(async () => {
    return await getUsersWithoutSubscriptionStorage();
  }, []);

  const addSubscription = useCallback(async () => {
    // Note: Subscription creation should be done via payment gateway
    await refreshSubscriptions();
  }, [refreshSubscriptions]);

  const deleteSubscription = useCallback(async () => {
    // Note: Subscription deletion should be handled carefully
    await refreshSubscriptions();
  }, [refreshSubscriptions]);

  const getById = useCallback(async (id: string) => {
    return await getSubscriptionById(id);
  }, []);

  const addPayment = useCallback(async (subscriptionId: string, payment: Omit<SubscriptionPayment, 'id'>) => {
    const success = await addPaymentStorage(subscriptionId, payment);
    if (success) {
      await refreshSubscriptions();
    }
    return success;
  }, [refreshSubscriptions]);

  // Get expiring subscriptions from current data (client-side filter)
  const getExpiringSubscriptions = useCallback((daysAhead: number = 7) => {
    const now = new Date();
    const futureDate = addDays(now, daysAhead);
    
    return subscriptions.filter(sub => {
      if (sub.status !== 'ativa') return false;
      if (!sub.nextBilling) return false;
      const billingDate = new Date(sub.nextBilling);
      return isAfter(billingDate, now) && isBefore(billingDate, futureDate);
    });
  }, [subscriptions]);

  // Fetch expiring subscriptions from server (more accurate)
  const fetchExpiringSubscriptions = useCallback(async (daysAhead: number = 7) => {
    return await getExpiringSubscriptionsStorage(daysAhead);
  }, []);

  const metrics = {
    total: subscriptions.length,
    ativas: subscriptions.filter(s => s.status === 'ativa').length,
    pendentes: subscriptions.filter(s => s.status === 'pendente').length,
    canceladas: subscriptions.filter(s => s.status === 'cancelada').length,
    suspensas: subscriptions.filter(s => s.status === 'suspensa').length,
    receitaTotal: subscriptions
      .filter(s => s.status === 'ativa')
      .reduce((acc, s) => acc + s.amount, 0),
  };

  return {
    subscriptions,
    loading,
    refreshSubscriptions,
    updateSubscription,
    createSubscription,
    getUsersWithoutSubscription,
    addSubscription,
    deleteSubscription,
    getById,
    addPayment,
    getExpiringSubscriptions,
    fetchExpiringSubscriptions,
    metrics,
  };
}
