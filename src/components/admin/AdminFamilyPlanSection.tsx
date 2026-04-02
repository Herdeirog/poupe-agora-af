import { useState, useEffect } from "react";
import { Users, UserPlus, Ban, ArrowDown, AlertTriangle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminFamilyMemberRow, { AdminFamilyMember } from "./AdminFamilyMemberRow";
import ForceDowngradeDialog from "./ForceDowngradeDialog";
import AdminFamilyActionHistory from "./AdminFamilyActionHistory";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFamilyPlan,
  getAdminFamilyPlan,
  removeMember,
  toggleMemberBlock,
  toggleInvitesBlocked,
  forceDowngrade,
} from "@/services/familyPlanService";
import type { FamilyPlanDB, FamilyMemberDB } from "@/types/familyPlan";

interface AdminFamilyPlanSectionProps {
  userId: string;
  userName: string;
  userEmail: string;
}

const planLabels: Record<string, string> = {
  individual: "Individual",
  family: "Família",
  family_plus: "Família Plus",
};

export default function AdminFamilyPlanSection({ userId, userName, userEmail }: AdminFamilyPlanSectionProps) {
  const [plan, setPlan] = useState<FamilyPlanDB | null>(null);
  const [members, setMembers] = useState<FamilyMemberDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<"family" | "family_plus">("family");
  const [memberToRemove, setMemberToRemove] = useState<FamilyMemberDB | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await getAdminFamilyPlan(userId);
      if (data) {
        setPlan(data.plan);
        setMembers(data.members);
      }
      setIsLoading(false);
    }
    loadData();
  }, [userId]);

  const handleToggleInvites = async () => {
    if (!plan) return;
    const result = await toggleInvitesBlocked(plan.id, !plan.invites_blocked, userId);
    if (result.success) {
      setPlan(prev => prev ? { ...prev, invites_blocked: !prev.invites_blocked } : null);
      toast.success(plan.invites_blocked ? "Convites liberados!" : "Convites bloqueados!");
    }
  };

  const handleRemoveMember = (id: string) => {
    const member = members.find(m => m.id === id);
    if (member) { setMemberToRemove(member); setRemoveDialogOpen(true); }
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove && plan) {
      const result = await removeMember(plan.id, memberToRemove.id, true, userId, userName);
      if (result.success) {
        setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
        toast.success(`${memberToRemove.name || memberToRemove.email} foi removido.`);
      }
    }
    setRemoveDialogOpen(false);
    setMemberToRemove(null);
  };

  const handleBlockMember = async (id: string) => {
    if (!plan) return;
    const member = members.find(m => m.id === id);
    if (!member) return;
    const block = member.status !== "blocked";
    const result = await toggleMemberBlock(plan.id, id, block, true, userId, userName);
    if (result.success) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, status: block ? "blocked" : "active" } : m));
      toast.success(block ? "Membro bloqueado!" : "Membro desbloqueado!");
    }
  };

  const handleForceDowngrade = async () => {
    if (!plan) return;
    const result = await forceDowngrade(plan.id, userId, userName);
    if (result.success) {
      setPlan(prev => prev ? { ...prev, plan_type: "individual" } : null);
      setMembers(prev => prev.filter(m => m.role === "admin"));
      toast.success("Downgrade realizado!");
    }
    setDowngradeDialogOpen(false);
  };

  const handleCreateFamilyPlan = async () => {
    setIsCreating(true);
    const result = await createFamilyPlan(userId, selectedPlanType, userEmail, userName);
    if (result.success) {
      toast.success(`Plano ${selectedPlanType === "family_plus" ? "Família Plus" : "Família"} criado com sucesso!`);
      // Reload data
      const data = await getAdminFamilyPlan(userId);
      if (data) {
        setPlan(data.plan);
        setMembers(data.members);
      }
    } else {
      toast.error(result.error || "Erro ao criar plano");
    }
    setIsCreating(false);
    setCreateDialogOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isIndividual = !plan || plan.plan_type === "individual";
  const activeMembers = members.filter(m => m.status !== "removed");
  const pendingInvites = members.filter(m => m.status === "invited").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resumo do Plano */}
      <div className="glass-strong p-6 shadow-premium">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Plano Família</h3>
            <p className="text-sm text-muted-foreground">Gestão do plano família do usuário</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
            <p className="text-sm text-muted-foreground mb-1">Plano Atual</p>
            <p className="text-lg font-semibold text-foreground">{planLabels[plan?.plan_type || "individual"]}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
            <p className="text-sm text-muted-foreground mb-1">Limite de Usuários</p>
            <p className="text-lg font-semibold text-foreground">{plan?.max_members || 1}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
            <p className="text-sm text-muted-foreground mb-1">Usuários Ativos</p>
            <p className="text-lg font-semibold text-foreground">{activeMembers.length}<span className="text-sm text-muted-foreground font-normal"> / {plan?.max_members || 1}</span></p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
            <p className="text-sm text-muted-foreground mb-1">Convites Pendentes</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-foreground">{pendingInvites}</p>
              {plan?.invites_blocked && <Badge variant="outline" className="badge-cancelado text-xs"><Ban className="h-3 w-3 mr-1" />Bloqueado</Badge>}
            </div>
          </div>
        </div>
      </div>

      {!isIndividual && (
        <div className="glass-strong p-6 shadow-premium">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />Membros da Família</h4>
            <Badge variant="outline" className="text-muted-foreground">{activeMembers.length} membro(s)</Badge>
          </div>
          <div className="space-y-3">
            {activeMembers.map((member) => (
              <AdminFamilyMemberRow
                key={member.id}
                member={{ id: member.id, name: member.name || member.email, email: member.email, role: member.role as "admin" | "member", status: member.status as any, joinedAt: member.joined_at }}
                onRemove={handleRemoveMember}
                onBlock={handleBlockMember}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ações Administrativas */}
      <div className="glass-strong p-6 shadow-premium">
        <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Ações Administrativas
        </h4>

        <div className="space-y-3">
          {!isIndividual && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
              <div>
                <p className="font-medium text-foreground flex items-center gap-2"><Ban className="h-4 w-4 text-amber-500" />Bloquear Convites</p>
                <p className="text-sm text-muted-foreground">Impede novos convites</p>
              </div>
              <Button variant="outline" onClick={handleToggleInvites} className={plan?.invites_blocked ? "border-primary text-primary" : ""}>
                {plan?.invites_blocked ? "Liberar Convites" : "Bloquear Convites"}
              </Button>
            </div>
          )}
          {!isIndividual && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div>
                <p className="font-medium text-foreground flex items-center gap-2"><ArrowDown className="h-4 w-4 text-destructive" />Forçar Downgrade</p>
                <p className="text-sm text-muted-foreground">Rebaixa para plano Individual</p>
              </div>
              <Button variant="outline" onClick={() => setDowngradeDialogOpen(true)} className="border-destructive/50 text-destructive hover:bg-destructive/10">
                Forçar Downgrade
              </Button>
            </div>
          )}
          {isIndividual && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
              <div>
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Plano Individual - sem opções de família</p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Plano Família
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-500/90 flex items-center gap-2"><AlertTriangle className="h-3 w-3" />Ações críticas são registradas no histórico</p>
        </div>
      </div>

      {!isIndividual && plan && <AdminFamilyActionHistory familyPlanId={plan.id} />}

      <ForceDowngradeDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen} onConfirm={handleForceDowngrade}
        userName={userName} currentPlan={planLabels[plan?.plan_type || "individual"]} membersCount={activeMembers.length} />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="glass-strong border-white/[0.12]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover Membro</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Remover <strong className="text-foreground">{memberToRemove?.name || memberToRemove?.email}</strong>? Uma notificação será enviada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Family Plan Dialog */}
      <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <AlertDialogContent className="glass-strong border-white/[0.12]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Criar Plano Família</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Criar um plano família para <strong className="text-foreground">{userName}</strong>. Escolha o tipo de plano:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedPlanType} onValueChange={(v) => setSelectedPlanType(v as "family" | "family_plus")}>
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Família (até 4 membros)</SelectItem>
                <SelectItem value="family_plus">Família Plus (até 8 membros)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateFamilyPlan} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
