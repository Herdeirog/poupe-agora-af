/**
 * DataProvider - Camada híbrida de acesso a dados
 * 
 * COMPORTAMENTO:
 * - ESCRITA: localStorage primeiro → Supabase depois (falha silenciosa)
 * - LEITURA: Supabase primeiro → fallback localStorage
 * 
 * REGRAS:
 * - NÃO remover localStorage
 * - NÃO alterar formato dos dados
 * - NÃO exigir autenticação para localStorage
 * - Suporta usuários legados (sem auth session) via Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/userProfile';
import { UserTransaction } from '@/types/userTransaction';
import { UserCategory } from '@/types/userCategory';
import { UserGoal } from '@/types/userGoal';
import { UserBudget } from '@/types/userBudget';
import { ReminderSettings, defaultReminderSettings } from '@/types/userReminder';

// ============= CHAVES LOCALSTORAGE (preservando formato existente) =============
const STORAGE_KEYS = {
  USER: 'poupe_agora_user',
  TRANSACTIONS: 'poupe_agora_transacoes',
  CATEGORIES: 'poupe_agora_categorias',
  REMINDERS: 'poupe_agora_lembretes',
  GOALS: 'poupe_agora_metas',
  BUDGET: 'poupe_agora_orcamento',
};

// ============= DB TYPES (until auto-generated types refresh) =============
interface DbProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  telefone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DbTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  category_id: string | null;
  date: string;
  origin: string | null;
  created_at: string;
  updated_at: string;
}

interface DbCategory {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: string | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string | null;
}

interface DbGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

interface DbBudget {
  id: string;
  user_id: string;
  monthly_limit: number;
  alert_at_70: boolean;
  alert_at_90: boolean;
  alert_at_100: boolean;
  created_at: string;
  updated_at: string;
}

interface DbReminder {
  id: string;
  user_id: string;
  enabled: boolean;
  time: string | null;
  notify_goals: boolean;
  notify_expenses: boolean;
  notify_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

// ============= HELPERS =============
function getFromLocal<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveToLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

/**
 * Get supabase_id from localStorage (for legacy users)
 */
function getSupabaseIdFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      const legacyUser = JSON.parse(stored);
      return legacyUser.supabase_id || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Get current user ID - tries auth first, then localStorage fallback
 */
async function getCurrentUserId(): Promise<string | null> {
  // 1. Try Supabase Auth first
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) return user.id;
  
  // 2. Fallback: check supabase_id in localStorage (legacy users)
  const legacyId = getSupabaseIdFromStorage();
  if (legacyId) {
    console.log('[DataProvider] Using legacy supabase_id:', legacyId);
    return legacyId;
  }
  
  return null;
}

/**
 * Check if user has auth session
 */
async function hasAuthSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Sync data via Edge Function (for legacy users without auth session)
 */
async function syncViaEdgeFunction(
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete',
  table: string,
  data?: Record<string, unknown> | Record<string, unknown>[],
  filters?: { id?: string }
): Promise<unknown> {
  const profileId = await getCurrentUserId();
  if (!profileId) {
    console.warn('[DataProvider] No user ID for edge function sync');
    return null;
  }

  try {
    const { data: result, error } = await supabase.functions.invoke('sync-user-data', {
      body: {
        profile_id: profileId,
        operation,
        table,
        data,
        filters
      }
    });

    if (error) {
      console.warn(`[DataProvider] Edge function ${operation} on ${table} failed:`, error);
      return null;
    }

    return result?.data;
  } catch (e) {
    console.warn(`[DataProvider] Edge function error:`, e);
    return null;
  }
}

// Type-safe supabase calls using any cast (temporary until types regenerate)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= USER / PROFILE =============
export async function getUser(): Promise<UserProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      
      let data: DbProfile | null = null;
      
      if (hasSession) {
        // Auth user - direct query
        const { data: profileData, error } = await db
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error) data = profileData;
      } else {
        // Legacy user - via edge function
        const result = await syncViaEdgeFunction('select', 'profiles');
        if (Array.isArray(result) && result.length > 0) {
          data = result[0] as DbProfile;
        }
      }

      if (data) {
        const profile: UserProfile = {
          id: data.id,
          name: data.full_name || '',
          email: data.email || '',
          phone: data.telefone || '',
          whatsapp: data.whatsapp || '',
          avatar: data.avatar_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        saveToLocal(STORAGE_KEYS.USER, profile);
        return profile;
      }
    }
  } catch (e) {
    console.warn('Supabase getUser failed, using localStorage:', e);
  }
  
  return getFromLocal<UserProfile>(STORAGE_KEYS.USER);
}

