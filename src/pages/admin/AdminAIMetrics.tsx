import { useState } from "react";
import { Brain, Zap, DollarSign, Clock, TrendingUp, Activity, Calendar, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { useAIMetrics } from "@/hooks/useAIMetrics";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAIMetrics() {
  const [days, setDays] = useState(7);
  const { summary, dailyMetrics, agentMetrics, topCalls, projection, isLoading } = useAIMetrics(days);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  // Prepare chart data
  const chartData = dailyMetrics.map(d => ({
    date: format(new Date(d.date), "dd/MM", { locale: ptBR }),
    custo: d.cost_usd,
    chamadas: d.total_calls,
    tokens_in: d.tokens_in,
    tokens_out: d.tokens_out,
  }));

  const agentChartData = agentMetrics.map(a => ({
    name: a.agent_slug.replace(/_/g, " "),
    tokens_in: a.tokens_in,
    tokens_out: a.tokens_out,
    chamadas: a.total_calls,
  }));

  // Prepare projection chart data with actual + projected
  const projectionChartData = (() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data: Array<{ date: string; custo: number; projecao?: number; tipo: "real" | "projecao" }> = [];
    
    // Add daily metrics for current month
    const currentMonthMetrics = dailyMetrics.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    
    currentMonthMetrics.forEach(d => {
      data.push({
        date: format(new Date(d.date), "dd/MM", { locale: ptBR }),
        custo: d.cost_usd,
        tipo: "real",
      });
    });

    // Add projected days
    if (projection.daysRemaining > 0 && projection.dailyAverage > 0) {
      for (let i = 1; i <= Math.min(projection.daysRemaining, 10); i++) {
        const futureDate = addDays(now, i);
        data.push({
          date: format(futureDate, "dd/MM", { locale: ptBR }),
          custo: 0,
          projecao: projection.dailyAverage,
          tipo: "projecao",
        });
      }
    }
    
    return data;
  })();

  const TrendIcon = projection.trend === "up" ? ArrowUp : projection.trend === "down" ? ArrowDown : Minus;
  const trendColor = projection.trend === "up" ? "text-destructive" : projection.trend === "down" ? "text-green-500" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Métricas de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore custos, tokens e desempenho dos agentes de IA
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cost Projection Card */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Projeção de Custo Mensal
          </CardTitle>
          <CardDescription>
            Estimativa baseada no uso atual do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Gasto Atual</p>
              <p className="text-2xl font-bold">{formatCost(projection.currentMonthCost)}</p>
              <p className="text-xs text-muted-foreground">{projection.daysElapsed} dias</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projeção Mensal</p>
              <p className="text-2xl font-bold text-primary">{formatCost(projection.projectedMonthCost)}</p>
              <p className="text-xs text-muted-foreground">+{projection.daysRemaining} dias restantes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média Diária</p>
              <p className="text-2xl font-bold">{formatCost(projection.dailyAverage)}</p>
              <p className="text-xs text-muted-foreground">por dia</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tendência</p>
              <div className="flex items-center gap-1">
                <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                <span className={`text-xl font-bold ${trendColor}`}>
                  {projection.percentChange > 0 ? "+" : ""}{projection.percentChange.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {projection.trend === "up" ? "Custos subindo" : projection.trend === "down" ? "Custos caindo" : "Estável"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge 
                variant={projection.trend === "up" ? "destructive" : projection.trend === "down" ? "secondary" : "outline"}
                className="mt-1"
              >
                {projection.trend === "up" ? "📈 Atenção" : projection.trend === "down" ? "📉 Otimizando" : "→ Normal"}
              </Badge>
            </div>
          </div>

          {/* Projection Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={projectionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(3)}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(4)}`, 
                  name === "custo" ? "Real" : "Projeção"
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="custo" 
                name="Real"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="projecao" 
                name="Projeção"
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Chamadas
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : summary.total_calls.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              nos últimos {days} dias
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Usados
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatTokens(summary.total_tokens_in + summary.total_tokens_out)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(summary.total_tokens_in)} in / {formatTokens(summary.total_tokens_out)} out
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Estimado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatCost(summary.total_cost_usd)}
            </div>
            <p className="text-xs text-muted-foreground">
              baseado em preços OpenAI
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/[0.08]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latência Média
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatLatency(summary.avg_latency_ms)}
            </div>
            <p className="text-xs text-muted-foreground">
              tempo médio de resposta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Cost Chart */}
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Custo Diário
            </CardTitle>
            <CardDescription>
              Gastos estimados com IA por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(3)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Custo"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="custo" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tokens by Agent Chart */}
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Tokens por Agente
            </CardTitle>
            <CardDescription>
              Consumo de tokens por agente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatTokens(value)}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [formatTokens(value), name === "tokens_in" ? "Entrada" : "Saída"]}
                />
                <Legend />
                <Bar dataKey="tokens_in" name="Entrada" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="tokens_out" name="Saída" fill="hsl(var(--primary) / 0.5)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Calls Table */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Chamadas Mais Caras
          </CardTitle>
          <CardDescription>
            Top 10 chamadas com maior consumo de tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead className="text-muted-foreground">Agente</TableHead>
                <TableHead className="text-muted-foreground">Tokens In</TableHead>
                <TableHead className="text-muted-foreground">Tokens Out</TableHead>
                <TableHead className="text-muted-foreground">Custo</TableHead>
                <TableHead className="text-muted-foreground">Latência</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhuma chamada registrada com tokens"}
                  </TableCell>
                </TableRow>
              ) : (
                topCalls.map((call) => (
                  <TableRow key={call.id} className="border-white/[0.08]">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {call.agent_slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTokens(call.tokens_in)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTokens(call.tokens_out)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-green-500">
                      {formatCost(call.cost_usd)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatLatency(call.latency_ms)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {call.created_at ? format(new Date(call.created_at), "dd/MM HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Stats Table */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Estatísticas por Agente
          </CardTitle>
          <CardDescription>
            Resumo de uso por agente nos últimos {days} dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead className="text-muted-foreground">Agente</TableHead>
                <TableHead className="text-muted-foreground">Chamadas</TableHead>
                <TableHead className="text-muted-foreground">Tokens Total</TableHead>
                <TableHead className="text-muted-foreground">Custo Total</TableHead>
                <TableHead className="text-muted-foreground">Latência Média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhum agente com dados"}
                  </TableCell>
                </TableRow>
              ) : (
                agentMetrics.map((agent) => (
                  <TableRow key={agent.agent_slug} className="border-white/[0.08]">
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {agent.agent_slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {agent.total_calls.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTokens(agent.tokens_in + agent.tokens_out)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-green-500">
                      {formatCost(agent.cost_usd)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatLatency(agent.avg_latency_ms)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
