import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useUserPlan } from '@/hooks/useUserProfile';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { StatsCard } from '@/components/app/StatsCard';
import { WhatsAppShortcuts } from '@/components/app/WhatsAppShortcuts';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AppDashboard() {
  const { transactions, getStats } = useUserTransactions();
  const { goals } = useUserGoals();
  const { plan, trialDays } = useUserPlan();
  const { getCategoryById } = useUserCategories();
  const { formatCurrency } = useFormatCurrency();

  const stats = getStats();
  const recentTransactions = transactions.slice(0, 5);
  const activeGoals = goals.filter(g => g.status === 'in_progress').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      {/* Plan Status */}
      {plan?.status === 'trial' && (
        <div className="glass-card p-4 rounded-xl border-user-warning/40 flex items-center justify-between fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-warning">
              <Sparkles className="h-5 w-5 text-user-warning" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Período de teste</p>
              <p className="text-sm text-muted-foreground">
                Você tem {trialDays} dias restantes no trial
              </p>
            </div>
          </div>
          <Link to="/app/plan">
            <button className="btn-premium text-sm">
              Assinar agora
            </button>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="stats">
        <StatsCard
          title="Receitas do Mês"
          value={formatCurrency(stats.totalIncome)}
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          trend="up"
        />
        <StatsCard
          title="Despesas do Mês"
          value={formatCurrency(stats.totalExpenses)}
          icon={<TrendingDown className="h-6 w-6 text-user-danger" />}
          trend="down"
        />
        <StatsCard
          title="Saldo Atual"
          value={formatCurrency(stats.balance)}
          icon={<Wallet className="h-6 w-6 text-primary" />}
          trend={stats.balance >= 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Metas Ativas"
          value={activeGoals.length}
          icon={<Target className="h-6 w-6 text-user-info" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="glass-strong p-6 rounded-2xl lg:col-span-2 fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-foreground">Últimas Transações</h3>
            <Link to="/app/transactions" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              Ver todas
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 glass-card rounded-xl">
              Nenhuma transação encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const category = getCategoryById(tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl glass-card transition-all duration-200 hover:border-border/50">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'icon-circle w-10 h-10',
                        tx.type === 'income' ? 'icon-circle-success' : 'icon-circle-danger'
                      )}>
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-user-danger" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{category?.name || 'Sem categoria'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'font-semibold',
                      tx.type === 'income' ? 'value-highlight' : 'value-danger'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* WhatsApp Shortcuts */}
        <WhatsAppShortcuts />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-foreground">Progresso das Metas</h3>
            <Link to="/app/goals" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              Ver todas
            </Link>
          </div>

          {activeGoals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 glass-card rounded-xl">
              Nenhuma meta ativa
            </p>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="glass-card p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{goal.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-right value-highlight">{progress.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <h3 className="text-base font-semibold text-foreground mb-5">Gastos por Categoria</h3>

          {!stats.expensesByCategory || Object.keys(stats.expensesByCategory).length === 0 ? (
            <p className="text-muted-foreground text-center py-8 glass-card rounded-xl">
              Nenhuma despesa este mês
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(stats.expensesByCategory).slice(0, 6).map(([categoryId, amount]) => {
                const category = getCategoryById(categoryId);
                const percentage = (amount / stats.totalExpenses) * 100;
                return (
                  <div key={categoryId} className="glass-card p-4 rounded-xl transition-all duration-200 hover:border-border/50">
                    <p className="font-medium text-sm truncate text-foreground">{category?.name || 'Outros'}</p>
                    <p className="text-lg font-bold value-danger mt-1">{formatCurrency(amount)}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
