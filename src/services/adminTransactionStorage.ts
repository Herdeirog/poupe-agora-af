import { AdminTransaction, AdminTransactionFilters, AdminTransactionStats } from '@/types/adminTransaction';
import { supabase } from '@/lib/supabase';

function mapAdminTransaction(t: any): AdminTransaction {
  return {
    id: t.id,
    userId: t.user_id,
    userName: t.profiles?.full_name || 'Desconhecido',
    userEmail: t.profiles?.email || 'N/A',
    amount: Number(t.amount),
    type: t.type,
    category: t.categories?.name || 'Sem categoria',
    description: t.description,
    date: t.date,
    status: t.status,
    origin: t.origin || 'manual',
    createdAt: t.created_at,
    logs: [], // Logs logic not yet implemented in DB or needs separate table
  };
}

export async function getAdminTransactions(filters?: AdminTransactionFilters): Promise<AdminTransaction[]> {
  let query = supabase
    .from('transactions')
    // Join profiles and categories. 
    // profiles referenced by user_id
    // categories referenced by category_id
    .select('*, profiles(full_name, email), categories(name)')
    .order('date', { ascending: false });

  if (filters) {
    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching admin transactions:', error);
    return [];
  }

  return data.map(mapAdminTransaction);
}

export async function getAdminTransactionById(id: string): Promise<AdminTransaction | undefined> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles(full_name, email), categories(name)')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return mapAdminTransaction(data);
}

export async function getTransactionStats(): Promise<AdminTransactionStats> {
  const transactions = await getAdminTransactions();
  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageTicket = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  const growthRate = 0; // TODO: Calculate from historical data

  return {
    totalTransactions,
    totalVolume,
    averageTicket,
    growthRate
  };
}

export function seedTransactionsIfEmpty(): void { }

// Helper for type compatibility if needed
export function saveTransactions(transactions: AdminTransaction[]): void { }
export function updateTransaction(id: string, data: Partial<AdminTransaction>): AdminTransaction[] { return []; }
