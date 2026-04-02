import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, format, subMonths, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { FinancialCommitment, CommitmentType, CommitmentStatus, CommitmentOrigin, RecurrenceFrequency } from '@/types/financialCommitment';

export interface MonthlySummaryStats {
  totalCommitments: number;
  totalValue: number;
  recurringCount: number;
  installmentCount: number;
  uniqueCount: number;
}

export interface DistributionItem {
  type: 'unique' | 'recurring' | 'installment';
  value: number;
  amount: number;
}

export type DueStatus = 'upcoming' | 'soon' | 'overdue';

export interface DueItem {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: CommitmentType;
  typeLabel: string;
  status: DueStatus;
  categoryId?: string;
}

export interface AlertData {
  overdueCount: number;
  dueSoonCount: number;
  activeInstallmentsCount: number;
}

export interface MonthComparison {
  currentTotal: number;
  previousTotal: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategorySummary {
  id: string;
  name: string;
  color: string;
  icon: string;
  count: number;
  amount: number;
}

interface DbCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

const COMMITMENTS_STORAGE_KEY = 'financial_commitments';

function getStoredCommitments(userId: string): FinancialCommitment[] {
  try {
    const stored = localStorage.getItem(`${COMMITMENTS_STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useMonthlySummary(selectedMonth: Date, categoryFilter: string | null = null) {
  const [commitments, setCommitments] = useState<(FinancialCommitment & { categoryId?: string })[]>([]);
  const [previousMonthCommitments, setPreviousMonthCommitments] = useState<(FinancialCommitment & { categoryId?: string })[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const prevMonthStart = startOfMonth(subMonths(selectedMonth, 1));
  const prevMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch categories from Supabase
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, color, icon');
      
      if (catData) {
        setCategories(catData);
      }

      // Use localStorage for commitments since the table doesn't exist yet
      const allCommitments = getStoredCommitments(user.id);
      
      // Filter for current month
      const currentMonthData = allCommitments.filter(c => {
        const date = c.date;
        return date >= format(monthStart, 'yyyy-MM-dd') && date <= format(monthEnd, 'yyyy-MM-dd');
      });
      setCommitments(currentMonthData);

      // Filter for previous month
      const prevMonthData = allCommitments.filter(c => {
        const date = c.date;
        return date >= format(prevMonthStart, 'yyyy-MM-dd') && date <= format(prevMonthEnd, 'yyyy-MM-dd');
      });
      setPreviousMonthCommitments(prevMonthData);

    } catch (e) {
      console.error('Error loading monthly summary:', e);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter by category if set
  const filteredCommitments = useMemo(() => {
    if (!categoryFilter) return commitments;
    return commitments.filter(c => c.categoryId === categoryFilter);
  }, [commitments, categoryFilter]);

  const filteredPreviousCommitments = useMemo(() => {
    if (!categoryFilter) return previousMonthCommitments;
    return previousMonthCommitments.filter(c => c.categoryId === categoryFilter);
  }, [previousMonthCommitments, categoryFilter]);

  // Stats
  const stats: MonthlySummaryStats = useMemo(() => {
    const recurring = filteredCommitments.filter(c => c.type === 'recurring');
    const installment = filteredCommitments.filter(c => c.type === 'installment');
    const unique = filteredCommitments.filter(c => c.type === 'unique');

    return {
      totalCommitments: filteredCommitments.length,
      totalValue: filteredCommitments.reduce((sum, c) => sum + (c.amount || 0), 0),
      recurringCount: recurring.length,
      installmentCount: installment.length,
      uniqueCount: unique.length,
    };
  }, [filteredCommitments]);

  // Distribution
  const distribution: DistributionItem[] = useMemo(() => {
    const unique = filteredCommitments.filter(c => c.type === 'unique');
    const recurring = filteredCommitments.filter(c => c.type === 'recurring');
    const installment = filteredCommitments.filter(c => c.type === 'installment');

    return [
      { type: 'unique', value: unique.length, amount: unique.reduce((s, c) => s + (c.amount || 0), 0) },
      { type: 'recurring', value: recurring.length, amount: recurring.reduce((s, c) => s + (c.amount || 0), 0) },
      { type: 'installment', value: installment.length, amount: installment.reduce((s, c) => s + (c.amount || 0), 0) },
    ];
  }, [filteredCommitments]);

  // Upcoming dues
  const upcomingDues: DueItem[] = useMemo(() => {
    const today = new Date();
    const soonThreshold = addDays(today, 5);

    return filteredCommitments
      .filter(c => c.status !== 'completed')
      .map(c => {
        const dueDate = parseISO(c.date);
        let status: DueStatus = 'upcoming';
        
        if (isBefore(dueDate, today)) {
          status = 'overdue';
        } else if (isBefore(dueDate, soonThreshold)) {
          status = 'soon';
        }

        let typeLabel = 'Único';
        if (c.type === 'recurring') {
          typeLabel = 'Recorrente';
        } else if (c.type === 'installment') {
          typeLabel = `Parcela ${c.currentInstallment || 1}/${c.totalInstallments || 1}`;
        }

        return {
          id: c.id,
          title: c.title,
          date: c.date,
          amount: c.amount || 0,
          type: c.type,
          typeLabel,
          status,
          categoryId: c.categoryId,
        };
      })
      .sort((a, b) => {
        // Sort: overdue first, then soon, then upcoming; within each, by date
        const statusOrder = { overdue: 0, soon: 1, upcoming: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.date.localeCompare(b.date);
      })
      .slice(0, 10);
  }, [filteredCommitments]);

  // Alerts
  const alerts: AlertData = useMemo(() => {
    const today = new Date();
    const soonThreshold = addDays(today, 5);

    const overdue = filteredCommitments.filter(c => {
      if (c.status === 'completed') return false;
      return isBefore(parseISO(c.date), today);
    });

    const dueSoon = filteredCommitments.filter(c => {
      if (c.status === 'completed') return false;
      const dueDate = parseISO(c.date);
      return isAfter(dueDate, today) && isBefore(dueDate, soonThreshold);
    });

    const activeInstallments = filteredCommitments.filter(c => 
      c.type === 'installment' && c.status !== 'completed'
    );

    return {
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      activeInstallmentsCount: activeInstallments.length,
    };
  }, [filteredCommitments]);

  // Month comparison
  const comparison: MonthComparison = useMemo(() => {
    const currentTotal = filteredCommitments.reduce((sum, c) => sum + (c.amount || 0), 0);
    const previousTotal = filteredPreviousCommitments.reduce((sum, c) => sum + (c.amount || 0), 0);

    let percentageChange = 0;
    if (previousTotal > 0) {
      percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    } else if (currentTotal > 0) {
      percentageChange = 100;
    }

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 1) trend = 'up';
    else if (percentageChange < -1) trend = 'down';

    return {
      currentTotal,
      previousTotal,
      percentageChange: Math.round(percentageChange * 10) / 10,
      trend,
    };
  }, [filteredCommitments, filteredPreviousCommitments]);

  // Category summary
  const categorySummary: CategorySummary[] = useMemo(() => {
    const categoryMap = new Map<string, { count: number; amount: number }>();
    
    commitments.forEach(c => {
      if (c.categoryId) {
        const existing = categoryMap.get(c.categoryId) || { count: 0, amount: 0 };
        categoryMap.set(c.categoryId, {
          count: existing.count + 1,
          amount: existing.amount + (c.amount || 0),
        });
      }
    });

    return categories
      .filter(cat => categoryMap.has(cat.id))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || '#6b7280',
        icon: cat.icon || 'tag',
        ...categoryMap.get(cat.id)!,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [commitments, categories]);

  return {
    loading,
    stats,
    distribution,
    upcomingDues,
    alerts,
    comparison,
    categories,
    categorySummary,
    refresh: loadData,
  };
}
