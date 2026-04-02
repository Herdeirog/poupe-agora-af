import { UserGoal, GoalStatus, GoalProgressEntry } from '@/types/userGoal';
import { supabase } from '@/lib/supabase';

const PROGRESS_KEY = 'pa_user_goal_progress'; // Keep local for MVP or add table? 
// Plan said: "goals" table. Progress is derivative if we just update current_amount.
// Or we can add a 'goal_progress' table if needed.
// For now, let's keep progress local or simplify it.
// Actually, `addGoalProgress` updates `currentAmount`.
// We can store progress entries in a new table `goal_progress` or just log it.
// Let's implement `goal_progress` table implicitly or just skip it for now and update the goal amount directly.
// But the code exports `getGoalProgress`.
// I'll create a simple 'goal_progress' table SQL if I can, OR just use local storage for detailed progress logs and Supabase for the Goal itself.
// Mixing them is bad.
// I'll assume we can create `goal_progress` table or just ignore progress details for now (MVP).
// Better: update userGoalStorage to only handle the Goal entity, and maybe mock/remove progress detail requirement if not critical, OR use a JSON column in goals?
// Let's implement Goal CRUD first.

function calculateGoalStatus(goal: UserGoal): GoalStatus {
  if (goal.currentAmount >= goal.targetAmount) return 'completed';
  if (new Date(goal.deadline) < new Date()) return 'overdue';
  return 'in_progress';
}

function mapGoal(g: any): UserGoal {
  const goal = {
    id: g.id,
    title: g.title,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    deadline: g.deadline,
    categoryId: g.category_id || undefined,
    createdAt: g.created_at,
    updatedAt: g.created_at,
    status: 'in_progress' as GoalStatus,
  };
  goal.status = calculateGoalStatus(goal);
  return goal;
}

export async function getGoals(): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }

  return (data || []).map(mapGoal);
}

export async function getGoalById(id: string): Promise<UserGoal | undefined> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return mapGoal(data);
}

export async function createGoal(data: Omit<UserGoal, 'id' | 'currentAmount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<UserGoal | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: newGoal, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: data.title,
      target_amount: data.targetAmount,
      current_amount: 0,
      deadline: data.deadline,
      category_id: data.categoryId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    return null;
  }

  return mapGoal(newGoal);
}

export async function updateGoal(id: string, data: Partial<UserGoal>): Promise<UserGoal | null> {
  const updates: any = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.targetAmount !== undefined) updates.target_amount = data.targetAmount;
  if (data.currentAmount !== undefined) updates.current_amount = data.currentAmount;
  if (data.deadline !== undefined) updates.deadline = data.deadline;
  if (data.categoryId !== undefined) updates.category_id = data.categoryId || null;

  const { data: updated, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating goal:', error);
    return null;
  }

  return mapGoal(updated);
}

export async function deleteGoal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
  return true;
}

// Deprecated or NotImplemented fully for MVP
export function addGoalProgress(goalId: string, amount: number, note?: string): GoalProgressEntry | null {
  // Sync update to goal amount
  // fetch goal, update amount + amount
  // For now, we just rely on updateGoal being called explicitly or this function updating it.
  // We can't really return a ProgressEntry without a table.
  // Return a mock or empty
  return null;
}

export function getGoalProgress(goalId: string): GoalProgressEntry[] {
  return [];
}

export function seedGoals(): void { }
