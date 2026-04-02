import { Copy, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const shortcuts = [
  { label: 'Registrar despesa', example: 'Gastei 50 no mercado' },
  { label: 'Registrar receita', example: 'Recebi 1200' },
  { label: 'Despesa transporte', example: 'Despesa 100 transporte' },
  { label: 'Ver saldo', example: 'Como está meu saldo?' },
  { label: 'Ver metas', example: 'Quais são minhas metas?' },
  { label: 'Resumo da semana', example: 'Resumo semanal' },
];

export function WhatsAppShortcuts() {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.',
    });
  };

  return (
    <div className="glass-strong p-6 rounded-2xl fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="icon-circle icon-circle-success">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Atalhos WhatsApp</h3>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl glass-card',
              'transition-all duration-200 hover:border-primary/30 green-glow-hover group'
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Zap className="h-4 w-4 text-primary shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{shortcut.label}</p>
                <p className="text-sm font-medium truncate text-foreground">{shortcut.example}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => handleCopy(shortcut.example)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Copie e envie via WhatsApp para registrar rapidamente
      </p>
    </div>
  );
}
