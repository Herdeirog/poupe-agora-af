/**
 * Financial Commitment Storage Service
 * Handles CRUD operations with Supabase integration
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  FinancialCommitment, 
  CommitmentType, 
  CommitmentStatus, 
  CommitmentOrigin,
  RecurrenceFrequency,
  RecurringPayment,
  RecurringPaymentStatus
} from '@/types/financialCommitment';
import { addMonths, addWeeks, format, parseISO } from 'date-fns';

const STORAGE_KEY = 'poupe_agora_financial_commitments';

// DB type for financial_commitments table
interface DbCommitment {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time: string | null;
  amount: number | null;
  type: string;
  status: string;
  origin: string;
  frequency: string | null;
  is_indefinite: boolean | null;
  current_installment: number | null;
  total_installments: number | null;
  start_date: string | null;
  total_payments_made: number | null;
  total_amount_paid: number | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// DB type for recurring_payments table
interface DbRecurringPayment {
  id: string;
  commitment_id: string;
  user_id: string;
  due_date: string;
  paid_at: string | null;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Helper functions
function getFromLocal(): FinancialCommitment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocal(data: FinancialCommitment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function mapDbToCommitment(db: DbCommitment): FinancialCommitment {
  return {
    id: db.id,
    title: db.title,
    date: db.date,
    time: db.time ?? undefined,
    amount: db.amount ?? undefined,
    type: db.type as CommitmentType,
    status: db.status as CommitmentStatus,
    origin: db.origin as CommitmentOrigin,
    categoryId: db.category_id ?? undefined,
    frequency: db.frequency as RecurrenceFrequency | undefined,
    isIndefinite: db.is_indefinite ?? undefined,
    currentInstallment: db.current_installment ?? undefined,
    totalInstallments: db.total_installments ?? undefined,
    startDate: db.start_date ?? undefined,
    totalPaymentsMade: db.total_payments_made ?? undefined,
    totalAmountPaid: db.total_amount_paid ?? undefined,
    createdAt: db.created_at,
    userId: db.user_id,
  };
}

function mapDbToRecurringPayment(db: DbRecurringPayment): RecurringPayment {
  return {
    date: db.due_date,
    paidAt: db.paid_at ?? undefined,
    amount: db.amount,
    status: db.status as RecurringPaymentStatus,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) return user.id;
  
  // Fallback: check localStorage for legacy user
  try {
    const stored = localStorage.getItem('poupe_agora_user');
    if (stored) {
      const legacyUser = JSON.parse(stored);
      return legacyUser.supabase_id || null;
    }
  } catch { /* ignore */ }
  return null;
}

async function hasAuthSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

async function syncViaEdgeFunction(
  operation: 'select' | 'insert' | 'update' | 'delete',
  data?: Record<string, unknown>,
  filters?: { id?: string }
): Promise<unknown> {
  const profileId = await getCurrentUserId();
  if (!profileId) return null;

  try {
    const { data: result, error } = await supabase.functions.invoke('sync-user-data', {
      body: {
        profile_id: profileId,
        operation,
        table: 'financial_commitments',
        data,
        filters
      }
    });
    if (error) {
      console.warn(`[commitmentStorage] Edge function ${operation} failed:`, error);
      return null;
    }
    return result?.data;
  } catch (e) {
    console.warn(`[commitmentStorage] Edge function error:`, e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= CRUD Operations =============

export async function getCommitments(): Promise<FinancialCommitment[]> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      let data: DbCommitment[] | null = null;

      if (hasSession) {
        const { data: commitmentData, error } = await db
          .from('financial_commitments')
          .select('*')
          .order('date', { ascending: true });
        
        if (!error) data = commitmentData;
      } else {
        const result = await syncViaEdgeFunction('select');
        if (Array.isArray(result)) {
          data = result as DbCommitment[];
        }
      }

      if (data && data.length > 0) {
        const commitments = data.map(mapDbToCommitment);
        saveToLocal(commitments);
        return commitments;
      }
    }
  } catch (e) {
    console.warn('Supabase getCommitments failed, using localStorage:', e);
  }

  return getFromLocal();
}

