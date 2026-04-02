export type SubscriptionStatus = 'ativa' | 'pendente' | 'cancelada' | 'suspensa' | 'trial';
export type SubscriptionOrigin = 'perfectpay' | 'asaas' | 'qify' | 'hotmart' | 'manual';
export type SubscriptionPlan = 'gratuito' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio' | 'trial' | 'premium';

export interface SubscriptionPayment {
  id: string;
  date: string;
  amount: number;
  status: 'pago' | 'pendente' | 'falha' | 'estornado';
  method: string;
  observacao?: string;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  origin: SubscriptionOrigin;
  amount: number;
  nextBilling: string;
  lastRenewal: string;
  startDate: string;
  endDate?: string;
  payments: SubscriptionPayment[];
  observacoes?: string;
}

export interface AdminSubscriptionFilters {
  search?: string;
  status?: SubscriptionStatus;
}
