import { UserProfile, UserSupportTicket } from '@/types/userProfile';
import { supabase } from '@/lib/supabase';

// Map DB profile to UserProfile
function mapProfile(p: any, email: string): UserProfile {
  return {
    id: p.id,
    name: p.full_name || email.split('@')[0],
    email: email,
    phone: p.telefone || '',
    whatsapp: p.whatsapp || '',
    avatar: p.avatar_url,
    plan: {
      type: 'free', // Default or fetch from subscriptions table
      status: 'active',
      expiresAt: '',
    },
    settings: {
      theme: 'dark', // Default
      notifications: {
        email: true,
        push: true,
        whatsapp: false,
      },
      currency: 'BRL',
    },
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return mapProfile(data, user.email || '');
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const updates: any = {};
  if (data.name) updates.full_name = data.name;
  if (data.phone) updates.telefone = data.phone;
  if (data.whatsapp) updates.whatsapp = data.whatsapp;
  if (data.avatar) updates.avatar_url = data.avatar;

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return mapProfile(updated, user.email || '');
}

export async function updatePlan(planData: UserProfile['plan']): Promise<UserProfile | null> {
  // Not implemented in DB yet
  return getProfile();
}

export async function updateSettings(settings: Partial<UserProfile['settings']>): Promise<UserProfile | null> {
  // Not implemented in DB yet
  return getProfile();
}

export async function createSupportTicket(ticket: Omit<UserSupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'>): Promise<UserSupportTicket | null> {
  // Not implemented
  return null;
}

export async function getUserTickets(): Promise<UserSupportTicket[]> {
  return [];
}

// Funções adicionadas para compatibilidade com hooks
export async function getPlan() {
  const profile = await getProfile();
  return profile?.plan || {
    type: 'free',
    status: 'active',
    expiresAt: '',
  };
}

export function getTrialDaysRemaining(): number {
  // Retorna 0 por padrão (sem trial)
  return 0;
}

export async function getSettings() {
  const profile = await getProfile();
  return profile?.settings || {
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      whatsapp: false,
    },
    currency: 'BRL',
  };
}

export async function getTickets(): Promise<UserSupportTicket[]> {
  return getUserTickets();
}

export function seedProfile(): void { }