export async function getCommitmentById(id: string): Promise<FinancialCommitment | undefined> {
  const commitments = await getCommitments();
  return commitments.find(c => c.id === id);
}

export async function createCommitment(
  data: Omit<FinancialCommitment, 'id' | 'createdAt' | 'userId'>
): Promise<FinancialCommitment | null> {
  const newCommitment: FinancialCommitment = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: data.status || 'pending',
    origin: data.origin || 'manual',
  };

  const current = getFromLocal();
  current.unshift(newCommitment);
  saveToLocal(current);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const insertData = {
        title: data.title,
        date: data.date,
        time: data.time ?? null,
        amount: data.amount ?? null,
        type: data.type,
        status: data.status || 'pending',
        origin: data.origin || 'manual',
        category_id: data.categoryId ?? null,
        frequency: data.frequency ?? null,
        is_indefinite: data.isIndefinite ?? null,
        current_installment: data.currentInstallment ?? null,
        total_installments: data.totalInstallments ?? null,
        start_date: data.startDate ?? data.date,
        total_payments_made: 0,
        total_amount_paid: 0,
      };

      const hasSession = await hasAuthSession();
      let inserted: DbCommitment | null = null;

      if (hasSession) {
        const { data: result, error } = await db
          .from('financial_commitments')
          .insert({ ...insertData, user_id: userId })
          .select()
          .single();
        
        if (!error) inserted = result;
      } else {
        const result = await syncViaEdgeFunction('insert', insertData);
        if (Array.isArray(result) && result.length > 0) {
          inserted = result[0] as DbCommitment;
        }
      }

      if (inserted) {
        const idx = current.findIndex(c => c.id === newCommitment.id);
        if (idx >= 0) {
          current[idx].id = inserted.id;
          saveToLocal(current);
        }
        return { ...newCommitment, id: inserted.id };
      }
    }
  } catch (e) {
    console.warn('Supabase createCommitment failed (silent):', e);
  }

  return newCommitment;
}

export async function updateCommitment(
  id: string,
  data: Partial<FinancialCommitment>
): Promise<FinancialCommitment | null> {
  const current = getFromLocal();
  const idx = current.findIndex(c => c.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data };
    saveToLocal(current);
  }

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.date !== undefined) updates.date = data.date;
    if (data.time !== undefined) updates.time = data.time ?? null;
    if (data.amount !== undefined) updates.amount = data.amount ?? null;
    if (data.type !== undefined) updates.type = data.type;
    if (data.status !== undefined) updates.status = data.status;
    if (data.origin !== undefined) updates.origin = data.origin;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId ?? null;
    if (data.frequency !== undefined) updates.frequency = data.frequency ?? null;
    if (data.isIndefinite !== undefined) updates.is_indefinite = data.isIndefinite ?? null;
    if (data.currentInstallment !== undefined) updates.current_installment = data.currentInstallment ?? null;
    if (data.totalInstallments !== undefined) updates.total_installments = data.totalInstallments ?? null;
    if (data.startDate !== undefined) updates.start_date = data.startDate ?? null;
    if (data.totalPaymentsMade !== undefined) updates.total_payments_made = data.totalPaymentsMade ?? 0;
    if (data.totalAmountPaid !== undefined) updates.total_amount_paid = data.totalAmountPaid ?? 0;

    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('financial_commitments').update(updates).eq('id', id);
    } else {
      await syncViaEdgeFunction('update', updates, { id });
    }
  } catch (e) {
    console.warn('Supabase updateCommitment failed (silent):', e);
  }

  return idx >= 0 ? current[idx] : null;
}

export async function deleteCommitment(id: string): Promise<boolean> {
  const current = getFromLocal();
  const filtered = current.filter(c => c.id !== id);
  saveToLocal(filtered);

  try {
    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('financial_commitments').delete().eq('id', id);
    } else {
      await syncViaEdgeFunction('delete', undefined, { id });
    }
  } catch (e) {
    console.warn('Supabase deleteCommitment failed (silent):', e);
  }

  return true;
}

export interface CommitmentStats {
  pending: number;
  completed: number;
  overdue: number;
  total: number;
  totalAmount: number;
}

