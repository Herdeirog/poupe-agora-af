import { useMemo } from 'react';
import { format, parseISO, subMonths, addMonths, isSameMonth, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RecurringPayment } from '@/types/financialCommitment';

interface RecurringTimelineProps {
  startDate: string;
  paymentHistory?: RecurringPayment[];
  size?: 'compact' | 'full';
  monthsToShow?: number;
}

export function RecurringTimeline({
  startDate,
  paymentHistory = [],
  size = 'compact',
  monthsToShow,
}: RecurringTimelineProps) {
  const defaultMonths = size === 'compact' ? 7 : 12;
  const months = monthsToShow || defaultMonths;

  const timelineData = useMemo(() => {
    const today = new Date();
    const currentMonth = startOfMonth(today);
    const start = parseISO(startDate);
    
    // Generate months to display (centered around current month)
    const monthsBefore = Math.floor(months / 2);
    const result = [];
    
    for (let i = -monthsBefore; i < months - monthsBefore; i++) {
      const monthDate = addMonths(currentMonth, i);
      
      // Skip months before start date
      if (isBefore(monthDate, startOfMonth(start))) {
        continue;
      }
      
      // Find payment for this month
      const payment = paymentHistory.find(p => 
        isSameMonth(parseISO(p.date), monthDate)
      );
      
      const isCurrentMonth = isSameMonth(monthDate, today);
      const isPast = isBefore(monthDate, currentMonth) && !isCurrentMonth;
      
      let status: 'paid' | 'current' | 'overdue' | 'future' | 'skipped' = 'future';
      
      if (payment) {
        if (payment.status === 'paid') status = 'paid';
        else if (payment.status === 'overdue') status = 'overdue';
        else if (payment.status === 'skipped') status = 'skipped';
        else if (isCurrentMonth) status = 'current';
      } else if (isCurrentMonth) {
        status = 'current';
      } else if (isPast) {
        // Past month without payment record - assume paid or unknown
        status = 'paid';
      }
      
      result.push({
        date: monthDate,
        label: format(monthDate, 'MMM', { locale: ptBR }),
        fullLabel: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
        status,
        payment,
      });
    }
    
    return result.slice(0, months);
  }, [startDate, paymentHistory, months]);

  if (size === 'compact') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 justify-center">
          {timelineData.map((month, index) => (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                month.status === 'paid' && "bg-emerald-500",
                month.status === 'current' && "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                month.status === 'overdue' && "bg-destructive",
                month.status === 'skipped' && "bg-muted-foreground/30",
                month.status === 'future' && "bg-muted-foreground/20 border border-muted-foreground/30"
              )}
              title={`${month.fullLabel} - ${
                month.status === 'paid' ? 'Pago' :
                month.status === 'current' ? 'Atual' :
                month.status === 'overdue' ? 'Atrasado' :
                month.status === 'skipped' ? 'Pulado' : 'Futuro'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 justify-center">
          {timelineData.map((month, index) => (
            <span 
              key={index} 
              className={cn(
                "text-[9px] w-3 text-center capitalize",
                month.status === 'current' ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {month.label.charAt(0)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Full size timeline
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        {timelineData.map((month, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded-full transition-all",
                month.status === 'paid' && "bg-emerald-500",
                month.status === 'current' && "bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                month.status === 'overdue' && "bg-destructive animate-pulse",
                month.status === 'skipped' && "bg-muted-foreground/30",
                month.status === 'future' && "bg-muted-foreground/20 border border-muted-foreground/30"
              )}
            />
            {/* Connecting line */}
            {index < timelineData.length - 1 && (
              <div className="absolute h-0.5 bg-muted-foreground/20 w-full -z-10" />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-2">
        {timelineData.map((month, index) => (
          <span 
            key={index} 
            className={cn(
              "text-xs capitalize text-center",
              month.status === 'current' ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {month.label}
          </span>
        ))}
      </div>
    </div>
  );
}
