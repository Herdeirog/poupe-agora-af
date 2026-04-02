import { SpendingForecast, CategoryForecast, ForecastInsight } from '@/types/spendingForecast';
import { UserTransaction } from '@/types/userTransaction';
import { UserBudget } from '@/types/userBudget';
import { RecurringTransaction } from '@/types/recurringTransaction';
import { UserCategory } from '@/types/userCategory';

export function calculateSpendingForecast(
  transactions: UserTransaction[],
  budget: UserBudget | null,
  recurringTransactions: RecurringTransaction[],
  categories: UserCategory[]
): SpendingForecast {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;
  
  // Get current month expenses
  const currentMonthExpenses = transactions.filter(t => {
    const date = new Date(t.date);
    return t.type === 'expense' && 
           date.getMonth() === currentMonth && 
           date.getFullYear() === currentYear;
  });

  const currentSpent = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  // Get historical data (last 3 months)
  const historicalData = getHistoricalSpending(transactions, 3);
  
  // Calculate average daily spending from history
  const avgDailySpending = historicalData.avgDaily;
  
  // Get pending recurring expenses
  const pendingRecurring = getPendingRecurringExpenses(recurringTransactions, daysRemaining);
  
  // Calculate forecast
  const projectedFromPattern = avgDailySpending * daysRemaining;
  const totalForecast = currentSpent + projectedFromPattern + pendingRecurring;
  
  // Budget comparison
  const budgetLimit = budget?.monthlyLimit || totalForecast * 1.2;
  const percentOfBudget = (totalForecast / budgetLimit) * 100;
  
  // Determine status
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentOfBudget >= 100) status = 'danger';
  else if (percentOfBudget >= 85) status = 'warning';
  
  // Daily recommendation
  const remainingBudget = Math.max(0, budgetLimit - currentSpent - pendingRecurring);
  const dailyRecommended = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
  
  // Category forecasts
  const categoryForecasts = calculateCategoryForecasts(
    currentMonthExpenses, 
    historicalData.byCategory, 
    categories, 
    daysRemaining
  );
  
  // Trend analysis
  const trend = analyzeTrend(historicalData.monthlyTotals);
  
  // Confidence based on data availability
  const confidence = calculateConfidence(historicalData.totalTransactions);

  return {
    totalForecast,
    budgetLimit,
    percentOfBudget,
    status,
    dailyRecommended,
    daysRemaining,
    categoryForecasts,
    trend,
    confidence,
    lastUpdated: now.toISOString(),
  };
}

function getHistoricalSpending(transactions: UserTransaction[], months: number) {
  const now = new Date();
  const results: { avgDaily: number; byCategory: Map<string, number[]>; monthlyTotals: number[]; totalTransactions: number } = {
    avgDaily: 0,
    byCategory: new Map(),
    monthlyTotals: [],
    totalTransactions: 0,
  };
  
  let totalDays = 0;
  let totalSpent = 0;
  
  for (let i = 1; i <= months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    const monthExpenses = transactions.filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && 
             date.getMonth() === targetMonth && 
             date.getFullYear() === targetYear;
    });
    
    const monthTotal = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
    results.monthlyTotals.push(monthTotal);
    results.totalTransactions += monthExpenses.length;
    
    totalSpent += monthTotal;
    totalDays += daysInTargetMonth;
    
    // Track by category
    monthExpenses.forEach(t => {
      const existing = results.byCategory.get(t.categoryId) || [];
      existing.push(t.amount);
      results.byCategory.set(t.categoryId, existing);
    });
  }
  
  results.avgDaily = totalDays > 0 ? totalSpent / totalDays : 0;
  
  return results;
}

