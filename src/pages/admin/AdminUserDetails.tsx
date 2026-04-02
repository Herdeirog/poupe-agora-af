import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Mail, MessageSquare, Lock, Unlock, Settings, Shield, Clock, MapPin, Phone, Calendar, Link2, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useState, useEffect } from "react";
import { AdminUser, AdminUserPlan, AdminUserStatus } from "@/types/adminUser";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UserIntegrationCard from "@/components/admin/UserIntegrationCard";
import UserFinancialControlPanel from "@/components/admin/UserFinancialControlPanel";
import AdminActionsPanel from "@/components/admin/AdminActionsPanel";
import AdminAlertsSection from "@/components/admin/AdminAlertsSection";
import AdminActionHistory from "@/components/admin/AdminActionHistory";
import AdminFamilyPlanSection from "@/components/admin/AdminFamilyPlanSection";
import { useAdminControls } from "@/hooks/useAdminControls";

const statusMap: Partial<Record<AdminUserStatus, { label: string; className: string }>> = {
  ativo: { label: "Ativo", className: "badge-ativo" },
  inativo: { label: "Inativo", className: "badge-inativo" },
  suspenso: { label: "Suspenso", className: "badge-suspenso" },
  cancelado: { label: "Cancelado", className: "badge-cancelado" },
  trial: { label: "Trial", className: "badge-trial" },
  active: { label: "Ativo", className: "badge-ativo" },
  inactive: { label: "Inativo", className: "badge-inativo" },
  suspended: { label: "Suspenso", className: "badge-suspenso" },
};

const planoMap: Partial<Record<AdminUserPlan, { label: string; className: string }>> = {
  gratuito: { label: "Gratuito", className: "badge-gratuito" },
  mensal: { label: "Mensal", className: "badge-mensal" },
  anual: { label: "Anual", className: "badge-anual" },
  premium: { label: "Premium", className: "badge-premium" },
  free: { label: "Gratuito", className: "badge-gratuito" },
  monthly: { label: "Mensal", className: "badge-mensal" },
  annual: { label: "Anual", className: "badge-anual" },
};

