import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReminderBadgeProps {
  hasReminder: boolean;
  className?: string;
}

export function ReminderBadge({ hasReminder, className }: ReminderBadgeProps) {
  if (!hasReminder) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20",
            className
          )}>
            <Bell className="h-3 w-3 text-emerald-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Lembrete ativo</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
