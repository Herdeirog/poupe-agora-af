export interface ReminderSettings {
  enabled: boolean;
  time: string;
  notifyGoals: boolean;
  notifyExpenses: boolean;
  notifyWeeklySummary: boolean;
}

export const defaultReminderSettings: ReminderSettings = {
  enabled: true,
  time: '08:00',
  notifyGoals: true,
  notifyExpenses: true,
  notifyWeeklySummary: true,
};

export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderStatus = 'active' | 'completed' | 'overdue';
export type ReminderOrigin = 'whatsapp' | 'manual';

export interface Reminder {
  id: string;
  description: string;
  date: string;
  amount?: number;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
  origin: ReminderOrigin;
  nextExecution?: string;
  createdAt: string;
}

export const recurrenceLabels: Record<ReminderRecurrence, string> = {
  once: 'Única vez',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

export const statusLabels: Record<ReminderStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  overdue: 'Atrasado',
};
