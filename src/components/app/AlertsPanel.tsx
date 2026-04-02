import { AlertTriangle, Clock, CreditCard, Info } from 'lucide-react';
import { AlertData } from '@/hooks/useMonthlySummary';

interface AlertsPanelProps {
  alerts: AlertData;
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const alertItems = [
    {
      type: 'danger' as const,
      icon: AlertTriangle,
      count: alerts.overdueCount,
      message: 'compromisso(s) atrasado(s) que precisam de atenção',
      show: alerts.overdueCount > 0,
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-500/10',
      iconColor: 'text-red-500',
      countBg: 'bg-red-500',
    },
    {
      type: 'warning' as const,
      icon: Clock,
      count: alerts.dueSoonCount,
      message: 'vencimento(s) nos próximos 5 dias',
      show: alerts.dueSoonCount > 0,
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      countBg: 'bg-amber-500',
    },
    {
      type: 'info' as const,
      icon: CreditCard,
      count: alerts.activeInstallmentsCount,
      message: 'parcela(s) ativa(s) restante(s) no mês',
      show: alerts.activeInstallmentsCount > 0,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      countBg: 'bg-blue-500',
    },
  ].filter(item => item.show);

  if (alertItems.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          ⚠️ Alertas
        </h3>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border-l-4 border-l-green-500">
          <Info className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-foreground">
            Tudo em dia! Nenhum alerta para este mês.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        ⚠️ Alertas
      </h3>
      
      <div className="space-y-3">
        {alertItems.map((alert, index) => (
          <div 
            key={index}
            className={`flex items-center gap-3 p-4 rounded-lg ${alert.bgColor} border-l-4 ${alert.borderColor} transition-all hover:scale-[1.01]`}
          >
            <alert.icon className={`h-5 w-5 ${alert.iconColor} shrink-0`} />
            <div className="flex items-center gap-2 flex-1">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${alert.countBg} text-white text-xs font-bold`}>
                {alert.count}
              </span>
              <p className="text-sm text-foreground">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
