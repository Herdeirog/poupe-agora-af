import { useState } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, CreditCard, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstallmentTimeline } from './InstallmentTimeline';
import { FinancialCommitment } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';
import { ReminderIconButton } from './ReminderIconButton';
import { ReminderBadge } from './ReminderBadge';
import { ReminderConfigModal } from './ReminderConfigModal';
import { useCommitmentReminders } from '@/hooks/useCommitmentReminders';

interface InstallmentTimelineCardProps {
  commitment: FinancialCommitment;
  onViewDetails: (commitment: FinancialCommitment) => void;
  onMarkPaid?: (id: string) => void;
  hasReminder?: boolean;
}

export function InstallmentTimelineCard({
  commitment,
  onViewDetails,
  onMarkPaid,
  hasReminder: initialHasReminder = false,
}: InstallmentTimelineCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const { 
    getReminderByCommitmentId, 
    createReminder, 
    updateReminder,
    deleteReminder 
  } = useCommitmentReminders();
  
  const existingReminder = getReminderByCommitmentId(commitment.id);
  const hasReminder = !!existingReminder || initialHasReminder;
  const { 
    title, 
    amount = 0, 
    currentInstallment = 1, 
    totalInstallments = 1,
    startDate,
    date,
    status
  } = commitment;

  const totalValue = amount * totalInstallments;
  const paidValue = amount * (currentInstallment - 1);
  const remainingValue = totalValue - paidValue;
  const progressPercent = ((currentInstallment - 1) / totalInstallments) * 100;

  // Calculate next due date
  const getNextDueDate = () => {
    if (startDate) {
      try {
        const start = parseISO(startDate);
        const nextDate = addMonths(start, currentInstallment - 1);
        return format(nextDate, "d 'de' MMMM", { locale: ptBR });
      } catch {
        return format(parseISO(date), "d 'de' MMMM", { locale: ptBR });
      }
    }
    return format(parseISO(date), "d 'de' MMMM", { locale: ptBR });
  };

  const isCompleted = currentInstallment > totalInstallments || status === 'completed';
  const isOverdue = status === 'overdue';

  return (
    <div className={cn(
      'glass-card p-4 rounded-xl space-y-4 transition-all hover:shadow-md',
      isOverdue && 'border-l-4 border-l-red-500',
      isCompleted && 'border-l-4 border-l-primary opacity-75'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isCompleted ? 'bg-primary/20' : isOverdue ? 'bg-red-500/20' : 'bg-yellow-500/20'
          )}>
            <CreditCard className={cn(
              'h-5 w-5',
              isCompleted ? 'text-primary' : isOverdue ? 'text-red-500' : 'text-yellow-500'
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <ReminderBadge hasReminder={hasReminder} />
            </div>
            <p className="text-sm text-muted-foreground">
              Parcela {currentInstallment} de {totalInstallments}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReminderIconButton
            hasReminder={hasReminder}
            onClick={() => setReminderModalOpen(true)}
            size="sm"
          />
          <Badge variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
            {isCompleted ? 'Concluído' : isOverdue ? 'Atrasado' : 'Em andamento'}
          </Badge>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground">Parcela</p>
          <p className="font-semibold text-foreground">{formatCurrency(amount)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Total</p>
          <p className="font-semibold text-foreground">{formatCurrency(totalValue)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Restante</p>
          <p className="font-semibold text-foreground">{formatCurrency(remainingValue)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Next due date */}
      {!isCompleted && (
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Próximo vencimento:</span>
          <span className={cn(
            'font-medium',
            isOverdue ? 'text-red-500' : 'text-foreground'
          )}>
            {getNextDueDate()}
          </span>
        </div>
      )}

      {/* Timeline */}
      <InstallmentTimeline
        currentInstallment={currentInstallment}
        totalInstallments={totalInstallments}
        startDate={startDate || date}
        size="compact"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(commitment)}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </Button>
        {!isCompleted && onMarkPaid && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onMarkPaid(commitment.id)}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Pagar Parcela
          </Button>
        )}
      </div>

      {/* Reminder Config Modal */}
      <ReminderConfigModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        commitment={commitment}
        existingReminder={existingReminder}
        onSave={async (config) => {
          if (existingReminder) {
            const result = await updateReminder(existingReminder.id, config);
            return !!result;
          } else {
            const result = await createReminder({
              commitmentId: commitment.id,
              ...config,
            });
            return !!result;
          }
        }}
        onRemove={existingReminder ? async () => {
          return await deleteReminder(existingReminder.id);
        } : undefined}
      />
    </div>
  );
}
