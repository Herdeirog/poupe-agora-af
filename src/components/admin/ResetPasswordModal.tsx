import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { AdminUser } from "@/types/adminUser";
import { toast } from "sonner";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

export function ResetPasswordModal({ open, onOpenChange, user }: ResetPasswordModalProps) {
  const handleConfirm = () => {
    onOpenChange(false);
    toast.info("Funcionalidade de envio de senha será integrada futuramente.", {
      duration: 4000,
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong border-white/[0.12] shadow-premium">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Resetar Senha</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enviar link de redefinição para <strong>{user.nome}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade enviará um email para <strong className="text-foreground">{user.email}</strong> com 
              instruções para redefinir a senha.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="glass-input hover:bg-white/[0.04]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Enviar Reset de Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
