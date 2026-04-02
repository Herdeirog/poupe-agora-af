import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  active: boolean;
  onComplete: () => void;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="stats"]',
    title: 'Visão geral',
    description: 'Aqui você vê um resumo das suas finanças: receitas, despesas e saldo atual.',
    position: 'bottom',
  },
  {
    target: '[data-tour="score"]',
    title: 'Score Financeiro',
    description: 'Seu score é calculado com base nos seus hábitos. Quanto maior, melhor sua saúde financeira!',
    position: 'bottom',
  },
  {
    target: '[data-tour="budget"]',
    title: 'Controle de Orçamento',
    description: 'Acompanhe quanto já gastou do seu orçamento mensal e receba alertas quando estiver perto do limite.',
    position: 'top',
  },
  {
    target: '[data-tour="insights"]',
    title: 'Insights Inteligentes',
    description: 'Dicas personalizadas baseadas no seu perfil para ajudar você a economizar mais.',
    position: 'top',
  },
];

export function GuidedTour({ active, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;

    const updatePosition = () => {
      const step = tourSteps[currentStep];
      const target = document.querySelector(step.target);
      
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'bottom':
            top = rect.bottom + 12;
            left = rect.left + rect.width / 2;
            break;
          case 'top':
            top = rect.top - 12;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - 12;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + 12;
            break;
        }

        setPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [active, currentStep]);

  if (!active) return null;

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getTooltipStyle = () => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
    };

    switch (step.position) {
      case 'bottom':
        style.top = position.top;
        style.left = position.left;
        style.transform = 'translateX(-50%)';
        break;
      case 'top':
        style.bottom = window.innerHeight - position.top;
        style.left = position.left;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.top = position.top;
        style.right = window.innerWidth - position.left;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.top = position.top;
        style.left = position.left;
        style.transform = 'translateY(-50%)';
        break;
    }

    return style;
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/60 z-[999]" />
      
      {/* Highlight */}
      {targetRect && (
        <div
          className="fixed z-[1000] border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(46, 245, 152, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        key={currentStep}
        style={getTooltipStyle()}
        className="glass-strong p-4 rounded-xl w-80 animate-fade-in"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-foreground">{step.title}</h4>
          <button
            onClick={onComplete}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} de {tourSteps.length}
            </span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={onComplete}
              className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
            >
              Pular tutorial
            </Button>
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="bg-primary text-primary-foreground">
              {isLastStep ? 'Concluir' : 'Próximo'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
