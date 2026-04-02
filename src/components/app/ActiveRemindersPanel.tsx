import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  Pause, 
  Play, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  CreditCard, 
  CalendarDays,
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  CommitmentReminder, 
  timingLabels 
} from '@/types/commitmentReminder';
import { useCommitmentReminders } from '@/hooks/useCommitmentReminders';
import { toast } from 'sonner';

interface ActiveRemindersPanelProps {
  onEditReminder?: (reminder: CommitmentReminder) => void;
  className?: string;
}

export function ActiveRemindersPanel({ 
  onEditReminder,
  className 
}: ActiveRemindersPanelProps) {
  const { 
    reminders, 
    loading, 
    stats, 
    toggleStatus, 
    deleteReminder,
    loadReminders 
  } = useCommitmentReminders();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const getTypeIcon = (type: CommitmentReminder['commitmentType']) => {
    switch (type) {
      case 'recurring':
        return <RefreshCw className="h-4 w-4" />;
      case 'installment':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: CommitmentReminder['commitmentType']) => {
    switch (type) {
      case 'recurring':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
            <RefreshCw className="h-3 w-3 mr-1" />
            Recorrente
          </Badge>
        );
      case 'installment':
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            <CreditCard className="h-3 w-3 mr-1" />
            Parcelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            <CalendarDays className="h-3 w-3 mr-1" />
            Único
          </Badge>
        );
    }
  };

  const handleTogglePause = async (id: string) => {
    setTogglingId(id);
    try {
      const result = await toggleStatus(id);
      if (result) {
        toast.success(result.status === 'active' ? 'Lembrete ativado!' : 'Lembrete pausado');
      } else {
        toast.error('Erro ao alterar status');
      }
    } catch (error) {
      toast.error('Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteReminder(deletingId);
      if (success) {
        toast.success('Lembrete removido');
      } else {
        toast.error('Erro ao remover lembrete');
      }
    } catch (error) {
      toast.error('Erro ao remover lembrete');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleEdit = (reminder: CommitmentReminder) => {
    onEditReminder?.(reminder);
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Lembretes Ativos</h2>
          </div>
        </div>
        <div className="glass-card rounded-xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Carregando lembretes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Lembretes Ativos</h2>
        </div>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum lembrete configurado
          </h3>
          <p className="text-muted-foreground">
            Configure lembretes nos seus compromissos para ser avisado antes do vencimento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div 
              key={reminder.id} 
              className={cn(
                "glass-card rounded-xl p-4 transition-all",
                reminder.status === 'paused' && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left - Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    reminder.status === 'active' ? "bg-primary/10" : "bg-muted"
                  )}>
                    {getTypeIcon(reminder.commitmentType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {reminder.commitmentTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {getTypeBadge(reminder.commitmentType)}
                      <span className="text-sm text-muted-foreground">
                        📅 Aviso: {format(parseISO(reminder.nextAlertDate), "dd/MM", { locale: ptBR })}
                      </span>
                      <Badge 
                        variant={reminder.status === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs",
                          reminder.status === 'active' && "bg-emerald-500"
                        )}
                      >
                        {reminder.status === 'active' ? '✓ Ativo' : '⏸️ Pausado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timingLabels[reminder.timing]}
                    </p>
                  </div>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(reminder)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleTogglePause(reminder.id)}
                    disabled={togglingId === reminder.id}
                  >
                    {togglingId === reminder.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : reminder.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 text-emerald-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {reminders.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg py-3">
          <Info className="h-4 w-4" />
          <span>
            {stats.active} lembrete{stats.active !== 1 ? 's' : ''} ativo{stats.active !== 1 ? 's' : ''}
            {stats.paused > 0 && ` • ${stats.paused} pausado${stats.paused !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              O lembrete será desativado e você não receberá mais avisos para este compromisso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
