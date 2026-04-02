export type CommitmentType = 'unique' | 'recurring' | 'installment';
export type CommitmentStatus = 'pending' | 'completed' | 'overdue';
export type CommitmentOrigin = 'manual' | 'whatsapp' | 'google';
export type RecurrenceFrequency = 'weekly' | 'monthly';
export type InstallmentPaymentStatus = 'paid' | 'pending' | 'overdue';
export type RecurringPaymentStatus = 'paid' | 'pending' | 'overdue' | 'skipped';

export interface InstallmentPayment {
  installment: number;
  date: string;
  paidAt?: string;
  status: InstallmentPaymentStatus;
}

export interface RecurringPayment {
  date: string;
  paidAt?: string;
  amount: number;
  status: RecurringPaymentStatus;
}

export interface FinancialCommitment {
  id: string;
  title: string;
  date: string;
  time?: string;
  amount?: number;
  type: CommitmentType;
  status: CommitmentStatus;
  origin: CommitmentOrigin;
  // Categoria
  categoryId?: string;
  // Para recorrência
  frequency?: RecurrenceFrequency;
  isIndefinite?: boolean;
  // Para parcelas
  currentInstallment?: number;
  totalInstallments?: number;
  startDate?: string;
  installmentHistory?: InstallmentPayment[];
  // Para recorrentes - histórico
  recurringPaymentHistory?: RecurringPayment[];
  totalPaymentsMade?: number;
  totalAmountPaid?: number;
  // Metadados
  createdAt?: string;
  userId?: string;
}

export const statusLabels: Record<CommitmentStatus, string> = {
  pending: 'Pendente',
  completed: 'Concluído',
  overdue: 'Atrasado',
};

export const typeLabels: Record<CommitmentType, string> = {
  unique: 'Único',
  recurring: 'Recorrente',
  installment: 'Parcelado',
};

export const originLabels: Record<CommitmentOrigin, string> = {
  manual: 'Manual',
  whatsapp: 'WhatsApp',
  google: 'Google',
};

export const frequencyLabels: Record<RecurrenceFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export const installmentStatusLabels: Record<InstallmentPaymentStatus, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  overdue: 'Atrasado',
};
