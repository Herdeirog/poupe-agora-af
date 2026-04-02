import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Users, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface FamilyUpgradeConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanPrice?: number;
}

const FAMILY_PLAN_PRICE = 49.90;
const FAMILY_PLAN_ANNUAL = FAMILY_PLAN_PRICE * 12;

const benefits = [
  'Adicione até 5 membros da família',
  'Todos os recursos do plano anual inclusos',
  'Gestão financeira compartilhada',
  'Permissões personalizadas por membro',
  'Convites por e-mail com segurança',
  'Histórico de atividades da família',
];

export function FamilyUpgradeConfirmModal({
  open,
  onOpenChange,
  currentPlanPrice = 29.90,
}: FamilyUpgradeConfirmModalProps) {
  const { formatCurrency } = useFormatCurrency();

  const monthlySavings = FAMILY_PLAN_PRICE - currentPlanPrice;
  const annualTotal = FAMILY_PLAN_ANNUAL;

  const handleConfirm = () => {
    // Mock: simula upgrade
    toast.success('Upgrade realizado com sucesso!', {
      description: 'Você agora tem acesso ao Plano Família.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-accent to-primary">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">Confirmar Upgrade</DialogTitle>
              <DialogDescription>
                Plano Família com até 5 membros
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumo de Preço */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Novo valor mensal</span>
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                <Sparkles className="h-3 w-3 mr-1" />
                Upgrade
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {formatCurrency(FAMILY_PLAN_PRICE)}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total anual: {formatCurrency(annualTotal)}</span>
              {monthlySavings > 0 && (
                <span className="text-destructive">
                  +{formatCurrency(monthlySavings)}/mês
                </span>
              )}
            </div>
          </div>

          {/* Benefícios */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Benefícios inclusos:</h4>
            <ul className="grid grid-cols-1 gap-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Avisos */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">Importante:</p>
              <ul className="mt-1 text-muted-foreground space-y-1">
                <li>• O valor será cobrado imediatamente</li>
                <li>• Seu plano atual será cancelado</li>
                <li>• Você pode cancelar a qualquer momento</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-gradient-to-r from-accent to-primary hover:opacity-90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Confirmar Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
