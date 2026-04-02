import { useState } from 'react';
import { Bell, BellOff, Clock, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalReminder } from '@/types/progressiveGoal';
import { toast } from 'sonner';

interface GoalReminderCardProps {
  reminder: GoalReminder | null;
  loading: boolean;
  onCreateReminder: (dayOfWeek: number, timeOfDay: string) => Promise<GoalReminder | null>;
  onUpdateReminder: (updates: Partial<{ dayOfWeek: number; timeOfDay: string; status: string }>) => Promise<GoalReminder | null>;
  onRemoveReminder: () => Promise<boolean>;
  onToggleStatus: () => Promise<GoalReminder | null>;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const TIME_OPTIONS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
];

export function GoalReminderCard({
  reminder,
  loading,
  onCreateReminder,
  onUpdateReminder,
  onRemoveReminder,
  onToggleStatus,
}: GoalReminderCardProps) {
  const [saving, setSaving] = useState(false);

  const handleToggleReminder = async () => {
    setSaving(true);
    try {
      if (reminder) {
        const updated = await onToggleStatus();
        if (updated) {
          toast.success(updated.status === 'active' ? 'Lembrete ativado!' : 'Lembrete pausado');
        }
      } else {
        const created = await onCreateReminder(1, '09:00');
        if (created) {
          toast.success('Lembrete semanal criado!');
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar lembrete');
    } finally {
      setSaving(false);
    }
  };

  const handleDayChange = async (value: string) => {
    if (!reminder) return;
    setSaving(true);
    try {
      await onUpdateReminder({ dayOfWeek: parseInt(value) });
      toast.success('Dia do lembrete atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = async (value: string) => {
    if (!reminder) return;
    setSaving(true);
    try {
      await onUpdateReminder({ timeOfDay: value });
      toast.success('Horário do lembrete atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const isActive = reminder?.status === 'active';

  const formatNextAlert = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="glass-strong p-6 rounded-2xl fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {isActive ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <h3 className="text-base font-semibold text-foreground">Lembrete Semanal</h3>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggleReminder}
          disabled={loading || saving}
        />
      </div>

      {reminder && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Dia da semana
              </label>
              <Select
                value={reminder.dayOfWeek.toString()}
                onValueChange={handleDayChange}
                disabled={!isActive || saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Horário
              </label>
              <Select
                value={reminder.timeOfDay}
                onValueChange={handleTimeChange}
                disabled={!isActive || saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isActive && reminder.nextAlertDate && (
            <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
              <Bell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-foreground">Próximo lembrete:</p>
                <p className="text-sm font-medium text-primary capitalize">
                  {formatNextAlert(reminder.nextAlertDate)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!reminder && !loading && (
        <p className="text-sm text-muted-foreground">
          Ative o lembrete para receber notificações semanais via WhatsApp sobre sua meta progressiva.
        </p>
      )}
    </div>
  );
}
