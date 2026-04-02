import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { UserTransaction } from '@/types/userTransaction';
import { RecurringTransaction } from '@/types/recurringTransaction';
import { Reminder } from '@/types/userReminder';
import { UserCategory } from '@/types/userCategory';
import { FinancialCommitment, statusLabels, typeLabels } from '@/types/financialCommitment';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Bell, MessageCircle, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CalendarDayDetailsProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | undefined;
  transactions: UserTransaction[];
  recurringTransactions: RecurringTransaction[];
  reminders: Reminder[];
  categories: UserCategory[];
  commitments?: FinancialCommitment[];
}

const recurrenceLabels: Record<string, string> = {
  once: 'Único',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

export function CalendarDayDetails({
  open,
  onClose,
  selectedDate,
  transactions,
  recurringTransactions,
  reminders,
  categories,
  commitments = [],
}: CalendarDayDetailsProps) {
  const { formatCurrency } = useFormatCurrency();

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(tx => isSameDay(new Date(tx.date), selectedDate));
  }, [transactions, selectedDate]);

  const dayRecurring = useMemo(() => {
    if (!selectedDate) return [];
    return recurringTransactions.filter(rt => 
      rt.isActive && isSameDay(new Date(rt.nextDueDate), selectedDate)
    );
  }, [recurringTransactions, selectedDate]);

  const dayReminders = useMemo(() => {
    if (!selectedDate) return [];
    return reminders.filter(r => {
      if (r.status !== 'active') return false;
      const reminderDate = r.nextExecution ? new Date(r.nextExecution) : new Date(r.date);
      return isSameDay(reminderDate, selectedDate);
    });
  }, [reminders, selectedDate]);

  const dayCommitments = useMemo(() => {
    if (!selectedDate) return [];
    return commitments.filter(c => isSameDay(new Date(c.date), selectedDate));
  }, [commitments, selectedDate]);

  const summary = useMemo(() => {
    const income = dayTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = dayTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, balance: income - expense };
  }, [dayTransactions]);

  if (!selectedDate) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md glass-strong border-l border-border/50">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <Calendar className="h-5 w-5 text-user-info" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground font-normal">
                {format(selectedDate, 'yyyy')}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 rounded-xl text-center">
              <ArrowUpRight className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-sm font-semibold value-highlight">
                {formatCurrency(summary.income)}
              </p>
            </div>
            <div className="glass-card p-3 rounded-xl text-center">
              <ArrowDownRight className="h-4 w-4 text-user-danger mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-sm font-semibold value-danger">
                {formatCurrency(summary.expense)}
              </p>
            </div>
            <div className="glass-card p-3 rounded-xl text-center">
              <span className={cn(
                'text-lg font-bold',
                summary.balance >= 0 ? 'value-highlight' : 'value-danger'
              )}>
                {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
              </span>
              <p className="text-xs text-muted-foreground">Saldo</p>
            </div>
          </div>

          {/* Financial Commitments */}
          {dayCommitments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-user-warning" />
                Compromissos ({dayCommitments.length})
              </h4>
              <div className="space-y-2">
                {dayCommitments.map((c) => (
                  <Link 
                    key={c.id}
                    to="/app/agenda"
                    className={cn(
                      "flex items-center justify-between glass-card p-3 rounded-xl border-l-2 hover:border-opacity-80 transition-colors block",
                      c.status === 'overdue' ? 'border-user-danger' : 
                      c.status === 'pending' ? 'border-user-warning' : 'border-primary'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {c.status === 'overdue' && <AlertTriangle className="h-3 w-3 text-user-danger" />}
                        <p className="font-medium text-sm text-foreground truncate">{c.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          c.status === 'overdue' ? 'text-user-danger border-user-danger/30' :
                          c.status === 'pending' ? 'text-user-warning border-user-warning/30' :
                          'text-primary border-primary/30'
                        )}>
                          {statusLabels[c.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[c.type]}
                          {c.type === 'installment' && c.currentInstallment && c.totalInstallments && 
                            ` ${c.currentInstallment}/${c.totalInstallments}`
                          }
                        </Badge>
                      </div>
                    </div>
                    {c.amount && (
                      <span className="font-semibold text-sm text-foreground ml-2">
                        {formatCurrency(c.amount)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Due */}
          {dayRecurring.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500" />
                Vencimentos Recorrentes
              </h4>
              <div className="space-y-2">
                {dayRecurring.map((rt) => (
                  <div key={rt.id} className="flex items-center justify-between glass-card p-3 rounded-xl border-l-2 border-amber-500">
                    <div>
                      <p className="font-medium text-sm text-foreground">{rt.title}</p>
                      <p className="text-xs text-muted-foreground">{getCategoryName(rt.categoryId)}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      rt.type === 'income' ? 'text-primary' : 'text-user-danger'
                    )}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reminders */}
          {dayReminders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-user-info" />
                Lembretes ({dayReminders.length})
              </h4>
              <div className="space-y-2">
                {dayReminders.map((reminder) => (
                  <Link 
                    key={reminder.id}
                    to="/app/reminders"
                    className="flex items-center justify-between glass-card p-3 rounded-xl border-l-2 border-user-info hover:border-user-info/80 transition-colors block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {reminder.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {recurrenceLabels[reminder.recurrence] || reminder.recurrence}
                        </Badge>
                        {reminder.origin === 'whatsapp' && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Badge>
                        )}
                      </div>
                    </div>
                    {reminder.amount && (
                      <span className="font-semibold text-sm text-foreground ml-2">
                        {formatCurrency(reminder.amount)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Transações ({dayTransactions.length})
            </h4>
            
            {dayTransactions.length === 0 ? (
              <div className="glass-card p-6 rounded-xl text-center">
                <p className="text-muted-foreground text-sm">
                  Nenhuma transação neste dia
                </p>
                <Link 
                  to="/app/transactions/new" 
                  className="text-primary text-sm hover:underline mt-2 inline-block"
                >
                  Adicionar transação
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {dayTransactions.map((tx) => (
                  <Link 
                    key={tx.id} 
                    to={`/app/transactions/${tx.id}`}
                    className="flex items-center justify-between glass-card p-3 rounded-xl hover:border-border/50 transition-colors block"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'icon-circle w-8 h-8',
                        tx.type === 'income' ? 'icon-circle-success' : 'icon-circle-danger'
                      )}>
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-user-danger" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryName(tx.categoryId)}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'font-semibold text-sm',
                      tx.type === 'income' ? 'value-highlight' : 'value-danger'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
