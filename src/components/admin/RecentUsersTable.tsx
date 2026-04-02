import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { AdminUserStatus, AdminUserPlan } from "@/types/adminUser";
import { Shield } from "lucide-react";

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

export function RecentUsersTable() {
  const { recentUsers } = useAdminUsers();

  return (
    <div className="glass-strong overflow-hidden shadow-premium animate-fade-in">
      <div className="p-6 border-b border-white/[0.08]">
        <h3 className="text-lg font-semibold text-foreground">Últimos Usuários</h3>
        <p className="text-sm text-muted-foreground">Usuários cadastrados recentemente</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
            <TableHead className="text-muted-foreground font-medium">Telefone</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-muted-foreground font-medium">Plano</TableHead>
            <TableHead className="text-muted-foreground font-medium">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentUsers.map((user) => (
            <TableRow
              key={user.id}
              className="border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/[0.08]">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {(user.nome || user.name || 'U').split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{user.nome || user.name}</p>
                      {(user.isAdmin || user.tipoUsuario === 'admin' || user.role === 'admin') && (
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.telefone || user.phone || "-"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusMap[user.status]?.className || "badge-ativo"}>
                  {statusMap[user.status]?.label || user.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={planoMap[user.plano || user.plan || 'free']?.className || "badge-gratuito"}>
                  {planoMap[user.plano || user.plan || 'free']?.label || user.plano || user.plan || 'Gratuito'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.dataCadastro || user.joinedAt || Date.now()).toLocaleDateString("pt-BR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