function getPendingRecurringExpenses(recurring: RecurringTransaction[], daysRemaining: number): number {
  const now = new Date();
  const endOfPeriod = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
  
  return recurring
    .filter(r => {
      if (!r.isActive || r.type !== 'expense') return false;
      const dueDate = new Date(r.nextDueDate);
      return dueDate >= now && dueDate <= endOfPeriod;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}

function calculateCategoryForecasts(
  currentExpenses: UserTransaction[],
  historicalByCategory: Map<string, number[]>,
  categories: UserCategory[],
  daysRemaining: number
): CategoryForecast[] {
  const categoryMap = new Map<string, { spent: number; historical: number[] }>();
  
  // Current spending
  currentExpenses.forEach(t => {
    const existing = categoryMap.get(t.categoryId) || { spent: 0, historical: [] };
    existing.spent += t.amount;
    categoryMap.set(t.categoryId, existing);
  });
  
  // Add historical data
  historicalByCategory.forEach((amounts, categoryId) => {
    const existing = categoryMap.get(categoryId) || { spent: 0, historical: [] };
    existing.historical = amounts;
    categoryMap.set(categoryId, existing);
  });
  
  const forecasts: CategoryForecast[] = [];
  
  categoryMap.forEach((data, categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const avgHistorical = data.historical.length > 0 
      ? data.historical.reduce((a, b) => a + b, 0) / data.historical.length 
      : 0;
    
    const now = new Date();
    const daysPassed = now.getDate();
    const avgDaily = daysPassed > 0 ? data.spent / daysPassed : 0;
    const forecastedTotal = data.spent + (avgDaily * daysRemaining);
    
    // Trend compared to historical
    let trend: 'up' | 'stable' | 'down' = 'stable';
    if (avgHistorical > 0) {
      const ratio = forecastedTotal / avgHistorical;
      if (ratio > 1.1) trend = 'up';
      else if (ratio < 0.9) trend = 'down';
    }
    
    forecasts.push({
      categoryId,
      categoryName: category?.name || 'Outros',
      currentSpent: data.spent,
      forecastedTotal,
      averageDaily: avgDaily,
      trend,
    });
  });
  
  return forecasts.sort((a, b) => b.forecastedTotal - a.forecastedTotal);
}

function analyzeTrend(monthlyTotals: number[]): 'increasing' | 'stable' | 'decreasing' {
  if (monthlyTotals.length < 2) return 'stable';
  
  const recent = monthlyTotals[0];
  const older = monthlyTotals.slice(1).reduce((a, b) => a + b, 0) / (monthlyTotals.length - 1);
  
  const change = (recent - older) / older;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

function calculateConfidence(totalTransactions: number): number {
  if (totalTransactions >= 50) return 95;
  if (totalTransactions >= 30) return 85;
  if (totalTransactions >= 15) return 70;
  if (totalTransactions >= 5) return 50;
  return 30;
}

export function getForecastInsights(forecast: SpendingForecast): ForecastInsight[] {
  const insights: ForecastInsight[] = [];
  
  if (forecast.status === 'danger') {
    insights.push({
      type: 'alert',
      message: `Você pode estourar o orçamento em ${(forecast.totalForecast - forecast.budgetLimit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      priority: 1,
    });
  }
  
  if (forecast.status === 'warning') {
    insights.push({
      type: 'alert',
      message: `Atenção: previsão de uso de ${forecast.percentOfBudget.toFixed(0)}% do orçamento`,
      priority: 2,
    });
  }
  
  if (forecast.dailyRecommended > 0) {
    insights.push({
      type: 'tip',
      message: `Gaste até ${forecast.dailyRecommended.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/dia para ficar no limite`,
      priority: 3,
    });
  }
  
  if (forecast.trend === 'decreasing') {
    insights.push({
      type: 'achievement',
      message: 'Seus gastos estão diminuindo! Continue assim.',
      priority: 4,
    });
  }
  
  const topCategory = forecast.categoryForecasts[0];
  if (topCategory && topCategory.trend === 'up') {
    insights.push({
      type: 'tip',
      message: `${topCategory.categoryName} está acima da média. Considere revisar.`,
      priority: 5,
    });
  }
  
  return insights.sort((a, b) => a.priority - b.priority);
}
