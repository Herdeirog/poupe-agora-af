import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Bell,
  Mail,
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { NotificationType, NotificationStatus } from "@/types/adminNotification";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const typeMap: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  email: { label: "Email", icon: Mail },
  sistema: { label: "Sistema", icon: Bell },
};

const statusMap: Record<NotificationStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  entregue: { label: "Entregue", className: "badge-ativo", icon: CheckCircle },
  falha: { label: "Falha", className: "badge-cancelado", icon: XCircle },
  pendente: { label: "Pendente", className: "badge-trial", icon: Clock },
  agendada: { label: "Agendada", className: "badge-mensal", icon: Calendar },
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { notifications, metrics, resendNotification, addNotification } = useAdminNotifications();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: 'sistema' as NotificationType,
    title: '',
    content: '',
    userId: '',
    scheduled: false,
    scheduledAt: '',
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        n.userName.toLowerCase().includes(searchLower) ||
        n.title.toLowerCase().includes(searchLower);
      const matchesType = typeFilter === "all" || n.type === typeFilter;
      const matchesStatus = statusFilter === "all" || n.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [notifications, search, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleResend = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resendNotification(id);
    toast.success("Notificação reenviada!");
  };

  const handleCreateNotification = () => {
    if (!newNotification.title || !newNotification.content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    addNotification({
      userId: newNotification.userId || 'manual',
      userName: 'Todos os usuários',
      userEmail: 'broadcast@sistema.com',
      type: newNotification.type,
      title: newNotification.title,
      content: newNotification.content,
      status: newNotification.scheduled ? 'agendada' : 'pendente',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: newNotification.scheduled ? newNotification.scheduledAt : undefined,
      createdAt: new Date().toISOString(),
      logs: [],
    });

    toast.success("Notificação criada com sucesso!");
    setIsCreateModalOpen(false);
    setNewNotification({
      type: 'sistema',
      title: '',
      content: '',
      userId: '',
      scheduled: false,
      scheduledAt: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Notificações</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground">
            Gerencie notificações enviadas aos usuários
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Notificação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="glass-strong p-4 shadow-premium animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.entregues}</p>
              <p className="text-sm text-muted-foreground">Entregues</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-danger">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{metrics.falhas}</p>
              <p className="text-sm text-muted-foreground">Falhas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{metrics.pendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{metrics.agendadas}</p>
              <p className="text-sm text-muted-foreground">Agendadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-strong p-4 shadow-premium animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário ou título..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="pl-9 glass-input"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
              <SelectTrigger className="w-[140px] glass-input">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="w-[140px] glass-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="falha">Falha</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="agendada">Agendada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-strong overflow-hidden shadow-premium animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
              <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
              <TableHead className="text-muted-foreground font-medium">Título</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium">Tentativas</TableHead>
              <TableHead className="text-muted-foreground font-medium">Data</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedNotifications.map((n) => {
              const TypeIcon = typeMap[n.type].icon;
              return (
                <TableRow
                  key={n.id}
                  className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/notifications/${n.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{typeMap[n.type].label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{n.userName}</p>
                      <p className="text-xs text-muted-foreground">{n.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate">{n.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusMap[n.status].className}>
                      {statusMap[n.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {n.attempts}/{n.maxAttempts}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/[0.04]">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass border-white/[0.12]">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/notifications/${n.id}`); }}
                          className="hover:bg-white/[0.04] cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {(n.status === 'falha' || n.status === 'pendente') && (
                          <DropdownMenuItem 
                            onClick={(e) => handleResend(n.id, e)}
                            className="hover:bg-white/[0.04] cursor-pointer"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reenviar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedNotifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma notificação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedNotifications.length} de {filteredNotifications.length} notificações
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="glass-input hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="glass-input hover:bg-white/[0.04]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Notification Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="glass border-white/[0.12]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Notificação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie uma nova notificação para enviar aos usuários.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo</Label>
              <Select 
                value={newNotification.type} 
                onValueChange={(v) => setNewNotification({...newNotification, type: v as NotificationType})}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/[0.12]">
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Título *</Label>
              <Input 
                placeholder="Título da notificação"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Conteúdo *</Label>
              <Textarea 
                placeholder="Conteúdo da notificação..."
                value={newNotification.content}
                onChange={(e) => setNewNotification({...newNotification, content: e.target.value})}
                className="glass-input min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="glass-input">
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleCreateNotification}>
              <Send className="mr-2 h-4 w-4" />
              Criar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
