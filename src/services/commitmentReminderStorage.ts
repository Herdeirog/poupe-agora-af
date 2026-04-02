/**
 * Storage service for commitment reminders
 * Uses Supabase for persistence with localStorage fallback
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  CommitmentReminder, 
  ReminderTiming, 
  ReminderRecurrenceMode, 
  ReminderChannel, 
  ReminderStatus 
} from '@/types/commitmentReminder';

export interface CreateReminderData {
  commitmentId: string;
  timing: ReminderTiming;
  customDays?: number;
  recurrenceMode?: ReminderRecurrenceMode;
  channel: ReminderChannel;
  nextAlertDate: string;
}

export interface UpdateReminderData {
  timing?: ReminderTiming;
  customDays?: number;
  recurrenceMode?: ReminderRecurrenceMode;
  channel?: ReminderChannel;
  status?: ReminderStatus;
  nextAlertDate?: string;
}

interface DbReminder {
  id: string;
  user_id: string;
  commitment_id: string;
  timing: string;
  custom_days: number | null;
  recurrence_mode: string | null;
  channel: string;
  status: string;
  next_alert_date: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbToReminder(db: DbReminder): CommitmentReminder {
  return {
    id: db.id,
    commitmentId: db.commitment_id,
    commitmentTitle: '', // Will be filled by join or UI
    commitmentType: 'unique',
    timing: db.timing as ReminderTiming,
    customDays: db.custom_days ?? undefined,
    recurrenceMode: db.recurrence_mode as ReminderRecurrenceMode | undefined,
    channel: db.channel as ReminderChannel,
    status: db.status as ReminderStatus,
    nextAlertDate: db.next_alert_date || '',
    createdAt: db.created_at,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getReminders(): Promise<CommitmentReminder[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('commitment_reminders')
    .select('*')
    .eq('user_id', userId)
    .order('next_alert_date', { ascending: true });

  if (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }

  return (data || []).map(mapDbToReminder);
}

export async function getReminderByCommitmentId(commitmentId: string): Promise<CommitmentReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('commitment_reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('commitment_id', commitmentId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching reminder:', error);
    return null;
  }

  return data ? mapDbToReminder(data) : null;
}

export async function createReminder(reminderData: CreateReminderData): Promise<CommitmentReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('commitment_reminders')
    .insert({
      user_id: userId,
      commitment_id: reminderData.commitmentId,
      timing: reminderData.timing,
      custom_days: reminderData.customDays ?? null,
      recurrence_mode: reminderData.recurrenceMode ?? 'all_occurrences',
      channel: reminderData.channel,
      status: 'active',
      next_alert_date: reminderData.nextAlertDate,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reminder:', error);
    return null;
  }

  return mapDbToReminder(data);
}

export async function updateReminder(id: string, updates: UpdateReminderData): Promise<CommitmentReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const updateData: Record<string, unknown> = {};
  if (updates.timing !== undefined) updateData.timing = updates.timing;
  if (updates.customDays !== undefined) updateData.custom_days = updates.customDays;
  if (updates.recurrenceMode !== undefined) updateData.recurrence_mode = updates.recurrenceMode;
  if (updates.channel !== undefined) updateData.channel = updates.channel;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.nextAlertDate !== undefined) updateData.next_alert_date = updates.nextAlertDate;

  const { data, error } = await supabase
    .from('commitment_reminders')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating reminder:', error);
    return null;
  }

  return mapDbToReminder(data);
}

export async function deleteReminder(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('commitment_reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }

  return true;
}

export async function toggleReminderStatus(id: string): Promise<CommitmentReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // First get current status
  const { data: current, error: fetchError } = await supabase
    .from('commitment_reminders')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !current) {
    console.error('Error fetching reminder for toggle:', fetchError);
    return null;
  }

  const newStatus = current.status === 'active' ? 'paused' : 'active';
  return updateReminder(id, { status: newStatus as ReminderStatus });
}
