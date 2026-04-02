import { useState, useMemo } from 'react';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserCategories } from '@/hooks/useUserCategories';
import { useUserReminders } from '@/hooks/useUserReminders';
import { useFinancialCommitments } from '@/hooks/useFinancialCommitments';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { FinancialCalendar } from '@/components/app/FinancialCalendar';
import { CalendarDayDetails } from '@/components/app/CalendarDayDetails';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ArrowUpRight, ArrowDownRight, Bell, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { statusLabels } from '@/types/financialCommitment';

export default function AppCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { transactions } = useUserTransactions();
  const { categories } = useUserCategories();
  const { reminders } = useUserReminders();
  const { commitments } = useFinancialCommitments();
  const { formatCurrency } = useFormatCurrency();

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthTransactions = transactions.filter(tx =>
      isSameMonth(new Date(tx.date), currentMonth)
    );

    const income = monthTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = monthTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const transactionCount = monthTransactions.length;

    return { income, expense, balance: income - expense, transactionCount };
  }, [transactions, currentMonth]);

  // Monthly reminders
  const monthlyReminders = useMemo(() => {
    return reminders.filter(r => {
      if (r.status !== 'active') return false;
      const reminderDate = r.nextExecution ? new Date(r.nextExecution) : new Date(r.date);
      return isSameMonth(reminderDate, currentMonth);
    });
  }, [reminders, currentMonth]);

  // Monthly commitments
  const monthlyCommitments = useMemo(() => {
    return commitments.filter(c => {
      if (c.status === 'completed') return false;
      return isSameMonth(new Date(c.date), currentMonth);
    });
  }, [commitments, currentMonth]);

  const overdueCommitments = monthlyCommitments.filter(c => c.status === 'overdue');
  const pendingCommitments = monthlyCommitments.filter(c => c.status === 'pending');



  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setDetailsOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground">Calendário Financeiro</h1>
        <p className="text-muted-foreground">Visualize suas finanças por dia</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 glass-card p-4 rounded-xl fade-in">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-user-danger animate-pulse" />
          <span className="text-sm text-muted-foreground">Compromisso atrasado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-user-warning" />
          <span className="text-sm text-muted-foreground">Compromisso pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Receita maior</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-400" />
          <span className="text-sm text-muted-foreground">Despesa maior</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-user-info" />
          <span className="text-sm text-muted-foreground">Lembrete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 fade-in-up">
          <FinancialCalendar
            transactions={transactions}
            recurringTransactions={[]}
            reminders={reminders}
            commitments={commitments}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Monthly Summary */}
          <div className="glass-strong p-6 rounded-2xl fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-circle icon-circle-info">
                <Calendar className="h-5 w-5 text-user-info" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {monthlySummary.transactionCount} transações
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between glass-card p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Receitas</span>
                </div>
                <span className="font-semibold value-highlight">
                  {formatCurrency(monthlySummary.income)}
                </span>
              </div>

              <div className="flex items-center justify-between glass-card p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-user-danger" />
                  <span className="text-sm text-muted-foreground">Despesas</span>
                </div>
                <span className="font-semibold value-danger">
                  {formatCurrency(monthlySummary.expense)}
                </span>
              </div>

              <div className="flex items-center justify-between glass-card p-3 rounded-xl border-primary/30 border">
                <span className="text-sm font-medium text-foreground">Saldo</span>
                <span className={cn(
                  'font-bold text-lg',
                  monthlySummary.balance >= 0 ? 'value-highlight' : 'value-danger'
                )}>
                  {monthlySummary.balance >= 0 ? '+' : ''}{formatCurrency(monthlySummary.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Commitments */}
          {monthlyCommitments.length > 0 && (
            <div className="glass-strong p-6 rounded-2xl fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "icon-circle",
                  overdueCommitments.length > 0 ? "icon-circle-danger" : "icon-circle-warning"
                )}>
                  {overdueCommitments.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-user-danger" />
                  ) : (
                    <FileText className="h-5 w-5 text-user-warning" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Compromissos</h3>
                  <p className="text-xs text-muted-foreground">
                    {overdueCommitments.length > 0 && (
                      <span className="text-user-danger">{overdueCommitments.length} atrasado(s), </span>
                    )}
                    {pendingCommitments.length} pendente(s)
                  </p>
                </div>
              </div>

              {overdueCommitments.length > 0 && (
                <div className="glass-card p-3 rounded-xl border border-user-danger/30 mb-3">
                  <div className="flex items-center gap-2 text-user-danger text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Atenção: {overdueCommitments.length} compromisso(s) em atraso!</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {monthlyCommitments.slice(0, 3).map(c => (
                  <div key={c.id} className={cn(
                    "flex justify-between text-sm glass-card p-2 rounded-lg border-l-2",
                    c.status === 'overdue' ? 'border-user-danger' : 'border-user-warning'
                  )}>
                    <span className="text-foreground truncate max-w-[50%]">{c.title}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs",
                        c.status === 'overdue' ? 'text-user-danger' : 'text-muted-foreground'
                      )}>
                        {statusLabels[c.status]}
                      </span>
                      <span className="text-foreground">
                        {format(new Date(c.date), 'dd/MM')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {monthlyCommitments.length > 3 && (
                <Link to="/app/agenda" className="text-primary text-xs hover:underline mt-3 inline-block">
                  Ver todos os {monthlyCommitments.length} compromissos
                </Link>
              )}
            </div>
          )}

          {/* Monthly Reminders */}
          {monthlyReminders.length > 0 && (
            <div className="glass-strong p-6 rounded-2xl fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="icon-circle icon-circle-info">
                  <Bell className="h-5 w-5 text-user-info" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Lembretes</h3>
                  <p className="text-xs text-muted-foreground">
                    {monthlyReminders.length} agendado(s) este mês
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {monthlyReminders.slice(0, 3).map(r => (
                  <div key={r.id} className="flex justify-between text-sm glass-card p-2 rounded-lg">
                    <span className="text-muted-foreground truncate max-w-[60%]">{r.description}</span>
                    <span className="text-foreground">
                      {format(new Date(r.nextExecution || r.date), 'dd/MM')}
                    </span>
                  </div>
                ))}
              </div>

              {monthlyReminders.length > 3 && (
                <Link to="/app/reminders" className="text-primary text-xs hover:underline mt-3 inline-block">
                  Ver todos os {monthlyReminders.length} lembretes
                </Link>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Day Details Drawer */}
      <CalendarDayDetails
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        selectedDate={selectedDate}
        transactions={transactions}
        recurringTransactions={[]}
        reminders={reminders}
        categories={categories}
        commitments={commitments}
      />
    </div>
  );
}
