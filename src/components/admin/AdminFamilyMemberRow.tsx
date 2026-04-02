import { User, Mail, Trash2, Ban, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AdminFamilyMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "invited" | "blocked";
  joinedAt?: string;
}

interface AdminFamilyMemberRowProps {
  member: AdminFamilyMember;
  onRemove: (id: string) => void;
  onBlock: (id: string) => void;
}

const statusConfig = {
  active: { label: "Ativo", className: "badge-ativo" },
  invited: { label: "Convidado", className: "badge-trial" },
  blocked: { label: "Bloqueado", className: "badge-cancelado" },
};

export default function AdminFamilyMemberRow({ member, onRemove, onBlock }: AdminFamilyMemberRowProps) {
  const isAdmin = member.role === "admin";
  const statusInfo = statusConfig[member.status];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isAdmin ? "bg-primary/10" : "bg-white/[0.04]"
        )}>
          <User className={cn("h-5 w-5", isAdmin ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{member.name}</span>
            {isAdmin && (
              <Badge variant="outline" className="border-primary/50 text-primary text-xs py-0 px-1.5">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            {member.email}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className={cn("font-medium", statusInfo.className)}>
          {statusInfo.label}
        </Badge>

        {!isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onBlock(member.id)}
              className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
              title={member.status === "blocked" ? "Desbloquear" : "Bloquear"}
            >
              <Ban className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(member.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Remover membro"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
