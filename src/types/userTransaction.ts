export type TransactionType = 'income' | 'expense';
export type TransactionOrigin = 'manual' | 'whatsapp';

export interface UserTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string;
  origin: TransactionOrigin;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
