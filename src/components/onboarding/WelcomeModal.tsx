import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Target, 
  TrendingUp, 
  Lightbulb, 
  ChevronRight, 
  ChevronLeft,
  Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  open: boolean;
  onComplete: () => void;
}

const slides = [
  {
    icon: Wallet,
    title: 'Controle suas finanças',
    description: 'Registre suas receitas e despesas de forma rápida e organize suas finanças pessoais em um só lugar.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Target,
    title: 'Alcance suas metas',
    description: 'Defina objetivos financeiros e acompanhe seu progresso. Seja uma viagem, reserva de emergência ou um sonho.',
    color: 'text-user-info',
    bgColor: 'bg-user-info/10',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe seu score',
    description: 'Monitore sua saúde financeira com nosso score inteligente que analisa seus hábitos e gastos.',
    color: 'text-user-warning',
    bgColor: 'bg-user-warning/10',
  },
  {
    icon: Lightbulb,
    title: 'Receba insights',
    description: 'Dicas personalizadas baseadas no seu perfil para economizar mais e gastar melhor.',
    color: 'text-user-success',
    bgColor: 'bg-user-success/10',
  },
];

export function WelcomeModal({ open, onComplete }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md glass-strong border-border/30 p-0 overflow-hidden">
        <div className="relative">
          {/* Header decoration */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent" />
          
          <div className="relative p-8 pt-12">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={cn(
                'w-20 h-20 rounded-2xl flex items-center justify-center animate-scale-in',
                slide.bgColor
              )}>
                <Icon className={cn('w-10 h-10', slide.color)} />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-3 mb-8 animate-fade-in" key={currentSlide}>
              <h2 className="text-2xl font-bold text-foreground">{slide.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{slide.description}</p>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentSlide
                      ? 'w-6 bg-primary'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>

              <Button
                onClick={handleNext}
                className="btn-premium flex items-center gap-2"
              >
                {isLastSlide ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Começar
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
