import { Users, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { RecentUsersTable } from "@/components/admin/RecentUsersTable";
import { UsersChart } from "@/components/admin/UsersChart";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

export default function AdminDashboard() {
  const { metrics } = useAdminUsers();
  const { formatCurrency } = useFormatCurrency();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema Poupe Agora
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Usuários"
          value={metrics.totalUsers.toString()}
          change={12.5}
          changeLabel="vs mês anterior"
          icon={Users}
        />
        <StatsCard
          title="Usuários Ativos"
          value={metrics.activeUsers.toString()}
          change={8.2}
          changeLabel="vs mês anterior"
          icon={TrendingUp}
        />
        <StatsCard
          title="Assinaturas Ativas"
          value={metrics.activeSubscriptions.toString()}
          change={-2.4}
          changeLabel="vs mês anterior"
          icon={CreditCard}
        />
        <StatsCard
          title="Receita Mensal"
          value={formatCurrency(metrics.monthlyRevenue)}
          change={15.3}
          changeLabel="vs mês anterior"
          icon={DollarSign}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UsersChart />
        <RecentUsersTable />
      </div>
    </div>
  );
}
