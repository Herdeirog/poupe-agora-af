import { useState, useMemo } from "react";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  AlertCircle,
  CheckCircle,
  Download,
  DollarSign,
  Plus,
  Pencil,
  BarChart3,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { SubscriptionFormModal, SubscriptionFormData } from "@/components/admin/SubscriptionFormModal";
import { AdminSubscription, SubscriptionStatus, SubscriptionOrigin, SubscriptionPlan } from "@/types/adminSubscription";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const statusMap: Record<SubscriptionStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "badge-ativo" },
  pendente: { label: "Pendente", className: "badge-trial" },
  cancelada: { label: "Cancelada", className: "badge-cancelado" },
  suspensa: { label: "Suspensa", className: "badge-suspenso" },
  trial: { label: "Trial", className: "badge-trial" },
};

const originMap: Record<SubscriptionOrigin, string> = {
  perfectpay: "PerfectPay",
  asaas: "Asaas",
  qify: "Qify",
  hotmart: "Hotmart",
  manual: "Manual",
};

const planMap: Record<SubscriptionPlan, string> = {
  gratuito: "Gratuito",
  trial: "Trial",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  vitalicio: "Vitalício",
  premium: "Premium",
};

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const { subscriptions, metrics, createSubscription, updateSubscription, getUsersWithoutSubscription } = useAdminSubscriptions();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<AdminSubscription | undefined>();
  const { formatCurrency } = useFormatCurrency();

  const handleSaveSubscription = async (data: SubscriptionFormData) => {
    try {
      if (editingSubscription) {
        // Edit mode
        await updateSubscription(editingSubscription.id, {
          plan: data.plan as SubscriptionPlan,
          status: data.status as SubscriptionStatus,
          origin: data.origin as SubscriptionOrigin,
          amount: data.amount,
          startDate: data.currentPeriodStart,
          nextBilling: data.currentPeriodEnd,
          observacoes: data.observacoes,
        });
        toast.success("Assinatura atualizada com sucesso!");
        setEditingSubscription(undefined);
        return true;
      } else {
        // Create mode
        const result = await createSubscription(data);
        if (result) {
          toast.success("Assinatura criada com sucesso!");
          return true;
        }
        toast.error("Erro ao criar assinatura");
        return false;
      }
    } catch (error) {
      toast.error("Erro ao salvar assinatura");
      return false;
    }
  };

  const handleOpenEditModal = (sub: AdminSubscription) => {
    setEditingSubscription(sub);
    setIsFormModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsFormModalOpen(open);
    if (!open) {
      setEditingSubscription(undefined);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        sub.id.toLowerCase().includes(searchLower) ||
        sub.userName.toLowerCase().includes(searchLower) ||
        sub.userEmail.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
      const matchesOrigin = originFilter === "all" || sub.origin === originFilter;
      const matchesPlan = planFilter === "all" || sub.plan === planFilter;
      return matchesSearch && matchesStatus && matchesOrigin && matchesPlan;
    });
  }, [subscriptions, search, statusFilter, originFilter, planFilter]);

  const totalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubscriptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubscriptions, currentPage]);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // formatCurrency agora vem do hook useFormatCurrency

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Usuário",
      "E-mail",
      "Plano",
      "Status",
      "Valor",
      "Origem",
      "Data Início",
      "Próx. Cobrança",
      "Última Renovação"
    ];

    const rows = filteredSubscriptions.map(sub => [
      sub.id,
      sub.userName,
      sub.userEmail,
      planMap[sub.plan],
      statusMap[sub.status].label,
      sub.amount,
      originMap[sub.origin],
      new Date(sub.startDate).toLocaleDateString("pt-BR"),
      new Date(sub.nextBilling).toLocaleDateString("pt-BR"),
      new Date(sub.lastRenewal).toLocaleDateString("pt-BR"),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assinaturas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredSubscriptions.length} assinaturas exportadas com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Assinaturas</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as assinaturas do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="glass-input hover:bg-white/[0.04]" 
            onClick={() => navigate('/admin/subscriptions/dashboard')}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="glass-input hover:bg-white/[0.04]" 
            onClick={exportToCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button 
            onClick={() => setIsFormModalOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Assinatura
          </Button>
        </div>
      </div>

      <SubscriptionFormModal
        open={isFormModalOpen}
        onOpenChange={handleCloseModal}
        onSave={handleSaveSubscription}
        fetchUsersWithoutSubscription={getUsersWithoutSubscription}
        subscription={editingSubscription}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="glass-strong p-4 shadow-premium animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-info">
              <CreditCard className="h-5 w-5" />
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
              <p className="text-2xl font-bold text-primary">{metrics.ativas}</p>
              <p className="text-sm text-muted-foreground">Ativas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-warning">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{metrics.pendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-danger">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{metrics.canceladas}</p>
              <p className="text-sm text-muted-foreground">Canceladas</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-4 shadow-premium animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-success">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.receitaTotal)}</p>
              <p className="text-sm text-muted-foreground">MRR</p>
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
              placeholder="Buscar por ID, usuário ou email..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="pl-9 glass-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="w-[130px] glass-input">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(v) => handleFilterChange(setPlanFilter, v)}>
              <SelectTrigger className="w-[140px] glass-input">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="gratuito">Gratuito</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="semestral">Semestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
                <SelectItem value="vitalicio">Vitalício</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Select value={originFilter} onValueChange={(v) => handleFilterChange(setOriginFilter, v)}>
              <SelectTrigger className="w-[140px] glass-input">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="perfectpay">PerfectPay</SelectItem>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="qify">Qify</SelectItem>
                <SelectItem value="hotmart">Hotmart</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
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
              <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium">Plano</TableHead>
              <TableHead className="text-muted-foreground font-medium">Origem</TableHead>
              <TableHead className="text-muted-foreground font-medium">Valor</TableHead>
              <TableHead className="text-muted-foreground font-medium">Próx. Cobrança</TableHead>
              <TableHead className="text-muted-foreground font-medium">Última Renovação</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubscriptions.map((sub) => (
              <TableRow
                key={sub.id}
                className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/subscriptions/${sub.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{sub.userName}</p>
                    <p className="text-xs text-muted-foreground">{sub.userEmail}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusMap[sub.status].className}>
                    {statusMap[sub.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="badge-info">
                    {planMap[sub.plan]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{originMap[sub.origin]}</TableCell>
                <TableCell className="text-foreground font-medium">{formatCurrency(sub.amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(sub.nextBilling).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(sub.lastRenewal).toLocaleDateString("pt-BR")}
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
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/subscriptions/${sub.id}`); }}
                        className="hover:bg-white/[0.04] cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(sub); }}
                        className="hover:bg-white/[0.04] cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {paginatedSubscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedSubscriptions.length} de {filteredSubscriptions.length} assinaturas
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
    </div>
  );
}
