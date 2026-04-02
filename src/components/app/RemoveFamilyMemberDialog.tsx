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
import { FamilyMember } from '@/types/familyPlan';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface RemoveFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: FamilyMember | null;
  onConfirm: () => void;
}

export function RemoveFamilyMemberDialog({ open, onOpenChange, member, onConfirm }: RemoveFamilyMemberDialogProps) {
  const handleConfirm = () => {
    if (member) {
      toast.success(`${member.name} foi removido da conta familiar`);
      onConfirm();
    }
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Remover Membro
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja remover <strong>{member.name}</strong> da sua conta familiar?
            </p>
            <p className="text-muted-foreground">
              Esta pessoa perderá acesso imediatamente a todos os dados financeiros compartilhados.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover membro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
