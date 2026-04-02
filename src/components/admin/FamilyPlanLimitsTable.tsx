import { useState } from "react";
import { Users, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface PlanLimit {
  id: string;
  plan: string;
  label: string;
  maxUsers: number;
  invitesPerMonth: number;
  active: boolean;
}

const mockPlanLimits: PlanLimit[] = [
  { id: "1", plan: "individual", label: "Individual", maxUsers: 1, invitesPerMonth: 0, active: true },
  { id: "2", plan: "family", label: "Família", maxUsers: 4, invitesPerMonth: 6, active: true },
  { id: "3", plan: "family_plus", label: "Família Plus", maxUsers: 6, invitesPerMonth: 10, active: true },
];

export default function FamilyPlanLimitsTable() {
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>(mockPlanLimits);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ maxUsers: number; invitesPerMonth: number }>({ maxUsers: 0, invitesPerMonth: 0 });

  const handleEdit = (plan: PlanLimit) => {
    setEditingId(plan.id);
    setEditValues({ maxUsers: plan.maxUsers, invitesPerMonth: plan.invitesPerMonth });
  };

  const handleSave = (id: string) => {
    setPlanLimits(prev => prev.map(p => 
      p.id === id ? { ...p, maxUsers: editValues.maxUsers, invitesPerMonth: editValues.invitesPerMonth } : p
    ));
    setEditingId(null);
    toast.success("Limites atualizados com sucesso!");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setPlanLimits(prev => prev.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    ));
    toast.success("Status do plano atualizado!");
  };

  return (
    <div className="glass-strong p-6 shadow-premium animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Limites de Usuários por Plano</h3>
          <p className="text-sm text-muted-foreground">Configure a quantidade máxima de usuários e convites por plano</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.08] hover:bg-transparent">
              <TableHead className="text-muted-foreground">Plano</TableHead>
              <TableHead className="text-muted-foreground text-center">Máx. Usuários</TableHead>
              <TableHead className="text-muted-foreground text-center">Convites/mês</TableHead>
              <TableHead className="text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planLimits.map((plan) => (
              <TableRow key={plan.id} className="border-white/[0.08] hover:bg-white/[0.02]">
                <TableCell className="font-medium text-foreground">{plan.label}</TableCell>
                <TableCell className="text-center">
                  {editingId === plan.id ? (
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={editValues.maxUsers}
                      onChange={(e) => setEditValues(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 1 }))}
                      className="glass-input w-20 mx-auto text-center"
                    />
                  ) : (
                    <span className="text-foreground">{plan.maxUsers}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {editingId === plan.id ? (
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={editValues.invitesPerMonth}
                      onChange={(e) => setEditValues(prev => ({ ...prev, invitesPerMonth: parseInt(e.target.value) || 0 }))}
                      className="glass-input w-20 mx-auto text-center"
                    />
                  ) : (
                    <span className="text-foreground">{plan.invitesPerMonth}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={plan.active ? "badge-ativo cursor-pointer" : "badge-inativo cursor-pointer"}
                    onClick={() => toggleActive(plan.id)}
                  >
                    {plan.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === plan.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleSave(plan.id)} className="h-8 w-8 text-primary hover:bg-primary/10">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8 text-muted-foreground hover:bg-white/[0.04]">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(plan)} className="h-8 w-8 text-muted-foreground hover:bg-white/[0.04]">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
