import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Bot, Sparkles, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { agentService } from "@/services/agentService";
import { AIAgent } from "@/types/aiAgent";

const agentIcons: Record<string, React.ElementType> = {
  'assistente_financeiro': Sparkles,
  'agente_consulta': MessageSquare,
  'assistente_compromissos': Calendar,
};

export default function AdminAgentConfig() {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAgent = async () => {
      if (!agentSlug) return;
      
      setLoading(true);
      try {
        const loadedAgent = await agentService.getAgentBySlug(agentSlug);
        if (loadedAgent) {
          setAgent(loadedAgent);
        } else {
          toast.error("Agente não encontrado");
          navigate("/admin/agents");
        }
      } catch (error) {
        console.error('Error loading agent:', error);
        toast.error("Erro ao carregar agente");
        navigate("/admin/agents");
      } finally {
        setLoading(false);
      }
    };
    
    loadAgent();
  }, [agentSlug, navigate]);

  const handleSave = async () => {
    if (!agent) return;
    
    setSaving(true);
    try {
      await agentService.saveAgent(agent);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const IconComponent = agentIcons[agent.slug] || Bot;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="hover:text-foreground cursor-pointer" onClick={() => navigate("/admin/agents")}>Agentes</span> / <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/agents")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            <p className="text-muted-foreground text-sm">{agent.description}</p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <Card className="glass-strong shadow-premium">
        <CardHeader>
          <CardTitle className="text-lg">Configuração do Agente</CardTitle>
          <CardDescription>
            Personalize o comportamento e as respostas deste agente de IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Name & Status */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome do Agente</Label>
              <Input
                value={agent.name}
                disabled
                className="glass-input bg-muted/30"
              />
              <p className="text-xs text-muted-foreground">
                O nome do agente não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={agent.active}
                  onCheckedChange={(checked) => 
                    setAgent({ ...agent, active: checked })
                  }
                />
                <span className={agent.active ? 'text-primary' : 'text-muted-foreground'}>
                  {agent.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ative para permitir que o agente responda aos usuários
              </p>
            </div>
          </div>

          {/* Row 2: Model */}
          <div className="space-y-2">
            <Label className="text-foreground">Modelo de LLM</Label>
            <Select
              value={agent.model}
              onValueChange={(value) => 
                setAgent({ ...agent, model: value })
              }
            >
              <SelectTrigger className="glass-input w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o (Mais inteligente)</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O GPT-4o oferece respostas mais elaboradas, enquanto o Mini é mais rápido e econômico
            </p>
          </div>

          {/* Row 3: Temperature & Max Tokens */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Temperatura</Label>
                <span className="text-sm font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                  {agent.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[agent.temperature]}
                onValueChange={([value]) => 
                  setAgent({ ...agent, temperature: value })
                }
                min={0}
                max={2}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Valores baixos (0.0-0.3) = respostas mais consistentes. Valores altos (0.7-1.0) = mais criativas.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Limite de Tokens (max_tokens)</Label>
              <Input
                type="number"
                value={agent.max_tokens}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1024;
                  setAgent({ ...agent, max_tokens: Math.min(8192, Math.max(1, value)) });
                }}
                min={1}
                max={8192}
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de tokens na resposta (1-8192). Valores maiores permitem respostas mais longas.
              </p>
            </div>
          </div>

          {/* Row 4: Prompt (largest area) */}
          <div className="space-y-2">
            <Label className="text-foreground">Prompt do Agente</Label>
            <Textarea
              value={agent.prompt}
              onChange={(e) => setAgent({ ...agent, prompt: e.target.value })}
              className="glass-input min-h-[300px] font-mono text-sm resize-y"
              placeholder="Digite as instruções para o agente..."
            />
            <p className="text-xs text-muted-foreground">
              Este prompt define como o agente deve se comportar e responder aos usuários
            </p>
          </div>

          {/* Row 5: Description */}
          <div className="space-y-2">
            <Label className="text-foreground">Descrição (opcional)</Label>
            <Input
              value={agent.description || ''}
              onChange={(e) => setAgent({ ...agent, description: e.target.value })}
              className="glass-input"
              placeholder="Descrição do agente..."
            />
            <p className="text-xs text-muted-foreground">
              Descrição visível no painel de agentes
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
