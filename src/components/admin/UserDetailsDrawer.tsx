import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminUser, AdminUserStatus, AdminUserPlan } from "@/types/adminUser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Shield,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
  Lock,
  Unlock,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface UserDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

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

export function UserDetailsDrawer({ open, onOpenChange, user }: UserDetailsDrawerProps) {
  const navigate = useNavigate();

  if (!user) return null;

  const initials = (user.nome || 'U').split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md glass-strong border-white/[0.12] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-foreground text-xl">{user.nome}</SheetTitle>
              <SheetDescription className="text-muted-foreground">{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Status e Acesso */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn("font-medium", statusMap[user.status].className)}>
              {statusMap[user.status].label}
            </Badge>
            <Badge variant="outline" className={cn("font-medium", planoMap[user.plano].className)}>
              {planoMap[user.plano].label}
            </Badge>
            {user.emTeste && (
              <Badge variant="outline" className="badge-trial">
                Em Teste {diasRestantes !== null && `(${diasRestantes} dias)`}
              </Badge>
            )}
            {!user.acessoLiberado && (
              <Badge variant="outline" className="badge-cancelado flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}
            {user.tipoUsuario === 'admin' && (
              <Badge variant="outline" className="border-primary/50 text-primary flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>

          <Separator className="bg-white/[0.08]" />

          {/* Informações de Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Informações de Contato
            </h4>
            <div className="grid gap-3 pl-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.telefone || "-"}</span>
              </div>
              {user.cidade && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.cidade}{user.estado && `, ${user.estado}`}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-white/[0.08]" />

          {/* Informações do Plano */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Informações do Plano
            </h4>
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="text-foreground font-medium">{planoMap[user.plano].label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-foreground font-medium">{statusMap[user.status].label}</span>
              </div>
              {user.dataInicioPlano && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="text-foreground">{formatDate(user.dataInicioPlano)}</span>
                </div>
              )}
              {user.dataFimPlano && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fim:</span>
                  <span className="text-foreground">{formatDate(user.dataFimPlano)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acesso:</span>
                <span className={cn("font-medium", user.acessoLiberado ? "text-primary" : "text-destructive")}>
                  {user.acessoLiberado ? "Liberado" : "Bloqueado"}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/[0.08]" />

          {/* Datas */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Datas
            </h4>
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastro:</span>
                <span className="text-foreground">{formatDate(user.dataCadastro)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {user.observacoes && (
            <>
              <Separator className="bg-white/[0.08]" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Observações</h4>
                <p className="text-sm text-muted-foreground bg-white/[0.02] p-3 rounded-lg">
                  {user.observacoes}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-white/[0.08]">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              onOpenChange(false);
              navigate(`/admin/users/${user.id}`);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver Página Completa
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
