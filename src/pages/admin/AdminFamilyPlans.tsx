import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UsersRound,
  Plus,
  Ban,
  ArrowDown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllFamilyPlans,
  adminCreateFamilyPlan,
  toggleInvitesBlocked,
  forceDowngrade,
  type FamilyPlanWithAdmin,
} from "@/services/familyPlanService";

const planLabels: Record<string, string> = {
  individual: "Individual",
  family: "Família",
  family_plus: "Família Plus",
};

const planBadgeClasses: Record<string, string> = {
  individual: "bg-muted text-muted-foreground",
  family: "bg-primary/10 text-primary border-primary/20",
  family_plus: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

export default function AdminFamilyPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<FamilyPlanWithAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedPlanType, setSelectedPlanType] = useState<"family" | "family_plus">("family");
  const [isCreating, setIsCreating] = useState(false);
  const [usersWithoutPlan, setUsersWithoutPlan] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Actions
  const [actionPlan, setActionPlan] = useState<FamilyPlanWithAdmin | null>(null);
  const [actionType, setActionType] = useState<"block" | "downgrade" | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    const data = await getAllFamilyPlans();
    setPlans(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadUsersWithoutPlan = async () => {
    setLoadingUsers(true);
    try {
      // Get all users from profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("full_name", { ascending: true });

      // For now, family_plans table doesn't exist, so all users are available
      setUsersWithoutPlan(profiles || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoadingUsers(false);
  };

  const handleOpenCreateDialog = () => {
    loadUsersWithoutPlan();
    setCreateDialogOpen(true);
  };

  const handleCreatePlan = async () => {
    if (!selectedUser) {
      toast.error("Selecione um usuário");
      return;
    }

    const user = usersWithoutPlan.find(u => u.id === selectedUser);
    if (!user) return;

    setIsCreating(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const result = await adminCreateFamilyPlan(
      currentUser?.id || "",
      selectedUser,
      selectedPlanType,
      user.email || "",
      user.full_name || undefined
    );

    if (result.success) {
      toast.success(`Plano ${planLabels[selectedPlanType]} criado para ${user.full_name || user.email}!`);
      setCreateDialogOpen(false);
      setSelectedUser("");
      loadPlans();
    } else {
      toast.error(result.error || "Erro ao criar plano");
    }
    setIsCreating(false);
  };

  const handleToggleInvites = async (plan: FamilyPlanWithAdmin) => {
    const { data: { user } } = await supabase.auth.getUser();
    const result = await toggleInvitesBlocked(plan.plan.id, !plan.plan.invites_blocked, user?.id);
    if (result.success) {
      toast.success(plan.plan.invites_blocked ? "Convites liberados!" : "Convites bloqueados!");
      loadPlans();
    }
  };

  const handleForceDowngrade = async () => {
    if (!actionPlan) return;
    const { data: { user } } = await supabase.auth.getUser();
    const result = await forceDowngrade(actionPlan.plan.id, user?.id || "", "Admin");
    if (result.success) {
      toast.success("Downgrade realizado com sucesso!");
      loadPlans();
    }
    setActionPlan(null);
    setActionType(null);
  };

  // Filter plans
  const filteredPlans = plans.filter(p => {
    const matchesSearch = 
      p.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.plan.plan_type === filterType;
    return matchesSearch && matchesType;
  });

  // Stats
  const stats = {
    total: plans.length,
    family: plans.filter(p => p.plan.plan_type === "family").length,
    familyPlus: plans.filter(p => p.plan.plan_type === "family_plus").length,
    totalMembers: plans.reduce((sum, p) => sum + p.activeMembers, 0),
  };

  // Filter users for select
  const filteredUsers = usersWithoutPlan.filter(u => 
    userSearch === "" ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <UsersRound className="h-7 w-7 text-primary" />
            Planos Família
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os planos família do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPlans} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-strong p-5 shadow-premium">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <UsersRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Planos</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-5 shadow-premium">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planos Família</p>
              <p className="text-2xl font-bold text-foreground">{stats.family}</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-5 shadow-premium">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Família Plus</p>
              <p className="text-2xl font-bold text-foreground">{stats.familyPlus}</p>
            </div>
          </div>
        </div>
        <div className="glass-strong p-5 shadow-premium">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-strong p-4 shadow-premium">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-input"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] glass-input">
              <SelectValue placeholder="Tipo de plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="family">Família</SelectItem>
              <SelectItem value="family_plus">Família Plus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-strong shadow-premium overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UsersRound className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterType !== "all" 
                ? "Nenhum plano encontrado com os filtros aplicados" 
                : "Nenhum plano família cadastrado"}
            </p>
            {!searchTerm && filterType === "all" && (
              <Button onClick={handleOpenCreateDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-white/[0.02]">
                <TableHead className="text-muted-foreground">Administrador</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Membros</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Criado em</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((item) => (
                <TableRow key={item.plan.id} className="border-white/[0.08] hover:bg-white/[0.04]">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{item.adminName}</p>
                      <p className="text-sm text-muted-foreground">{item.adminEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={planBadgeClasses[item.plan.plan_type]}>
                      {planLabels[item.plan.plan_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{item.activeMembers}</span>
                    <span className="text-muted-foreground"> / {item.plan.max_members}</span>
                  </TableCell>
                  <TableCell>
                    {item.plan.invites_blocked ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        <Ban className="h-3 w-3 mr-1" />
                        Convites Bloqueados
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(item.plan.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/users/${item.plan.admin_user_id}`)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleInvites(item)}
                        className="h-8 w-8"
                      >
                        <Ban className={`h-4 w-4 ${item.plan.invites_blocked ? "text-primary" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setActionPlan(item); setActionType("downgrade"); }}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Plan Dialog */}
      <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <AlertDialogContent className="glass-strong border-white/[0.12] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Plano Família
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Selecione um usuário e o tipo de plano família a ser criado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Usuário</label>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Buscar usuário..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="glass-input mb-2"
                  />
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {filteredUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum usuário disponível
                        </div>
                      ) : (
                        filteredUsers.slice(0, 50).map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name || "Sem nome"}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de Plano</label>
              <Select value={selectedPlanType} onValueChange={(v) => setSelectedPlanType(v as "family" | "family_plus")}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">
                    <div className="flex flex-col">
                      <span>Família</span>
                      <span className="text-xs text-muted-foreground">Até 5 membros</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="family_plus">
                    <div className="flex flex-col">
                      <span>Família Plus</span>
                      <span className="text-xs text-muted-foreground">Até 10 membros</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreatePlan} disabled={isCreating || !selectedUser}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade Dialog */}
      <AlertDialog open={actionType === "downgrade"} onOpenChange={() => { setActionPlan(null); setActionType(null); }}>
        <AlertDialogContent className="glass-strong border-white/[0.12]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-destructive" />
              Forçar Downgrade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja forçar o downgrade do plano de{" "}
              <strong className="text-foreground">{actionPlan?.adminName}</strong>?
              <br /><br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover todos os membros do plano família</li>
                <li>Enviar notificações aos membros removidos</li>
                <li>Converter o plano para Individual</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDowngrade} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <ArrowDown className="h-4 w-4 mr-2" />
              Confirmar Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