export async function saveUser(data: Partial<UserProfile>): Promise<UserProfile | null> {
  const current = getFromLocal<UserProfile>(STORAGE_KEYS.USER) || {} as UserProfile;
  const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
  saveToLocal(STORAGE_KEYS.USER, updated);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name) updates.full_name = data.name;
      if (data.phone) updates.telefone = data.phone;
      if (data.whatsapp) updates.whatsapp = data.whatsapp;
      if (data.avatar) updates.avatar_url = data.avatar;
      if (data.email) updates.email = data.email;

      const hasSession = await hasAuthSession();
      if (hasSession) {
        await db.from('profiles').update(updates).eq('id', userId);
      } else {
        await syncViaEdgeFunction('update', 'profiles', updates, { id: userId });
      }
    }
  } catch (e) {
    console.warn('Supabase saveUser failed (silent):', e);
  }

  return updated as UserProfile;
}

// ============= TRANSACTIONS =============
export async function getTransacoes(): Promise<UserTransaction[]> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      
      let data: DbTransaction[] | null = null;
      
      if (hasSession) {
        const { data: txData, error } = await db
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });
        
        if (!error) data = txData;
      } else {
        const result = await syncViaEdgeFunction('select', 'transactions');
        if (Array.isArray(result)) {
          data = result as DbTransaction[];
        }
      }

      if (data && data.length > 0) {
        const transactions = data.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type as 'income' | 'expense',
          description: t.description || '',
          categoryId: t.category_id || '',
          date: t.date,
          origin: (t.origin || 'manual') as 'manual' | 'whatsapp',
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, transactions);
        return transactions;
      }
    }
  } catch (e) {
    console.warn('Supabase getTransacoes failed, using localStorage:', e);
  }

  return getFromLocal<UserTransaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
}

export async function saveTransacao(data: Omit<UserTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserTransaction | null> {
  const newTransaction: UserTransaction = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = getFromLocal<UserTransaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
  current.unshift(newTransaction);
  saveToLocal(STORAGE_KEYS.TRANSACTIONS, current);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const insertData = {
        amount: data.amount,
        type: data.type,
        description: data.description,
        category_id: data.categoryId || null,
        date: data.date,
        origin: data.origin || 'manual',
      };

      const hasSession = await hasAuthSession();
      let inserted: DbTransaction | null = null;
      
      if (hasSession) {
        const { data: result, error } = await db
          .from('transactions')
          .insert({ ...insertData, user_id: userId })
          .select()
          .single();
        
        if (!error) inserted = result;
      } else {
        const result = await syncViaEdgeFunction('insert', 'transactions', insertData);
        if (Array.isArray(result) && result.length > 0) {
          inserted = result[0] as DbTransaction;
        }
      }

      if (inserted) {
        const idx = current.findIndex(t => t.id === newTransaction.id);
        if (idx >= 0) {
          current[idx].id = inserted.id;
          saveToLocal(STORAGE_KEYS.TRANSACTIONS, current);
        }
        return { ...newTransaction, id: inserted.id };
      }
    }
  } catch (e) {
    console.warn('Supabase saveTransacao failed (silent):', e);
  }

  return newTransaction;
}

export async function updateTransacao(id: string, data: Partial<UserTransaction>): Promise<UserTransaction | null> {
  const current = getFromLocal<UserTransaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
  const idx = current.findIndex(t => t.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data, updatedAt: new Date().toISOString() };
    saveToLocal(STORAGE_KEYS.TRANSACTIONS, current);
  }

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.type !== undefined) updates.type = data.type;
    if (data.description !== undefined) updates.description = data.description;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId || null;
    if (data.date !== undefined) updates.date = data.date;

    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('transactions').update(updates).eq('id', id);
    } else {
      await syncViaEdgeFunction('update', 'transactions', updates, { id });
    }
  } catch (e) {
    console.warn('Supabase updateTransacao failed (silent):', e);
  }

  return idx >= 0 ? current[idx] : null;
}

export async function deleteTransacao(id: string): Promise<boolean> {
  const current = getFromLocal<UserTransaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
  const filtered = current.filter(t => t.id !== id);
  saveToLocal(STORAGE_KEYS.TRANSACTIONS, filtered);

  try {
    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('transactions').delete().eq('id', id);
    } else {
      await syncViaEdgeFunction('delete', 'transactions', undefined, { id });
    }
  } catch (e) {
    console.warn('Supabase deleteTransacao failed (silent):', e);
  }

  return true;
}

