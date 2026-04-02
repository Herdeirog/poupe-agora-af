export type PlanStatus = 'active' | 'pending' | 'trial' | 'cancelled';
export type PlanType = 'free' | 'monthly' | 'annual';
export type PlanOrigin = 'perfectpay' | 'asaas' | 'qify' | 'hotmart';

export interface UserPlan {
  id?: string;
  userId?: string;
  type: PlanType;
  status: PlanStatus;
  origin?: PlanOrigin;
  activatedAt?: string;
  renewsAt?: string;
  trialEndsAt?: string;
  price?: number;
  expiresAt?: string; // Added for compatibility
}

export interface UserSettings {
  id?: string;
  userId?: string;
  notifyWhatsapp?: boolean;
  notifyEmail?: boolean;
  notifyGoals?: boolean;
  notifyBudgetAlert?: boolean;
  budgetAlertThreshold?: number; // 0-100 percentage
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  currency?: 'BRL' | 'USD' | 'EUR';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  notifications?: {
    email: boolean;
    push: boolean;
    whatsapp: boolean;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string; // Direct number
  avatar?: string;
  whatsappLinked?: boolean; // Legacy or computed
  whatsappNumber?: string; // Legacy
  createdAt: string;
  updatedAt: string;
  plan?: UserPlan;
  settings?: UserSettings;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export type UserSupportTicket = SupportTicket; // Alias for compatibility
