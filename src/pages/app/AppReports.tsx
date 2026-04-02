import { useState, useMemo } from 'react';
import { useReports } from '@/hooks/useReports';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, FileText, Calendar, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(152, 90%, 55%)', 'hsl(210, 100%, 60%)', 'hsl(280, 100%, 65%)', 'hsl(45, 100%, 55%)', 'hsl(0, 85%, 65%)', 'hsl(180, 70%, 50%)'];

export default function AppReports() {
  const [period, setPeriod] = useState('12');
  const { generateFullReport, getMonthlyReports, getCategoryReport, loading } = useReports();
  const { categories } = useUserCategories();
  const { formatCurrency: formatCurrencyFull, symbol } = useFormatCurrency();

  const report = useMemo(() => generateFullReport(parseInt(period)), [period, generateFullReport]);
  const monthlyData = useMemo(() => getMonthlyReports(parseInt(period)), [period, getMonthlyReports]);
  const categoryData = useMemo(() => getCategoryReport(parseInt(period)), [period, getCategoryReport]);

  const formatCurrency = (value: number) => {
    // Compact format for charts
    if (Math.abs(value) >= 1000000) {
      return `${symbol} ${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${symbol} ${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrencyFull(value);
  };

  const chartData = monthlyData.map(m => ({
    name: m.month.substring(0, 3),
    receitas: m.income,
    despesas: m.expense,
    saldo: m.balance,
  }));

  const pieData = categoryData.slice(0, 6).map((c, i) => ({
    name: c.categoryName,
    value: c.total,
    color: COLORS[i % COLORS.length],
  }));

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="h-4 w-4 text-primary" />;
    if (value < -5) return <TrendingDown className="h-4 w-4 text-user-danger" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] glass-card">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-in-up">
        <div className="glass-strong p-5 rounded-2xl">
          <p className="text-sm text-muted-foreground mb-1">Total Receitas</p>
          <p className="text-2xl font-bold value-highlight">{formatCurrencyFull(report.summary.totalIncome)}</p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {getTrendIcon(report.trends.incomeGrowth)}
            <span className={report.trends.incomeGrowth > 0 ? 'text-primary' : 'text-user-danger'}>
              {report.trends.incomeGrowth > 0 ? '+' : ''}{report.trends.incomeGrowth.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="glass-strong p-5 rounded-2xl">
          <p className="text-sm text-muted-foreground mb-1">Total Despesas</p>
          <p className="text-2xl font-bold value-danger">{formatCurrencyFull(report.summary.totalExpense)}</p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {getTrendIcon(-report.trends.expenseGrowth)}
            <span className={report.trends.expenseGrowth < 0 ? 'text-primary' : 'text-user-danger'}>
              {report.trends.expenseGrowth > 0 ? '+' : ''}{report.trends.expenseGrowth.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="glass-strong p-5 rounded-2xl">
          <p className="text-sm text-muted-foreground mb-1">Saldo Líquido</p>
          <p className={cn('text-2xl font-bold', report.summary.netBalance >= 0 ? 'value-highlight' : 'value-danger')}>
            {formatCurrencyFull(report.summary.netBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Média mensal: {formatCurrency(report.summary.avgMonthlySavings)}
          </p>
        </div>
        <div className="glass-strong p-5 rounded-2xl">
          <p className="text-sm text-muted-foreground mb-1">Melhor Mês</p>
          <p className="text-lg font-bold text-foreground capitalize">{report.summary.bestMonth}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Pior: {report.summary.worstMonth}
          </p>
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Area Chart */}
          <div className="glass-strong p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Evolução Mensal</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 90%, 55%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(152, 90%, 55%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 85%, 65%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0, 85%, 65%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrencyFull(value)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="receitas" stroke="hsl(152, 90%, 55%)" fillOpacity={1} fill="url(#colorReceitas)" />
                  <Area type="monotone" dataKey="despesas" stroke="hsl(0, 85%, 65%)" fillOpacity={1} fill="url(#colorDespesas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart - Balance */}
          <div className="glass-strong p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Saldo Mensal</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrencyFull(value)}
                  />
                  <Bar 
                    dataKey="saldo" 
                    fill="hsl(152, 90%, 55%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-strong p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição de Gastos</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrencyFull(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category List */}
            <div className="glass-strong p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-foreground mb-4">Top Categorias</h3>
              <div className="space-y-4">
                {categoryData.slice(0, 6).map((cat, i) => (
                  <div key={cat.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-foreground">{cat.categoryName}</span>
                        {cat.trend === 'up' && <TrendingUp className="h-3 w-3 text-user-danger" />}
                        {cat.trend === 'down' && <TrendingDown className="h-3 w-3 text-primary" />}
                      </div>
                      <span className="text-sm font-semibold value-danger">{formatCurrencyFull(cat.total)}</span>
                    </div>
                    <Progress value={cat.percentage} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cat.percentage.toFixed(1)}%</span>
                      <span>{cat.transactionCount} transações</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="glass-strong p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Insights do Período</h3>
            <div className="space-y-4">
              {report.insights.map((insight, index) => (
                <div key={index} className="glass-card p-4 rounded-xl flex items-start gap-3">
                  <div className="icon-circle icon-circle-info w-8 h-8 flex-shrink-0">
                    <FileText className="h-4 w-4 text-user-info" />
                  </div>
                  <p className="text-sm text-foreground">{insight}</p>
                </div>
              ))}
            </div>

            {/* Trends Summary */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <h4 className="text-base font-semibold text-foreground mb-4">Resumo de Tendências</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(report.trends.incomeGrowth)}
                    <span className={cn('text-lg font-bold', report.trends.incomeGrowth >= 0 ? 'text-primary' : 'text-user-danger')}>
                      {report.trends.incomeGrowth > 0 ? '+' : ''}{report.trends.incomeGrowth.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Receitas</p>
                </div>
                <div className="glass-card p-4 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(-report.trends.expenseGrowth)}
                    <span className={cn('text-lg font-bold', report.trends.expenseGrowth <= 0 ? 'text-primary' : 'text-user-danger')}>
                      {report.trends.expenseGrowth > 0 ? '+' : ''}{report.trends.expenseGrowth.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                </div>
                <div className="glass-card p-4 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {getTrendIcon(report.trends.savingsGrowth)}
                    <span className={cn('text-lg font-bold', report.trends.savingsGrowth >= 0 ? 'text-primary' : 'text-user-danger')}>
                      {report.trends.savingsGrowth > 0 ? '+' : ''}{report.trends.savingsGrowth.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Poupança</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
