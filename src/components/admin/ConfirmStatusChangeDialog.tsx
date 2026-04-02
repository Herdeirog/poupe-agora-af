import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, XCircle, Pause } from "lucide-react";

interface ConfirmStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "suspender" | "cancelar";
  userName: string;
  onConfirm: () => void;
  loading?: boolean;
}

const actionConfig = {
  suspender: {
    title: "Suspender Assinatura",
    description: (name: string) =>
      `Tem certeza que deseja suspender a assinatura de ${name}? O acesso será bloqueado temporariamente até a reativação.`,
    icon: Pause,
    confirmText: "Suspender",
    confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  cancelar: {
    title: "Cancelar Assinatura",
    description: (name: string) =>
      `Tem certeza que deseja cancelar a assinatura de ${name}? Esta ação é irreversível e o usuário perderá o acesso aos recursos premium.`,
    icon: XCircle,
    confirmText: "Cancelar Assinatura",
    confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
};

export function ConfirmStatusChangeDialog({
  open,
  onOpenChange,
  action,
  userName,
  onConfirm,
  loading,
}: ConfirmStatusChangeDialogProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass border-border/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${action === 'cancelar' ? 'bg-destructive/20' : 'bg-yellow-500/20'}`}>
              <Icon className={`h-5 w-5 ${action === 'cancelar' ? 'text-destructive' : 'text-yellow-500'}`} />
            </div>
            <AlertDialogTitle className="text-foreground">
              {config.title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground pt-2">
            {config.description(userName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-2 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {action === 'cancelar' 
                ? 'Após o cancelamento, o usuário precisará realizar uma nova assinatura para recuperar o acesso.'
                : 'O usuário poderá ser reativado a qualquer momento pelo painel administrativo.'
              }
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="glass-input">
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={config.confirmClass}
          >
            {config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