// ============= CATEGORIES =============
export async function getCategorias(): Promise<UserCategory[]> {
  try {
    const userId = await getCurrentUserId();
    const hasSession = await hasAuthSession();
    
    let data: DbCategory[] | null = null;
    
    if (hasSession || userId) {
      if (hasSession) {
        const { data: catData, error } = await db
          .from('categories')
          .select('*')
          .order('name');
        
        if (!error) data = catData;
      } else if (userId) {
        const result = await syncViaEdgeFunction('select', 'categories');
        if (Array.isArray(result)) {
          data = result as DbCategory[];
        }
      }

      if (data && data.length > 0) {
        const categories = data.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon || '',
          color: c.color || '',
          type: (c.type || 'expense') as 'income' | 'expense' | 'both',
          isDefault: c.user_id === null,
          createdAt: c.created_at,
          updatedAt: c.updated_at || c.created_at,
        }));
        saveToLocal(STORAGE_KEYS.CATEGORIES, categories);
        return categories;
      }
    }
  } catch (e) {
    console.warn('Supabase getCategorias failed, using localStorage:', e);
  }

  return getFromLocal<UserCategory[]>(STORAGE_KEYS.CATEGORIES) || [];
}

export async function saveCategoria(data: Omit<UserCategory, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>): Promise<UserCategory | null> {
  const newCategory: UserCategory = {
    ...data,
    id: crypto.randomUUID(),
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = getFromLocal<UserCategory[]>(STORAGE_KEYS.CATEGORIES) || [];
  current.push(newCategory);
  saveToLocal(STORAGE_KEYS.CATEGORIES, current);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const insertData = {
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        is_default: false,
      };

      const hasSession = await hasAuthSession();
      let inserted: DbCategory | null = null;
      
      if (hasSession) {
        const { data: result, error } = await db
          .from('categories')
          .insert({ ...insertData, user_id: userId })
          .select()
          .single();
        
        if (!error) inserted = result;
      } else {
        const result = await syncViaEdgeFunction('insert', 'categories', insertData);
        if (Array.isArray(result) && result.length > 0) {
          inserted = result[0] as DbCategory;
        }
      }

      if (inserted) {
        const idx = current.findIndex(c => c.id === newCategory.id);
        if (idx >= 0) {
          current[idx].id = inserted.id;
          saveToLocal(STORAGE_KEYS.CATEGORIES, current);
        }
        return { ...newCategory, id: inserted.id };
      }
    }
  } catch (e) {
    console.warn('Supabase saveCategoria failed (silent):', e);
  }

  return newCategory;
}

export async function updateCategoria(id: string, data: Partial<UserCategory>): Promise<UserCategory | null> {
  const current = getFromLocal<UserCategory[]>(STORAGE_KEYS.CATEGORIES) || [];
  const idx = current.findIndex(c => c.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data, updatedAt: new Date().toISOString() };
    saveToLocal(STORAGE_KEYS.CATEGORIES, current);
  }

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.color !== undefined) updates.color = data.color;
    if (data.type !== undefined) updates.type = data.type;

    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('categories').update(updates).eq('id', id);
    } else {
      await syncViaEdgeFunction('update', 'categories', updates, { id });
    }
  } catch (e) {
    console.warn('Supabase updateCategoria failed (silent):', e);
  }

  return idx >= 0 ? current[idx] : null;
}

export async function deleteCategoria(id: string): Promise<boolean> {
  const current = getFromLocal<UserCategory[]>(STORAGE_KEYS.CATEGORIES) || [];
  const filtered = current.filter(c => c.id !== id);
  saveToLocal(STORAGE_KEYS.CATEGORIES, filtered);

  try {
    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('categories').delete().eq('id', id);
    } else {
      await syncViaEdgeFunction('delete', 'categories', undefined, { id });
    }
  } catch (e) {
    console.warn('Supabase deleteCategoria failed (silent):', e);
  }

  return true;
}

