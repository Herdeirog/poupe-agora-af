/**
 * User Reminder Storage Service
 * Handles CRUD operations for financial reminders with Supabase integration
 */

import { supabase } from '@/integrations/supabase/client';
import { Reminder, ReminderRecurrence, ReminderStatus, ReminderOrigin } from '@/types/userReminder';

const STORAGE_KEY = 'poupe_agora_lembretes_financeiros';

// DB type for user_reminders table
interface DbUserReminder {
  id: string;
  user_id: string;
  description: string;
  date: string;
  amount: number | null;
  recurrence: string;
  status: string;
  origin: string;
  next_execution: string | null;
  created_at: string;
  updated_at: string;
}

// Helper functions
function getFromLocal(): Reminder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocal(data: Reminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function mapDbToReminder(db: DbUserReminder): Reminder {
  return {
    id: db.id,
    description: db.description,
    date: db.date,
    amount: db.amount ?? undefined,
    recurrence: db.recurrence as ReminderRecurrence,
    status: db.status as ReminderStatus,
    origin: db.origin as ReminderOrigin,
    nextExecution: db.next_execution ?? undefined,
    createdAt: db.created_at,
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
        table: 'user_reminders',
        data,
        filters
      }
    });
    if (error) {
      console.warn(`[userReminderStorage] Edge function ${operation} failed:`, error);
      return null;
    }
    return result?.data;
  } catch (e) {
    console.warn(`[userReminderStorage] Edge function error:`, e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= CRUD Operations =============

export async function getReminders(): Promise<Reminder[]> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const hasSession = await hasAuthSession();
      let data: DbUserReminder[] | null = null;

      if (hasSession) {
        const { data: reminderData, error } = await db
          .from('user_reminders')
          .select('*')
          .order('date', { ascending: true });
        
        if (!error) data = reminderData;
      } else {
        const result = await syncViaEdgeFunction('select');
        if (Array.isArray(result)) {
          data = result as DbUserReminder[];
        }
      }

      if (data && data.length > 0) {
        const reminders = data.map(mapDbToReminder);
        saveToLocal(reminders);
        return reminders;
      }
    }
  } catch (e) {
    console.warn('Supabase getReminders failed, using localStorage:', e);
  }

  return getFromLocal();
}

export async function getReminderById(id: string): Promise<Reminder | undefined> {
  const reminders = await getReminders();
  return reminders.find(r => r.id === id);
}

export async function createReminder(
  data: Omit<Reminder, 'id' | 'createdAt'>
): Promise<Reminder | null> {
  const newReminder: Reminder = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const current = getFromLocal();
  current.unshift(newReminder);
  saveToLocal(current);

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const insertData = {
        description: data.description,
        date: data.date,
        amount: data.amount ?? null,
        recurrence: data.recurrence,
        status: data.status,
        origin: data.origin,
        next_execution: data.nextExecution ?? null,
      };

      const hasSession = await hasAuthSession();
      let inserted: DbUserReminder | null = null;

      if (hasSession) {
        const { data: result, error } = await db
          .from('user_reminders')
          .insert({ ...insertData, user_id: userId })
          .select()
          .single();
        
        if (!error) inserted = result;
      } else {
        const result = await syncViaEdgeFunction('insert', insertData);
        if (Array.isArray(result) && result.length > 0) {
          inserted = result[0] as DbUserReminder;
        }
      }

      if (inserted) {
        const idx = current.findIndex(r => r.id === newReminder.id);
        if (idx >= 0) {
          current[idx].id = inserted.id;
          saveToLocal(current);
        }
        return { ...newReminder, id: inserted.id };
      }
    }
  } catch (e) {
    console.warn('Supabase createReminder failed (silent):', e);
  }

  return newReminder;
}

export async function updateReminder(
  id: string,
  data: Partial<Reminder>
): Promise<Reminder | null> {
  const current = getFromLocal();
  const idx = current.findIndex(r => r.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...data };
    saveToLocal(current);
  }

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.description !== undefined) updates.description = data.description;
    if (data.date !== undefined) updates.date = data.date;
    if (data.amount !== undefined) updates.amount = data.amount ?? null;
    if (data.recurrence !== undefined) updates.recurrence = data.recurrence;
    if (data.status !== undefined) updates.status = data.status;
    if (data.origin !== undefined) updates.origin = data.origin;
    if (data.nextExecution !== undefined) updates.next_execution = data.nextExecution ?? null;

    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('user_reminders').update(updates).eq('id', id);
    } else {
      await syncViaEdgeFunction('update', updates, { id });
    }
  } catch (e) {
    console.warn('Supabase updateReminder failed (silent):', e);
  }

  return idx >= 0 ? current[idx] : null;
}

export async function deleteReminder(id: string): Promise<boolean> {
  const current = getFromLocal();
  const filtered = current.filter(r => r.id !== id);
  saveToLocal(filtered);

  try {
    const hasSession = await hasAuthSession();
    if (hasSession) {
      await db.from('user_reminders').delete().eq('id', id);
    } else {
      await syncViaEdgeFunction('delete', undefined, { id });
    }
  } catch (e) {
    console.warn('Supabase deleteReminder failed (silent):', e);
  }

  return true;
}

export interface ReminderStats {
  active: number;
  completed: number;
  overdue: number;
  total: number;
}

export async function getReminderStats(): Promise<ReminderStats> {
  const reminders = await getReminders();
  return {
    active: reminders.filter(r => r.status === 'active').length,
    completed: reminders.filter(r => r.status === 'completed').length,
    overdue: reminders.filter(r => r.status === 'overdue').length,
    total: reminders.length,
  };
}
