import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Crown, User } from 'lucide-react';
import { FamilyMember } from '@/types/familyPlan';

interface FamilyMemberCardProps {
  member: FamilyMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: (member: FamilyMember) => void;
}

export function FamilyMemberCard({ member, isCurrentUser, canRemove, onRemove }: FamilyMemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = () => {
    switch (member.status) {
      case 'active':
        return <Badge className="badge-premium badge-ativo">Ativo</Badge>;
      case 'invited':
        return <Badge className="badge-premium badge-warning">Convidado</Badge>;
      case 'pending':
        return <Badge className="badge-premium badge-info">Pendente</Badge>;
      default:
        return null;
    }
  };

  const getRoleBadge = () => {
    if (member.role === 'admin') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Crown className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <User className="h-3 w-3" />
        Membro
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar} alt={member.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {member.name}
              {isCurrentUser && <span className="text-muted-foreground ml-1">(você)</span>}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">{member.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getRoleBadge()}
        {getStatusBadge()}
        
        {canRemove && !isCurrentUser && member.role !== 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(member)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
