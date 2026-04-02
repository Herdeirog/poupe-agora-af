import { useState, useEffect, useCallback } from 'react';
import { UserGoal, GoalProgressEntry } from '@/types/userGoal';
import * as storage from '@/services/userGoalStorage';

export function useUserGoals() {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    // storage.seedGoals(); // Deprecated
    const data = await storage.getGoals();
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(async (data: Omit<UserGoal, 'id' | 'currentAmount' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const newGoal = await storage.createGoal(data);
    loadGoals();
    return newGoal;
  }, [loadGoals]);

  const updateGoal = useCallback(async (id: string, data: Partial<UserGoal>) => {
    const updated = await storage.updateGoal(id, data);
    loadGoals();
    return updated;
  }, [loadGoals]);

  const deleteGoal = useCallback(async (id: string) => {
    const success = await storage.deleteGoal(id);
    if (success) loadGoals();
    return success;
  }, [loadGoals]);

  const addProgress = useCallback(async (goalId: string, amount: number, note?: string) => {
    // Determine implementation of progress
    const entry = storage.addGoalProgress(goalId, amount, note);
    // If addGoalProgress becomes async later, await it. Currently it returns null.
    // Ideally we should update the goal amount directly via updateGoal logic if specific endpoint misses.
    loadGoals();
    return entry;
  }, [loadGoals]);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addProgress,
    refresh: loadGoals,
  };
}

export function useGoal(id: string) {
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [progress, setProgress] = useState<GoalProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // storage.getGoalById returns UserGoal | undefined (Promise)
    const goalData = await storage.getGoalById(id);
    // storage.getGoalProgress returns GoalProgressEntry[] (Sync? No, likely should be async or is mock)
    // Checking userGoalStorage.ts: getGoalProgress IS synchronous currently (returns []).
    const progressData = storage.getGoalProgress(id);

    setGoal(goalData || null);
    setProgress(progressData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { goal, progress, loading, refresh: load };
}
