import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, TrendingUp, TrendingDown, Minus, Filter, X } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { SummaryStatsCards } from './SummaryStatsCards';
import { CommitmentDistributionChart } from './CommitmentDistributionChart';
import { UpcomingDueList } from './UpcomingDueList';
import { AlertsPanel } from './AlertsPanel';
import { MonthComparisonCard } from './MonthComparisonCard';
import { CategoryFilterSelect } from './CategoryFilterSelect';
import { useMonthlySummary } from '@/hooks/useMonthlySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function MonthlySummaryTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const {
    loading,
    stats,
    distribution,
    upcomingDues,
    alerts,
    comparison,
    categories,
    categorySummary,
  } = useMonthlySummary(currentMonth, categoryFilter);

  const monthTitle = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  const selectedCategory = categories.find(c => c.id === categoryFilter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground capitalize">
              Resumo Financeiro — {monthTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              Visão geral dos seus compromissos
            </p>
          </div>
        </div>
        
        <MonthSelector 
          currentMonth={currentMonth} 
          onMonthChange={setCurrentMonth} 
        />
      </div>

      {/* Category Filter */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtrar por Categoria
          </div>
          <div className="flex-1 flex items-center gap-3">
            <CategoryFilterSelect
              categories={categories}
              selectedCategoryId={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
            {categoryFilter && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCategoryFilter(null)}
                className="h-8 gap-1"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        {selectedCategory && (
          <div className="mt-3 text-sm text-muted-foreground">
            Exibindo apenas compromissos da categoria: <span className="font-medium text-foreground">{selectedCategory.name}</span>
          </div>
        )}
      </div>

      {/* Month Comparison Card */}
      <MonthComparisonCard comparison={comparison} currentMonth={currentMonth} />

      {/* Stats Cards */}
      <SummaryStatsCards stats={stats} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <CommitmentDistributionChart distribution={distribution} />
        
        {/* Upcoming dues */}
        <UpcomingDueList items={upcomingDues} />
      </div>

      {/* Alerts Panel */}
      <AlertsPanel alerts={alerts} />
    </div>
  );
}
