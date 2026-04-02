import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReminderIconButtonProps {
  hasReminder: boolean;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function ReminderIconButton({ 
  hasReminder, 
  onClick, 
  className,
  size = 'default'
}: ReminderIconButtonProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
              buttonSize,
              hasReminder && "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10",
              !hasReminder && "text-muted-foreground hover:text-foreground",
              className
            )}
          >
            {hasReminder ? (
              <Bell className={cn(iconSize, "fill-current")} />
            ) : (
              <BellOff className={iconSize} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasReminder ? 'Lembrete ativo' : 'Configurar lembrete'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
