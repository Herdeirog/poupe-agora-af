import { UserTransaction, TransactionFilters } from '@/types/userTransaction';
import { supabase } from '@/lib/supabase';

// Helper to map DB transaction to frontend type
function mapTransaction(t: any): UserTransaction {
  return {
    id: t.id,
    amount: Number(t.amount),
    type: t.type,
    description: t.description || '',
    categoryId: t.category_id || '',
    date: t.date,
    origin: t.origin || 'manual',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function getTransactions(): Promise<UserTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return (data || []).map(mapTransaction);
}

export async function getTransactionById(id: string): Promise<UserTransaction | undefined> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return mapTransaction(data);
}

export async function getFilteredTransactions(filters: TransactionFilters): Promise<UserTransaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered transactions:', error);
    return [];
  }

  return (data || []).map(mapTransaction);
}

export async function createTransaction(data: Omit<UserTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserTransaction | null> {
  // Validate Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  const { data: newTransaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id, // Explicitly linking to auth user
      amount: data.amount,
      type: data.type,
      description: data.description,
      category_id: data.categoryId === '' ? null : data.categoryId,
      date: data.date,
      origin: data.origin || 'manual',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    return null;
  }

  return mapTransaction(newTransaction);
}

export async function updateTransaction(id: string, data: Partial<UserTransaction>): Promise<UserTransaction | null> {
  const updates: any = {};
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.type !== undefined) updates.type = data.type;
  if (data.description !== undefined) updates.description = data.description;
  if (data.categoryId !== undefined) updates.category_id = data.categoryId === '' ? null : data.categoryId;
  if (data.date !== undefined) updates.date = data.date;
  if (data.origin !== undefined) updates.origin = data.origin;

  updates.updated_at = new Date().toISOString();

  // RLS ensures users can only update their own transactions
  const { data: updated, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    return null;
  }

  return mapTransaction(updated);
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
  return true;
}

export async function getTransactionStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

  // Optimized query: Fetch ONLY current month's transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startOfMonth)
    .lt('date', nextMonth);

  if (error) {
    console.error('Error calculating stats:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      expensesByCategory: {},
      transactionCount: 0,
    };
  }

  const safeTransactions = transactions || [];

  const totalIncome = safeTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = safeTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;

  const expensesByCategory = safeTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const catId = t.category_id || 'uncategorized';
      acc[catId] = (acc[catId] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  return {
    totalIncome,
    totalExpenses,
    balance,
    expensesByCategory,
    transactionCount: safeTransactions.length,
  };
}
