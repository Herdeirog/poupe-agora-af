import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InstallmentTimeline } from './InstallmentTimeline';
import { FinancialCommitment, InstallmentPayment } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface InstallmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: FinancialCommitment | null;
  onMarkPaid?: (id: string) => void;
}

export function InstallmentDetailsModal({
  open,
  onOpenChange,
  commitment,
  onMarkPaid,
}: InstallmentDetailsModalProps) {
  const { formatCurrency } = useFormatCurrency();
  
  if (!commitment) return null;

  const {
    title,
    amount = 0,
    currentInstallment = 1,
    totalInstallments = 1,
    startDate,
    date,
    status,
    installmentHistory,
  } = commitment;

  const totalValue = amount * totalInstallments;
  const paidInstallments = currentInstallment - 1;
  const paidValue = amount * paidInstallments;
  const remainingValue = totalValue - paidValue;
  const remainingInstallments = totalInstallments - paidInstallments;

  // Generate installment history if not provided
  const getInstallmentHistory = (): InstallmentPayment[] => {
    if (installmentHistory && installmentHistory.length > 0) {
      return installmentHistory;
    }

    // Generate mock history based on current state
    const history: InstallmentPayment[] = [];
    const start = startDate ? parseISO(startDate) : parseISO(date);

    for (let i = 1; i <= totalInstallments; i++) {
      const installmentDate = addMonths(start, i - 1);
      let installmentStatus: 'paid' | 'pending' | 'overdue' = 'pending';
      
      if (i < currentInstallment) {
        installmentStatus = 'paid';
      } else if (i === currentInstallment && status === 'overdue') {
        installmentStatus = 'overdue';
      }

      history.push({
        installment: i,
        date: format(installmentDate, 'yyyy-MM-dd'),
        paidAt: installmentStatus === 'paid' ? format(installmentDate, 'yyyy-MM-dd') : undefined,
        status: installmentStatus,
      });
    }

    return history;
  };

  const history = getInstallmentHistory();
  const startDateFormatted = startDate 
    ? format(parseISO(startDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const endDate = startDate 
    ? addMonths(parseISO(startDate), totalInstallments - 1)
    : addMonths(parseISO(date), totalInstallments - 1);
  const endDateFormatted = format(endDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const isCompleted = currentInstallment > totalInstallments || status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <Badge variant={isCompleted ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}>
              {isCompleted ? 'Concluído' : status === 'overdue' ? 'Atrasado' : 'Em andamento'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Summary Card */}
            <div className="glass-card p-4 rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Resumo Financeiro
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Valor da Parcela</p>
                  <p className="font-semibold text-lg text-foreground">{formatCurrency(amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total de Parcelas</p>
                  <p className="font-semibold text-lg text-foreground">{totalInstallments}x</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-lg text-foreground">{formatCurrency(totalValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Já Pago</p>
                  <p className="font-semibold text-lg text-primary">
                    {formatCurrency(paidValue)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({paidInstallments} parcelas)
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Restante</p>
                  <p className="font-semibold text-lg text-foreground">
                    {formatCurrency(remainingValue)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({remainingInstallments} parcelas)
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Progresso</p>
                  <p className="font-semibold text-lg text-foreground">
                    {Math.round((paidInstallments / totalInstallments) * 100)}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(paidInstallments / totalInstallments) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="glass-card p-4 rounded-xl space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Data de Início</p>
                  <p className="font-medium text-foreground">{startDateFormatted}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Previsão de Término</p>
                  <p className="font-medium text-foreground">{endDateFormatted}</p>
                </div>
              </div>
            </div>

            {/* Visual Timeline */}
            {totalInstallments <= 12 && (
              <div className="glass-card p-4 rounded-xl space-y-3">
                <h3 className="font-semibold text-foreground">Linha do Tempo</h3>
                <InstallmentTimeline
                  currentInstallment={currentInstallment}
                  totalInstallments={totalInstallments}
                  startDate={startDate || date}
                  size="full"
                />
              </div>
            )}

            {/* Installment History */}
            <div className="glass-card p-4 rounded-xl space-y-3">
              <h3 className="font-semibold text-foreground">Histórico de Parcelas</h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.installment}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg text-sm',
                      item.status === 'paid' && 'bg-primary/10',
                      item.status === 'pending' && item.installment === currentInstallment && 'bg-blue-500/10 border border-blue-500/20',
                      item.status === 'overdue' && 'bg-red-500/10',
                      item.status === 'pending' && item.installment !== currentInstallment && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'paid' ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : item.status === 'overdue' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : item.installment === currentInstallment ? (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          Parcela {item.installment}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(item.date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(amount)}</p>
                      <Badge 
                        variant={
                          item.status === 'paid' ? 'default' : 
                          item.status === 'overdue' ? 'destructive' : 
                          item.installment === currentInstallment ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {item.status === 'paid' ? 'Pago' : 
                         item.status === 'overdue' ? 'Atrasado' : 
                         item.installment === currentInstallment ? 'Atual' : 'Futuro'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {!isCompleted && onMarkPaid && (
            <Button onClick={() => onMarkPaid(commitment.id)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Pagar Parcela Atual
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
