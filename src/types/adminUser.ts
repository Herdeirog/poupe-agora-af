export type AdminUserRole = 'admin' | 'cliente' | 'support' | 'usuario';
export type AdminUserTipo = AdminUserRole; // Alias for backward compatibility
export type AdminUserStatus = 'active' | 'inactive' | 'suspended' | 'ativo' | 'inativo' | 'suspenso' | 'trial' | 'cancelado';
export type AdminUserPlan = 'free' | 'monthly' | 'annual' | 'premium' | 'gratuito' | 'mensal' | 'anual';

export interface AdminUser {
  id: string;
  name?: string;
  nome?: string;
  email: string;
  role?: AdminUserRole;
  tipoUsuario?: AdminUserRole;
  status: AdminUserStatus;
  lastAccess?: string;
  joinedAt?: string;
  dataCadastro?: string;
  avatar?: string;
  location?: string;
  plan?: AdminUserPlan;
  plano?: AdminUserPlan;

  // Contact fields
  telefone?: string;
  whatsapp?: string;
  phone?: string;

  // Location fields
  cidade?: string;
  estado?: string;

  // Plan related fields
  dataInicioPlano?: string;
  dataFimPlano?: string;
  emTeste?: boolean;
  diasTeste?: number;
  acessoLiberado?: boolean;

  // Admin flag
  isAdmin?: boolean;

  // Notes
  observacoes?: string;

  // Family Plan fields
  familyPlanId?: string;
  familyPlanType?: 'family' | 'family_plus';
  familyMaxMembers?: number;
  familyActiveMembers?: number;
  hasFamilyPlan?: boolean;
}

export interface AdminUserFilters {
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
}