export async function getCommitmentStats(): Promise<CommitmentStats> {
  const commitments = await getCommitments();
  return {
    pending: commitments.filter(c => c.status === 'pending').length,
    completed: commitments.filter(c => c.status === 'completed').length,
    overdue: commitments.filter(c => c.status === 'overdue').length,
    total: commitments.length,
    totalAmount: commitments
      .filter(c => c.status !== 'completed')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
  };
}

// ============= Payment History Operations =============

export async function getPaymentHistory(commitmentId: string): Promise<RecurringPayment[]> {
  try {
    const hasSession = await hasAuthSession();
    if (!hasSession) return [];

    const { data, error } = await db
      .from('recurring_payments')
      .select('*')
      .eq('commitment_id', commitmentId)
      .order('due_date', { ascending: false });

    if (error) {
      console.warn('Failed to fetch payment history:', error);
      return [];
    }

    return (data || []).map(mapDbToRecurringPayment);
  } catch (e) {
    console.warn('Error fetching payment history:', e);
    return [];
  }
}

export async function registerPayment(
  commitmentId: string,
  paymentData: { paidAt: Date; amount: number }
): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const hasSession = await hasAuthSession();
    if (!hasSession) return false;

    // Get the commitment to calculate next due date
    const commitment = await getCommitmentById(commitmentId);
    if (!commitment) return false;

    const dueDate = commitment.date;
    const paidAtStr = paymentData.paidAt.toISOString();

    // Insert payment record
    const { error: paymentError } = await db
      .from('recurring_payments')
      .insert({
        commitment_id: commitmentId,
        user_id: userId,
        due_date: dueDate,
        paid_at: paidAtStr,
        amount: paymentData.amount,
        status: 'paid',
      });

    if (paymentError) {
      console.error('Failed to insert payment:', paymentError);
      return false;
    }

    // Calculate next due date based on type
    let nextDueDate: string;
    let newCurrentInstallment: number | undefined;

    if (commitment.type === 'installment') {
      // For installments, increment and check if completed
      const currentInst = (commitment.currentInstallment || 0) + 1;
      newCurrentInstallment = currentInst;

      if (currentInst >= (commitment.totalInstallments || 1)) {
        // All installments paid
        await updateCommitment(commitmentId, {
          status: 'completed',
          currentInstallment: newCurrentInstallment,
          totalPaymentsMade: (commitment.totalPaymentsMade || 0) + 1,
          totalAmountPaid: (commitment.totalAmountPaid || 0) + paymentData.amount,
        });
        return true;
      }

      // Calculate next installment date
      const currentDate = parseISO(dueDate);
      nextDueDate = format(addMonths(currentDate, 1), 'yyyy-MM-dd');
    } else if (commitment.type === 'recurring') {
      // For recurring, calculate next based on frequency
      const currentDate = parseISO(dueDate);
      if (commitment.frequency === 'weekly') {
        nextDueDate = format(addWeeks(currentDate, 1), 'yyyy-MM-dd');
      } else {
        nextDueDate = format(addMonths(currentDate, 1), 'yyyy-MM-dd');
      }
    } else {
      // Unique commitment - mark as completed
      await updateCommitment(commitmentId, {
        status: 'completed',
        totalPaymentsMade: 1,
        totalAmountPaid: paymentData.amount,
      });
      return true;
    }

    // Update commitment with next due date and payment stats
    await updateCommitment(commitmentId, {
      date: nextDueDate,
      status: 'pending',
      currentInstallment: newCurrentInstallment,
      totalPaymentsMade: (commitment.totalPaymentsMade || 0) + 1,
      totalAmountPaid: (commitment.totalAmountPaid || 0) + paymentData.amount,
    });

    return true;
  } catch (e) {
    console.error('Error registering payment:', e);
    return false;
  }
}

export async function getCommitmentWithHistory(commitmentId: string): Promise<FinancialCommitment | undefined> {
  const commitment = await getCommitmentById(commitmentId);
  if (!commitment) return undefined;

  const history = await getPaymentHistory(commitmentId);
  return {
    ...commitment,
    recurringPaymentHistory: history,
  };
}
