import { AdminUser, AdminUserFilters } from '@/types/adminUser';
import { supabase } from '@/lib/supabase';

// Map Supabase profile to AdminUser
function mapAdminUser(p: any, email: string, familyPlan?: any, membersCount?: number): AdminUser {
  const name = p.full_name || (email ? email.split('@')[0] : 'Usuário');
  const role = (p.tipo as 'admin' | 'cliente' | 'support') || 'cliente';
  const joinedAt = p.created_at || new Date().toISOString();

  // Map status English -> Portuguese for UI compatibility
  let statusPt = 'ativo';
  if (p.status === 'inactive') statusPt = 'inativo';
  if (p.status === 'suspended') statusPt = 'suspenso';

  // Map plan English -> Portuguese
  let planPt = 'gratuito'; // Default

  return {
    id: p.id,
    name: name,
    email: email,
    role: role,
    status: statusPt as any,
    lastAccess: new Date().toISOString(),
    joinedAt: joinedAt,
    avatar: p.avatar_url,
    location: 'Brasil',
    plan: planPt as any,

    // Legacy fields for Admin Panel compatibility
    nome: name,
    tipoUsuario: role,
    dataCadastro: joinedAt,
    telefone: p.telefone || p.phone || '',
    plano: planPt as any,
    emTeste: false,
    diasTeste: 0,
    acessoLiberado: true,
    observacoes: '',

    // Family Plan fields
    familyPlanId: familyPlan?.id,
    familyPlanType: familyPlan?.plan_type,
    familyMaxMembers: familyPlan?.max_members,
    familyActiveMembers: membersCount || 0,
    hasFamilyPlan: !!familyPlan,
  };
}

export async function getAdminUsers(filters?: AdminUserFilters): Promise<AdminUser[]> {
  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching admin users:', profilesError);
    return [];
  }

  // Fetch family plans with member counts
  const { data: familyPlans, error: familyError } = await supabase
    .from('family_plans')
    .select(`
      id,
      admin_user_id,
      plan_type,
      max_members,
      family_members!family_members_family_plan_id_fkey(id, status)
    `);

  if (familyError) {
    console.error('Error fetching family plans:', familyError);
  }

  // Create a map of user_id -> family plan info
  const familyPlanMap = new Map<string, { plan: any; membersCount: number }>();
  if (familyPlans) {
    for (const fp of familyPlans) {
      const activeMembers = (fp.family_members || []).filter(
        (m: any) => m.status === 'active' || m.status === 'ativo'
      ).length;
      familyPlanMap.set(fp.admin_user_id, { plan: fp, membersCount: activeMembers });
    }
  }

  let users = profiles.map(p => {
    const familyInfo = familyPlanMap.get(p.id);
    return mapAdminUser(p, p.email || '', familyInfo?.plan, familyInfo?.membersCount);
  });

  if (filters) {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    if (filters.role) {
      users = users.filter(u => u.role === filters.role);
    }
    if (filters.status) {
      users = users.filter(u => u.status === filters.status);
    }
  }

  return users;
}

export async function getAdminUserById(id: string): Promise<AdminUser | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return mapAdminUser(data, data.email || '');
}

export async function updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser | null> {
  const updates: any = {};
  if (data.name) updates.full_name = data.name;
  if (data.role) updates.tipo = data.role;

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating admin user:', error);
    return null;
  }

  return mapAdminUser(updated, updated.email || '');
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId: id }
  });

  if (error || !data?.success) {
    console.error('Error deleting admin user:', error || data?.error);
    return false;
  }
  return true;
}

export async function getUserStats() {
  const users = await getAdminUsers();

  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    newUsersThisMonth: users.filter(u => {
      const joined = new Date(u.joinedAt);
      const now = new Date();
      return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
    }).length,
    growthRate: 0 // TODO: Calculate from historical data
  };
}

export function seedAdminUsersIfEmpty(): void { }

// Deprecated but kept for type signature compatibility if referenced
export function resetAdminUsers(): AdminUser[] {
  return [];
}
