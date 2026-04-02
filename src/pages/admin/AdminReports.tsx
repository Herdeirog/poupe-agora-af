import { useState, useMemo } from "react";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { Download, Users, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { useAdminTransactions } from "@/hooks/useAdminTransactions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function AdminReports() {
  const [period, setPeriod] = useState("30");
  const [isExporting, setIsExporting] = useState(false);
  const { metrics: userMetrics } = useAdminUsers();
  const { metrics: subMetrics } = useAdminSubscriptions();
  const { metrics: transMetrics } = useAdminTransactions();
  const { formatCurrency } = useFormatCurrency();

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const periodDays = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Buscar dados reais
      const [profilesRes, subscriptionsRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').gte('created_at', startDateStr),
        supabase.from('subscriptions').select('*').gte('created_at', startDateStr),
        supabase.from('transactions').select('*').gte('created_at', startDateStr)
      ]);

      // Gerar CSV
      const headers = [
        'Relatório de Métricas - Poupe Agora',
        `Período: Últimos ${periodDays} dias`,
        `Data de Geração: ${new Date().toLocaleString('pt-BR')}`,
        '',
        'RESUMO GERAL',
        'Métrica,Valor',
        `Total de Usuários,${userMetrics.totalUsers}`,
        `Usuários Ativos,${userMetrics.activeUsers}`,
        `Assinaturas Ativas,${subMetrics.ativas}`,
        `Assinaturas Canceladas,${subMetrics.canceladas}`,
        `Receita Total,${formatCurrency(subMetrics.receitaTotal)}`,
        '',
        'NOVOS USUÁRIOS NO PERÍODO',
        'ID,Nome,Email,Data Cadastro'
      ];

      const userRows = (profilesRes.data || []).map(p => 
        `${p.id},"${p.full_name || 'N/A'}","${p.email || 'N/A'}",${new Date(p.created_at).toLocaleDateString('pt-BR')}`
      );

      const subscriptionHeaders = [
        '',
        'ASSINATURAS NO PERÍODO',
        'ID,Usuário,Plano,Status,Valor,Data Início'
      ];

      const subRows = (subscriptionsRes.data || []).map(s => 
        `${s.id},"${s.user_email || 'N/A'}","${s.plan || 'N/A'}","${s.status || 'N/A'}",${s.amount || 0},${s.start_date ? new Date(s.start_date).toLocaleDateString('pt-BR') : 'N/A'}`
      );

      const transactionHeaders = [
        '',
        'TRANSAÇÕES NO PERÍODO',
        'ID,Valor,Tipo,Descrição,Data'
      ];

      const txRows = (transactionsRes.data || []).map(t => 
        `${t.id},${t.amount},"${t.type || 'N/A'}","${(t.description || '').replace(/"/g, '""')}",${new Date(t.date).toLocaleDateString('pt-BR')}`
      );

      const csvContent = [
        ...headers,
        ...userRows,
        ...subscriptionHeaders,
        ...subRows,
        ...transactionHeaders,
        ...txRows
      ].join('\n');

      // Download
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_poupeagora_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Relatório exportado com ${(profilesRes.data?.length || 0)} usuários, ${(subscriptionsRes.data?.length || 0)} assinaturas e ${(transactionsRes.data?.length || 0)} transações.`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error("Erro ao exportar relatório. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Relatórios</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize métricas e indicadores do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px] glass-input">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/[0.12]">
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-strong p-4 shadow-premium animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{userMetrics.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{subMetrics.ativas}</p>
              <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(subMetrics.receitaTotal)}</p>
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-danger">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{subMetrics.canceladas}</p>
              <p className="text-sm text-muted-foreground">Cancelamentos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Note: Charts removed - implement with real Supabase data when needed */}
      <div className="glass-strong p-6 shadow-premium animate-fade-in text-center">
        <p className="text-muted-foreground">Gráficos serão implementados com dados reais do Supabase</p>
      </div>
    </div>
  );
}