export default function AdminUserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getUserById, updateUser, toggleUserAccess } = useAdminUsers();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<Partial<AdminUser>>({});
  const [planFormData, setPlanFormData] = useState<Partial<AdminUser>>({});

  // Estado mockado para integrações do usuário
  const [userIntegrations, setUserIntegrations] = useState<{
    googleCalendar: {
      status: 'connected' | 'disconnected' | 'blocked';
      email?: string;
      lastSync?: string;
      remindersActive: boolean;
      blockedByAdmin: boolean;
    }
  }>({
    googleCalendar: {
      status: 'connected',
      email: 'usuario@gmail.com',
      lastSync: '2024-12-17T14:32:00',
      remindersActive: true,
      blockedByAdmin: false,
    }
  });

  useEffect(() => {
    async function loadUser() {
      if (!id) return;
      try {
        const userData = await getUserById(id);
        if (userData) {
          setUser(userData);
          setFormData({
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            whatsapp: userData.whatsapp,
            cidade: userData.cidade,
            estado: userData.estado,
            tipoUsuario: userData.tipoUsuario,
            observacoes: userData.observacoes,
          });
          setPlanFormData({
            plano: userData.plano,
            status: userData.status,
            emTeste: userData.emTeste,
            diasTeste: userData.diasTeste,
            dataInicioPlano: userData.dataInicioPlano?.split('T')[0],
            dataFimPlano: userData.dataFimPlano?.split('T')[0],
            acessoLiberado: userData.acessoLiberado,
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
    loadUser();
  }, [id, getUserById]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleSaveGeneral = () => {
    updateUser(user.id, {
      ...formData,
      isAdmin: formData.tipoUsuario === 'admin',
    });
    toast.success("Dados atualizados com sucesso!");
  };

  const handleSavePlan = () => {
    updateUser(user.id, {
      plano: planFormData.plano,
      status: planFormData.status,
      emTeste: planFormData.emTeste,
      diasTeste: planFormData.diasTeste,
      dataInicioPlano: planFormData.dataInicioPlano ? new Date(planFormData.dataInicioPlano).toISOString() : undefined,
      dataFimPlano: planFormData.dataFimPlano ? new Date(planFormData.dataFimPlano).toISOString() : undefined,
      acessoLiberado: planFormData.acessoLiberado,
    });
    toast.success("Plano atualizado com sucesso!");
  };

  const handleToggleAccess = () => {
    const newAccess = toggleUserAccess(user.id);
    setPlanFormData(prev => ({ ...prev, acessoLiberado: newAccess }));
    toast.success(newAccess ? "Acesso liberado!" : "Acesso bloqueado!");
  };

  const calcularDiasRestantes = () => {
    if (!user.emTeste || !user.dataFimPlano) return null;
    const hoje = new Date();
    const fim = new Date(user.dataFimPlano);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const diasRestantes = calcularDiasRestantes();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin/users")}
          className="hover:bg-white/[0.04]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{user.nome}</h1>
            {!user.acessoLiberado && (
              <Badge variant="outline" className="badge-cancelado flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}
            {user.emTeste && diasRestantes !== null && (
              <Badge variant="outline" className="badge-trial">
                Em teste ({diasRestantes} dias)
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button 
          variant="outline" 
          className="glass-input hover:bg-white/[0.04]"
          onClick={handleToggleAccess}
        >
          {user.acessoLiberado ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Bloquear Acesso
            </>
          ) : (
            <>
              <Unlock className="mr-2 h-4 w-4" />
              Liberar Acesso
            </>
          )}
        </Button>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={cn("font-medium", statusMap[user.status].className)}>
          {statusMap[user.status].label}
        </Badge>
        <Badge variant="outline" className={cn("font-medium", planoMap[user.plano].className)}>
          {planoMap[user.plano].label}
        </Badge>
        {user.tipoUsuario === 'admin' && (
          <Badge variant="outline" className="border-primary/50 text-primary flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass-strong border-white/[0.08] p-1 shadow-premium">
          <TabsTrigger 
            value="general" 
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            Dados Gerais
          </TabsTrigger>
          <TabsTrigger 
            value="subscription"
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            Plano e Acesso
          </TabsTrigger>
          <TabsTrigger 
            value="info"
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            Informações
          </TabsTrigger>
          <TabsTrigger 
            value="integrations"
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            Integrações
          </TabsTrigger>
          <TabsTrigger 
            value="financial"
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <Wallet className="h-4 w-4 mr-1.5" />
            Compromissos
          </TabsTrigger>
          <TabsTrigger 
            value="family"
            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <Users className="h-4 w-4 mr-1.5" />
            Família
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Informações do Usuário</h3>
            </div>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Nome</Label>
                  <Input 
                    id="name" 
                    value={formData.nome || ""} 
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="glass-input" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email || ""} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="glass-input" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Telefone</Label>
                  <Input 
                    id="phone" 
                    value={formData.telefone || ""} 
                    onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                    className="glass-input" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-foreground">WhatsApp (API)</Label>
                  <Input 
                    id="whatsapp" 
                    placeholder="5511999999999"
                    value={formData.whatsapp || ""} 
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    className="glass-input" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Número com código do país, sem espaços ou símbolos
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-foreground">Cidade</Label>
                  <Input 
                    id="cidade" 
                    value={formData.cidade || ""} 
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="glass-input" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-foreground">Estado</Label>
                  <Input 
                    id="estado" 
                    maxLength={2}
                    value={formData.estado || ""} 
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    className="glass-input" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
                <Switch 
                  id="admin" 
                  checked={formData.tipoUsuario === 'admin'}
                  onCheckedChange={(checked) => setFormData({ ...formData, tipoUsuario: checked ? 'admin' : 'usuario' })}
                />
                <Label htmlFor="admin" className="text-foreground">Administrador</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-foreground">Observações</Label>
                <Textarea 
                  id="observacoes" 
                  value={formData.observacoes || ""} 
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="glass-input min-h-[100px]" 
                  placeholder="Notas internas sobre o usuário..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground green-glow-sm"
                  onClick={handleSaveGeneral}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Gerenciamento de Plano</h3>
            </div>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de Plano</Label>
                  <Select 
                    value={planFormData.plano} 
                    onValueChange={(v: AdminUserPlan) => setPlanFormData({ ...planFormData, plano: v })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.12]">
                      <SelectItem value="gratuito">Gratuito</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Status do Plano</Label>
                  <Select 
                    value={planFormData.status} 
                    onValueChange={(v: AdminUserStatus) => setPlanFormData({ ...planFormData, status: v })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/[0.12]">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataInicio" className="text-foreground">Data de Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={planFormData.dataInicioPlano || ""}
                    onChange={(e) => setPlanFormData({ ...planFormData, dataInicioPlano: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim" className="text-foreground">Data de Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={planFormData.dataFimPlano || ""}
                    onChange={(e) => setPlanFormData({ ...planFormData, dataFimPlano: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08] space-y-4">
                <div className="flex items-center gap-3">
                  <Switch 
                    id="emTeste" 
                    checked={planFormData.emTeste}
                    onCheckedChange={(checked) => setPlanFormData({ ...planFormData, emTeste: checked })}
                  />
                  <Label htmlFor="emTeste" className="text-foreground">Em período de teste</Label>
                </div>
                {planFormData.emTeste && (
                  <div className="pl-6">
                    <Label htmlFor="diasTeste" className="text-sm text-muted-foreground">Dias de teste</Label>
                    <Input
                      id="diasTeste"
                      type="number"
                      min={1}
                      max={90}
                      value={planFormData.diasTeste || 14}
                      onChange={(e) => setPlanFormData({ ...planFormData, diasTeste: parseInt(e.target.value) || 14 })}
                      className="glass-input w-24 mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <Switch 
                    id="acessoLiberado" 
                    checked={planFormData.acessoLiberado}
                    onCheckedChange={(checked) => setPlanFormData({ ...planFormData, acessoLiberado: checked })}
                  />
                  <Label htmlFor="acessoLiberado" className="text-foreground">Acesso liberado ao sistema</Label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground green-glow-sm"
                  onClick={handleSavePlan}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Plano
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Informações do Sistema</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                    <p className="text-foreground font-medium">
                      {new Date(user.dataCadastro).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>

                {user.dataInicioPlano && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Início do Plano</p>
                      <p className="text-foreground font-medium">
                        {new Date(user.dataInicioPlano).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}

                {user.dataFimPlano && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fim do Plano</p>
                      <p className="text-foreground font-medium">
                        {new Date(user.dataFimPlano).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {user.cidade && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Localização</p>
                      <p className="text-foreground font-medium">
                        {user.cidade}{user.estado && `, ${user.estado}`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contato</p>
                    <p className="text-foreground font-medium">{user.telefone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {user.observacoes && (
              <div className="mt-6 pt-6 border-t border-white/[0.08]">
                <h4 className="text-sm font-semibold text-foreground mb-2">Observações</h4>
                <p className="text-muted-foreground bg-white/[0.02] p-4 rounded-lg">
                  {user.observacoes}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6 animate-fade-in">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Integrações do Usuário</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie as integrações ativas para este usuário
              </p>
            </div>

            {/* Google Calendar Integration Card */}
            <UserIntegrationCard
              integration={{
                ...userIntegrations.googleCalendar,
                userPlan: user?.plano === 'gratuito' || user?.plano === 'free' ? 'Gratuito' : 
                          user?.plano === 'mensal' || user?.plano === 'monthly' ? 'Mensal' :
                          user?.plano === 'anual' || user?.plano === 'annual' ? 'Anual' : 'Premium',
              }}
              onForceDisconnect={() => {
                setUserIntegrations(prev => ({
                  ...prev,
                  googleCalendar: { ...prev.googleCalendar, status: 'disconnected', email: undefined, lastSync: undefined }
                }));
              }}
              onBlockFeature={() => {
                setUserIntegrations(prev => ({
                  ...prev,
                  googleCalendar: { ...prev.googleCalendar, blockedByAdmin: true }
                }));
              }}
              onUnblockFeature={() => {
                setUserIntegrations(prev => ({
                  ...prev,
                  googleCalendar: { ...prev.googleCalendar, blockedByAdmin: false }
                }));
              }}
            />

            {/* Mock state selector for demo */}
            <div className="glass p-4 border-dashed border-2 border-white/[0.1]">
              <p className="text-xs text-muted-foreground mb-3 font-medium">🔧 Controle de Demo (apenas desenvolvimento)</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={userIntegrations.googleCalendar.status === 'connected' && !userIntegrations.googleCalendar.blockedByAdmin ? 'default' : 'outline'}
                  className={userIntegrations.googleCalendar.status === 'connected' && !userIntegrations.googleCalendar.blockedByAdmin ? 'bg-primary' : 'glass-input'}
                  onClick={() => setUserIntegrations({
                    googleCalendar: {
                      status: 'connected',
                      email: 'usuario@gmail.com',
                      lastSync: '2024-12-17T14:32:00',
                      remindersActive: true,
                      blockedByAdmin: false,
                    }
                  })}
                >
                  Conectado
                </Button>
                <Button
                  size="sm"
                  variant={userIntegrations.googleCalendar.status === 'disconnected' && !userIntegrations.googleCalendar.blockedByAdmin ? 'default' : 'outline'}
                  className={userIntegrations.googleCalendar.status === 'disconnected' && !userIntegrations.googleCalendar.blockedByAdmin ? 'bg-primary' : 'glass-input'}
                  onClick={() => setUserIntegrations({
                    googleCalendar: {
                      status: 'disconnected',
                      blockedByAdmin: false,
                      remindersActive: false,
                    }
                  })}
                >
                  Não Conectado
                </Button>
                <Button
                  size="sm"
                  variant={userIntegrations.googleCalendar.blockedByAdmin ? 'default' : 'outline'}
                  className={userIntegrations.googleCalendar.blockedByAdmin ? 'bg-destructive' : 'glass-input'}
                  onClick={() => setUserIntegrations({
                    googleCalendar: {
                      status: 'blocked',
                      blockedByAdmin: true,
                      remindersActive: false,
                    }
                  })}
                >
                  Bloqueado Admin
                </Button>
                <Button
                  size="sm"
                  variant={userIntegrations.googleCalendar.status === 'blocked' && !userIntegrations.googleCalendar.blockedByAdmin ? 'default' : 'outline'}
                  className={userIntegrations.googleCalendar.status === 'blocked' && !userIntegrations.googleCalendar.blockedByAdmin ? 'bg-amber-500' : 'glass-input'}
                  onClick={() => setUserIntegrations({
                    googleCalendar: {
                      status: 'blocked',
                      blockedByAdmin: false,
                      remindersActive: false,
                    }
                  })}
                >
                  Bloqueado Plano
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Financial Commitments Tab */}
        <TabsContent value="financial">
          <div className="space-y-6 animate-fade-in">
            {/* Alertas informativos */}
            <AdminAlertsSection />

            {/* Painel de status dos compromissos */}
            <div className="glass-strong p-6 shadow-premium">
              <UserFinancialControlPanel userId={user.id} planLimit={10} />
            </div>

            {/* Ações administrativas */}
            <div className="glass-strong p-6 shadow-premium">
              <AdminActionsPanel userId={user.id} />
            </div>

            {/* Histórico de ações */}
            <div className="glass-strong p-6 shadow-premium">
              <AdminActionHistory userId={user.id} />
            </div>
          </div>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family">
          <AdminFamilyPlanSection userId={user.id} userName={user.nome || user.name || ''} userEmail={user.email || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
