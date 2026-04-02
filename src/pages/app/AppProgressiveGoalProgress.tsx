import { useParams, Link } from 'react-router-dom';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  PiggyBank,
  ArrowLeft,
  Sparkles,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPresentationMode } from '@/lib/presentationMode';
import { useProgressiveGoal } from '@/hooks/useProgressiveGoals';
import { useGoalReminder } from '@/hooks/useGoalReminders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useCelebration } from '@/hooks/useCelebration';
import { ProgressiveGoalChart } from '@/components/app/ProgressiveGoalChart';
import { GoalReminderCard } from '@/components/app/GoalReminderCard';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function AppProgressiveGoalProgress() {
  const { id } = useParams<{ id: string }>();
  const { 
    goal, 
    weeks,
    displayWeeks,
    loading,
    regenerating,
    needsWeekRegeneration,
    regenerateWeeks,
    markAsPaid,
    paidWeekNumbers,
    totalPaid,
    grandTotal,
    currentWeekValue,
    remaining,
    progressPercent,
  } = useProgressiveGoal(id || '');
  
  const {
    reminder,
    loading: reminderLoading,
    createReminder,
    updateReminder,
    removeReminder,
    toggleStatus,
  } = useGoalReminder(id || '');
  
  const { formatCurrency, formatNumber, symbol } = useFormatCurrency();
  const { celebrate } = useCelebration();
  const [markingPaid, setMarkingPaid] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  // Auto-regenerar semanas faltantes
  useEffect(() => {
    if (needsWeekRegeneration && !regenerating) {
      regenerateWeeks().then(success => {
        if (success) {
          toast.success('Semanas da meta foram criadas automaticamente');
        }
      });
    }
  }, [needsWeekRegeneration, regenerating, regenerateWeeks]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getWeekStatus = (weekNumber: number) => {
    if (paidWeekNumbers.includes(weekNumber)) return 'paid';
    if (goal && weekNumber === goal.currentWeek) return 'current';
    return 'pending';
  };

  const isCurrentWeekPaid = goal ? paidWeekNumbers.includes(goal.currentWeek) : false;

  const handleMarkAsPaid = async () => {
    if (!goal || isCurrentWeekPaid) return;
    
    setMarkingPaid(true);
    try {
      const success = await markAsPaid(goal.currentWeek);
      if (success) {
        celebrate();
        setJustPaid(true);
        toast.success(`Semana ${goal.currentWeek} marcada como paga!`);
        // Remover feedback inline após 3s
        setTimeout(() => setJustPaid(false), 3000);
      } else {
        toast.error('Erro ao marcar semana como paga');
      }
    } catch (error) {
      toast.error('Erro ao marcar semana como paga');
    } finally {
      setMarkingPaid(false);
    }
  };

  // Generate payment history from paid weeks
  const paidWeeksData = weeks
    .filter(w => w.status === 'paid')
    .sort((a, b) => b.weekNumber - a.weekNumber);

  if (loading || regenerating) {
    return (
      <div className="space-y-4 pb-8 px-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Target className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Meta não encontrada</h2>
        <p className="text-muted-foreground">Esta meta progressiva não existe ou foi removida.</p>
        <Link to="/app/goals">
          <Button>Voltar para Metas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <AppBreadcrumb 
        items={[
          { label: 'Metas', href: '/app/goals' },
          { label: goal.title }
        ]} 
      />

      {/* Header Compacto */}
      <div className="flex items-center gap-3 fade-in">
        <Link to="/app/goals">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{goal.title}</h1>
          <p className="text-xs text-muted-foreground">
            Semana {goal.currentWeek} de {goal.totalWeeks} • Meta Progressiva
          </p>
        </div>
      </div>

      {/* BLOCO HERO - Ação Principal (Mobile-First) */}
      {goal.status === 'active' && goal.currentWeek <= goal.totalWeeks && (
        <div className="glass-strong p-5 sm:p-6 rounded-2xl fade-in-up border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          {/* Semana Atual + Valor */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-2">
              <span className="text-2xl font-bold text-primary">{goal.currentWeek}</span>
            </div>
            <p className="text-sm text-muted-foreground">Semana atual</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-1">
              {formatCurrency(currentWeekValue)}
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="mb-4">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{progressPercent.toFixed(0)}% completo</span>
              <span>{paidWeekNumbers.length}/{goal.totalWeeks} semanas</span>
            </div>
          </div>

          {/* Feedback de Sucesso Inline */}
          {justPaid && (
            <div className="mb-3 p-3 rounded-lg bg-primary/20 border border-primary/30 text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                <CheckCircle className="h-5 w-5" />
                <span>Pagamento da semana confirmado!</span>
              </div>
            </div>
          )}

          {/* Botão Principal Grande */}
          <Button 
            className={cn(
              "w-full text-base py-6 font-bold rounded-xl transition-all",
              isCurrentWeekPaid 
                ? "bg-muted text-muted-foreground cursor-default" 
                : "btn-premium shadow-lg hover:shadow-xl hover:scale-[1.02]"
            )}
            onClick={handleMarkAsPaid}
            disabled={markingPaid || isPresentationMode() || isCurrentWeekPaid}
          >
            {markingPaid ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processando...
              </>
            ) : isCurrentWeekPaid ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                ✓ Semana paga
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Marcar semana como PAGA
              </>
            )}
          </Button>
        </div>
      )}

      {/* Meta Concluída */}
      {goal.status === 'completed' && (
        <div className="glass-strong p-6 rounded-2xl fade-in-up border-2 border-primary/50 bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Meta Concluída! 🎉</h2>
            <p className="text-muted-foreground">
              Você completou todas as {goal.totalWeeks} semanas!
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards Compactos - Secundário */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-strong p-3 rounded-xl text-center fade-in-up">
          <Clock className="h-4 w-4 text-user-warning mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Esta semana</p>
          <p className="text-sm font-bold text-foreground">{symbol} {formatNumber(currentWeekValue)}</p>
        </div>
        <div className="glass-strong p-3 rounded-xl text-center fade-in-up">
          <PiggyBank className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Poupado</p>
          <p className="text-sm font-bold value-highlight">{symbol} {formatNumber(totalPaid)}</p>
        </div>
        <div className="glass-strong p-3 rounded-xl text-center fade-in-up">
          <Target className="h-4 w-4 text-user-info mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Restante</p>
          <p className="text-sm font-bold text-foreground">{symbol} {formatNumber(remaining)}</p>
        </div>
      </div>

      {/* Histórico de Pagamentos - Colapsável (Primeiro porque é mais relevante) */}
      <details className="glass-strong rounded-xl fade-in-up group">
        <summary className="p-4 cursor-pointer list-none flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Histórico de semanas ({paidWeeksData.length} pagas)
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          {paidWeeksData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nenhuma semana paga ainda
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paidWeeksData.map((week) => (
                <div 
                  key={week.id}
                  className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Semana {week.weekNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {week.paidAt ? formatDate(week.paidAt) : ''}
                    </span>
                  </div>
                  <span className="text-sm font-semibold value-highlight">{formatCurrency(week.weekValue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Timeline Completa - Colapsável */}
      <details className="glass-strong rounded-xl fade-in-up group">
        <summary className="p-4 cursor-pointer list-none flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Ver todas as {goal.totalWeeks} semanas
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          {/* Legenda */}
          <div className="flex gap-3 text-xs mb-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary"></div>
              <span className="text-muted-foreground">Pago</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-user-warning border border-primary"></div>
              <span className="text-muted-foreground">Atual</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-muted"></div>
              <span className="text-muted-foreground">Pendente</span>
            </div>
          </div>
          
          {/* Grid de Semanas */}
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
            {displayWeeks.map((week) => {
              const status = getWeekStatus(week.weekNumber);
              return (
                <div
                  key={week.id}
                  className={cn(
                    "relative p-1.5 rounded text-center text-[10px]",
                    status === 'paid' && "bg-primary text-primary-foreground",
                    status === 'current' && "bg-user-warning/30 border border-primary",
                    status === 'pending' && "bg-muted/50 text-muted-foreground"
                  )}
                  title={`Semana ${week.weekNumber}: ${formatCurrency(week.weekValue)}`}
                >
                  <div className="font-semibold">{week.weekNumber}</div>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      {/* Gráfico de Evolução - Colapsável */}
      <details className="glass-strong rounded-xl fade-in-up group">
        <summary className="p-4 cursor-pointer list-none flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Gráfico de evolução</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <ProgressiveGoalChart
            weeks={displayWeeks}
            totalWeeks={goal.totalWeeks}
            initialValue={goal.initialValue}
            paidWeekNumbers={paidWeekNumbers}
          />
        </div>
      </details>

      {/* Lembrete Semanal - Colapsável */}
      {!isPresentationMode() && (
        <details className="glass-strong rounded-xl fade-in-up group">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-user-warning" />
              <span className="text-sm font-medium text-foreground">Lembrete semanal</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 border-t border-border/50 pt-3">
            <GoalReminderCard
              reminder={reminder}
              loading={reminderLoading}
              onCreateReminder={createReminder}
              onUpdateReminder={updateReminder}
              onRemoveReminder={removeReminder}
              onToggleStatus={toggleStatus}
            />
          </div>
        </details>
      )}
    </div>
  );
}
