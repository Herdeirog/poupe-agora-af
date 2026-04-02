import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AgentRun {
  id: string;
  agent_slug: string | null;
  user_id: string | null;
  status: string;
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  error_message: string | null;
  created_at: string | null;
}

interface DailyStats {
  date: string;
  total: number;
  success: number;
  error: number;
}

export default function AdminAgentLogs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    avgLatency: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const agents = [
    { slug: "assistente_compromissos", name: "Assistente de Compromissos" },
    { slug: "agente_consulta", name: "Agente de Consulta" },
    { slug: "assistente_financeiro", name: "Assistente Financeiro" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query with filters
      let query = supabase
        .from("agent_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterAgent !== "all") {
        query = query.eq("agent_slug", filterAgent);
      }
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      const runsData = (data || []) as AgentRun[];
      setRuns(runsData);

      // Calculate stats
      const total = runsData.length;
      const success = runsData.filter((r) => r.status === "ok").length;
      const errors = runsData.filter((r) => r.status === "error").length;
      const latencies = runsData
        .filter((r) => r.latency_ms != null)
        .map((r) => r.latency_ms as number);
      const avgLatency =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

      setStats({ total, success, error: errors, avgLatency });

      // Calculate daily stats for last 7 days
      const dailyMap = new Map<string, { total: number; success: number; error: number }>();
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = format(date, "yyyy-MM-dd");
        dailyMap.set(key, { total: 0, success: 0, error: 0 });
      }

      runsData.forEach((run) => {
        if (run.created_at) {
          const key = format(new Date(run.created_at), "yyyy-MM-dd");
          if (dailyMap.has(key)) {
            const current = dailyMap.get(key)!;
            current.total++;
            if (run.status === "ok") current.success++;
            if (run.status === "error") current.error++;
          }
        }
      });

      const dailyArray: DailyStats[] = Array.from(dailyMap.entries()).map(
        ([date, stats]) => ({
          date: format(new Date(date), "dd/MM", { locale: ptBR }),
          ...stats,
        })
      );

      setDailyStats(dailyArray);
    } catch (error) {
      console.error("Error fetching agent runs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterAgent, filterStatus]);

  const getAgentName = (slug: string | null) => {
    if (!slug) return "Desconhecido";
    const agent = agents.find((a) => a.slug === slug);
    return agent?.name || slug;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sucesso
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/agents")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Logs de Agentes</h1>
            <p className="text-sm text-muted-foreground">
              Histórico de execuções e estatísticas
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="glass border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats.total}</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400">{stats.success}</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-destructive">{stats.error}</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Latência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-primary">{stats.avgLatency}ms</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Execuções por Dia (Últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="success" fill="hsl(142, 76%, 36%)" name="Sucesso" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="error" fill="hsl(var(--destructive))" name="Erro" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os agentes</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.slug} value={agent.slug}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ok">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Latência</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    </TableRow>
                  ))
                ) : runs.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma execução encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id} className="border-white/10 hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-sm">
                        {run.created_at
                          ? format(new Date(run.created_at), "dd/MM HH:mm:ss", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getAgentName(run.agent_slug)}
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {run.latency_ms ? `${run.latency_ms}ms` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {run.tokens_in || run.tokens_out
                          ? `${run.tokens_in || 0} / ${run.tokens_out || 0}`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {run.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
