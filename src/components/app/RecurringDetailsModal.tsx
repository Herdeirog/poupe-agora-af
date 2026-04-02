import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Calendar, Check, X, Clock, ArrowRight, AlertCircle, SkipForward } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecurringTimeline } from './RecurringTimeline';
import { FinancialCommitment, frequencyLabels, RecurringPayment } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RecurringDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: FinancialCommitment | null;
  onMarkPaid?: (id: string) => void;
}

export function RecurringDetailsModal({
  open,
  onOpenChange,
  commitment,
  onMarkPaid,
}: RecurringDetailsModalProps) {
  if (!commitment) return null;

  const { formatCurrency } = useFormatCurrency();

  const {
    id,
    title,
    amount = 0,
    frequency = 'monthly',
    date,
    startDate,
    status,
    isIndefinite,
    recurringPaymentHistory = [],
    totalPaymentsMade = 0,
    totalAmountPaid = 0,
  } = commitment;

  const nextDueDate = parseISO(date);
  const frequencyLabel = frequencyLabels[frequency];
  const isOverdue = status === 'overdue';
  const isCompleted = status === 'completed';

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatShortDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yy", { locale: ptBR });
  };

  // Generate next 3 occurrences
  const nextOccurrences = [0, 1, 2].map(i => {
    const occurrenceDate = addMonths(nextDueDate, i);
    return {
      date: occurrenceDate,
      formattedDate: format(occurrenceDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
      isNext: i === 0,
    };
  });

  // Sort payment history by date descending
  const sortedHistory = [...recurringPaymentHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getStatusIcon = (paymentStatus: RecurringPayment['status']) => {
    switch (paymentStatus) {
      case 'paid':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusLabel = (paymentStatus: RecurringPayment['status']) => {
    switch (paymentStatus) {
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Atrasado';
      case 'skipped':
        return 'Pulado';
      default:
        return 'Pendente';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isOverdue ? "bg-destructive/10" : "bg-primary/10"
            )}>
              <RefreshCw className={cn(
                "h-6 w-6",
                isOverdue ? "text-destructive" : "text-primary"
              )} />
            </div>
            <div>
              <DialogTitle className="text-xl">{title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {frequencyLabel} • {isIndefinite ? 'Indefinido' : 'Por tempo determinado'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                📊 Resumo
              </h4>
              <div className="glass-card rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor Mensal</span>
                    <p className="font-semibold text-foreground">{formatCurrency(amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Frequência</span>
                    <p className="font-semibold text-foreground">{frequencyLabel}</p>
                  </div>
                  {startDate && (
                    <div>
                      <span className="text-muted-foreground">Desde</span>
                      <p className="font-semibold text-foreground">{formatDate(startDate)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-semibold text-foreground">
                      {isOverdue ? 'Atrasado' : isCompleted ? 'Finalizado' : 'Ativo'}
                      {isIndefinite && !isCompleted && ' (indefinido)'}
                    </p>
                  </div>
                </div>
                
                {totalPaymentsMade > 0 && (
                  <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pagamentos</span>
                      <p className="font-semibold text-emerald-600">{totalPaymentsMade} realizados</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Pago</span>
                      <p className="font-semibold text-emerald-600">{formatCurrency(totalAmountPaid)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {startDate && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  📅 Linha do Tempo
                </h4>
                <div className="glass-card rounded-lg p-4">
                  <RecurringTimeline
                    startDate={startDate}
                    paymentHistory={recurringPaymentHistory}
                    size="full"
                    monthsToShow={12}
                  />
                  <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Pago</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-primary/30" />
                      <span>Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      <span>Atrasado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 border border-muted-foreground/30" />
                      <span>Futuro</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Occurrences */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                📅 Próximas Ocorrências
              </h4>
              <div className="glass-card rounded-lg divide-y divide-border/50">
                {nextOccurrences.map((occurrence, index) => (
                  <div key={index} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        occurrence.isNext 
                          ? (isOverdue ? "bg-destructive/10" : "bg-primary/10")
                          : "bg-muted/50"
                      )}>
                        {occurrence.isNext ? (
                          isOverdue ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-primary" />
                          )
                        ) : (
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          occurrence.isNext ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {occurrence.formattedDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                      <Badge variant={occurrence.isNext ? (isOverdue ? "destructive" : "default") : "secondary"}>
                        {occurrence.isNext ? (isOverdue ? 'Atrasado' : 'Próximo') : 'Futuro'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment History */}
            {sortedHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  📋 Histórico de Pagamentos
                </h4>
                <div className="glass-card rounded-lg divide-y divide-border/50 max-h-48 overflow-y-auto">
                  {sortedHistory.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {formatShortDate(payment.date)}
                          </p>
                          {payment.paidAt && (
                            <p className="text-xs text-muted-foreground">
                              Pago em {formatShortDate(payment.paidAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                        <Badge 
                          variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}
                          className={payment.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          {onMarkPaid && !isCompleted && (
            <Button 
              onClick={() => onMarkPaid(id)}
              variant={isOverdue ? "destructive" : "default"}
            >
              <Check className="h-4 w-4 mr-2" />
              {isOverdue ? 'Regularizar Pagamento' : 'Registrar Pagamento'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
