import { AdminSubscription, AdminSubscriptionFilters, SubscriptionPayment } from '@/types/adminSubscription';
import { supabase } from '@/lib/supabase';
import { addDays, format } from 'date-fns';
import { formatCurrency } from '@/services/currencyService';

// Map DB subscription to AdminSubscription
function mapSubscription(s: any, payments: SubscriptionPayment[] = []): AdminSubscription {
  return {
    id: s.id,
    userId: s.user_id,
    userName: s.profiles?.full_name || 'Desconhecido',
    userEmail: s.profiles?.email || 'N/A',
    status: s.status,
    plan: s.plan,
    origin: s.origin,
    amount: Number(s.amount || 0),
    nextBilling: s.current_period_end,
    lastRenewal: s.current_period_start,
    startDate: s.created_at,
    endDate: s.canceled_at,
    payments: payments,
    observacoes: s.observacoes,
  };
}

export async function getSubscriptions(filters?: AdminSubscriptionFilters): Promise<AdminSubscription[]> {
  let query = supabase
    .from('subscriptions')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  if (filters) {
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return data.map(s => mapSubscription(s));
}

export async function getSubscriptionById(id: string): Promise<AdminSubscription | undefined> {
  // 1. Buscar assinatura
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(full_name, email)')
    .eq('id', id)
    .maybeSingle();

  if (error || !sub) {
    console.error('Error fetching subscription:', error);
    return undefined;
  }

  // 2. Buscar pagamentos da assinatura
  const { data: payments, error: paymentsError } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', id)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // 3. Mapear pagamentos
  const mappedPayments: SubscriptionPayment[] = (payments || []).map(p => ({
    id: p.id,
    date: p.paid_at || p.created_at,
    amount: Number(p.amount),
    status: p.status as SubscriptionPayment['status'],
    method: p.payment_method || 'Não informado',
    observacao: p.observacao || undefined,
  }));

  return mapSubscription(sub, mappedPayments);
}

export async function updateSubscription(id: string, data: Partial<AdminSubscription>): Promise<AdminSubscription | null> {
  const updateData: Record<string, any> = {};
  
  if (data.status) updateData.status = data.status;
  if (data.plan) updateData.plan = data.plan;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.startDate) updateData.created_at = data.startDate;
  if (data.nextBilling) updateData.current_period_end = data.nextBilling;
  if (data.lastRenewal) updateData.current_period_start = data.lastRenewal;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating subscription:', error);
    return null;
  }

  return await getSubscriptionById(id) || null;
}

export async function addPayment(subscriptionId: string, payment: Omit<SubscriptionPayment, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: subscriptionId,
      amount: payment.amount,
      status: payment.status,
      payment_method: payment.method,
      paid_at: payment.date,
      observacao: payment.observacao || null,
    });

  if (error) {
    console.error('Error adding payment:', error);
    return false;
  }

  return true;
}

export async function createSubscription(data: {
  userId: string;
  plan: string;
  status: string;
  origin: string;
  amount: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  observacoes?: string;
}): Promise<AdminSubscription | null> {
  const { error, data: newSub } = await supabase
    .from('subscriptions')
    .insert({
      user_id: data.userId,
      plan: data.plan,
      status: data.status,
      origin: data.origin,
      amount: data.amount,
      current_period_start: data.currentPeriodStart || new Date().toISOString(),
      current_period_end: data.currentPeriodEnd,
      trial_ends_at: data.trialEndsAt,
      observacoes: data.observacoes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }

  return await getSubscriptionById(newSub.id) || null;
}

export async function getUsersWithoutSubscription(): Promise<Array<{ id: string; name: string; email: string }>> {
  // Buscar todos os profiles
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
  
  // Buscar user_ids que já têm assinatura
  const { data: subs } = await supabase.from('subscriptions').select('user_id');
  
  const usersWithSub = new Set((subs || []).map(s => s.user_id));
  
  return (profiles || [])
    .filter(p => !usersWithSub.has(p.id))
    .map(p => ({ id: p.id, name: p.full_name || 'Sem nome', email: p.email || '' }));
}

// Get expiring subscriptions within specified days
export async function getExpiringSubscriptions(daysAhead: number = 7): Promise<AdminSubscription[]> {
  const now = new Date();
  const futureDate = addDays(now, daysAhead);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(full_name, email)')
    .eq('status', 'ativa')
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', futureDate.toISOString())
    .order('current_period_end', { ascending: true });

  if (error) {
    console.error('Error fetching expiring subscriptions:', error);
    return [];
  }

  return data.map(s => mapSubscription(s));
}

// Generate expiry notifications for subscriptions ending soon
export async function generateExpiryNotifications(daysAhead: number = 7): Promise<number> {
  const expiringSubs = await getExpiringSubscriptions(daysAhead);

  if (!expiringSubs.length) return 0;

  // Check for existing pending notifications to avoid duplicates
  const subIds = expiringSubs.map(s => s.id);
  const { data: existingNotifications } = await supabase
    .from('admin_notifications')
    .select('subscription_id')
    .in('subscription_id', subIds)
    .eq('status', 'pendente')
    .eq('type', 'vencimento');

  const existingSubIds = new Set((existingNotifications || []).map(n => n.subscription_id));
  
  // Filter out subscriptions that already have pending notifications
  const subsToNotify = expiringSubs.filter(s => !existingSubIds.has(s.id));

  if (!subsToNotify.length) return 0;

  // Create notifications
  const notifications = subsToNotify.map(sub => ({
    user_id: sub.userId,
    subscription_id: sub.id,
    type: 'vencimento',
    title: `Assinatura expirando em breve`,
    content: `A assinatura de ${sub.userName} (${sub.userEmail}) vence em ${format(new Date(sub.nextBilling), 'dd/MM/yyyy')}. Plano: ${sub.plan}. Valor: ${formatCurrency(sub.amount)}`,
    status: 'pendente',
    scheduled_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('admin_notifications')
    .insert(notifications);

  if (error) {
    console.error('Error creating expiry notifications:', error);
    return 0;
  }

  return notifications.length;
}

// Deprecated / Mock compatibility
export function seedSubscriptionsIfEmpty(): void { }
export function syncSubscriptionWithUser(id: string): void { }
