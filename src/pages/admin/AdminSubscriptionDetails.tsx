import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, 
  RefreshCw, 
  Play, 
  Pause, 
  XCircle, 
  Plus,
  CalendarIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { SubscriptionStatus, SubscriptionPlan, AdminSubscription, SubscriptionPayment } from "@/types/adminSubscription";
import { AddPaymentModal } from "@/components/admin/AddPaymentModal";
import { ConfirmStatusChangeDialog } from "@/components/admin/ConfirmStatusChangeDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusMap: Record<SubscriptionStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "badge-ativo" },
  pendente: { label: "Pendente", className: "badge-trial" },
  cancelada: { label: "Cancelada", className: "badge-cancelado" },
  suspensa: { label: "Suspensa", className: "badge-suspenso" },
  trial: { label: "Trial", className: "badge-trial" },
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

const planValues: Record<SubscriptionPlan, number> = {
  gratuito: 0,
  trial: 0,
  mensal: 97,
  trimestral: 267,
  semestral: 497,
  anual: 970,
  vitalicio: 1997,
  premium: 197,
};

const paymentStatusMap: Record<string, { label: string; className: string }> = {
  pago: { label: "Pago", className: "badge-ativo" },
  pendente: { label: "Pendente", className: "badge-trial" },
  falha: { label: "Falha", className: "badge-cancelado" },
  estornado: { label: "Estornado", className: "badge-suspenso" },
};

