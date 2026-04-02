/**
 * MigrationService - Silent one-time migration from localStorage to Supabase
 * 
 * Rules:
 * - Runs only ONCE per user (flag-based)
 * - Does NOT delete localStorage data
 * - Does NOT block the application
 * - Does NOT show messages to the user
 * - Fault-tolerant (continues on errors)
 * - Supports legacy users via Edge Function (bypasses RLS)
 */

import { supabase } from '@/lib/supabase';
import { syncViaEdgeFunction, hasAuthSession } from '@/services/DataProvider';

const MIGRATION_FLAG = 'supabase_migrated';

// localStorage keys used by the app
const STORAGE_KEYS = {
  user: 'poupe_agora_user',
  transacoes: 'poupe_agora_transacoes',
  categorias: 'poupe_agora_categorias',
  lembretes: 'poupe_agora_lembretes',
  metas: 'poupe_agora_metas',
  orcamento: 'poupe_agora_orcamento',
};

/**
 * Check if migration has already been completed
 */
export function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG) === 'true';
}

/**
 * Mark migration as complete
 */
function setMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG, 'true');
}

/**
 * Safely parse JSON from localStorage
 */
function safeParseJSON<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.warn(`[Migration] Failed to parse ${key}:`, error);
    return null;
  }
}

/**
 * Execute a database operation (supports both auth and legacy users)
 */