// ============= GOALS (METAS) =============
export async function getMetas(): Promise<UserGoal[]> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      
      let data: DbGoal[] | null = null;
      
      if (hasSession) {
        const { data: goalData, error } = await db
          .from('goals')
          .select('*')
          .order('deadline', { ascending: true });
        
        if (!error) data = goalData;
      } else {
        const result = await syncViaEdgeFunction('select', 'goals');
        if (Array.isArray(result)) {
          data = result as DbGoal[];
        }
      }

      if (data && data.length > 0) {
        const goals = data.map(g => {
          const goal: UserGoal = {
            id: g.id,
            title: g.title,
            targetAmount: Number(g.target_amount),
            currentAmount: Number(g.current_amount),
            deadline: g.deadline || '',
            status: 'in_progress',
            createdAt: g.created_at,
            updatedAt: g.created_at,
          };
          if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
          else if (goal.deadline && new Date(goal.deadline) < new Date()) goal.status = 'overdue';
          return goal;
        });
        saveToLocal(STORAGE_KEYS.GOALS, goals);
        return goals;
      }
    }
  } catch (e) {
    console.warn('Supabase getMetas failed, using localStorage:', e);
  }

  return getFromLocal<UserGoal[]>(STORAGE_KEYS.GOALS) || [];
}

export async function saveMeta(data: Omit<UserGoal, 'id' | 'currentAmount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<UserGoal | null> {
  const newGoal: UserGoal = {
    ...data,
    id: crypto.randomUUID(),
    currentAmount: 0,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = getFromLocal<UserGoal[]>(STORAGE_KEYS.GOALS) || [];
  current.push(newGoal);
  saveToLocal(STORAGE_KEYS.GOALS, current);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const insertData = {
        title: data.title,
        target_amount: data.targetAmount,
        current_amount: 0,
        deadline: data.deadline,
      };

      const hasSession = await hasAuthSession();
      let inserted: DbGoal | null = null;
      
      if (hasSession) {
        const { data: result, error } = await db
          .from('goals')
          .insert({ ...insertData, user_id: userId })
          .select()
          .single();
        
        if (!error) inserted = result;
      } else {
        const result = await syncViaEdgeFunction('insert', 'goals', insertData);
        if (Array.isArray(result) && result.length > 0) {
          inserted = result[0] as DbGoal;
        }
      }

      if (inserted) {
        const idx = current.findIndex(g => g.id === newGoal.id);
        if (idx >= 0) {
          current[idx].id = inserted.id;
          saveToLocal(STORAGE_KEYS.GOALS, current);
        }
        return { ...newGoal, id: inserted.id };
      }
    }
  } catch (e) {
    console.warn('Supabase saveMeta failed (silent):', e);
  }

  return newGoal;
}

export async function updateMeta(id: string, data: Partial<UserGoal>): Promise<UserGoal | null> {
  const current = getFromLocal<UserGoal[]>(STORAGE_KEYS.GOALS) || [];
  const idx = current.findIndex(g => g.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data, updatedAt: new Date().toISOString() };
    if (current[idx].currentAmount >= current[idx].targetAmount) {
      current[idx].status = 'completed';
    } else if (current[idx].deadline && new Date(current[idx].deadline) < new Date()) {
      current[idx].status = 'overdue';
    } else {
      current[idx].status = 'in_progress';
    }
    saveToLocal(STORAGE_KEYS.GOALS, current);
  }

  try {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.targetAmount !== undefined) updates.target_amount = data.targetAmount;
    if (data.currentAmount !== undefined) updates.current_amount = data.currentAmount;
    if (data.deadline !== undefined) updates.deadline = data.deadline;

    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('goals').update(updates).eq('id', id);
    } else {
      await syncViaEdgeFunction('update', 'goals', updates, { id });
    }
  } catch (e) {
    console.warn('Supabase updateMeta failed (silent):', e);
  }

  return idx >= 0 ? current[idx] : null;
}

export async function deleteMeta(id: string): Promise<boolean> {
  const current = getFromLocal<UserGoal[]>(STORAGE_KEYS.GOALS) || [];
  const filtered = current.filter(g => g.id !== id);
  saveToLocal(STORAGE_KEYS.GOALS, filtered);

  try {
    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('goals').delete().eq('id', id);
    } else {
      await syncViaEdgeFunction('delete', 'goals', undefined, { id });
    }
  } catch (e) {
    console.warn('Supabase deleteMeta failed (silent):', e);
  }

  return true;
}

