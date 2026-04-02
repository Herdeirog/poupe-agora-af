import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserPlus, Sparkles, Info, Crown, Loader2 } from 'lucide-react';
import { FamilyMember, FamilyPlanData } from '@/types/familyPlan';
import { FamilyMemberCard } from './FamilyMemberCard';
import { InviteFamilyMemberModal } from './InviteFamilyMemberModal';
import { RemoveFamilyMemberDialog } from './RemoveFamilyMemberDialog';
import { FamilyNotifications } from './FamilyNotifications';
import { FamilyActivityHistory } from './FamilyActivityHistory';
import { FamilyUpgradeConfirmModal } from './FamilyUpgradeConfirmModal';
import { getFamilyPlan, removeMember } from '@/services/familyPlanService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function FamilyMembersSection() {
  const { user } = useAuth();
  const [familyData, setFamilyData] = useState<FamilyPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const loadFamilyData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const data = await getFamilyPlan(user.id);
    setFamilyData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFamilyData();
  }, [user?.id]);

  const handleRemoveMember = (member: FamilyMember) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove && familyData) {
      const result = await removeMember(familyData.id, memberToRemove.id, true, user?.id);
      if (result.success) {
        setFamilyData(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.id !== memberToRemove.id),
          currentMembers: prev.currentMembers - 1
        } : null);
        toast.success(`${memberToRemove.name} foi removido.`);
      }
      setMemberToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Plano Individual ou sem plano família
  if (!familyData || familyData.planType === 'individual') {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Família / Membros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                Seu plano permite apenas um usuário.
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Faça upgrade para o Plano Família e adicione até 5 membros!
              </p>
            </div>
            <Button className="gap-2 btn-premium" onClick={() => setUpgradeModalOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Fazer upgrade para Plano Família
            </Button>
          </div>
          <FamilyUpgradeConfirmModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
        </CardContent>
      </Card>
    );
  }

  // Membro da Família (não admin)
  if (!familyData.isAdmin) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Família / Membros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="p-2 rounded-full bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Você faz parte de uma conta familiar</p>
              <p className="text-sm text-muted-foreground">
                Administrador: <span className="font-medium">{familyData.adminEmail}</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <Info className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              Os dados financeiros são compartilhados com todos os membros da família.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin do Plano Família
  const remainingSlots = familyData.maxMembers - familyData.currentMembers;
  const usagePercentage = (familyData.currentMembers / familyData.maxMembers) * 100;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Família / Membros
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {familyData.currentMembers} de {familyData.maxMembers} usuários
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {remainingSlots > 0 ? `${remainingSlots} vagas disponíveis` : 'Limite atingido'}
          </p>
        </div>

        <div className="space-y-2">
          {familyData.members.filter(m => m.status !== 'removed').map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.id === user?.id}
              canRemove={familyData.isAdmin && member.role !== 'admin'}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>

        {remainingSlots > 0 && (
          <Button variant="outline" className="w-full gap-2" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Convidar membro
          </Button>
        )}

        {remainingSlots <= 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Limite de membros atingido. <button className="text-primary hover:underline">Faça upgrade</button>
          </p>
        )}

        <InviteFamilyMemberModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          remainingSlots={remainingSlots}
          familyPlanId={familyData.id}
          actorUserId={user?.id || ''}
          actorEmail={user?.email || ''}
          onSuccess={loadFamilyData}
        />

        <RemoveFamilyMemberDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          member={memberToRemove}
          onConfirm={confirmRemoveMember}
        />
      </CardContent>

      <div className="px-6 pb-4">
        <FamilyNotifications familyPlanId={familyData.id} />
      </div>

      <div className="px-6 pb-6">
        <FamilyActivityHistory familyPlanId={familyData.id} />
      </div>
    </Card>
  );
}
