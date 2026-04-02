import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { UserTransaction } from '@/types/userTransaction';
import { RecurringTransaction } from '@/types/recurringTransaction';
import { Reminder } from '@/types/userReminder';
import { FinancialCommitment } from '@/types/financialCommitment';
import { cn } from '@/lib/utils';
import { format, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialCalendarProps {
  transactions: UserTransaction[];
  recurringTransactions: RecurringTransaction[];
  reminders: Reminder[];
  commitments?: FinancialCommitment[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function FinancialCalendar({
  transactions,
  recurringTransactions,
  reminders,
  commitments = [],
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
}: FinancialCalendarProps) {
  // Calculate daily summaries for the current month
  const dailySummaries = useMemo(() => {
    const summaries = new Map<string, { 
      income: number; 
      expense: number; 
      hasRecurring: boolean; 
      hasReminder: boolean;
      hasPendingCommitment: boolean;
      hasOverdueCommitment: boolean;
    }>();
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = startOfDay(new Date());
    
    // Initialize all days
    daysInMonth.forEach(day => {
      summaries.set(format(day, 'yyyy-MM-dd'), { 
        income: 0, 
        expense: 0, 
        hasRecurring: false, 
        hasReminder: false,
        hasPendingCommitment: false,
        hasOverdueCommitment: false,
      });
    });
    
    // Add transactions
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isSameMonth(txDate, currentMonth)) {
        const key = format(txDate, 'yyyy-MM-dd');
        const existing = summaries.get(key);
        if (existing) {
          if (tx.type === 'income') {
            existing.income += tx.amount;
          } else {
            existing.expense += tx.amount;
          }
          summaries.set(key, existing);
        }
      }
    });
    
    // Mark days with recurring transactions
    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;
      const dueDate = new Date(rt.nextDueDate);
      if (isSameMonth(dueDate, currentMonth)) {
        const key = format(dueDate, 'yyyy-MM-dd');
        const existing = summaries.get(key);
        if (existing) {
          existing.hasRecurring = true;
          summaries.set(key, existing);
        }
      }
    });

    // Mark days with reminders
    reminders.forEach(r => {
      if (r.status !== 'active') return;
      const reminderDate = r.nextExecution ? new Date(r.nextExecution) : new Date(r.date);
      if (isSameMonth(reminderDate, currentMonth)) {
        const key = format(reminderDate, 'yyyy-MM-dd');
        const existing = summaries.get(key);
        if (existing) {
          existing.hasReminder = true;
          summaries.set(key, existing);
        }
      }
    });

    // Mark days with commitments
    commitments.forEach(c => {
      if (c.status === 'completed') return;
      const commitmentDate = new Date(c.date);
      if (isSameMonth(commitmentDate, currentMonth)) {
        const key = format(commitmentDate, 'yyyy-MM-dd');
        const existing = summaries.get(key);
        if (existing) {
          const isOverdue = c.status === 'overdue' || (c.status === 'pending' && isBefore(startOfDay(commitmentDate), today));
          if (isOverdue) {
            existing.hasOverdueCommitment = true;
          } else if (c.status === 'pending') {
            existing.hasPendingCommitment = true;
          }
          summaries.set(key, existing);
        }
      }
    });
    
    return summaries;
  }, [transactions, recurringTransactions, reminders, commitments, currentMonth]);

  const getDayIndicator = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    const summary = dailySummaries.get(key);
    
    if (!summary) return null;
    
    const hasActivity = summary.income > 0 || summary.expense > 0;
    const isPositive = summary.income > summary.expense;
    const isNegative = summary.expense > summary.income;
    
    return (
      <div className="flex gap-0.5 justify-center mt-1">
        {summary.hasOverdueCommitment && (
          <span className="w-1.5 h-1.5 rounded-full bg-user-danger animate-pulse" />
        )}
        {summary.hasPendingCommitment && !summary.hasOverdueCommitment && (
          <span className="w-1.5 h-1.5 rounded-full bg-user-warning" />
        )}
        {summary.hasRecurring && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        )}
        {summary.hasReminder && (
          <span className="w-1.5 h-1.5 rounded-full bg-user-info" />
        )}
        {hasActivity && isPositive && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        )}
        {hasActivity && isNegative && (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        )}
      </div>
    );
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelectDate}
      month={currentMonth}
      onMonthChange={onMonthChange}
      locale={ptBR}
      className="glass-strong rounded-2xl p-4 pointer-events-auto"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-foreground capitalize",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-lg",
          "hover:bg-muted transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full",
          "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          "h-12 w-full p-0 font-normal aria-selected:opacity-100 rounded-lg",
          "hover:bg-muted transition-colors flex flex-col items-center justify-start pt-1"
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground ring-1 ring-primary/30",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
      }}
      components={{
        DayContent: ({ date }) => (
          <div className="flex flex-col items-center">
            <span>{date.getDate()}</span>
            {getDayIndicator(date)}
          </div>
        ),
      }}
    />
  );
}
