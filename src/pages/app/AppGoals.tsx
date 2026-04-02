import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useProgressiveGoals } from '@/hooks/useProgressiveGoals';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useCelebration } from '@/hooks/useCelebration';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Target, CheckCircle, AlertCircle, Clock, TrendingUp, Sparkles, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateGrandTotal } from '@/types/progressiveGoal';
import { markWeekAsPaid } from '@/services/progressiveGoalStorage';
import { toast } from 'sonner';

export default function AppGoals() {
  const { goals } = useUserGoals();
  const { goals: progressiveGoals, loading: progressiveLoading, refresh: refreshProgressiveGoals } = useProgressiveGoals();
  const { formatCurrency } = useFormatCurrency();
  const { celebrate } = useCelebration();
  const [markingGoalId, setMarkingGoalId] = useState<string | null>(null);

  const handleMarkAsPaid = async (e: React.MouseEvent, goalId: string, currentWeek: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setMarkingGoalId(goalId);
    try {
      const success = await markWeekAsPaid(goalId, currentWeek);
      if (success) {
        celebrate();
        toast.success(`Semana ${currentWeek} marcada como paga!`);
        refreshProgressiveGoals();
      } else {
        toast.error('Erro ao marcar semana como paga');
      }
    } catch (error) {
      toast.error('Erro ao marcar semana como paga');
    }
    setMarkingGoalId(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge-premium badge-income inline-flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />Concluída
          </span>
        );
      case 'overdue':
        return (
          <span className="badge-premium badge-expense inline-flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />Atrasada
          </span>
        );
      default:
        return (
          <span className="badge-premium badge-info inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />Em progresso
          </span>
        );
    }
  };

  const inProgressGoals = goals.filter(g => g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const overdueGoals = goals.filter(g => g.status === 'overdue');

  const activeProgressiveGoals = progressiveGoals.filter(g => g.status === 'active');
  const completedProgressiveGoals = progressiveGoals.filter(g => g.status === 'completed');

  const totalInProgress = inProgressGoals.length + activeProgressiveGoals.length;
  const totalCompleted = completedGoals.length + completedProgressiveGoals.length;

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Metas' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 fade-in">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-foreground">Metas Financeiras</h1>
          <p className="text-muted-foreground">Acompanhe seus objetivos financeiros</p>
        </div>
        <div className="flex gap-2 justify-center sm:justify-end w-full sm:w-auto">
          <Link to="/app/goals/new">
            <button className="btn-premium flex items-center gap-1.5 text-sm whitespace-nowrap px-3 py-2">
              <Plus className="h-4 w-4" />
              Meta Constante
            </button>
          </Link>
          <Link to="/app/goals/progressive/new">
            <Button variant="outline" className="flex items-center gap-1.5 text-sm whitespace-nowrap px-3 py-2 border-primary/30 hover:bg-primary/10 hover:border-primary">
              <Plus className="h-4 w-4 text-primary" />
              Meta Progressiva
            </Button>
          </Link>
        </div>
      </div>

      {/* Promotional Card for Progressive Goal - only show if no progressive goals */}
      {progressiveGoals.length === 0 && (
        <div className="glass-card p-5 rounded-2xl fade-in-up border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="icon-circle icon-circle-success">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Experimente a Meta Progressiva
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Novo</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Poupe de forma crescente e alcance até {formatCurrency(27560)} em 1 ano
                </p>
              </div>
            </div>
            <Link to="/app/goals/progressive/new">
              <Button className="btn-premium flex items-center gap-2 whitespace-nowrap">
                <TrendingUp className="h-4 w-4" />
                Criar Meta Progressiva
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong p-5 rounded-2xl fade-in-up flex items-center gap-4">
          <div className="icon-circle icon-circle-info">
            <Clock className="h-6 w-6 text-user-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Em Progresso</p>
            <p className="text-2xl font-bold text-foreground">{totalInProgress}</p>
          </div>
        </div>
        <div className="glass-strong p-5 rounded-2xl fade-in-up flex items-center gap-4">
          <div className="icon-circle icon-circle-success">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold value-highlight">{totalCompleted}</p>
          </div>
        </div>
        <div className="glass-strong p-5 rounded-2xl fade-in-up flex items-center gap-4">
          <div className="icon-circle icon-circle-danger">
            <AlertCircle className="h-6 w-6 text-user-danger" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-bold value-danger">{overdueGoals.length}</p>
          </div>
        </div>
      </div>

      {/* Progressive Goals Section */}
      {(progressiveGoals.length > 0 || progressiveLoading) && (
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Metas Progressivas</h3>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{progressiveGoals.length}</span>
          </div>
          
          {progressiveLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {progressiveGoals.map((goal) => {
                const grandTotal = calculateGrandTotal(goal.totalWeeks, goal.initialValue);
                const progress = grandTotal > 0 ? (goal.currentAmount / grandTotal) * 100 : 0;
                
                return (
                  <Link key={goal.id} to={`/app/goals/progressive/${goal.id}`} className="block">
                    <div className="glass-card p-5 rounded-xl transition-all duration-300 hover:border-primary/30 hover:shadow-premium group border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {goal.title}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Semana {goal.currentWeek} de {goal.totalWeeks}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "badge-premium inline-flex items-center gap-1",
                          goal.status === 'completed' ? 'badge-income' : 'badge-info'
                        )}>
                          {goal.status === 'completed' ? (
                            <><CheckCircle className="h-3 w-3" />Concluída</>
                          ) : (
                            <><TrendingUp className="h-3 w-3" />Progressiva</>
                          )}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{formatCurrency(goal.currentAmount)}</span>
                          <span className="font-medium text-foreground">{formatCurrency(grandTotal)}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Valor base: {formatCurrency(goal.initialValue)}/semana
                          </span>
                          <span className="value-highlight font-medium">
                            {progress.toFixed(1)}% concluído
                          </span>
                        </div>
                        
                        {goal.status === 'active' && (
                          <Button
                            size="sm"
                            className="btn-premium w-full mt-2"
                            onClick={(e) => handleMarkAsPaid(e, goal.id, goal.currentWeek)}
                            disabled={markingGoalId === goal.id}
                          >
                            {markingGoalId === goal.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar Semana {goal.currentWeek} como Paga
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Regular Goals List */}
      <div className="glass-strong p-6 rounded-2xl fade-in-up">
        <h3 className="text-base font-semibold text-foreground mb-5">Metas Tradicionais</h3>
        
        {goals.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-xl">
            <div className="icon-circle icon-circle-info w-16 h-16 mx-auto mb-4">
              <Target className="h-8 w-8 text-user-info" />
            </div>
            <p className="text-muted-foreground mb-4">Você ainda não tem metas tradicionais</p>
            <Link to="/app/goals/new">
              <button className="btn-premium">Criar meta tradicional</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Link key={goal.id} to={`/app/goals/${goal.id}`} className="block">
                  <div className="glass-card p-5 rounded-xl transition-all duration-300 hover:border-primary/30 hover:shadow-premium group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Prazo: {formatDate(goal.deadline)}
                        </p>
                      </div>
                      {getStatusBadge(goal.status)}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{formatCurrency(goal.currentAmount)}</span>
                        <span className="font-medium text-foreground">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <p className="text-xs text-right value-highlight font-medium">
                        {progress.toFixed(1)}% concluído
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
