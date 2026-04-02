import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { MonthComparison } from '@/hooks/useMonthlySummary';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface MonthComparisonCardProps {
  comparison: MonthComparison;
  currentMonth: Date;
}

export function MonthComparisonCard({ comparison, currentMonth }: MonthComparisonCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const previousMonth = subMonths(currentMonth, 1);
  const currentMonthName = format(currentMonth, 'MMM', { locale: ptBR });
  const previousMonthName = format(previousMonth, 'MMM', { locale: ptBR });

  const getTrendIcon = () => {
    switch (comparison.trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5" />;
      case 'down':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <Minus className="h-5 w-5" />;
    }
  };

  const getTrendColor = () => {
    switch (comparison.trend) {
      case 'up':
        return 'text-red-500 bg-red-500/10';
      case 'down':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-muted-foreground bg-muted/50';
    }
  };

  const getTrendLabel = () => {
    if (comparison.trend === 'stable') return 'Estável';
    const direction = comparison.trend === 'up' ? 'aumento' : 'redução';
    return `${Math.abs(comparison.percentageChange)}% de ${direction}`;
  };

  return (
    <div className="glass-card p-5 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Previous Month */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 capitalize">
              {previousMonthName}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(comparison.previousTotal)}
            </p>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground" />

          {/* Current Month */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 capitalize">
              {currentMonthName}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(comparison.currentTotal)}
            </p>
          </div>
        </div>

        {/* Trend Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-medium text-sm">
            {getTrendLabel()}
          </span>
        </div>
      </div>

      {comparison.previousTotal === 0 && comparison.currentTotal > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          * Sem dados do mês anterior para comparação
        </p>
      )}
    </div>
  );
}
