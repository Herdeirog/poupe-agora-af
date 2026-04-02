import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, AlertTriangle, RefreshCw, CreditCard, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CommitmentType } from '@/types/financialCommitment';
import { DueItem, DueStatus } from '@/hooks/useMonthlySummary';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface UpcomingDueListProps {
  items: DueItem[];
}

const statusConfig: Record<DueStatus, { bg: string; icon: typeof Calendar; iconColor: string; badge: string }> = {
  overdue: {
    bg: 'bg-red-500/10 border-l-4 border-l-red-500',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    badge: 'destructive',
  },
  soon: {
    bg: 'bg-amber-500/10 border-l-4 border-l-amber-500',
    icon: Clock,
    iconColor: 'text-amber-500',
    badge: 'outline',
  },
  upcoming: {
    bg: 'bg-muted/30 border-l-4 border-l-primary/50',
    icon: Calendar,
    iconColor: 'text-primary',
    badge: 'secondary',
  },
};

const typeIcons: Record<CommitmentType, typeof Wallet> = {
  unique: Wallet,
  recurring: RefreshCw,
  installment: CreditCard,
};

export function UpcomingDueList({ items }: UpcomingDueListProps) {
  const { formatCurrency } = useFormatCurrency();
  
  if (items.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          📋 Próximos Vencimentos
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum vencimento próximo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        📋 Próximos Vencimentos
      </h3>
      
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          const TypeIcon = typeIcons[item.type];
          
          return (
            <div 
              key={item.id}
              className={`p-3 rounded-lg ${config.bg} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`h-4 w-4 ${config.iconColor}`} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {format(parseISO(item.date), "d 'de' MMM", { locale: ptBR })}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {item.typeLabel}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">{formatCurrency(item.amount)}</p>
                  {item.status === 'overdue' && (
                    <Badge variant="destructive" className="text-[10px] mt-1">
                      Atrasado
                    </Badge>
                  )}
                  {item.status === 'soon' && (
                    <Badge variant="outline" className="text-[10px] mt-1 border-amber-500 text-amber-500">
                      Em breve
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
