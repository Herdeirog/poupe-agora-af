import { useEffect, useState } from 'react';
import { History, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getActionHistory, AdminActionRecord } from '@/services/adminActionHistoryService';

interface AdminActionHistoryProps {
  userId: string;
  refreshTrigger?: number;
}

const actionTypeColors: Record<string, string> = {
  block_agenda: 'bg-destructive/15 text-destructive border-destructive/30',
  unblock_agenda: 'bg-primary/15 text-primary border-primary/30',
  pause_reminders: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  resume_reminders: 'bg-primary/15 text-primary border-primary/30',
  reset_reminders: 'bg-destructive/15 text-destructive border-destructive/30',
  disable_google: 'bg-destructive/15 text-destructive border-destructive/30',
  enable_google: 'bg-primary/15 text-primary border-primary/30',
  update_notes: 'bg-muted text-muted-foreground border-border',
};

export default function AdminActionHistory({ userId, refreshTrigger }: AdminActionHistoryProps) {
  const [history, setHistory] = useState<AdminActionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getActionHistory(userId);
      setHistory(data);
      setLoading(false);
    }
    load();
  }, [userId, refreshTrigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Ações
        </h3>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        Histórico de Ações Administrativas
      </h3>

      {history.length === 0 ? (
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((record) => (
            <div
              key={record.id}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08] flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={actionTypeColors[record.action_type] ?? 'bg-muted text-muted-foreground'}
                  >
                    {record.action_label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {record.admin_email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(record.created_at)}
                  </span>
                </div>
                {record.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Nota: {record.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
