import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AdminSubscription } from "@/types/adminSubscription";

interface User {
  id: string;
  name: string;
  email: string;
}

export interface SubscriptionFormData {
  userId: string;
  plan: string;
  status: string;
  origin: string;
  amount: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  observacoes?: string;
}

interface SubscriptionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SubscriptionFormData) => Promise<boolean>;
  fetchUsersWithoutSubscription: () => Promise<User[]>;
  subscription?: AdminSubscription; // Se presente = modo edição
}

const planOptions = [
  { value: "gratuito", label: "Gratuito", amount: 0 },
  { value: "trial", label: "Trial", amount: 0 },
  { value: "mensal", label: "Mensal", amount: 29.90 },
  { value: "trimestral", label: "Trimestral", amount: 79.90 },
  { value: "semestral", label: "Semestral", amount: 149.90 },
  { value: "anual", label: "Anual", amount: 249.90 },
  { value: "vitalicio", label: "Vitalício", amount: 497.00 },
  { value: "premium", label: "Premium", amount: 99.90 },
];

const statusOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "pendente", label: "Pendente" },
  { value: "trial", label: "Trial" },
  { value: "suspensa", label: "Suspensa" },
  { value: "cancelada", label: "Cancelada" },
];

const originOptions = [
  { value: "manual", label: "Manual" },
  { value: "perfectpay", label: "PerfectPay" },
  { value: "asaas", label: "Asaas" },
  { value: "qify", label: "Qify" },
  { value: "hotmart", label: "Hotmart" },
];

const getDefaultFormData = (): SubscriptionFormData => ({
  userId: "",
  plan: "mensal",
  status: "ativa",
  origin: "manual",
  amount: 29.90,
  currentPeriodStart: new Date().toISOString().split("T")[0],
  currentPeriodEnd: "",
  trialEndsAt: "",
  observacoes: "",
});

export function SubscriptionFormModal({
  open,
  onOpenChange,
  onSave,
  fetchUsersWithoutSubscription,
  subscription,
}: SubscriptionFormModalProps) {
  const isEditMode = !!subscription;
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<SubscriptionFormData>(getDefaultFormData());

  // Reset form when modal opens/closes or subscription changes
  useEffect(() => {
    if (open) {
      if (subscription) {
        // Edit mode - populate with subscription data
        setFormData({
          userId: subscription.userId,
          plan: subscription.plan,
          status: subscription.status,
          origin: subscription.origin,
          amount: subscription.amount,
          currentPeriodStart: subscription.startDate ? new Date(subscription.startDate).toISOString().split("T")[0] : "",
          currentPeriodEnd: subscription.nextBilling ? new Date(subscription.nextBilling).toISOString().split("T")[0] : "",
          trialEndsAt: "",
          observacoes: subscription.observacoes || "",
        });
      } else {
        // Create mode - reset form and fetch users
        setFormData(getDefaultFormData());
        setLoadingUsers(true);
        fetchUsersWithoutSubscription()
          .then(setUsers)
          .finally(() => setLoadingUsers(false));
      }
    }
  }, [open, subscription, fetchUsersWithoutSubscription]);

  const handlePlanChange = (plan: string) => {
    const planOption = planOptions.find(p => p.value === plan);
    setFormData(prev => ({
      ...prev,
      plan,
      amount: planOption?.amount || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !formData.userId) return;

    setLoading(true);
    try {
      const success = await onSave({
        ...formData,
        userId: isEditMode ? subscription.userId : formData.userId,
        currentPeriodStart: formData.currentPeriodStart || undefined,
        currentPeriodEnd: formData.currentPeriodEnd || undefined,
        trialEndsAt: formData.trialEndsAt || undefined,
      });
      if (success) {
        onOpenChange(false);
        setFormData(getDefaultFormData());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditMode ? "Editar Assinatura" : "Nova Assinatura"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection - only in create mode */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="user">Usuário *</Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando usuários...
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os usuários já possuem assinatura.
                </p>
              ) : (
                <Select
                  value={formData.userId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/50">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Show user info in edit mode */}
          {isEditMode && (
            <div className="space-y-2">
              <Label>Usuário</Label>
              <p className="text-sm text-foreground bg-muted/20 px-3 py-2 rounded-md">
                {subscription.userName} ({subscription.userEmail})
              </p>
            </div>
          )}

          {/* Plan & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plano *</Label>
              <Select value={formData.plan} onValueChange={handlePlanChange}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  {planOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origin & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origem *</Label>
              <Select
                value={formData.origin}
                onValueChange={(v) => setFormData(prev => ({ ...prev, origin: v }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  {originOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="glass-input"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPeriodStart">Data Início</Label>
              <Input
                id="currentPeriodStart"
                type="date"
                value={formData.currentPeriodStart}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPeriodStart: e.target.value }))}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPeriodEnd">Próxima Cobrança</Label>
              <Input
                id="currentPeriodEnd"
                type="date"
                value={formData.currentPeriodEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPeriodEnd: e.target.value }))}
                className="glass-input"
              />
            </div>
          </div>

          {/* Trial End */}
          <div className="space-y-2">
            <Label htmlFor="trialEndsAt">Fim do Trial</Label>
            <Input
              id="trialEndsAt"
              type="date"
              value={formData.trialEndsAt}
              onChange={(e) => setFormData(prev => ({ ...prev, trialEndsAt: e.target.value }))}
              className="glass-input"
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              className="glass-input min-h-[80px]"
              placeholder="Observações opcionais..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="glass-input"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (!isEditMode && !formData.userId)}
              className="bg-primary hover:bg-primary/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Salvar Alterações" : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