export default function AdminSubscriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById, updateSubscription, refreshSubscriptions, addPayment } = useAdminSubscriptions();
  
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useFormatCurrency();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'suspender' | 'cancelar' | null>(null);
  
  // Editable dates
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [nextBilling, setNextBilling] = useState<Date | undefined>();
  const [lastRenewal, setLastRenewal] = useState<Date | undefined>();

  useEffect(() => {
    async function loadSubscription() {
      if (!id) return;
      setLoading(true);
      try {
        const sub = await getById(id);
        if (sub) {
          setSubscription(sub);
          setStartDate(new Date(sub.startDate));
          setNextBilling(new Date(sub.nextBilling));
          setLastRenewal(new Date(sub.lastRenewal));
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, [id, getById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Assinatura não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/subscriptions")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  // formatCurrency agora vem do hook useFormatCurrency

  const handleStatusChange = async (newStatus: SubscriptionStatus) => {
    await updateSubscription(subscription.id, { status: newStatus });
    setSubscription({ ...subscription, status: newStatus });
    toast.success(`Status alterado para ${statusMap[newStatus].label}`);
  };

  const handlePlanChange = async (newPlan: SubscriptionPlan) => {
    const newAmount = planValues[newPlan];
    await updateSubscription(subscription.id, { plan: newPlan, amount: newAmount });
    setSubscription({ ...subscription, plan: newPlan, amount: newAmount });
    toast.success(`Plano alterado para ${planMap[newPlan]}`);
  };

  const handleSaveDates = async () => {
    if (!startDate || !nextBilling || !lastRenewal) return;
    
    await updateSubscription(subscription.id, {
      startDate: startDate.toISOString(),
      nextBilling: nextBilling.toISOString(),
      lastRenewal: lastRenewal.toISOString(),
    });
    
    setSubscription({
      ...subscription,
      startDate: startDate.toISOString(),
      nextBilling: nextBilling.toISOString(),
      lastRenewal: lastRenewal.toISOString(),
    });
    
    toast.success("Datas atualizadas com sucesso!");
  };

  const handleSync = async () => {
    await refreshSubscriptions();
    const freshSub = await getById(subscription.id);
    if (freshSub) {
      setSubscription(freshSub);
      setStartDate(new Date(freshSub.startDate));
      setNextBilling(new Date(freshSub.nextBilling));
      setLastRenewal(new Date(freshSub.lastRenewal));
    }
    toast.success("Sincronização concluída! Dados atualizados.");
  };

  const handleAddPayment = async (payment: Omit<SubscriptionPayment, 'id'>) => {
    const success = await addPayment(subscription.id, payment);
    if (success) {
      // Recarregar assinatura para ver o pagamento
      const freshSub = await getById(subscription.id);
      if (freshSub) {
        setSubscription(freshSub);
      }
      toast.success("Pagamento adicionado com sucesso!");
    } else {
      toast.error("Erro ao adicionar pagamento");
    }
  };

  const handleActivate = () => handleStatusChange('ativa');
  const handleSuspend = () => setConfirmAction('suspender');
  const handleCancel = () => setConfirmAction('cancelar');
  
  const handleConfirmStatusChange = () => {
    if (confirmAction === 'suspender') {
      handleStatusChange('suspensa');
    } else if (confirmAction === 'cancelar') {
      handleStatusChange('cancelada');
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin/subscriptions")}
          className="hover:bg-white/[0.04]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Detalhes da Assinatura</h1>
          <p className="text-muted-foreground">{subscription.userName} - {subscription.userEmail}</p>
        </div>
        <Button variant="outline" className="glass-input hover:bg-white/[0.04]" onClick={handleSync}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Forçar Sincronização
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados da Assinatura */}
        <div className="glass-strong p-6 shadow-premium">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dados da Assinatura</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID</span>
              <span className="text-foreground font-mono text-sm bg-white/[0.04] px-2 py-1 rounded">{subscription.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={statusMap[subscription.status].className}>
                {statusMap[subscription.status].label}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Plano</span>
              <Badge variant="outline" className="badge-info">
                {planMap[subscription.plan]}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor</span>
              <span className="text-foreground font-semibold text-primary">{formatCurrency(subscription.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Origem</span>
              <span className="text-foreground capitalize">{subscription.origin}</span>
            </div>
            
            {/* Editable Dates */}
            <div className="pt-4 border-t border-white/[0.08] space-y-4">
              <h4 className="text-sm font-medium text-foreground">Datas (Editáveis)</h4>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal glass-input")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass border-white/[0.12]" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Próxima Cobrança</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal glass-input")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextBilling ? format(nextBilling, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass border-white/[0.12]" align="start">
                    <Calendar
                      mode="single"
                      selected={nextBilling}
                      onSelect={setNextBilling}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Última Renovação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal glass-input")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lastRenewal ? format(lastRenewal, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass border-white/[0.12]" align="start">
                    <Calendar
                      mode="single"
                      selected={lastRenewal}
                      onSelect={setLastRenewal}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                onClick={handleSaveDates} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Salvar Datas
              </Button>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="glass-strong p-6 shadow-premium">
          <h3 className="text-lg font-semibold text-foreground mb-4">Controles</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Alterar Status</label>
              <Select value={subscription.status} onValueChange={(v) => handleStatusChange(v as SubscriptionStatus)}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/[0.12]">
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Alterar Plano</label>
              <Select value={subscription.plan} onValueChange={(v) => handlePlanChange(v as SubscriptionPlan)}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/[0.12]">
                  <SelectItem value="gratuito">Gratuito - {formatCurrency(0)}</SelectItem>
                  <SelectItem value="trial">Trial - {formatCurrency(0)}</SelectItem>
                  <SelectItem value="mensal">Mensal - {formatCurrency(97)}</SelectItem>
                  <SelectItem value="trimestral">Trimestral - {formatCurrency(267)}</SelectItem>
                  <SelectItem value="semestral">Semestral - {formatCurrency(497)}</SelectItem>
                  <SelectItem value="anual">Anual - {formatCurrency(970)}</SelectItem>
                  <SelectItem value="vitalicio">Vitalício - {formatCurrency(1997)}</SelectItem>
                  <SelectItem value="premium">Premium - {formatCurrency(197)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground green-glow-sm"
                onClick={handleActivate}
                disabled={subscription.status === 'ativa'}
              >
                <Play className="mr-2 h-4 w-4" />
                Ativar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 glass-input hover:bg-yellow-500/10 hover:border-yellow-500/50"
                onClick={handleSuspend}
                disabled={subscription.status === 'suspensa'}
              >
                <Pause className="mr-2 h-4 w-4" />
                Suspender
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleCancel}
                disabled={subscription.status === 'cancelada'}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>

            <div className="pt-4 border-t border-white/[0.08]">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Alterações de status e plano são sincronizadas automaticamente com o cadastro do usuário.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="glass-strong overflow-hidden shadow-premium">
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Histórico de Pagamentos</h3>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Pagamento
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-muted-foreground">Data</TableHead>
              <TableHead className="text-muted-foreground">Valor</TableHead>
              <TableHead className="text-muted-foreground">Método</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscription.payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum pagamento registrado.
                </TableCell>
              </TableRow>
            ) : (
              subscription.payments.map((payment) => (
                <TableRow key={payment.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                  <TableCell className="text-foreground">
                    {new Date(payment.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-foreground font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.method}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={paymentStatusMap[payment.status]?.className || 'badge-info'}
                    >
                      {paymentStatusMap[payment.status]?.label || payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.observacao || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        onSave={handleAddPayment}
      />

      <ConfirmStatusChangeDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        action={confirmAction || 'suspender'}
        userName={subscription.userName}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
