import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface InstallmentTimelineProps {
  currentInstallment: number;
  totalInstallments: number;
  startDate?: string;
  size?: 'compact' | 'full';
}

export function InstallmentTimeline({
  currentInstallment,
  totalInstallments,
  startDate,
  size = 'compact',
}: InstallmentTimelineProps) {
  const installments = Array.from({ length: totalInstallments }, (_, i) => i + 1);
  
  const getInstallmentStatus = (installment: number) => {
    if (installment < currentInstallment) return 'paid';
    if (installment === currentInstallment) return 'current';
    return 'future';
  };

  const getInstallmentDate = (installment: number) => {
    if (!startDate) return null;
    try {
      const start = parseISO(startDate);
      const date = addMonths(start, installment - 1);
      return format(date, 'MMM', { locale: ptBR });
    } catch {
      return null;
    }
  };

  if (size === 'compact') {
    // Show max 12 items, compress if more
    const displayCount = Math.min(totalInstallments, 12);
    const showEllipsis = totalInstallments > 12;
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          {installments.slice(0, displayCount).map((num) => {
            const status = getInstallmentStatus(num);
            return (
              <div
                key={num}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all',
                  status === 'paid' && 'bg-primary text-primary-foreground',
                  status === 'current' && 'bg-blue-500 text-white ring-2 ring-blue-500/30 ring-offset-1 ring-offset-background',
                  status === 'future' && 'bg-muted text-muted-foreground'
                )}
              >
                {status === 'paid' ? '✓' : num}
              </div>
            );
          })}
          {showEllipsis && (
            <span className="text-muted-foreground text-xs">+{totalInstallments - 12}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" /> Pago
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> Atual
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted" /> Futuro
          </span>
        </div>
      </div>
    );
  }

  // Full size with dates
  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-muted" />
        
        {/* Progress line */}
        <div 
          className="absolute top-3 left-3 h-0.5 bg-primary transition-all"
          style={{ 
            width: `calc(${((currentInstallment - 1) / (totalInstallments - 1)) * 100}% - 12px)` 
          }}
        />
        
        {/* Installment dots */}
        <div className="relative flex justify-between">
          {installments.map((num) => {
            const status = getInstallmentStatus(num);
            const dateLabel = getInstallmentDate(num);
            
            return (
              <div key={num} className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium z-10 transition-all',
                    status === 'paid' && 'bg-primary text-primary-foreground',
                    status === 'current' && 'bg-blue-500 text-white ring-2 ring-blue-500/30',
                    status === 'future' && 'bg-muted text-muted-foreground border border-border'
                  )}
                >
                  {status === 'paid' ? '✓' : num}
                </div>
                {dateLabel && (
                  <span className="text-[10px] text-muted-foreground mt-1 capitalize">
                    {dateLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" /> Pago
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> Atual
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted border border-border" /> Futuro
        </span>
      </div>
    </div>
  );
}
