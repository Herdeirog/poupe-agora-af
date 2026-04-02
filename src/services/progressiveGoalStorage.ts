import { supabase } from '@/integrations/supabase/client';
import { ProgressiveGoal, GoalWeek, calculateWeekValue, calculateGrandTotal, PROGRESSIVE_GOAL_LIMITS } from '@/types/progressiveGoal';

const GOALS_STORAGE_KEY = 'progressive_goals';
const WEEKS_STORAGE_KEY = 'goal_weeks';

interface StoredGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  initial_value: number;
  total_weeks: number;
  current_week: number;
  start_date: string;
  status: string;
  created_at: string;
}

interface StoredWeek {
  id: string;
  goal_id: string;
  user_id: string;
  week_number: number;
  week_value: number;
  status: string;
  paid_at?: string;
  created_at: string;
}

function getStoredGoals(): StoredGoal[] {
  try {
    const stored = localStorage.getItem(GOALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: StoredGoal[]): void {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
}

function getStoredWeeks(): StoredWeek[] {
  try {
    const stored = localStorage.getItem(WEEKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWeeks(weeks: StoredWeek[]): void {
  localStorage.setItem(WEEKS_STORAGE_KEY, JSON.stringify(weeks));
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createProgressiveGoal(
  title: string,
  initialValue: number,
  totalWeeks: number = PROGRESSIVE_GOAL_LIMITS.DEFAULT_WEEKS,
  startDate?: string
): Promise<ProgressiveGoal | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Validar e ajustar range de semanas (10-100)
  const validatedWeeks = Math.min(
    PROGRESSIVE_GOAL_LIMITS.MAX_WEEKS,
    Math.max(PROGRESSIVE_GOAL_LIMITS.MIN_WEEKS, totalWeeks)
  );

  // Validar valor inicial mínimo
  const validatedInitialValue = Math.max(PROGRESSIVE_GOAL_LIMITS.MIN_INITIAL_VALUE, initialValue);

  const targetAmount = calculateGrandTotal(validatedWeeks, validatedInitialValue);
  const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];

  const goalId = crypto.randomUUID();

  const newGoal: StoredGoal = {
    id: goalId,
    user_id: userId,
    title,
    target_amount: targetAmount,
    current_amount: 0,
    initial_value: validatedInitialValue,
    total_weeks: validatedWeeks,
    current_week: 1,
    start_date: effectiveStartDate,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  const goals = getStoredGoals();
  goals.push(newGoal);
  saveGoals(goals);

  // Generate week records
  const weeks = getStoredWeeks();
  for (let i = 0; i < validatedWeeks; i++) {
    weeks.push({
      id: crypto.randomUUID(),
      goal_id: goalId,
      user_id: userId,
      week_number: i + 1,
      week_value: calculateWeekValue(i + 1, validatedInitialValue),
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }
  saveWeeks(weeks);

  return mapGoalFromDb(newGoal);
}

export async function getProgressiveGoals(): Promise<ProgressiveGoal[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const goals = getStoredGoals();
  return goals
    .filter(g => g.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(mapGoalFromDb);
}

export async function getProgressiveGoalById(id: string): Promise<ProgressiveGoal | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const goals = getStoredGoals();
  const goal = goals.find(g => g.id === id && g.user_id === userId);
  return goal ? mapGoalFromDb(goal) : null;
}

export async function getGoalWeeks(goalId: string): Promise<GoalWeek[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const weeks = getStoredWeeks();
  return weeks
    .filter(w => w.goal_id === goalId && w.user_id === userId)
    .sort((a, b) => a.week_number - b.week_number)
    .map(mapWeekFromDb);
}

export async function markWeekAsPaid(goalId: string, weekNumber: number): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const weeks = getStoredWeeks();
  const weekIdx = weeks.findIndex(w => w.goal_id === goalId && w.week_number === weekNumber && w.user_id === userId);
  
  if (weekIdx < 0) return false;

  weeks[weekIdx].status = 'paid';
  weeks[weekIdx].paid_at = new Date().toISOString();
  saveWeeks(weeks);

  // Calculate totals
  const paidWeeks = weeks.filter(w => w.goal_id === goalId && w.status === 'paid');
  const totalPaid = paidWeeks.reduce((sum, w) => sum + w.week_value, 0);
  const paidCount = paidWeeks.length;

  // Update goal
  const goals = getStoredGoals();
  const goalIdx = goals.findIndex(g => g.id === goalId && g.user_id === userId);
  
  if (goalIdx >= 0) {
    goals[goalIdx].current_amount = totalPaid;
    goals[goalIdx].current_week = paidCount + 1;
    if (paidCount >= goals[goalIdx].total_weeks) {
      goals[goalIdx].status = 'completed';
    }
    saveGoals(goals);
  }

  return true;
}

export async function deleteProgressiveGoal(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const goals = getStoredGoals();
  const filtered = goals.filter(g => !(g.id === id && g.user_id === userId));
  saveGoals(filtered);

  // Also delete weeks
  const weeks = getStoredWeeks();
  const filteredWeeks = weeks.filter(w => w.goal_id !== id);
  saveWeeks(filteredWeeks);

  return true;
}

// Regenerar semanas faltantes para uma meta existente
export async function regenerateGoalWeeks(goalId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const goals = getStoredGoals();
  const goal = goals.find(g => g.id === goalId && g.user_id === userId);
  if (!goal) return false;

  const totalWeeks = goal.total_weeks || 52;
  const initialValue = goal.initial_value || 1;

  // Delete existing weeks
  let weeks = getStoredWeeks();
  weeks = weeks.filter(w => w.goal_id !== goalId);

  // Create new weeks
  for (let i = 0; i < totalWeeks; i++) {
    weeks.push({
      id: crypto.randomUUID(),
      goal_id: goalId,
      user_id: userId,
      week_number: i + 1,
      week_value: calculateWeekValue(i + 1, initialValue),
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }
  saveWeeks(weeks);

  return true;
}

// Mapper functions
function mapGoalFromDb(data: StoredGoal): ProgressiveGoal {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    initialValue: data.initial_value || 0,
    totalWeeks: data.total_weeks || 52,
    currentWeek: data.current_week || 1,
    startDate: data.start_date || data.created_at,
    status: (data.status || 'active') as 'active' | 'completed' | 'paused',
    createdAt: data.created_at,
    targetAmount: data.target_amount || 0,
    currentAmount: data.current_amount || 0,
  };
}

function mapWeekFromDb(data: StoredWeek): GoalWeek {
  return {
    id: data.id,
    goalId: data.goal_id,
    userId: data.user_id,
    weekNumber: data.week_number,
    weekValue: data.week_value,
    status: data.status === 'paid' ? 'paid' : 'pending',
    paidAt: data.paid_at,
    createdAt: data.created_at,
  };
}
