import { AlertTriangle, ArrowDown } from "lucide-react";
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

interface ForceDowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
  currentPlan: string;
  membersCount: number;
}

export default function ForceDowngradeDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
  currentPlan,
  membersCount,
}: ForceDowngradeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-strong border-white/[0.12]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-foreground">Forçar Downgrade</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            <p>
              Você está prestes a rebaixar <strong className="text-foreground">{userName}</strong> do plano{" "}
              <strong className="text-foreground">{currentPlan}</strong> para o plano <strong className="text-foreground">Individual</strong>.
            </p>
            
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <p className="font-medium mb-1">⚠️ Consequências desta ação:</p>
              <ul className="list-disc list-inside space-y-1 text-destructive/90">
                <li>{membersCount > 1 ? `${membersCount - 1} membro(s) serão removidos automaticamente` : "Nenhum membro será afetado"}</li>
                <li>Convites pendentes serão cancelados</li>
                <li>O usuário perderá acesso aos recursos família</li>
                <li>Esta ação não pode ser desfeita automaticamente</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="glass-input hover:bg-white/[0.04]">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Confirmar Downgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
