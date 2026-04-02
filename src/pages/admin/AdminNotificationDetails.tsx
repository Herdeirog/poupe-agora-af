import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Bell, Mail, MessageSquare, User, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AdminNotification, NotificationType, NotificationStatus } from "@/types/adminNotification";
import { toast } from "sonner";

const typeMap: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  sistema: { label: "Sistema", icon: Bell },
};

const statusMap: Record<NotificationStatus, { label: string; className: string }> = {
  entregue: { label: "Entregue", className: "badge-ativo" },
  falha: { label: "Falha", className: "badge-cancelado" },
  pendente: { label: "Pendente", className: "badge-trial" },
  agendada: { label: "Agendada", className: "badge-mensal" },
};

export default function AdminNotificationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById, resendNotification } = useAdminNotifications();
  
  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotification() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getById(id);
        setNotification(data || null);
      } catch (error) {
        console.error('Error loading notification:', error);
        setNotification(null);
      } finally {
        setLoading(false);
      }
    }
    loadNotification();
  }, [id, getById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Notificação não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/notifications")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const TypeIcon = typeMap[notification.type]?.icon || Bell;

  const handleResend = () => {
    resendNotification(notification.id);
    toast.success("Notificação reenviada!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin/notifications")}
          className="hover:bg-white/[0.04]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Detalhes da Notificação</h1>
          <p className="text-muted-foreground">{notification.title}</p>
        </div>
        {(notification.status === 'falha' || notification.status === 'pendente') && (
          <Button className="bg-primary hover:bg-primary/90" onClick={handleResend}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reenviar Agora
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados da Notificação */}
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dados da Notificação</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID</span>
              <span className="text-foreground font-mono text-sm">{notification.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo</span>
              <div className="flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{typeMap[notification.type]?.label || notification.type}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={statusMap[notification.status]?.className || "badge-info"}>
                {statusMap[notification.status]?.label || notification.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tentativas</span>
              <span className="text-foreground">{notification.attempts || 0}/{notification.maxAttempts || 3}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Criada em
              </span>
              <span className="text-foreground">
                {notification.createdAt ? new Date(notification.createdAt).toLocaleString("pt-BR") : "-"}
              </span>
            </div>
            {notification.sentAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Enviada em
                </span>
                <span className="text-foreground">
                  {new Date(notification.sentAt).toLocaleString("pt-BR")}
                </span>
              </div>
            )}
            {notification.scheduledAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendada para
                </span>
                <span className="text-foreground">
                  {new Date(notification.scheduledAt).toLocaleString("pt-BR")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Destinatário */}
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Destinatário</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome
              </span>
              <span className="text-foreground">{notification.userName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{notification.userEmail || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID do Usuário</span>
              <span className="text-foreground font-mono text-sm">{notification.userId || "-"}</span>
            </div>
            {notification.userId && (
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full glass-input"
                  onClick={() => navigate(`/admin/users/${notification.userId}`)}
                >
                  Ver perfil do usuário
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="glass p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Conteúdo da Notificação</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Título</p>
            <p className="text-foreground font-medium">{notification.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
              <p className="text-foreground whitespace-pre-wrap">{notification.content}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="glass overflow-hidden">
        <div className="p-6 border-b border-white/[0.08]">
          <h3 className="text-lg font-semibold text-foreground">Logs de Envio</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground">Data/Hora</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notification.logs && notification.logs.length > 0 ? (
              notification.logs.map((log) => (
                <TableRow key={log.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                  <TableCell className="text-foreground">
                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={log.status === 'Sucesso' ? 'badge-ativo' : log.status === 'Erro' ? 'badge-cancelado' : 'badge-trial'}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.message}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum log registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