async function executeDbOperation(
  operation: 'select' | 'insert' | 'upsert',
  table: string,
  userId: string,
  data?: Record<string, unknown> | Record<string, unknown>[],
  filters?: { column?: string; value?: unknown }
): Promise<{ data: unknown; error: unknown }> {
  const hasSession = await hasAuthSession();
  
  if (hasSession) {
    // Auth user - direct query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    
    switch (operation) {
      case 'select': {
        let query = db.from(table).select(filters?.column || '*');
        if (table === 'profiles') {
          query = query.eq('id', userId);
        } else {
          query = query.eq('user_id', userId);
        }
        return await query;
      }
      case 'insert': {
        return await db.from(table).insert(data);
      }
      case 'upsert': {
        const onConflict = table === 'profiles' ? 'id' : 'user_id';
        return await db.from(table).upsert(data, { onConflict });
      }
    }
  } else {
    // Legacy user - via edge function
    try {
      const result = await syncViaEdgeFunction(operation, table, data as Record<string, unknown>, undefined);
      return { data: result, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }
}

/**
 * Migrate user profile data
 */
async function migrateProfile(userId: string): Promise<void> {
  const userData = safeParseJSON<Record<string, unknown>>(STORAGE_KEYS.user);
  if (!userData) {
    console.log('[Migration] Profile: No local data');
    return;
  }

  const { error } = await executeDbOperation('upsert', 'profiles', userId, {
    id: userId,
    full_name: userData.nome || userData.full_name || userData.name || null,
    whatsapp: userData.whatsapp || null,
    telefone: userData.phone || userData.telefone || null,
    email: userData.email || null,
  });

  if (error) throw error;
  console.log('[Migration] Profile: OK');
}

/**
 * Migrate transactions
 */
async function migrateTransactions(userId: string): Promise<void> {
  const transacoes = safeParseJSON<Record<string, unknown>[]>(STORAGE_KEYS.transacoes);
  if (!transacoes || transacoes.length === 0) {
    console.log('[Migration] Transactions: No local data');
    return;
  }

  // Get existing transactions to avoid duplicates
  const { data: existing } = await executeDbOperation('select', 'transactions', userId, undefined, {
    column: 'date, amount, description'
  });

  const existingSet = new Set(
    ((existing as Record<string, unknown>[]) || []).map(t => `${t.date}|${t.amount}|${t.description}`)
  );

  const newTransactions = transacoes
    .filter(t => !existingSet.has(`${t.data || t.date}|${t.valor || t.amount}|${t.descricao || t.description}`))
    .map(t => ({
      user_id: userId,
      date: t.data || t.date,
      amount: t.valor || t.amount,
      type: t.tipo || t.type || 'expense',
      description: t.descricao || t.description || null,
      category_id: null,
      origin: 'migrated',
    }));

  if (newTransactions.length === 0) {
    console.log('[Migration] Transactions: All already exist');
    return;
  }

  const { error } = await executeDbOperation('insert', 'transactions', userId, newTransactions);

  if (error) throw error;
  console.log(`[Migration] Transactions: ${newTransactions.length} migrated`);
}

/**
 * Migrate categories (only user-created, not defaults)
 */
async function migrateCategories(userId: string): Promise<void> {
  const categorias = safeParseJSON<Record<string, unknown>[]>(STORAGE_KEYS.categorias);
  if (!categorias || categorias.length === 0) {
    console.log('[Migration] Categories: No local data');
    return;
  }

  // Get existing categories to avoid duplicates
  const { data: existing } = await executeDbOperation('select', 'categories', userId, undefined, {
    column: 'name'
  });

  const existingNames = new Set(((existing as Record<string, unknown>[]) || []).map(c => String(c.name).toLowerCase()));

  const newCategories = categorias
    .filter(c => !c.is_default && !c.isDefault && !existingNames.has(String(c.nome || c.name || '').toLowerCase()))
    .map(c => ({
      user_id: userId,
      name: c.nome || c.name,
      icon: c.icone || c.icon || null,
      color: c.cor || c.color || null,
      type: c.tipo || c.type || 'expense',
      is_default: false,
    }));

  if (newCategories.length === 0) {
    console.log('[Migration] Categories: All already exist or are defaults');
    return;
  }

  const { error } = await executeDbOperation('insert', 'categories', userId, newCategories);

  if (error) throw error;
  console.log(`[Migration] Categories: ${newCategories.length} migrated`);
}

/**
 * Migrate goals
 */
async function migrateGoals(userId: string): Promise<void> {
  const metas = safeParseJSON<Record<string, unknown>[]>(STORAGE_KEYS.metas);
  if (!metas || metas.length === 0) {
    console.log('[Migration] Goals: No local data');
    return;
  }

  // Get existing goals to avoid duplicates
  const { data: existing } = await executeDbOperation('select', 'goals', userId, undefined, {
    column: 'title'
  });

  const existingTitles = new Set(((existing as Record<string, unknown>[]) || []).map(g => String(g.title).toLowerCase()));

  const newGoals = metas
    .filter(m => !existingTitles.has(String(m.titulo || m.title || '').toLowerCase()))
    .map(m => ({
      user_id: userId,
      title: m.titulo || m.title,
      target_amount: m.valor_alvo || m.target_amount || m.targetAmount || 0,
      current_amount: m.valor_atual || m.current_amount || m.currentAmount || 0,
      deadline: m.prazo || m.deadline || null,
    }));

  if (newGoals.length === 0) {
    console.log('[Migration] Goals: All already exist');
    return;
  }

  const { error } = await executeDbOperation('insert', 'goals', userId, newGoals);

  if (error) throw error;
  console.log(`[Migration] Goals: ${newGoals.length} migrated`);
}

/**
 * Migrate budget
 */
async function migrateBudget(userId: string): Promise<void> {
  const orcamento = safeParseJSON<Record<string, unknown>>(STORAGE_KEYS.orcamento);
  if (!orcamento) {
    console.log('[Migration] Budget: No local data');
    return;
  }

  const { error } = await executeDbOperation('upsert', 'budgets', userId, {
    user_id: userId,
    monthly_limit: orcamento.limite_mensal || orcamento.monthly_limit || orcamento.monthlyLimit || 3000,
    alert_at_70: orcamento.alerta_70 ?? orcamento.alert_at_70 ?? orcamento.alertAt70 ?? true,
    alert_at_90: orcamento.alerta_90 ?? orcamento.alert_at_90 ?? orcamento.alertAt90 ?? true,
    alert_at_100: orcamento.alerta_100 ?? orcamento.alert_at_100 ?? orcamento.alertAt100 ?? true,
  });

  if (error) throw error;
  console.log('[Migration] Budget: OK');
}

/**
 * Migrate reminders
 */
async function migrateReminders(userId: string): Promise<void> {
  const lembretes = safeParseJSON<Record<string, unknown>>(STORAGE_KEYS.lembretes);
  if (!lembretes) {
    console.log('[Migration] Reminders: No local data');
    return;
  }

  const { error } = await executeDbOperation('upsert', 'reminders', userId, {
    user_id: userId,
    enabled: lembretes.ativo ?? lembretes.enabled ?? true,
    time: lembretes.horario || lembretes.time || '08:00',
    notify_expenses: lembretes.notificar_despesas ?? lembretes.notify_expenses ?? lembretes.notifyExpenses ?? true,
    notify_goals: lembretes.notificar_metas ?? lembretes.notify_goals ?? lembretes.notifyGoals ?? true,
    notify_weekly_summary: lembretes.notificar_resumo ?? lembretes.notify_weekly_summary ?? lembretes.notifyWeeklySummary ?? true,
  });

  if (error) throw error;
  console.log('[Migration] Reminders: OK');
}

/**
 * Helper to run migration for a single entity with error handling
 */
async function migrateEntity(
  name: string,
  migrateFn: () => Promise<void>
): Promise<void> {
  try {
    await migrateFn();
  } catch (error) {
    console.warn(`[Migration] ${name}: FAILED`, error);
    // Don't throw - continue with next entity
  }
}

/**
 * Run the complete migration process
 * This should be called after successful user authentication
 */
export async function runMigration(userId: string): Promise<void> {
  // Check if already migrated
  if (isMigrated()) {
    console.log('[Migration] Already completed, skipping');
    return;
  }

  console.log('[Migration] Starting migration for user:', userId);

  // Run all migrations (fault-tolerant)
  await migrateEntity('Profile', () => migrateProfile(userId));
  await migrateEntity('Categories', () => migrateCategories(userId));
  await migrateEntity('Transactions', () => migrateTransactions(userId));
  await migrateEntity('Goals', () => migrateGoals(userId));
  await migrateEntity('Budget', () => migrateBudget(userId));
  await migrateEntity('Reminders', () => migrateReminders(userId));

  // Mark as migrated (even if some entities failed)
  setMigrated();
  console.log('[Migration] Complete');
}
