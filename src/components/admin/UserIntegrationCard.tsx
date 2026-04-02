import { Calendar, Mail, Clock, Bell, Unlink, Ban, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type IntegrationStatus = 'connected' | 'disconnected' | 'blocked';

interface UserIntegration {
  status: IntegrationStatus;
  email?: string;
  lastSync?: string;
  remindersActive?: boolean;
  blockedByAdmin?: boolean;
  userPlan?: string;
}

interface UserIntegrationCardProps {
  integration: UserIntegration;
  onForceDisconnect: () => void;
  onBlockFeature: () => void;
  onUnblockFeature: () => void;
}

export default function UserIntegrationCard({ 
  integration, 
  onForceDisconnect, 
  onBlockFeature,
  onUnblockFeature 
}: UserIntegrationCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleForceDisconnect = () => {
    onForceDisconnect();
    toast.success("Integração desconectada com sucesso!");
  };

  const handleBlockFeature = () => {
    onBlockFeature();
    toast.success("Recurso bloqueado para este usuário!");
  };

  const handleUnblockFeature = () => {
    onUnblockFeature();
    toast.success("Recurso desbloqueado para este usuário!");
  };

  // Status: Blocked by plan
  if (integration.status === 'blocked' && !integration.blockedByAdmin) {
    return (
      <div className="glass-strong p-6 shadow-premium opacity-75">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-muted/30">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold text-foreground">Google Agenda</h4>
              <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground gap-1">
                <Lock className="h-3 w-3" />
                Indisponível no plano
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Este recurso não está disponível para o plano atual do usuário.
            </p>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Plano atual:</span>
                <span className="text-foreground font-medium">{integration.userPlan || 'Gratuito'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Necessário:</span>
                <span className="text-primary font-medium">Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Status: Blocked by admin
  if (integration.blockedByAdmin) {
    return (
      <div className="glass-strong p-6 shadow-premium border-destructive/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <Calendar className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold text-foreground">Google Agenda</h4>
              <Badge variant="outline" className="badge-cancelado gap-1">
                <Ban className="h-3 w-3" />
                Bloqueado pelo Admin
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Este recurso foi bloqueado manualmente pelo administrador.
            </p>

            <Button 
              variant="outline" 
              className="glass-input hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
              onClick={handleUnblockFeature}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Desbloquear Recurso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Status: Disconnected
  if (integration.status === 'disconnected') {
    return (
      <div className="glass-strong p-6 shadow-premium">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-muted/30">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-semibold text-foreground">Google Agenda</h4>
              <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground gap-1">
                <XCircle className="h-3 w-3" />
                Não conectado
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              O usuário ainda não conectou sua conta Google.
            </p>

            <Button 
              variant="outline" 
              className="glass-input hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
              onClick={handleBlockFeature}
            >
              <Ban className="mr-2 h-4 w-4" />
              Bloquear Recurso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Status: Connected
  return (
    <div className="glass-strong p-6 shadow-premium">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-foreground">Google Agenda</h4>
            <Badge variant="outline" className="badge-ativo gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Conectado
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            A conta Google está sincronizada.
          </p>

          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{integration.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Última sincronização:</span>
              <span className="text-foreground">{formatDate(integration.lastSync)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Lembretes ativos:</span>
              <span className={integration.remindersActive ? 'text-primary' : 'text-muted-foreground'}>
                {integration.remindersActive ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="glass-input hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-500"
              onClick={handleForceDisconnect}
            >
              <Unlink className="mr-2 h-4 w-4" />
              Forçar Desconexão
            </Button>
            <Button 
              variant="outline" 
              className="glass-input hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
              onClick={handleBlockFeature}
            >
              <Ban className="mr-2 h-4 w-4" />
              Bloquear Recurso
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
