import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, UserPlus, UserCheck, UserMinus, Ban, Crown, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFamilyActionHistory, type FamilyActionRecord, getActionColor } from '@/services/familyActionHistoryService';

interface FamilyActivityHistoryProps {
  familyPlanId?: string;
}

export function FamilyActivityHistory({ familyPlanId }: FamilyActivityHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activities, setActivities] = useState<FamilyActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!familyPlanId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const data = await getFamilyActionHistory(familyPlanId);
        setActivities(data);
      } catch (error) {
        console.error('Error loading activity history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [familyPlanId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_invited':
      case 'invite_sent':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'member_joined':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'member_removed':
      case 'force_downgrade':
        return <UserMinus className="h-4 w-4 text-destructive" />;
      case 'member_blocked':
      case 'invites_blocked':
        return <Ban className="h-4 w-4 text-amber-500" />;
      case 'member_unblocked':
      case 'invites_unblocked':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'role_changed':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'plan_upgraded':
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const formatActivityDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

  if (activities.length === 0) {
    return null;
  }

  const displayedActivities = isExpanded ? activities : activities.slice(0, 3);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Histórico de Atividades
          </CardTitle>
          {activities.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs gap-1">
              {isExpanded ? <>Menos <ChevronUp className="h-3 w-3" /></> : <>Ver tudo ({activities.length}) <ChevronDown className="h-3 w-3" /></>}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {displayedActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3 relative">
                <div className={`relative z-10 flex items-center justify-center w-4 h-4 mt-1 rounded-full bg-background border-2 border-border ${getActionColor(activity.actionType)}`}>
                  <div className="absolute -left-1 -top-1 w-6 h-6 flex items-center justify-center">
                    {getActivityIcon(activity.actionType)}
                  </div>
                </div>
                
                <div className="flex-1 pb-2">
                  <p className="text-sm text-foreground">{activity.actionLabel}</p>
                  {activity.targetEmail && (
                    <p className="text-xs text-muted-foreground">Para: {activity.targetEmail}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatActivityDate(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
