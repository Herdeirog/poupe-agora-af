import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Bell, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { SubscriptionPlan, SubscriptionOrigin } from "@/types/adminSubscription";
import { generateExpiryNotifications } from "@/services/adminSubscriptionStorage";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

const planColors: Record<SubscriptionPlan, string> = {
  gratuito: "hsl(var(--muted-foreground))",
  trial: "hsl(210, 40%, 60%)",
  mensal: "hsl(var(--primary))",
  trimestral: "hsl(150, 60%, 50%)",
  semestral: "hsl(200, 70%, 50%)",
  anual: "hsl(45, 90%, 55%)",
  vitalicio: "hsl(280, 70%, 60%)",
  premium: "hsl(330, 70%, 55%)",
};

const planLabels: Record<SubscriptionPlan, string> = {
  gratuito: "Gratuito",
  trial: "Trial",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  vitalicio: "Vitalício",
  premium: "Premium",
};

const originLabels: Record<SubscriptionOrigin, string> = {
  manual: "Manual",
  perfectpay: "PerfectPay",
  asaas: "Asaas",
  qify: "Qify",
  hotmart: "Hotmart",
};

const chartConfig = {
  subscriptions: {
    label: "Assinaturas",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
  newSubs: {
    label: "Novas",
    color: "hsl(150, 60%, 50%)",
  },
  canceled: {
    label: "Canceladas",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

type PeriodFilter = '3m' | '6m' | '12m' | 'custom';

export default function AdminSubscriptionsDashboard() {
  const navigate = useNavigate();
  const { subscriptions, metrics } = useAdminSubscriptions();
  const { formatCurrency } = useFormatCurrency();

  // Filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('6m');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | 'all'>('all');
  const [originFilter, setOriginFilter] = useState<SubscriptionOrigin | 'all'>('all');
  const [generatingNotifications, setGeneratingNotifications] = useState(false);

  // Filter subscriptions by plan and origin
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
      const matchesOrigin = originFilter === 'all' || sub.origin === originFilter;
      return matchesPlan && matchesOrigin;
    });
  }, [subscriptions, planFilter, originFilter]);

  // Get date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodFilter === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    const monthsBack = periodFilter === '3m' ? 2 : periodFilter === '6m' ? 5 : 11;
    return {
      start: subMonths(startOfMonth(now), monthsBack),
      end: endOfMonth(now),
    };
  }, [periodFilter, startDate, endDate]);

  // Generate monthly data based on filters
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });

    return months.map((month) => {
      const monthSubs = filteredSubscriptions.filter((sub) => {
        const subDate = new Date(sub.startDate);
        return isSameMonth(subDate, month) || subDate < month;
      });

      const activeSubs = monthSubs.filter((sub) => sub.status === "ativa");
      const newSubs = filteredSubscriptions.filter((sub) => {
        const subDate = new Date(sub.startDate);
        return isSameMonth(subDate, month);
      });
      
      const canceledSubs = filteredSubscriptions.filter((sub) => {
        if (sub.status !== 'cancelada') return false;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        return endDate && isSameMonth(endDate, month);
      });

      const monthRevenue = activeSubs.reduce((sum, sub) => sum + (sub.amount || 0), 0);

      return {
        month: format(month, "MMM", { locale: ptBR }),
        fullMonth: format(month, "MMMM yyyy", { locale: ptBR }),
        subscriptions: activeSubs.length,
        revenue: monthRevenue,
        newSubs: newSubs.length,
        canceled: canceledSubs.length,
      };
    });
  }, [filteredSubscriptions, dateRange]);

  // Plan distribution data
  const planDistribution = useMemo(() => {
    const distribution = filteredSubscriptions.reduce((acc, sub) => {
      if (sub.status === "ativa" || sub.status === "trial") {
        acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      }
      return acc;
    }, {} as Record<SubscriptionPlan, number>);

    return Object.entries(distribution)
      .map(([plan, count]) => ({
        name: planLabels[plan as SubscriptionPlan],
        value: count,
        fill: planColors[plan as SubscriptionPlan],
      }))
      .filter((item) => item.value > 0);
  }, [filteredSubscriptions]);

  // Calculate growth rate
  const growthRate = useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const current = monthlyData[monthlyData.length - 1].subscriptions;
    const previous = monthlyData[monthlyData.length - 2].subscriptions;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [monthlyData]);

  // Calculate churn rate
  const churnRate = useMemo(() => {
    const lastMonth = monthlyData[monthlyData.length - 1];
    if (!lastMonth || lastMonth.subscriptions === 0) return 0;
    return Math.round((lastMonth.canceled / (lastMonth.subscriptions + lastMonth.canceled)) * 100);
  }, [monthlyData]);

  // Get expiring subscriptions (next 7 days)
  const expiringSubscriptions = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    
    return subscriptions.filter(sub => {
      if (sub.status !== 'ativa') return false;
      if (!sub.nextBilling) return false;
      const billingDate = new Date(sub.nextBilling);
      return isAfter(billingDate, now) && isBefore(billingDate, sevenDaysFromNow);
    });
  }, [subscriptions]);

  // formatCurrency agora vem do hook useFormatCurrency

  const handleGenerateNotifications = useCallback(async () => {
    setGeneratingNotifications(true);
    try {
      const count = await generateExpiryNotifications(7);
      if (count > 0) {
        toast.success(`${count} notificação(ões) de vencimento gerada(s)`);
      } else {
        toast.info("Nenhuma assinatura próxima do vencimento encontrada");
      }
    } catch (error) {
      toast.error("Erro ao gerar notificações");
    } finally {
      setGeneratingNotifications(false);
    }
  }, []);

  const clearFilters = () => {
    setPeriodFilter('6m');
    setPlanFilter('all');
    setOriginFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = planFilter !== 'all' || originFilter !== 'all' || periodFilter !== '6m';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/admin/subscriptions")}
            className="hover:bg-white/[0.04]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Assinaturas</h1>
            <p className="text-muted-foreground">Análise de evolução e métricas</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerateNotifications}
          disabled={generatingNotifications}
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          {generatingNotifications ? "Gerando..." : "Gerar Alertas de Vencimento"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-strong shadow-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Filtros Avançados</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Period Filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Período</label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {periodFilter === 'custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data Início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data Fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Plan Filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Plano</label>
              <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as SubscriptionPlan | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(planLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origin Filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Origem</label>
              <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as SubscriptionOrigin | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(originLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-strong shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.receitaTotal)}</div>
            <p className="text-xs text-muted-foreground">Receita mensal recorrente</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.ativas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total > 0 ? Math.round((metrics.ativas / metrics.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Crescimento</CardTitle>
            {growthRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${growthRate >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate}%
            </div>
            <p className="text-xs text-muted-foreground">vs. mês anterior</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Churn</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${churnRate <= 5 ? 'text-green-500' : churnRate <= 10 ? 'text-yellow-500' : 'text-destructive'}`}>
              {churnRate}%
            </div>
            <p className="text-xs text-muted-foreground">cancelamentos/mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Subscriptions Alert */}
      {expiringSubscriptions.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-foreground">Assinaturas Vencendo em 7 dias</CardTitle>
            </div>
            <CardDescription>{expiringSubscriptions.length} assinatura(s) próxima(s) do vencimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSubscriptions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{sub.userName}</p>
                    <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      {planLabels[sub.plan]}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vence em {format(new Date(sub.nextBilling), "dd/MM")}
                    </p>
                  </div>
                </div>
              ))}
              {expiringSubscriptions.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{expiringSubscriptions.length - 5} mais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Evolution */}
        <Card className="glass-strong shadow-premium">
          <CardHeader>
            <CardTitle className="text-foreground">Evolução de Assinaturas</CardTitle>
            <CardDescription>
              Assinaturas ativas {periodFilter === 'custom' ? 'no período selecionado' : `nos últimos ${periodFilter === '3m' ? '3' : periodFilter === '6m' ? '6' : '12'} meses`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="subscriptionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="subscriptions"
                  stroke="hsl(var(--primary))"
                  fill="url(#subscriptionsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="glass-strong shadow-premium">
          <CardHeader>
            <CardTitle className="text-foreground">Receita Mensal (MRR)</CardTitle>
            <CardDescription>Evolução da receita recorrente</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(v)} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="glass-strong shadow-premium">
          <CardHeader>
            <CardTitle className="text-foreground">Distribuição por Plano</CardTitle>
            <CardDescription>Assinaturas ativas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* New vs Canceled */}
        <Card className="glass-strong shadow-premium">
          <CardHeader>
            <CardTitle className="text-foreground">Novas vs Canceladas</CardTitle>
            <CardDescription>Comparativo mensal de movimentação</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newSubs"
                  name="Novas"
                  stroke="hsl(150, 60%, 50%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(150, 60%, 50%)" }}
                />
                <Line
                  type="monotone"
                  dataKey="canceled"
                  name="Canceladas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
