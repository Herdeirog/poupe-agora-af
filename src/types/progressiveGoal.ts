// Constantes de limites para metas progressivas
export const PROGRESSIVE_GOAL_LIMITS = {
  MIN_WEEKS: 1,
  MAX_WEEKS: 52,
  MIN_INITIAL_VALUE: 1,
  DEFAULT_WEEKS: 26,
} as const;

export type ProgressiveGoalStatus = 'active' | 'completed' | 'paused';
export type WeekStatus = 'pending' | 'paid';

export interface ProgressiveGoal {
  id: string;
  userId: string;
  title: string;
  initialValue: number;
  totalWeeks: number;
  currentWeek: number;
  startDate: string;
  status: ProgressiveGoalStatus;
  createdAt: string;
  // Calculated fields
  targetAmount: number;
  currentAmount: number;
}

export interface GoalWeek {
  id: string;
  goalId: string;
  userId: string;
  weekNumber: number;
  weekValue: number;
  status: WeekStatus;
  paidAt?: string;
  createdAt: string;
}

export type ReminderStatus = 'active' | 'paused';

export interface GoalReminder {
  id: string;
  goalId: string;
  userId: string;
  channel: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  timeOfDay: string;
  status: ReminderStatus;
  nextAlertDate?: string;
  lastSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper functions for progressive goal calculations
export const calculateWeekValue = (weekNumber: number, initialValue: number): number => {
  return weekNumber * initialValue;
};

export const calculateTotalUpToWeek = (weekNumber: number, initialValue: number): number => {
  return (weekNumber * (weekNumber + 1) / 2) * initialValue;
};

export const calculateGrandTotal = (totalWeeks: number, initialValue: number): number => {
  return calculateTotalUpToWeek(totalWeeks, initialValue);
};
