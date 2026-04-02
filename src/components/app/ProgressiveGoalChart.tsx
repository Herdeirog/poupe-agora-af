import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { GoalWeek, calculateTotalUpToWeek } from '@/types/progressiveGoal';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface ProgressiveGoalChartProps {
  weeks: GoalWeek[];
  totalWeeks: number;
  initialValue: number;
  paidWeekNumbers: number[];
}

export function ProgressiveGoalChart({ 
  weeks, 
  totalWeeks, 
  initialValue, 
  paidWeekNumbers 
}: ProgressiveGoalChartProps) {
  const { formatCurrency } = useFormatCurrency();
  
  const chartData = useMemo(() => {
    const data = [];
    let accumulatedReal = 0;
    
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const expectedTotal = calculateTotalUpToWeek(weekNum, initialValue);
      
      if (paidWeekNumbers.includes(weekNum)) {
        accumulatedReal += weekNum * initialValue;
      }
      
      data.push({
        semana: weekNum,
        meta: expectedTotal,
        real: accumulatedReal > 0 ? accumulatedReal : null,
        realValue: accumulatedReal,
      });
    }
    
    return data;
  }, [weeks, totalWeeks, initialValue, paidWeekNumbers]);

  // formatCurrency agora vem do hook useFormatCurrency

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const metaValue = payload.find((p: any) => p.dataKey === 'meta')?.value || 0;
      const realValue = payload.find((p: any) => p.dataKey === 'real')?.value || 0;
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">Semana {label}</p>
          <div className="space-y-1">
            <p className="text-xs flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Meta esperada:</span>
              <span className="font-medium text-foreground">{formatCurrency(metaValue)}</span>
            </p>
            {realValue > 0 && (
              <p className="text-xs flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Progresso real:</span>
                <span className="font-medium text-primary">{formatCurrency(realValue)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-strong p-6 rounded-2xl fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Evolução do Progresso</h3>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="semana" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => value % 4 === 0 || value === 1 ? `${value}` : ''}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">
                  {value === 'meta' ? 'Meta esperada' : 'Progresso real'}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="meta"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorMeta)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="real"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorReal)"
              strokeWidth={2}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
