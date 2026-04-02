export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringTransactionType = 'income' | 'expense';

export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: RecurringTransactionType;
  categoryId: string;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  lastProcessedDate?: string;
  isActive: boolean;
  notifyDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};
