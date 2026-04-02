import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminUser, AdminUserPlan, AdminUserStatus, AdminUserTipo } from "@/types/adminUser";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userData: Omit<AdminUser, "id">) => void;
  onUserCreated?: () => void;
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  tipoUsuario: AdminUserTipo;
  plano: AdminUserPlan;
  status: AdminUserStatus;
  emTeste: boolean;
  diasTeste: number;
  acessoLiberado: boolean;
  observacoes: string;
  cidade: string;
  estado: string;
  sendEmail: boolean;
  sendWhatsApp: boolean;
}

const initialFormData: FormData = {
  nome: "",
  email: "",
  telefone: "",
  whatsapp: "",
  tipoUsuario: "usuario",
  plano: "mensal",
  status: "ativo",
  emTeste: false,
  diasTeste: 14,
  acessoLiberado: true,
  observacoes: "",
  cidade: "",
  estado: "",
  sendEmail: true,
  sendWhatsApp: true,
};

export function UserFormModal({ open, onOpenChange, onSave, onUserCreated }: UserFormModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  // Normalizar número WhatsApp (adicionar 55 se necessário)
  const normalizeWhatsAppNumber = (number: string): string => {
    const digitsOnly = number.replace(/\D/g, "");
    
    // Se já começa com 55, retorna como está
    if (digitsOnly.startsWith("55")) {
      return digitsOnly;
    }
    
    // Se tiver entre 10-11 dígitos (DDD + número brasileiro), adicionar 55
    if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
      return `55${digitsOnly}`;
    }
    
    return digitsOnly;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim() || formData.nome.length < 3) {
      newErrors.nome = "Nome deve ter pelo menos 3 caracteres";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    // Validar WhatsApp se preenchido
    if (formData.whatsapp) {
      const digits = formData.whatsapp.replace(/\D/g, "");
      if (digits.length < 10) {
        newErrors.whatsapp = "Número inválido (mínimo 10 dígitos)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Corrija os erros do formulário");
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalizar WhatsApp antes de enviar
      const normalizedWhatsApp = formData.whatsapp ? normalizeWhatsAppNumber(formData.whatsapp) : "";

      // Chamar edge function para criar usuário de verdade
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          full_name: formData.nome,
          email: formData.email,
          whatsapp: normalizedWhatsApp,
          telefone: formData.telefone,
          role: formData.tipoUsuario,
          plan: formData.plano,
          status: formData.status,
          em_teste: formData.emTeste,
          dias_teste: formData.diasTeste,
          cidade: formData.cidade,
          estado: formData.estado,
          observacoes: formData.observacoes,
          sendEmail: formData.sendEmail,
          sendWhatsApp: formData.sendWhatsApp && formData.whatsapp.length > 0,
          platform_url: window.location.origin, // Domínio dinâmico da plataforma
        },
      });

      // Verificar primeiro se data contém erro (API retorna 400 com JSON)
      if (data && !data.success) {
        console.error("Edge function returned error:", data.error);
        toast.error(data.error || "Erro ao criar usuário");
        return;
      }

      // Se houve erro de rede/função
      if (error) {
        console.error("Edge function error:", error);
        // Tentar extrair mensagem de erro do contexto
        let errorMessage = "Erro ao criar usuário";
        try {
          // FunctionsHttpError pode ter context com json
          if (error.context) {
            const contextData = await error.context.json?.();
            if (contextData?.error) {
              errorMessage = contextData.error;
            }
          }
        } catch {
          errorMessage = error.message || "Erro desconhecido";
        }
        toast.error(errorMessage);
        return;
      }

      if (!data) {
        toast.error("Resposta vazia do servidor");
        return;
      }

      // Montar mensagem de sucesso com detalhes
      let successMessage = "Usuário criado com sucesso!";
      const details: string[] = [];

      if (data.emailSent) {
        details.push("✅ Email enviado");
      } else if (data.emailError) {
        details.push(`⚠️ Email: ${data.emailError}`);
      }

      if (data.whatsAppSent) {
        details.push("✅ WhatsApp enviado");
      } else if (data.whatsAppError) {
        details.push(`⚠️ WhatsApp: ${data.whatsAppError}`);
      }

      if (data.tempPassword) {
        details.push(`🔐 Senha temporária: ${data.tempPassword}`);
      }

      toast.success(successMessage, {
        description: details.join("\n"),
        duration: 10000,
      });

      onOpenChange(false);
      onUserCreated?.();

    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Erro inesperado ao criar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-strong border-white/[0.12] shadow-premium max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Criar Novo Usuário</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha os dados para criar um novo usuário no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Dados Básicos */}
          <div className="grid gap-2">
            <Label htmlFor="nome" className="text-foreground">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`glass-input ${errors.nome ? "border-destructive" : ""}`}
            />
            {errors.nome && <span className="text-xs text-destructive">{errors.nome}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-foreground">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`glass-input ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefone" className="text-foreground">Telefone</Label>
              <Input
                id="telefone"
                placeholder="5511999999999"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, "") })}
                className="glass-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp" className="text-foreground">WhatsApp (API)</Label>
              <Input
                id="whatsapp"
                placeholder="41999999999"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, "") })}
                className={`glass-input ${errors.whatsapp ? "border-destructive" : ""}`}
              />
              {errors.whatsapp && <span className="text-xs text-destructive">{errors.whatsapp}</span>}
              <p className="text-xs text-muted-foreground">
                DDD + número (ex: 41999999999). O código 55 será adicionado automaticamente.
              </p>
            </div>
          </div>

          {/* Tipo de Usuário */}
          <div className="grid gap-2">
            <Label className="text-foreground">Tipo de Usuário</Label>
            <Select
              value={formData.tipoUsuario}
              onValueChange={(v: AdminUserTipo) => setFormData({ ...formData, tipoUsuario: v })}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-white/[0.12]">
                <SelectItem value="usuario">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plano */}
          <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08] space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Configuração do Plano</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-sm">Tipo de Plano</Label>
                <Select
                  value={formData.plano}
                  onValueChange={(v: AdminUserPlan) => setFormData({ ...formData, plano: v })}
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
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-sm">Status do Plano</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: AdminUserStatus) => setFormData({ ...formData, status: v })}
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
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emTeste"
                  checked={formData.emTeste}
                  onCheckedChange={(checked) => setFormData({ ...formData, emTeste: !!checked })}
                  className="border-white/[0.2] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="emTeste" className="text-sm font-normal text-foreground">
                  Em período de teste
                </Label>
              </div>

              {formData.emTeste && (
                <div className="pl-6 grid gap-2">
                  <Label htmlFor="diasTeste" className="text-sm text-muted-foreground">
                    Dias de teste
                  </Label>
                  <Input
                    id="diasTeste"
                    type="number"
                    min={1}
                    max={90}
                    value={formData.diasTeste}
                    onChange={(e) => setFormData({ ...formData, diasTeste: parseInt(e.target.value) || 14 })}
                    className="glass-input w-24"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acessoLiberado"
                checked={formData.acessoLiberado}
                onCheckedChange={(checked) => setFormData({ ...formData, acessoLiberado: !!checked })}
                className="border-white/[0.2] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="acessoLiberado" className="text-sm font-normal text-foreground">
                Liberar acesso imediatamente
              </Label>
            </div>
          </div>

          {/* Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cidade" className="text-foreground">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="glass-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estado" className="text-foreground">Estado</Label>
              <Input
                id="estado"
                placeholder="UF"
                maxLength={2}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                className="glass-input"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="grid gap-2">
            <Label htmlFor="observacoes" className="text-foreground">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Notas internas sobre o usuário..."
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="glass-input min-h-[80px]"
            />
          </div>

          {/* Opções de Envio */}
          <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08] space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: !!checked })}
                className="border-white/[0.2] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="sendEmail" className="text-sm font-normal text-foreground">
                Enviar credenciais por email
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendWhatsApp"
                checked={formData.sendWhatsApp}
                onCheckedChange={(checked) => setFormData({ ...formData, sendWhatsApp: !!checked })}
                className="border-white/[0.2] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                disabled={!formData.whatsapp}
              />
              <Label htmlFor="sendWhatsApp" className={`text-sm font-normal ${!formData.whatsapp ? 'text-muted-foreground' : 'text-foreground'}`}>
                Enviar boas-vindas no WhatsApp
                {!formData.whatsapp && <span className="text-xs ml-1">(preencha o WhatsApp)</span>}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="glass-input hover:bg-white/[0.04]"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground green-glow-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Usuário"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
