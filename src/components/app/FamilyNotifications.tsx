import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, AlertTriangle, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FamilyNotificationDB } from '@/types/familyPlan';

const STORAGE_KEY = 'family_notifications';

interface FamilyNotificationsProps {
  familyPlanId?: string;
  onNotificationCountChange?: (count: number) => void;
}

function getStoredNotifications(familyPlanId: string): FamilyNotificationDB[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${familyPlanId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function FamilyNotifications({ familyPlanId, onNotificationCountChange }: FamilyNotificationsProps) {
  const [notifications, setNotifications] = useState<FamilyNotificationDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      if (!familyPlanId) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Use localStorage as the table doesn't exist yet
        const data = getStoredNotifications(familyPlanId);
        setNotifications(data);
        onNotificationCountChange?.(data.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
  }, [familyPlanId, onNotificationCountChange]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'member_removed':
      case 'force_downgrade':
        return <X className="h-4 w-4 text-destructive" />;
      case 'member_blocked':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'member_unblocked':
      case 'invite_sent':
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationMessage = (notification: FamilyNotificationDB) => {
    const labels: Record<string, string> = {
      member_removed: `Notificação de remoção enviada para ${notification.target_email}`,
      member_blocked: `Notificação de bloqueio enviada para ${notification.target_email}`,
      member_unblocked: `Notificação de desbloqueio enviada para ${notification.target_email}`,
      force_downgrade: `Notificação de downgrade enviada para ${notification.target_email}`,
      invite_sent: `Convite enviado para ${notification.target_email}`,
      invite_expired: `Convite expirado para ${notification.target_email}`,
    };
    return labels[notification.notification_type] || notification.notification_type;
  };

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      sent: { class: 'bg-green-500/10 text-green-500 border-green-500/30', label: 'Enviado' },
      pending: { class: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'Pendente' },
      failed: { class: 'bg-destructive/10 text-destructive border-destructive/30', label: 'Falhou' },
      skipped: { class: 'bg-muted text-muted-foreground', label: 'Ignorado' },
    };
    const v = variants[status] || variants.pending;
    return <Badge variant="outline" className={`text-xs ${v.class}`}>{v.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  const displayedNotifications = isExpanded ? notifications : notifications.slice(0, 3);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Histórico de Notificações
            <Badge variant="outline" className="text-xs">{notifications.length}</Badge>
          </CardTitle>
          {notifications.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs gap-1">
              {isExpanded ? <>Menos <ChevronUp className="h-3 w-3" /></> : <>Ver todas ({notifications.length}) <ChevronDown className="h-3 w-3" /></>}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedNotifications.map((notification) => (
          <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{getNotificationMessage(notification)}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{getTimeAgo(notification.created_at)}</p>
                {getStatusBadge(notification.status)}
              </div>
              {notification.error_message && (
                <p className="text-xs text-destructive mt-1">{notification.error_message}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
