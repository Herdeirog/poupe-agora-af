import { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ptBR } from 'date-fns/locale';
import { Bell, RefreshCw, CreditCard, CalendarDays, MessageCircle, Mail, Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  ReminderTiming, 
  ReminderRecurrenceMode, 
  ReminderChannel,
  CommitmentReminder,
  timingLabels, 
  recurrenceModeLabels 
} from '@/types/commitmentReminder';
import { FinancialCommitment, typeLabels, frequencyLabels } from '@/types/financialCommitment';
import { ReminderSuccessDialog } from './ReminderSuccessDialog';
import { toast } from 'sonner';

interface ReminderConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: FinancialCommitment | null;
  existingReminder?: CommitmentReminder | null;
  onSave?: (config: {
    timing: ReminderTiming;
    customDays?: number;
    recurrenceMode?: ReminderRecurrenceMode;
    channel: ReminderChannel;
    nextAlertDate: string;
  }) => Promise<boolean>;
  onRemove?: () => Promise<boolean>;
}

export function ReminderConfigModal({
  open,
  onOpenChange,
  commitment,
  existingReminder,
  onSave,
  onRemove,
}: ReminderConfigModalProps) {
  const { formatCurrency } = useFormatCurrency();
  const [timing, setTiming] = useState<ReminderTiming>('3_days_before');
  const [customDays, setCustomDays] = useState<number>(5);
  const [recurrenceMode, setRecurrenceMode] = useState<ReminderRecurrenceMode>('all_occurrences');
  const [channel] = useState<ReminderChannel>('whatsapp');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing reminder data when modal opens
  useEffect(() => {
    if (existingReminder) {
      setTiming(existingReminder.timing);
      setCustomDays(existingReminder.customDays || 5);
      setRecurrenceMode(existingReminder.recurrenceMode || 'all_occurrences');
    } else {
      // Reset to defaults for new reminder
      setTiming('3_days_before');
      setCustomDays(5);
      setRecurrenceMode('all_occurrences');
    }
  }, [existingReminder, open]);

  if (!commitment) return null;

  const { title, amount, type, frequency, currentInstallment, totalInstallments, date } = commitment;
  const hasExistingReminder = !!existingReminder;

  const getTypeIcon = () => {
    switch (type) {
      case 'recurring':
        return <RefreshCw className="h-4 w-4" />;
      case 'installment':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getTypeDescription = () => {
    if (type === 'recurring' && frequency) {
      return `Recorrente • ${frequencyLabels[frequency]}`;
    }
    if (type === 'installment' && currentInstallment && totalInstallments) {
      return `Parcela ${currentInstallment}/${totalInstallments}`;
    }
    return typeLabels[type];
  };

  const calculateNextAlertDate = () => {
    const dueDate = parseISO(date);
    let daysToSubtract = 0;
    
    switch (timing) {
      case 'same_day':
        daysToSubtract = 0;
        break;
      case '1_day_before':
        daysToSubtract = 1;
        break;
      case '3_days_before':
        daysToSubtract = 3;
        break;
      case 'custom':
        daysToSubtract = customDays;
        break;
    }
    
    return format(addDays(dueDate, -daysToSubtract), 'yyyy-MM-dd');
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const success = await onSave({
        timing,
        customDays: timing === 'custom' ? customDays : undefined,
        recurrenceMode: type === 'recurring' ? recurrenceMode : undefined,
        channel,
        nextAlertDate: calculateNextAlertDate(),
      });
      
      if (success) {
        onOpenChange(false);
        setShowSuccess(true);
      } else {
        toast.error('Erro ao salvar lembrete');
      }
    } catch (error) {
      toast.error('Erro ao salvar lembrete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    
    setIsSaving(true);
    try {
      const success = await onRemove();
      if (success) {
        toast.success('Lembrete removido');
        onOpenChange(false);
      } else {
        toast.error('Erro ao remover lembrete');
      }
    } catch (error) {
      toast.error('Erro ao remover lembrete');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <DialogTitle>Configurar Lembrete</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Commitment Info Card */}
            <div className="glass-card rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getTypeIcon()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getTypeDescription()} • {amount ? formatCurrency(amount) : 'Valor não definido'}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {typeLabels[type]}
                </Badge>
              </div>
            </div>

            {/* Timing Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                ⏰ Quando avisar
              </Label>
              <RadioGroup value={timing} onValueChange={(v) => setTiming(v as ReminderTiming)}>
                {Object.entries(timingLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-3">
                    <RadioGroupItem value={value} id={`timing-${value}`} />
                    <Label 
                      htmlFor={`timing-${value}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                    {value === 'custom' && timing === 'custom' && (
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={customDays}
                          onChange={(e) => setCustomDays(Number(e.target.value))}
                          className="w-16 h-8"
                        />
                        <span className="text-sm text-muted-foreground">dias antes</span>
                      </div>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Recurrence Mode - Only for recurring type */}
            {type === 'recurring' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    ⚙️ Para compromissos recorrentes
                  </Label>
                  <RadioGroup value={recurrenceMode} onValueChange={(v) => setRecurrenceMode(v as ReminderRecurrenceMode)}>
                    {Object.entries(recurrenceModeLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-3">
                        <RadioGroupItem value={value} id={`recurrence-${value}`} />
                        <Label 
                          htmlFor={`recurrence-${value}`} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Channel Selection */}
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                📲 Canal de notificação
              </Label>
              <div className="space-y-2">
                {/* WhatsApp - Active */}
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2",
                  "border-emerald-500/50 bg-emerald-500/10"
                )}>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Receba lembretes direto no seu WhatsApp</p>
                  </div>
                  <Badge variant="default" className="bg-emerald-500 text-white">
                    Ativo
                  </Badge>
                </div>

                {/* Email - Disabled */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 opacity-50 cursor-not-allowed">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground">E-mail</p>
                    <p className="text-xs text-muted-foreground">Em breve</p>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    Em breve
                  </Badge>
                </div>

                {/* Push - Disabled */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 opacity-50 cursor-not-allowed">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground">Push</p>
                    <p className="text-xs text-muted-foreground">Em breve</p>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    Em breve
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            {hasExistingReminder && (
              <Button 
                variant="outline" 
                onClick={handleRemove} 
                className="text-destructive hover:bg-destructive/10"
                disabled={isSaving}
              >
                Desativar
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Bell className="h-4 w-4 mr-2" />
              {hasExistingReminder ? 'Atualizar' : 'Ativar'} Lembrete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <ReminderSuccessDialog
        open={showSuccess}
        onOpenChange={setShowSuccess}
        commitmentTitle={title}
        timing={timing}
        customDays={timing === 'custom' ? customDays : undefined}
        nextAlertDate={calculateNextAlertDate()}
      />
    </>
  );
}
