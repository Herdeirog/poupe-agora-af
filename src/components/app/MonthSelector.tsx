import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onMonthChange(subMonths(currentMonth, 1))}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        className="h-9 w-9"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {!isCurrentMonth && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onMonthChange(new Date())}
          className="ml-2"
        >
          Este Mês
        </Button>
      )}
    </div>
  );
}
