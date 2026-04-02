import { useEffect } from "react";
import { Lock, Unlock, Pause, Play, RefreshCw, Unplug, Link, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminControls } from "@/hooks/useAdminControls";
import { Badge } from "@/components/ui/badge";

interface AdminActionsPanelProps {
  userId: string;
  onActionComplete?: () => void;
}

export default function AdminActionsPanel({ userId, onActionComplete }: AdminActionsPanelProps) {
  const {
    controlState,
    loading,
    loadControlState,
    toggleAgendaBlock,
    toggleRemindersPause,
    resetReminders,
    toggleGoogleDisable,
  } = useAdminControls(userId);

  useEffect(() => {
    if (userId) {
      loadControlState();
    }
  }, [userId, loadControlState]);

  const handleAction = async (action: () => Promise<void | boolean>) => {
    await action();
    onActionComplete?.();
  };

  const actions = [
    {
      id: 'block_agenda',
      label: controlState?.agendaBlocked ? 'Desbloquear Agenda' : 'Bloquear Agenda',
      icon: controlState?.agendaBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />,
      warning: controlState?.agendaBlocked 
        ? 'O usuário voltará a ter acesso à agenda financeira.'
        : 'Remove acesso à agenda financeira. O usuário não poderá criar ou visualizar compromissos.',
      variant: controlState?.agendaBlocked ? 'default' : 'destructive' as const,
      action: toggleAgendaBlock,
      isActive: controlState?.agendaBlocked,
    },
    {
      id: 'pause_reminders',
      label: controlState?.remindersPaused ? 'Reativar Lembretes' : 'Pausar Lembretes',
      icon: controlState?.remindersPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />,
      warning: controlState?.remindersPaused
        ? 'Os lembretes serão reativados e o usuário voltará a receber notificações.'
        : 'Para todos os lembretes ativos. O usuário não receberá notificações até reativar.',
      variant: 'default' as const,
      action: toggleRemindersPause,
      isActive: controlState?.remindersPaused,
    },
    {
      id: 'reset_reminders',
      label: 'Reconfigurar Lembretes',
      icon: <RefreshCw className="h-4 w-4" />,
      warning: 'Força nova configuração de lembretes. Todas as configurações atuais serão DELETADAS.',
      variant: 'destructive' as const,
      action: resetReminders,
      isActive: false,
    },
    {
      id: 'disconnect_google',
      label: controlState?.googleDisabled ? 'Reativar Google' : 'Desativar Google',
      icon: controlState?.googleDisabled ? <Link className="h-4 w-4" /> : <Unplug className="h-4 w-4" />,
      warning: controlState?.googleDisabled
        ? 'A integração com Google Agenda será reabilitada para o usuário.'
        : 'Desconecta a integração com Google Agenda. Sincronização será interrompida.',
      variant: controlState?.googleDisabled ? 'default' : 'destructive' as const,
      action: toggleGoogleDisable,
      isActive: controlState?.googleDisabled,
    },
  ];

  if (!controlState && loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Ações Administrativas</h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-3"
          >
            <div className="flex items-center justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={action.variant === 'destructive' && !action.isActive ? 'destructive' : 'outline'}
                    className={action.variant === 'default' || action.isActive ? 'flex-1 glass-input hover:bg-white/[0.04]' : 'flex-1'}
                    disabled={loading}
                  >
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass border-white/[0.12]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Confirmar Ação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a executar: <strong>{action.label}</strong>
                      <br /><br />
                      {action.warning}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="glass-input">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAction(action.action)}
                      className={action.variant === 'destructive' && !action.isActive
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {action.isActive && (
                <Badge variant="outline" className="ml-2 badge-ativo">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
              {action.warning}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
