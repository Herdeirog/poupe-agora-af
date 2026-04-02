import { useState, useEffect, useCallback } from 'react';
import { GoalReminder } from '@/types/progressiveGoal';
import {
  createGoalReminder,
  getGoalReminder,
  updateGoalReminder,
  deleteGoalReminder,
  toggleReminderStatus,
} from '@/services/goalReminderStorage';

export function useGoalReminder(goalId: string) {
  const [reminder, setReminder] = useState<GoalReminder | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    const data = await getGoalReminder(goalId);
    setReminder(data);
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createReminder = async (dayOfWeek: number = 1, timeOfDay: string = '09:00') => {
    const newReminder = await createGoalReminder(goalId, dayOfWeek, timeOfDay);
    if (newReminder) {
      setReminder(newReminder);
    }
    return newReminder;
  };

  const updateReminder = async (updates: Partial<{ dayOfWeek: number; timeOfDay: string; status: string }>) => {
    if (!reminder) return null;
    const updated = await updateGoalReminder(reminder.id, updates);
    if (updated) {
      setReminder(updated);
    }
    return updated;
  };

  const removeReminder = async () => {
    if (!reminder) return false;
    const success = await deleteGoalReminder(reminder.id);
    if (success) {
      setReminder(null);
    }
    return success;
  };

  const toggleStatus = async () => {
    if (!reminder) return null;
    const updated = await toggleReminderStatus(reminder.id, reminder.status);
    if (updated) {
      setReminder(updated);
    }
    return updated;
  };

  return {
    reminder,
    loading,
    createReminder,
    updateReminder,
    removeReminder,
    toggleStatus,
    refresh,
  };
}
