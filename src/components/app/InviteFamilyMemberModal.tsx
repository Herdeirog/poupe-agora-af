import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Mail, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { inviteMember } from '@/services/familyPlanService';

interface InviteFamilyMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingSlots: number;
  familyPlanId: string;
  actorUserId: string;
  actorEmail: string;
  onSuccess?: () => void;
}

export function InviteFamilyMemberModal({ 
  open, 
  onOpenChange, 
  remainingSlots,
  familyPlanId,
  actorUserId,
  actorEmail,
  onSuccess
}: InviteFamilyMemberModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe o email do membro');
      return;
    }

    if (remainingSlots <= 0) {
      toast.error('Limite de membros atingido');
      return;
    }

    if (!familyPlanId) {
      toast.error('Plano familiar não encontrado');
      return;
    }

    setIsSubmitting(true);
    
    const result = await inviteMember(familyPlanId, email, name || undefined, actorUserId, actorEmail);
    
    if (result.success) {
      toast.success(`Convite enviado para ${email}`);
      setEmail('');
      setName('');
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || 'Erro ao enviar convite');
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convidar Membro
          </DialogTitle>
          <DialogDescription>
            Envie um convite para adicionar um novo membro à sua conta familiar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email do membro *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome (opcional)
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Nome do membro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              O membro receberá um convite por email e poderá visualizar todos os dados financeiros da conta familiar.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || remainingSlots <= 0} className="gap-2">
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Enviando...' : 'Enviar convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
