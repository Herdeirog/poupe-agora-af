import { useState, useEffect } from "react";
import { History, UserPlus, UserCheck, UserMinus, Ban, Mail, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  getFamilyActionHistory, 
  getAdminFamilyActions,
  getActionColor,
  type FamilyActionRecord 
} from "@/services/familyActionHistoryService";

interface AdminFamilyActionHistoryProps {
  familyPlanId?: string;
  userId?: string;
  maxItems?: number;
}

export default function AdminFamilyActionHistory({ 
  familyPlanId, 
  userId,
  maxItems = 10 
}: AdminFamilyActionHistoryProps) {
  const [actions, setActions] = useState<FamilyActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        let data: FamilyActionRecord[] = [];
        
        if (familyPlanId) {
          data = await getFamilyActionHistory(familyPlanId);
        } else if (userId) {
          data = await getAdminFamilyActions(userId);
        }
        
        setActions(data);
      } catch (error) {
        console.error("Error loading action history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [familyPlanId, userId]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "member_invited":
      case "invite_sent":
        return <UserPlus className="h-4 w-4" />;
      case "member_joined":
        return <UserCheck className="h-4 w-4" />;
      case "member_removed":
      case "force_downgrade":
        return <UserMinus className="h-4 w-4" />;
      case "member_blocked":
      case "invites_blocked":
        return <Ban className="h-4 w-4" />;
      case "member_unblocked":
      case "invites_unblocked":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum histórico de ações</p>
          <p className="text-sm text-muted-foreground/70">As ações do plano família aparecerão aqui</p>
        </CardContent>
      </Card>
    );
  }

  const displayedActions = isExpanded ? actions : actions.slice(0, maxItems);
  const hasMore = actions.length > maxItems;

  return (
    <Card className="glass-strong shadow-premium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Histórico de Ações
            <Badge variant="outline" className="text-xs">
              {actions.length} registro(s)
            </Badge>
          </CardTitle>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs gap-1"
            >
              {isExpanded ? (
                <>Menos <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Ver tudo ({actions.length}) <ChevronDown className="h-3 w-3" /></>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {displayedActions.map((action) => (
              <div key={action.id} className="flex gap-4 relative">
                {/* Timeline dot with icon */}
                <div className={`relative z-10 flex items-center justify-center w-6 h-6 mt-1 rounded-full bg-background border-2 border-border ${getActionColor(action.actionType)}`}>
                  {getActionIcon(action.actionType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {action.actionLabel}
                      </p>
                      {action.targetEmail && (
                        <p className="text-xs text-muted-foreground">
                          Alvo: {action.targetEmail}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {action.notificationSent && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-green-500/10 text-green-500 border-green-500/30">
                          <Mail className="h-3 w-3 mr-1" />
                          Notificado
                        </Badge>
                      )}
                      {action.isAdminAction && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-amber-500/10 text-amber-500 border-amber-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {action.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{action.notes}"
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(action.createdAt)}
                    {action.actorEmail && ` • por ${action.actorEmail}`}
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
