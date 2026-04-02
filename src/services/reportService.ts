import { UserTransaction } from '@/types/userTransaction';
import { UserCategory } from '@/types/userCategory';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
}

export interface CategoryReport {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'up' | 'down' | 'stable';
  previousTotal: number;
}

export interface YearlyComparison {
  category: string;
  currentYear: number;
  previousYear: number;
  change: number;
  changePercent: number;
}

export interface FullReport {
  period: { start: string; end: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    avgMonthlySavings: number;
    bestMonth: string;
    worstMonth: string;
  };
  monthlyData: MonthlyReport[];
  categoryBreakdown: CategoryReport[];
  trends: {
    incomeGrowth: number;
    expenseGrowth: number;
    savingsGrowth: number;
  };
  insights: string[];
}

export function generateMonthlyReports(transactions: UserTransaction[], months: number = 12): MonthlyReport[] {
  const now = new Date();
  const reports: MonthlyReport[] = [];

  for (let i = 0; i < months; i++) {
    const targetDate = subMonths(now, i);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    reports.push({
      month: format(targetDate, 'MMMM', { locale: ptBR }),
      year: targetDate.getFullYear(),
      income,
      expense,
      balance,
      savingsRate,
      transactionCount: monthTransactions.length,
    });
  }

  return reports.reverse();
}

export function generateCategoryReport(
  transactions: UserTransaction[],
  categories: UserCategory[],
  months: number = 1
): CategoryReport[] {
  const now = new Date();
  const periodStart = startOfMonth(subMonths(now, months - 1));
  const periodEnd = endOfMonth(now);
  const previousPeriodStart = startOfMonth(subMonths(periodStart, months));
  const previousPeriodEnd = endOfMonth(subMonths(periodEnd, months));

  const currentTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= periodStart && d <= periodEnd;
  });

  const previousTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d >= previousPeriodStart && d <= previousPeriodEnd;
  });

  const totalCurrent = currentTransactions.reduce((s, t) => s + t.amount, 0);

  const categoryMap = new Map<string, { current: number; previous: number; count: number }>();

  currentTransactions.forEach(t => {
    const existing = categoryMap.get(t.categoryId) || { current: 0, previous: 0, count: 0 };
    existing.current += t.amount;
    existing.count++;
    categoryMap.set(t.categoryId, existing);
  });

  previousTransactions.forEach(t => {
    const existing = categoryMap.get(t.categoryId) || { current: 0, previous: 0, count: 0 };
    existing.previous += t.amount;
    categoryMap.set(t.categoryId, existing);
  });

  const reports: CategoryReport[] = [];

  categoryMap.forEach((data, categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const change = data.current - data.previous;
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (data.previous > 0) {
      const changePercent = (change / data.previous) * 100;
      if (changePercent > 10) trend = 'up';
      else if (changePercent < -10) trend = 'down';
    }

    reports.push({
      categoryId,
      categoryName: category?.name || 'Sem categoria',
      total: data.current,
      percentage: totalCurrent > 0 ? (data.current / totalCurrent) * 100 : 0,
      transactionCount: data.count,
      averageTransaction: data.count > 0 ? data.current / data.count : 0,
      trend,
      previousTotal: data.previous,
    });
  });

  return reports.sort((a, b) => b.total - a.total);
}

export function generateFullReport(
  transactions: UserTransaction[],
  categories: UserCategory[],
  months: number = 12
): FullReport {
  const monthlyData = generateMonthlyReports(transactions, months);
  const categoryBreakdown = generateCategoryReport(transactions, categories, months);

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
  const netBalance = totalIncome - totalExpense;
  const avgMonthlySavings = monthlyData.length > 0 ? netBalance / monthlyData.length : 0;

  const bestMonth = monthlyData.reduce((best, m) => m.balance > best.balance ? m : best, monthlyData[0]);
  const worstMonth = monthlyData.reduce((worst, m) => m.balance < worst.balance ? m : worst, monthlyData[0]);

  // Calculate trends
  const halfPoint = Math.floor(monthlyData.length / 2);
  const firstHalf = monthlyData.slice(0, halfPoint);
  const secondHalf = monthlyData.slice(halfPoint);

  const firstHalfIncome = firstHalf.reduce((s, m) => s + m.income, 0) / (firstHalf.length || 1);
  const secondHalfIncome = secondHalf.reduce((s, m) => s + m.income, 0) / (secondHalf.length || 1);
  const incomeGrowth = firstHalfIncome > 0 ? ((secondHalfIncome - firstHalfIncome) / firstHalfIncome) * 100 : 0;

  const firstHalfExpense = firstHalf.reduce((s, m) => s + m.expense, 0) / (firstHalf.length || 1);
  const secondHalfExpense = secondHalf.reduce((s, m) => s + m.expense, 0) / (secondHalf.length || 1);
  const expenseGrowth = firstHalfExpense > 0 ? ((secondHalfExpense - firstHalfExpense) / firstHalfExpense) * 100 : 0;

  const savingsGrowth = incomeGrowth - expenseGrowth;

  // Generate insights
  const insights: string[] = [];
  
  if (netBalance > 0) {
    insights.push(`Você economizou ${netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no período analisado.`);
  } else {
    insights.push(`Você gastou ${Math.abs(netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a mais do que ganhou.`);
  }

  if (incomeGrowth > 5) {
    insights.push(`Sua renda cresceu ${incomeGrowth.toFixed(0)}% na segunda metade do período.`);
  }

  if (expenseGrowth > 10) {
    insights.push(`Atenção: seus gastos aumentaram ${expenseGrowth.toFixed(0)}%.`);
  } else if (expenseGrowth < -10) {
    insights.push(`Parabéns! Você reduziu seus gastos em ${Math.abs(expenseGrowth).toFixed(0)}%.`);
  }

  if (categoryBreakdown.length > 0) {
    const topCategory = categoryBreakdown[0];
    insights.push(`${topCategory.categoryName} é sua maior categoria de gastos (${topCategory.percentage.toFixed(0)}%).`);
  }

  return {
    period: {
      start: format(subMonths(new Date(), months - 1), 'MMMM yyyy', { locale: ptBR }),
      end: format(new Date(), 'MMMM yyyy', { locale: ptBR }),
    },
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
      avgMonthlySavings,
      bestMonth: bestMonth ? `${bestMonth.month} ${bestMonth.year}` : '-',
      worstMonth: worstMonth ? `${worstMonth.month} ${worstMonth.year}` : '-',
    },
    monthlyData,
    categoryBreakdown,
    trends: { incomeGrowth, expenseGrowth, savingsGrowth },
    insights,
  };
}
