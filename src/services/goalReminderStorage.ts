import { supabase } from '@/integrations/supabase/client';
import { GoalReminder } from '@/types/progressiveGoal';

const STORAGE_KEY = 'goal_reminders';

interface StoredReminder extends GoalReminder {
  id: string;
}

function getStoredReminders(): StoredReminder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveReminders(reminders: StoredReminder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

const calculateNextAlertDate = (dayOfWeek: number): string => {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilNext = dayOfWeek - currentDay;
  
  if (daysUntilNext <= 0) {
    daysUntilNext += 7;
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilNext);
  return nextDate.toISOString().split('T')[0];
};

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createGoalReminder(
  goalId: string,
  dayOfWeek: number = 1,
  timeOfDay: string = '09:00'
): Promise<GoalReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const nextAlertDate = calculateNextAlertDate(dayOfWeek);

  const newReminder: StoredReminder = {
    id: crypto.randomUUID(),
    goalId,
    userId,
    channel: 'whatsapp',
    dayOfWeek,
    timeOfDay,
    status: 'active',
    nextAlertDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reminders = getStoredReminders();
  reminders.push(newReminder);
  saveReminders(reminders);

  return newReminder;
}

export async function getGoalReminder(goalId: string): Promise<GoalReminder | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const reminders = getStoredReminders();
  return reminders.find(r => r.goalId === goalId && r.userId === userId) || null;
}

export async function updateGoalReminder(
  id: string,
  updates: Partial<{ dayOfWeek: number; timeOfDay: string; status: string }>
): Promise<GoalReminder | null> {
  const reminders = getStoredReminders();
  const idx = reminders.findIndex(r => r.id === id);
  
  if (idx < 0) return null;

  if (updates.dayOfWeek !== undefined) {
    reminders[idx].dayOfWeek = updates.dayOfWeek;
    reminders[idx].nextAlertDate = calculateNextAlertDate(updates.dayOfWeek);
  }
  if (updates.timeOfDay !== undefined) {
    reminders[idx].timeOfDay = updates.timeOfDay;
  }
  if (updates.status !== undefined) {
    reminders[idx].status = updates.status as 'active' | 'paused';
  }
  reminders[idx].updatedAt = new Date().toISOString();

  saveReminders(reminders);
  return reminders[idx];
}

export async function deleteGoalReminder(id: string): Promise<boolean> {
  const reminders = getStoredReminders();
  const filtered = reminders.filter(r => r.id !== id);
  saveReminders(filtered);
  return true;
}

export async function toggleReminderStatus(id: string, currentStatus: string): Promise<GoalReminder | null> {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  return updateGoalReminder(id, { status: newStatus });
}
