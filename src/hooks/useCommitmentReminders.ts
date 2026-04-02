/**
 * Hook for managing commitment reminders
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  CommitmentReminder, 
  ReminderTiming, 
  ReminderRecurrenceMode, 
  ReminderChannel 
} from '@/types/commitmentReminder';
import * as storage from '@/services/commitmentReminderStorage';

interface CreateReminderParams {
  commitmentId: string;
  timing: ReminderTiming;
  customDays?: number;
  recurrenceMode?: ReminderRecurrenceMode;
  channel: ReminderChannel;
  nextAlertDate: string;
}

export function useCommitmentReminders() {
  const [reminders, setReminders] = useState<CommitmentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storage.getReminders();
      setReminders(data);
    } catch (e) {
      setError('Erro ao carregar lembretes');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const getReminderForCommitment = useCallback(async (commitmentId: string) => {
    return storage.getReminderByCommitmentId(commitmentId);
  }, []);

  const createReminder = useCallback(async (params: CreateReminderParams) => {
    const result = await storage.createReminder(params);
    if (result) {
      await loadReminders();
    }
    return result;
  }, [loadReminders]);

  const updateReminder = useCallback(async (
    id: string, 
    updates: storage.UpdateReminderData
  ) => {
    const result = await storage.updateReminder(id, updates);
    if (result) {
      await loadReminders();
    }
    return result;
  }, [loadReminders]);

  const deleteReminder = useCallback(async (id: string) => {
    const result = await storage.deleteReminder(id);
    if (result) {
      await loadReminders();
    }
    return result;
  }, [loadReminders]);

  const toggleStatus = useCallback(async (id: string) => {
    const result = await storage.toggleReminderStatus(id);
    if (result) {
      await loadReminders();
    }
    return result;
  }, [loadReminders]);

  // Check if a commitment has an active reminder
  const hasReminderForCommitment = useCallback((commitmentId: string) => {
    return reminders.some(r => r.commitmentId === commitmentId);
  }, [reminders]);

  // Get reminder for specific commitment
  const getReminderByCommitmentId = useCallback((commitmentId: string) => {
    return reminders.find(r => r.commitmentId === commitmentId);
  }, [reminders]);

  // Stats
  const stats = {
    total: reminders.length,
    active: reminders.filter(r => r.status === 'active').length,
    paused: reminders.filter(r => r.status === 'paused').length,
  };

  return {
    reminders,
    loading,
    error,
    stats,
    loadReminders,
    getReminderForCommitment,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleStatus,
    hasReminderForCommitment,
    getReminderByCommitmentId,
  };
}
