import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MoreVertical, 
  Check, 
  Pencil, 
  Trash2, 
  MessageCircle, 
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FinancialCommitment, 
  frequencyLabels,
  originLabels 
} from '@/types/financialCommitment';
import { ReminderIconButton } from './ReminderIconButton';
import { ReminderConfigModal } from './ReminderConfigModal';
import { useCommitmentReminders } from '@/hooks/useCommitmentReminders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ReminderTiming, ReminderRecurrenceMode, ReminderChannel } from '@/types/commitmentReminder';

interface CommitmentCardProps {
  commitment: FinancialCommitment;
  onMarkComplete?: (id: string) => void;
  onEdit?: (commitment: FinancialCommitment) => void;
  onDelete?: (id: string) => void;
  hasReminder?: boolean;
}

export function CommitmentCard({ 
  commitment, 
  onMarkComplete, 
  onEdit, 
  onDelete,
  hasReminder: initialHasReminder = false 
}: CommitmentCardProps) {
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  const { 
    hasReminderForCommitment, 
    getReminderByCommitmentId, 
    createReminder, 
    updateReminder,
    deleteReminder 
  } = useCommitmentReminders();
  
  const existingReminder = getReminderByCommitmentId(commitment.id);
  const hasReminder = !!existingReminder || initialHasReminder;

  const { 
    id, 
    title, 
    time, 
    amount, 
    type, 
    status, 
    origin, 
    frequency,
    currentInstallment, 
    totalInstallments 
  } = commitment;

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getTypeBadge = () => {
    if (type === 'installment' && currentInstallment && totalInstallments) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">
          {currentInstallment}/{totalInstallments}
        </Badge>
      );
    }
    if (type === 'recurring' && frequency) {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
          {frequencyLabels[frequency]}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
        Único
      </Badge>
    );
  };

  const getOriginBadge = () => {
    const baseClasses = "text-xs";
    switch (origin) {
      case 'whatsapp':
        return (
          <Badge variant="outline" className={cn(baseClasses, "bg-green-500/10 text-green-400 border-green-500/30")}>
            <MessageCircle className="h-3 w-3 mr-1" />
            WhatsApp
          </Badge>
        );
      case 'google':
        return (
          <Badge variant="outline" className={cn(baseClasses, "bg-blue-500/10 text-blue-400 border-blue-500/30")}>
            <CalendarIcon className="h-3 w-3 mr-1" />
            Google
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={cn(baseClasses, "text-muted-foreground")}>
            Manual
          </Badge>
        );
    }
  };

  return (
    <div className={cn(
      "glass-card p-4 rounded-xl transition-all duration-200 hover:shadow-md",
      status === 'completed' && "opacity-60"
    )}>
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Status indicator and info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status indicator */}
          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getStatusColor())} />
          
          {/* Title and time */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-medium text-foreground truncate",
              status === 'completed' && "line-through"
            )}>
              {title}
            </p>
            {time && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{time}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Badges, amount, actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Type badge */}
          {getTypeBadge()}
          
          {/* Amount */}
          {amount !== undefined && (
            <span className="font-bold text-foreground min-w-[100px] text-right">
              {formatCurrency(amount)}
            </span>
          )}
          
          {/* Origin badge */}
          <div className="hidden sm:block">
            {getOriginBadge()}
          </div>

          {/* Reminder button */}
          <ReminderIconButton
            hasReminder={hasReminder}
            onClick={() => setReminderModalOpen(true)}
            size="sm"
          />
          
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status !== 'completed' && (
                <DropdownMenuItem onClick={() => onMarkComplete?.(id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como pago
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit?.(commitment)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Reminder Config Modal */}
      <ReminderConfigModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        commitment={commitment}
        existingReminder={existingReminder}
        onSave={async (config) => {
          if (existingReminder) {
            const result = await updateReminder(existingReminder.id, config);
            return !!result;
          } else {
            const result = await createReminder({
              commitmentId: commitment.id,
              ...config,
            });
            return !!result;
          }
        }}
        onRemove={existingReminder ? async () => {
          return await deleteReminder(existingReminder.id);
        } : undefined}
      />
    </div>
  );
}
