import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DistributionItem } from '@/hooks/useMonthlySummary';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CommitmentDistributionChartProps {
  distribution: DistributionItem[];
}

const COLORS = {
  unique: 'hsl(217, 91%, 60%)',      // Azul
  recurring: 'hsl(160, 84%, 39%)',   // Verde
  installment: 'hsl(38, 92%, 50%)',  // Amarelo/Laranja
};

const TYPE_LABELS = {
  unique: 'Únicos',
  recurring: 'Recorrentes',
  installment: 'Parcelados',
};

export function CommitmentDistributionChart({ distribution }: CommitmentDistributionChartProps) {
  const { formatCurrency } = useFormatCurrency();
  const total = distribution.reduce((sum, item) => sum + item.value, 0);
  
  const chartData = distribution.map(item => ({
    name: TYPE_LABELS[item.type],
    value: item.value,
    amount: item.amount,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    color: COLORS[item.type],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} compromisso(s) ({data.percentage}%)
          </p>
          <p className="text-sm font-medium text-primary">
            {formatCurrency(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy }: any) => {
    return (
      <text 
        x={cx} 
        y={cy} 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="fill-foreground"
      >
        <tspan x={cx} dy="-0.5em" className="text-2xl font-bold">{total}</tspan>
        <tspan x={cx} dy="1.5em" className="text-xs fill-muted-foreground">total</tspan>
      </text>
    );
  };

  return (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        📊 Distribuição por Tipo
      </h3>
      
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">
              {item.name} ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
