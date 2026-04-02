export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'confirmada' | 'pendente' | 'cancelada';
export type TransactionOrigin = 'whatsapp' | 'manual' | 'importacao';
export type TransactionCategory =
  | 'salario'
  | 'freelance'
  | 'investimentos'
  | 'alimentacao'
  | 'transporte'
  | 'moradia'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'outros';

export interface TransactionLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface AdminTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  status: TransactionStatus;
  origin: TransactionOrigin;
  date: string;
  createdAt: string;
  logs: TransactionLog[];
}

export interface AdminTransactionFilters {
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}

export interface AdminTransactionStats {
  totalTransactions: number;
  totalVolume: number;
  averageTicket: number;
  growthRate: number;
}
