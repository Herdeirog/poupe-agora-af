export interface SpendingForecast {
  totalForecast: number;
  budgetLimit: number;
  percentOfBudget: number;
  status: 'safe' | 'warning' | 'danger';
  dailyRecommended: number;
  daysRemaining: number;
  categoryForecasts: CategoryForecast[];
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  lastUpdated: string;
}

export interface CategoryForecast {
  categoryId: string;
  categoryName: string;
  currentSpent: number;
  forecastedTotal: number;
  averageDaily: number;
  trend: 'up' | 'stable' | 'down';
}

export interface ForecastInsight {
  type: 'alert' | 'tip' | 'achievement';
  message: string;
  priority: number;
}
