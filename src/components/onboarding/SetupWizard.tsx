import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet, 
  Target, 
  ArrowRight, 
  Check,
  ChevronLeft,
  Sparkles,
  PiggyBank
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBudget } from '@/hooks/useBudget';
import { useUserGoals } from '@/hooks/useUserGoals';
import { toast } from '@/hooks/use-toast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface SetupWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  { id: 'budget', title: 'Orçamento', icon: Wallet },
  { id: 'goal', title: 'Meta', icon: Target },
  { id: 'complete', title: 'Pronto', icon: Check },
];

export function SetupWizard({ open, onComplete, onSkip }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  
  const { updateBudget } = useBudget();
  const { createGoal } = useUserGoals();
  const { formatCurrency, symbol } = useFormatCurrency();
  const { currencyInfo } = useCurrencyContext();

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleBudgetSubmit = () => {
    if (budgetAmount) {
      const amount = parseFloat(budgetAmount.replace(/[^\d,]/g, '').replace(',', '.'));
      if (amount > 0) {
        updateBudget({ monthlyLimit: amount });
        toast({
          title: 'Orçamento definido!',
          description: `Seu limite mensal é de ${formatCurrency(amount)}`,
        });
      }
    }
    setCurrentStep(1);
  };

  const handleGoalSubmit = () => {
    if (goalTitle && goalAmount) {
      const amount = parseFloat(goalAmount.replace(/[^\d,]/g, '').replace(',', '.'));
      if (amount > 0) {
        createGoal({
          title: goalTitle,
          targetAmount: amount,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          categoryId: '',
        });
        toast({
          title: 'Meta criada!',
          description: `"${goalTitle}" foi adicionada às suas metas`,
        });
      }
    }
    setCurrentStep(2);
  };

  const handleComplete = () => {
    onComplete();
    toast({
      title: '🎉 Configuração concluída!',
      description: 'Seu app está pronto para uso',
    });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const formatInputValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers) / 100;
    return amount.toLocaleString(currencyInfo.locale, {
      minimumFractionDigits: currencyInfo.decimalPlaces,
      maximumFractionDigits: currencyInfo.decimalPlaces,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg glass-strong border-border/30 p-0 overflow-hidden">
        {/* Header with progress */}
        <div className="p-6 pb-4 border-b border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Configuração Inicial</h2>
                <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length}</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tudo
            </button>
          </div>

          <Progress value={progress} className="h-2" />

          {/* Steps indicator */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary/20 text-primary border-2 border-primary',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}>
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm hidden sm:block',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Defina seu orçamento</h3>
                <p className="text-muted-foreground mt-2">
                  Quanto você deseja gastar por mês? Isso nos ajuda a acompanhar suas despesas.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Limite mensal de gastos</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{symbol}</span>
                  <Input
                    id="budget"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(formatInputValue(e.target.value))}
                    placeholder="0,00"
                    className="pl-10 glass-input text-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                  Pular etapa
                </Button>
                <Button className="flex-1 btn-premium" onClick={handleBudgetSubmit}>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-user-info/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-user-info" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Crie sua primeira meta</h3>
                <p className="text-muted-foreground mt-2">
                  Qual é seu objetivo financeiro? Pode ser uma viagem, reserva ou qualquer sonho.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goalTitle">Nome da meta</Label>
                  <Input
                    id="goalTitle"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Ex: Viagem, Reserva de emergência..."
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goalAmount">Valor da meta</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{symbol}</span>
                    <Input
                      id="goalAmount"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(formatInputValue(e.target.value))}
                      placeholder="0,00"
                      className="pl-10 glass-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button className="flex-1 btn-premium" onClick={handleGoalSubmit}>
                  {goalTitle ? 'Criar meta' : 'Pular etapa'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground">Tudo pronto!</h3>
                <p className="text-muted-foreground mt-2">
                  Seu app está configurado e pronto para uso. Comece a registrar suas transações!
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl text-left space-y-3">
                <p className="text-sm font-medium text-foreground">Próximos passos:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Adicione suas primeiras transações
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Explore as categorias personalizáveis
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Acompanhe seu score financeiro
                  </li>
                </ul>
              </div>

              <Button className="w-full btn-premium" onClick={handleComplete}>
                <Sparkles className="w-4 h-4 mr-2" />
                Começar a usar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