// ============= BUDGET (ORÇAMENTO) =============
export async function getOrcamento(): Promise<UserBudget | null> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      
      let data: DbBudget | null = null;
      
      if (hasSession) {
        const { data: budgetData, error } = await db
          .from('budgets')
          .select('*')
          .maybeSingle();
        
        if (!error) data = budgetData;
      } else {
        const result = await syncViaEdgeFunction('select', 'budgets');
        if (Array.isArray(result) && result.length > 0) {
          data = result[0] as DbBudget;
        }
      }

      if (data) {
        const budget: UserBudget = {
          id: data.id,
          monthlyLimit: Number(data.monthly_limit),
          alertAt70: data.alert_at_70,
          alertAt90: data.alert_at_90,
          alertAt100: data.alert_at_100,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        saveToLocal(STORAGE_KEYS.BUDGET, budget);
        return budget;
      }
    }
  } catch (e) {
    console.warn('Supabase getOrcamento failed, using localStorage:', e);
  }

  return getFromLocal<UserBudget>(STORAGE_KEYS.BUDGET);
}

export async function saveOrcamento(data: Partial<UserBudget>): Promise<UserBudget | null> {
  const current = getFromLocal<UserBudget>(STORAGE_KEYS.BUDGET) || {
    id: crypto.randomUUID(),
    monthlyLimit: 3000,
    alertAt70: true,
    alertAt90: true,
    alertAt100: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
  saveToLocal(STORAGE_KEYS.BUDGET, updated);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const upsertData = {
        monthly_limit: updated.monthlyLimit,
        alert_at_70: updated.alertAt70,
        alert_at_90: updated.alertAt90,
        alert_at_100: updated.alertAt100,
        updated_at: new Date().toISOString(),
      };

      const hasSession = await hasAuthSession();
      if (hasSession) {
        await db.from('budgets').upsert({
          ...upsertData,
          user_id: userId,
        }, { onConflict: 'user_id' });
      } else {
        await syncViaEdgeFunction('upsert', 'budgets', upsertData);
      }
    }
  } catch (e) {
    console.warn('Supabase saveOrcamento failed (silent):', e);
  }

  return updated;
}

// ============= REMINDERS (LEMBRETES) =============
export async function getLembretes(): Promise<ReminderSettings> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      
      let data: DbReminder | null = null;
      
      if (hasSession) {
        const { data: reminderData, error } = await db
          .from('reminders')
          .select('*')
          .maybeSingle();
        
        if (!error) data = reminderData;
      } else {
        const result = await syncViaEdgeFunction('select', 'reminders');
        if (Array.isArray(result) && result.length > 0) {
          data = result[0] as DbReminder;
        }
      }

      if (data) {
        const reminders: ReminderSettings = {
          enabled: data.enabled,
          time: data.time || '08:00',
          notifyGoals: data.notify_goals,
          notifyExpenses: data.notify_expenses,
          notifyWeeklySummary: data.notify_weekly_summary,
        };
        saveToLocal(STORAGE_KEYS.REMINDERS, reminders);
        return reminders;
      }
    }
  } catch (e) {
    console.warn('Supabase getLembretes failed, using localStorage:', e);
  }

  return getFromLocal<ReminderSettings>(STORAGE_KEYS.REMINDERS) || defaultReminderSettings;
}

export async function saveLembrete(data: Partial<ReminderSettings>): Promise<ReminderSettings> {
  const current = getFromLocal<ReminderSettings>(STORAGE_KEYS.REMINDERS) || defaultReminderSettings;
  const updated = { ...current, ...data };
  saveToLocal(STORAGE_KEYS.REMINDERS, updated);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const upsertData = {
        enabled: updated.enabled,
        time: updated.time,
        notify_goals: updated.notifyGoals,
        notify_expenses: updated.notifyExpenses,
        notify_weekly_summary: updated.notifyWeeklySummary,
        updated_at: new Date().toISOString(),
      };

      const hasSession = await hasAuthSession();
      if (hasSession) {
        await db.from('reminders').upsert({
          ...upsertData,
          user_id: userId,
        }, { onConflict: 'user_id' });
      } else {
        await syncViaEdgeFunction('upsert', 'reminders', upsertData);
      }
    }
  } catch (e) {
    console.warn('Supabase saveLembrete failed (silent):', e);
  }

  return updated;
}

// ============= EXPORT HELPER FOR MIGRATION =============
export { syncViaEdgeFunction, getCurrentUserId, hasAuthSession };

// ============= EXPORT DEFAULT =============
const DataProvider = {
  getUser,
  saveUser,
  getTransacoes,
  saveTransacao,
  updateTransacao,
  deleteTransacao,
  getCategorias,
  saveCategoria,
  updateCategoria,
  deleteCategoria,
  getMetas,
  saveMeta,
  updateMeta,
  deleteMeta,
  getOrcamento,
  saveOrcamento,
  getLembretes,
  saveLembrete,
};

export default DataProvider;
