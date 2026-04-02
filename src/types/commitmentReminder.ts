/**
 * Types for Smart Reminders system
 */

export type ReminderTiming = 'same_day' | '1_day_before' | '3_days_before' | 'custom';
export type ReminderRecurrenceMode = 'all_occurrences' | 'next_only';
export type ReminderStatus = 'active' | 'paused';
export type ReminderChannel = 'whatsapp' | 'email' | 'push';

export interface CommitmentReminder {
  id: string;
  commitmentId: string;
  commitmentTitle: string;
  commitmentType: 'unique' | 'recurring' | 'installment';
  timing: ReminderTiming;
  customDays?: number; // For custom timing
  recurrenceMode?: ReminderRecurrenceMode; // Only for recurring
  channel: ReminderChannel;
  status: ReminderStatus;
  nextAlertDate: string;
  createdAt: string;
}

export const timingLabels: Record<ReminderTiming, string> = {
  same_day: 'No dia do vencimento',
  '1_day_before': '1 dia antes',
  '3_days_before': '3 dias antes',
  custom: 'Personalizado',
};

export const recurrenceModeLabels: Record<ReminderRecurrenceMode, string> = {
  all_occurrences: 'Avisar em todas as ocorrências',
  next_only: 'Avisar apenas na próxima',
};

export const channelLabels: Record<ReminderChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  push: 'Notificação Push',
};

export const statusLabels: Record<ReminderStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
};

// Mock data for demo purposes
export const mockReminders: CommitmentReminder[] = [
  {
    id: '1',
    commitmentId: 'c1',
    commitmentTitle: 'Netflix',
    commitmentType: 'recurring',
    timing: '3_days_before',
    recurrenceMode: 'all_occurrences',
    channel: 'whatsapp',
    status: 'active',
    nextAlertDate: '2025-01-15',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    commitmentId: 'c2',
    commitmentTitle: 'Celular',
    commitmentType: 'installment',
    timing: '1_day_before',
    channel: 'whatsapp',
    status: 'paused',
    nextAlertDate: '2025-01-10',
    createdAt: '2025-01-01',
  },
  {
    id: '3',
    commitmentId: 'c3',
    commitmentTitle: 'Aluguel',
    commitmentType: 'recurring',
    timing: 'same_day',
    recurrenceMode: 'all_occurrences',
    channel: 'whatsapp',
    status: 'active',
    nextAlertDate: '2025-01-05',
    createdAt: '2025-01-01',
  },
];
