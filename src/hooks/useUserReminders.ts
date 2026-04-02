/**
 * Hook for managing user financial reminders
 */

import { useState, useCallback, useEffect } from 'react';
import { Reminder } from '@/types/userReminder';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  ReminderStats,
} from '@/services/userReminderStorage';

export function useUserReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (e) {
      console.error('Failed to load reminders:', e);
      setError('Erro ao carregar lembretes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const addReminder = useCallback(async (
    data: Omit<Reminder, 'id' | 'createdAt'>
  ): Promise<Reminder | null> => {
    try {
      const newReminder = await createReminder(data);
      if (newReminder) {
        setReminders(prev => [newReminder, ...prev]);
      }
      return newReminder;
    } catch (e) {
      console.error('Failed to create reminder:', e);
      setError('Erro ao criar lembrete');
      return null;
    }
  }, []);

  const editReminder = useCallback(async (
    id: string,
    data: Partial<Reminder>
  ): Promise<Reminder | null> => {
    try {
      const updated = await updateReminder(id, data);
      if (updated) {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      }
      return updated;
    } catch (e) {
      console.error('Failed to update reminder:', e);
      setError('Erro ao atualizar lembrete');
      return null;
    }
  }, []);

  const removeReminder = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await deleteReminder(id);
      if (success) {
        setReminders(prev => prev.filter(r => r.id !== id));
      }
      return success;
    } catch (e) {
      console.error('Failed to delete reminder:', e);
      setError('Erro ao excluir lembrete');
      return false;
    }
  }, []);

  const markComplete = useCallback(async (id: string): Promise<boolean> => {
    return !!(await editReminder(id, { status: 'completed' }));
  }, [editReminder]);

  const stats: ReminderStats = {
    active: reminders.filter(r => r.status === 'active').length,
    completed: reminders.filter(r => r.status === 'completed').length,
    overdue: reminders.filter(r => r.status === 'overdue').length,
    total: reminders.length,
  };

  return {
    reminders,
    isLoading,
    error,
    stats,
    loadReminders,
    addReminder,
    editReminder,
    removeReminder,
    markComplete,
  };
}
