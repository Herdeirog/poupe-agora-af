import { ClipboardList, Wallet, RefreshCw, CreditCard } from 'lucide-react';
import { MonthlySummaryStats } from '@/hooks/useMonthlySummary';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface SummaryStatsCardsProps {
  stats: MonthlySummaryStats;
}

export function SummaryStatsCards({ stats }: SummaryStatsCardsProps) {
  const { formatCurrency } = useFormatCurrency();
  const cards = [
    {
      icon: ClipboardList,
      value: stats.totalCommitments.toString(),
      label: 'Compromissos',
      sublabel: 'neste mês',
      color: 'bg-primary/20 text-primary',
    },
    {
      icon: Wallet,
      value: formatCurrency(stats.totalValue),
      label: 'Valor Total',
      sublabel: 'comprometido',
      color: 'bg-blue-500/20 text-blue-500',
    },
    {
      icon: RefreshCw,
      value: stats.recurringCount.toString(),
      label: 'Recorrentes',
      sublabel: 'ativos',
      color: 'bg-green-500/20 text-green-500',
    },
    {
      icon: CreditCard,
      value: stats.installmentCount.toString(),
      label: 'Parcelados',
      sublabel: 'em andamento',
      color: 'bg-amber-500/20 text-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="glass-card p-4 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02]"
        >
          <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
            <card.icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-foreground truncate">{card.value}</p>
            <p className="text-sm text-muted-foreground">
              {card.label} <span className="hidden sm:inline text-xs">· {card.sublabel}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
