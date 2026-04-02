import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Calendar, Eye, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecurringTimeline } from './RecurringTimeline';
import { FinancialCommitment, frequencyLabels } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';
import { ReminderIconButton } from './ReminderIconButton';
import { ReminderBadge } from './ReminderBadge';
import { ReminderConfigModal } from './ReminderConfigModal';
import { useCommitmentReminders } from '@/hooks/useCommitmentReminders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RecurringTimelineCardProps {
  commitment: FinancialCommitment;
  onViewDetails: (commitment: FinancialCommitment) => void;
  onMarkPaid?: (id: string) => void;
  hasReminder?: boolean;
}

export function RecurringTimelineCard({
  commitment,
  onViewDetails,
  onMarkPaid,
  hasReminder: initialHasReminder = false,
}: RecurringTimelineCardProps) {
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const { formatCurrency } = useFormatCurrency();
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
    amount,
    frequency,
    date,
    startDate,
    status,
    isIndefinite,
    recurringPaymentHistory = [],
    totalPaymentsMade = 0,
    totalAmountPaid = 0,
  } = commitment;

  const nextDueDate = parseISO(date);
  const formattedNextDue = format(nextDueDate, "d 'de' MMMM", { locale: ptBR });
  const frequencyLabel = frequency ? frequencyLabels[frequency] : 'Mensal';
  const formattedStartDate = startDate 
    ? format(parseISO(startDate), "MMM/yyyy", { locale: ptBR })
    : null;

  const isOverdue = status === 'overdue';
  const isCompleted = status === 'completed';

  return (
    <div className={cn(
      "glass-card rounded-xl p-5 space-y-4 transition-all hover:shadow-md",
      isOverdue && "border-destructive/50 bg-destructive/5",
      isCompleted && "opacity-60"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isOverdue ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <RefreshCw className={cn(
              "h-5 w-5",
              isOverdue ? "text-destructive" : "text-primary"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <ReminderBadge hasReminder={hasReminder} />
            </div>
            <p className="text-sm text-muted-foreground">
              {frequencyLabel} • {amount ? formatCurrency(amount) : 'Valor não definido'}
              {formattedStartDate && ` • Desde ${formattedStartDate}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ReminderIconButton
            hasReminder={hasReminder}
            onClick={() => setReminderModalOpen(true)}
            size="sm"
          />
          <Badge 
            variant={isOverdue ? "destructive" : isCompleted ? "secondary" : "default"}
            className="shrink-0"
          >
            {isOverdue ? 'Atrasado' : isCompleted ? 'Finalizado' : isIndefinite ? 'Ativo' : 'Em andamento'}
          </Badge>
        </div>
      </div>

      {/* Next due date */}
      <div className={cn(
        "flex items-center gap-2 text-sm",
        isOverdue ? "text-destructive" : "text-muted-foreground"
      )}>
        {isOverdue ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        <span>
          {isOverdue ? 'Venceu em: ' : 'Próximo vencimento: '}
          <strong className={isOverdue ? "text-destructive" : "text-foreground"}>
            {formattedNextDue}
          </strong>
        </span>
      </div>

      {/* Timeline */}
      {startDate && (
        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-2 text-center">Histórico recente:</p>
          <RecurringTimeline
            startDate={startDate}
            paymentHistory={recurringPaymentHistory}
            size="compact"
          />
        </div>
      )}

      {/* Stats */}
      {totalPaymentsMade > 0 && (
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground bg-muted/30 rounded-lg py-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            {totalPaymentsMade} pagamentos realizados • Total: {formatCurrency(totalAmountPaid)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(commitment)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </Button>

        {onMarkPaid && !isCompleted && (
          <Button
            variant={isOverdue ? "destructive" : "default"}
            size="sm"
            onClick={() => onMarkPaid(commitment.id)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isOverdue ? 'Regularizar' : 'Registrar Pagamento'}
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
