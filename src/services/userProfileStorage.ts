import { UserProfile, UserSettings, UserSupportTicket } from '@/types/userProfile';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
  notifyWhatsapp: false,
  notifyEmail: true,
  notifyGoals: true,
  notifyBudgetAlert: true,
  budgetAlertThreshold: 80,
  notifications: { email: true, push: true, whatsapp: false },
};

function mapProfile(p: any, email: string): UserProfile {
  return {
    id: p.id,
    name: p.full_name || email.split('@')[0],
    email,
    phone: p.telefone || '',
    whatsapp: p.whatsapp || '',
    avatar: p.avatar_url,
    plan: { type: 'free', status: 'active', expiresAt: '' },
    settings: { ...DEFAULT_SETTINGS, ...(p.preferences || {}) },
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[userProfileStorage] getProfile error:', error);
    return null;
  }

  return mapProfile(data, user.email || '');
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { updated_at: new Date().toISOString() };
  if (data.name)   updates.full_name  = data.name;
  if (data.phone)  updates.telefone   = data.phone;
  if (data.whatsapp) updates.whatsapp = data.whatsapp;
  if (data.avatar) updates.avatar_url = data.avatar;

  const { data: updated, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[userProfileStorage] updateProfile error:', error);
    return null;
  }

  return mapProfile(updated, user.email || '');
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Busca preferences atuais para fazer merge
  const { data: current } = await db
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single();

  const merged = { ...(current?.preferences || {}), ...settings };

  const { data: updated, error } = await db
    .from('profiles')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[userProfileStorage] updateSettings error:', error);
    return null;
  }

  return mapProfile(updated, user.email || '');
}

export async function getSettings(): Promise<UserSettings> {
  const profile = await getProfile();
  return profile?.settings ?? DEFAULT_SETTINGS;
}

export async function updatePlan(planData: UserProfile['plan']): Promise<UserProfile | null> {
  return getProfile();
}

export async function getPlan() {
  const profile = await getProfile();
  return profile?.plan || { type: 'free', status: 'active', expiresAt: '' };
}

export function getTrialDaysRemaining(): number {
  return 0;
}

export async function createSupportTicket(
  ticket: Omit<UserSupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'>
): Promise<UserSupportTicket | null> {
  return null;
}

export async function getUserTickets(): Promise<UserSupportTicket[]> {
  return [];
}

export async function getTickets(): Promise<UserSupportTicket[]> {
  return [];
}

export function seedProfile(): void {}
