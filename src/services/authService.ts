import { supabase } from '@/lib/supabase';
import { AuthUser, AuthSession } from '@/types/authUser';

// Map Supabase User to our AuthUser type
function mapUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    nome: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    tipo: (user.user_metadata?.tipo as 'admin' | 'cliente') || 'cliente', // Default to client
    avatar_url: user.user_metadata?.avatar_url,
  };
}

export async function login(email: string, senha: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    return { success: true, user: mapUser(data.user) };
  }

  return { success: false, error: 'Erro desconhecido ao fazer login' };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthSession | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return {
    user: mapUser(session.user),
    isAuthenticated: true,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return mapUser(user);
}

export async function register(email: string, senha: string, nome: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        full_name: nome,
        tipo: 'cliente', // Default for public registration
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    return { success: true, user: mapUser(data.user) };
  }

  return { success: false, error: 'Erro ao criar conta' };
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Deprecated or Mock function kept for interface compatibility if needed, but empty
export function seedUsers(): void {
  // No-op in Supabase
}
