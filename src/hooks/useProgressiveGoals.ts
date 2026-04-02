import { useState, useEffect, useCallback } from 'react';
import { ProgressiveGoal, GoalWeek, calculateWeekValue, calculateGrandTotal, calculateTotalUpToWeek } from '@/types/progressiveGoal';
import {
  createProgressiveGoal,
  getProgressiveGoals,
  getProgressiveGoalById,
  getGoalWeeks,
  markWeekAsPaid,
  deleteProgressiveGoal,
  regenerateGoalWeeks,
} from '@/services/progressiveGoalStorage';

export function useProgressiveGoals() {
  const [goals, setGoals] = useState<ProgressiveGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getProgressiveGoals();
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGoal = async (title: string, initialValue: number, totalWeeks: number = 52, startDate?: string) => {
    const goal = await createProgressiveGoal(title, initialValue, totalWeeks, startDate);
    if (goal) {
      await refresh();
    }
    return goal;
  };

  const deleteGoal = async (id: string) => {
    const success = await deleteProgressiveGoal(id);
    if (success) {
      await refresh();
    }
    return success;
  };

  return {
    goals,
    loading,
    createGoal,
    deleteGoal,
    refresh,
  };
}

export function useProgressiveGoal(id: string) {
  const [goal, setGoal] = useState<ProgressiveGoal | null>(null);
  const [weeks, setWeeks] = useState<GoalWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    
    const [goalData, weeksData] = await Promise.all([
      getProgressiveGoalById(id),
      getGoalWeeks(id),
    ]);
    
    setGoal(goalData);
    setWeeks(weeksData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-regenerar semanas se goal existe mas weeks está vazio
  const regenerateWeeks = useCallback(async () => {
    if (!id) return false;
    setRegenerating(true);
    const success = await regenerateGoalWeeks(id);
    if (success) {
      await refresh();
    }
    setRegenerating(false);
    return success;
  }, [id, refresh]);

  const markAsPaid = async (weekNumber: number) => {
    const success = await markWeekAsPaid(id, weekNumber);
    if (success) {
      await refresh();
    }
    return success;
  };

  // Detectar semanas faltantes
  const needsWeekRegeneration = !loading && goal !== null && weeks.length === 0;

  // Gerar semanas de fallback quando weeks está vazio mas goal existe
  const displayWeeks: GoalWeek[] = weeks.length > 0 
    ? weeks 
    : goal 
      ? Array.from({ length: goal.totalWeeks }, (_, i) => ({
          id: `fallback-${i + 1}`,
          goalId: goal.id,
          userId: goal.userId,
          weekNumber: i + 1,
          weekValue: calculateWeekValue(i + 1, goal.initialValue),
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        }))
      : [];

  // Computed values - com fallback para quando weeks está vazio
  const paidWeeks = weeks.filter(w => w.status === 'paid');
  const paidWeekNumbers = paidWeeks.map(w => w.weekNumber);
  const totalPaid = paidWeeks.reduce((sum, w) => sum + w.weekValue, 0);
  
  // Usar targetAmount do banco ou calcular se não tiver
  const grandTotal = goal?.targetAmount || (goal ? calculateGrandTotal(goal.totalWeeks, goal.initialValue) : 0);
  
  // Calcular valor da semana atual - com fallback
  const currentWeekData = weeks.find(w => w.weekNumber === goal?.currentWeek);
  const currentWeekValue = currentWeekData?.weekValue || (goal ? calculateWeekValue(goal.currentWeek, goal.initialValue) : 0);
  
  const remaining = grandTotal - totalPaid;
  const progressPercent = grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0;

  return {
    goal,
    weeks,
    displayWeeks,
    loading,
    regenerating,
    needsWeekRegeneration,
    regenerateWeeks,
    markAsPaid,
    refresh,
    // Computed
    paidWeeks,
    paidWeekNumbers,
    totalPaid,
    grandTotal,
    currentWeekValue,
    remaining,
    progressPercent,
  };
}
