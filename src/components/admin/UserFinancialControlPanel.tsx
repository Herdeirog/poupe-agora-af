import { useEffect } from "react";
import { Calendar, CreditCard, Bell, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserFinancialData } from "@/hooks/useUserFinancialData";

interface UserFinancialControlPanelProps {
  userId: string;
  planLimit?: number;
}

export default function UserFinancialControlPanel({ userId, planLimit = 10 }: UserFinancialControlPanelProps) {
  const { data, loading, loadData } = useUserFinancialData(userId, planLimit);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: 'active' | 'blocked' | 'connected' | 'disconnected') => {
    const statusMap = {
      active: { label: 'Ativo', className: 'bg-primary/15 text-primary border-primary/30' },
      blocked: { label: 'Bloqueado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
      connected: { label: 'Conectado', className: 'bg-primary/15 text-primary border-primary/30' },
      disconnected: { label: 'Desconectado', className: 'bg-muted text-muted-foreground border-border' },
    };
    return statusMap[status];
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Compromissos Financeiros
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Compromissos Financeiros
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Agenda Financeira */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Agenda</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="outline" className={getStatusBadge(data.agenda.status).className}>
                {getStatusBadge(data.agenda.status).label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Compromissos:</span>
              <span className="text-sm font-medium text-foreground">{data.agenda.totalCommitments}</span>
            </div>
          </div>
        </div>

        {/* Parcelamentos */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Parcelamentos</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ativos:</span>
              <span className="text-sm font-medium text-foreground">{data.installments.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Limite:</span>
              <span className="text-sm font-medium text-foreground">{data.installments.limit}</span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min((data.installments.active / data.installments.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lembretes */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Lembretes</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ativos:</span>
              <span className="text-sm font-medium text-primary">{data.reminders.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pausados:</span>
              <span className="text-sm font-medium text-amber-500">{data.reminders.paused}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Agenda */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Google Agenda</p>
              {data.googleCalendar.email && (
                <p className="text-sm text-muted-foreground">{data.googleCalendar.email}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={getStatusBadge(data.googleCalendar.status).className}>
            {getStatusBadge(data.googleCalendar.status).label}
          </Badge>
        </div>
      </div>
    </div>
  );
}
