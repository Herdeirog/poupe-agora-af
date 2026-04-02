import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Calendar, Clock, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReminderTiming, timingLabels } from '@/types/commitmentReminder';

interface ReminderSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitmentTitle: string;
  timing: ReminderTiming;
  customDays?: number;
  nextAlertDate: string;
}

export function ReminderSuccessDialog({
  open,
  onOpenChange,
  commitmentTitle,
  timing,
  customDays,
  nextAlertDate,
}: ReminderSuccessDialogProps) {
  const formattedDate = format(parseISO(nextAlertDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const getTimingDescription = () => {
    if (timing === 'custom' && customDays) {
      return `${customDays} dias antes do vencimento`;
    }
    return timingLabels[timing];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <DialogTitle className="text-xl">Lembrete configurado!</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-center text-muted-foreground">
            Você receberá um aviso via WhatsApp para <strong className="text-foreground">{commitmentTitle}</strong>:
          </p>

          <div className="glass-card rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Próximo aviso</p>
                <p className="font-medium text-foreground">{formattedDate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Antecedência</p>
                <p className="font-medium text-foreground">{getTimingDescription()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Canal</p>
                <p className="font-medium text-foreground">WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
