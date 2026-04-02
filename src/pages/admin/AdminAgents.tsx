import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bot, Settings2, Sparkles, MessageSquare, Calendar, RefreshCw,
  Wifi, WifiOff, QrCode, Loader2, Save, TestTube, Plus, Link, LogOut,
  Eye, EyeOff, CheckCircle2, XCircle, Power, Copy, Check, Info
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { agentService } from "@/services/agentService";
import { AIAgent } from "@/types/aiAgent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const agentIcons: Record<string, React.ElementType> = {
  'assistente_financeiro': Sparkles,
  'agente_consulta': MessageSquare,
  'assistente_compromissos': Calendar,
};

interface EvolutionSettings {
  id?: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  webhook_secret: string;
  active: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

function WebhookInstructions() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-webhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
        <Info className="h-4 w-4" />
        Configuração do Webhook na Evolution API
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">URL do Webhook (copie e cole na Evolution)</Label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={webhookUrl}
            className="font-mono text-xs bg-background/50"
          />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5 mt-2">
        <p className="font-medium text-foreground/80">Como configurar manualmente na Evolution API:</p>
        <ol className="list-decimal list-inside space-y-1 ml-1">
          <li>Acesse o painel da Evolution API &gt; <strong>Configurations</strong> &gt; <strong>Events</strong> &gt; <strong>Webhook</strong></li>
          <li>Cole a URL acima no campo <strong>"URL"</strong></li>
          <li>Ative <strong>"Webhook Base64"</strong> (necessario para imagens e audio)</li>
          <li>Ative o evento <strong>"MESSAGES_UPSERT"</strong></li>
          <li>Clique em <strong>Save</strong></li>
        </ol>
        <p className="mt-2 text-muted-foreground/80 italic">
          Ou use o botao "Configurar Webhook" abaixo para configurar automaticamente.
        </p>
      </div>
    </div>
  );
}

export default function AdminAgents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Evolution Integration States
  const [evolutionSettings, setEvolutionSettings] = useState<EvolutionSettings>({
    api_url: '',
    api_key: '',
    instance_name: '',
    webhook_secret: '',
    active: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [evolutionLoading, setEvolutionLoading] = useState({
    settings: false,
    save: false,
    test: false,
    createInstance: false,
    connect: false,
    webhook: false,
    logout: false,
    status: false,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgents();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  };

  const loadEvolutionSettings = async () => {
    setEvolutionLoading(prev => ({ ...prev, settings: true }));
    try {
      const { data, error } = await supabase
        .from('integration_evolution')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEvolutionSettings({
          id: data.id,
          api_url: data.api_url || '',
          api_key: data.api_key || '',
          instance_name: data.instance_name || '',
          webhook_secret: data.webhook_secret || '',
          active: data.active || false,
        });
        
        // Check status if settings exist
        if (data.api_url && data.api_key && data.instance_name) {
          checkEvolutionStatus();
        }
      }
    } catch (error) {
      console.error('Error loading Evolution settings:', error);
    } finally {
      setEvolutionLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const saveEvolutionSettings = async () => {
    setEvolutionLoading(prev => ({ ...prev, save: true }));
    try {
      const payload = {
        api_url: evolutionSettings.api_url,
        api_key: evolutionSettings.api_key,
        instance_name: evolutionSettings.instance_name,
        webhook_secret: evolutionSettings.webhook_secret,
        active: evolutionSettings.active,
        updated_at: new Date().toISOString(),
      };

      if (evolutionSettings.id) {
        const { error } = await supabase
          .from('integration_evolution')
          .update(payload)
          .eq('id', evolutionSettings.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('integration_evolution')
          .insert(payload)
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setEvolutionSettings(prev => ({ ...prev, id: data.id }));
        }
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setEvolutionLoading(prev => ({ ...prev, save: false }));
    }
  };

  const checkEvolutionStatus = async () => {
    setEvolutionLoading(prev => ({ ...prev, status: true }));
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
          instance_name: evolutionSettings.instance_name,
        }
      });
      
      if (error) throw error;
      
      if (data?.connected) {
        setConnectionStatus('connected');
        setQrCode(null);
        stopPolling();
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setConnectionStatus('disconnected');
    } finally {
      setEvolutionLoading(prev => ({ ...prev, status: false }));
    }
  };

  const testConnection = async () => {
    setEvolutionLoading(prev => ({ ...prev, test: true }));
    try {
      const { data, error } = await supabase.functions.invoke('evolution-health', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
        }
      });
      
      if (error) throw error;
      
      if (data?.connected) {
        toast.success("Conexão com Evolution API funcionando!");
      } else {
        toast.error("Falha na conexão: " + (data?.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error("Erro ao testar conexão: " + (error.message || 'Erro desconhecido'));
    } finally {
      setEvolutionLoading(prev => ({ ...prev, test: false }));
    }
  };

  const createInstance = async () => {
    setEvolutionLoading(prev => ({ ...prev, createInstance: true }));
    try {
      const { data, error } = await supabase.functions.invoke('evolution-instance-create', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
          instance_name: evolutionSettings.instance_name,
        }
      });
      
      if (error) throw error;
      
      if (data?.success || data?.instance) {
        toast.success("Instância criada com sucesso!");
        await checkEvolutionStatus();
      } else {
        toast.error("Erro ao criar instância: " + (data?.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error("Erro ao criar instância: " + (error.message || 'Erro desconhecido'));
    } finally {
      setEvolutionLoading(prev => ({ ...prev, createInstance: false }));
    }
  };

  const generateQRCode = async () => {
    setEvolutionLoading(prev => ({ ...prev, connect: true }));
    setConnectionStatus('connecting');
    try {
      const { data, error } = await supabase.functions.invoke('evolution-connect', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
          instance_name: evolutionSettings.instance_name,
        }
      });
      
      if (error) throw error;
      
      const qr = data?.base64 || data?.qrcode;
      if (qr) {
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
        startPolling();
      } else if (data?.connected) {
        setConnectionStatus('connected');
        toast.success("WhatsApp já está conectado!");
      } else {
        toast.error("Não foi possível gerar o QR Code");
        setConnectionStatus('disconnected');
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast.error("Erro ao gerar QR Code: " + (error.message || 'Erro desconhecido'));
      setConnectionStatus('disconnected');
    } finally {
      setEvolutionLoading(prev => ({ ...prev, connect: false }));
    }
  };

  const configureWebhook = async () => {
    setEvolutionLoading(prev => ({ ...prev, webhook: true }));
    try {
      const { data, error } = await supabase.functions.invoke('evolution-set-webhook', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
          instance_name: evolutionSettings.instance_name,
          webhook_secret: evolutionSettings.webhook_secret,
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Webhook configurado com sucesso!");
      } else {
        toast.error("Erro ao configurar webhook: " + (data?.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Error setting webhook:', error);
      toast.error("Erro ao configurar webhook: " + (error.message || 'Erro desconhecido'));
    } finally {
      setEvolutionLoading(prev => ({ ...prev, webhook: false }));
    }
  };

  const disconnectInstance = async () => {
    setEvolutionLoading(prev => ({ ...prev, logout: true }));
    try {
      const { data, error } = await supabase.functions.invoke('evolution-logout', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
          instance_name: evolutionSettings.instance_name,
        }
      });
      
      if (error) throw error;
      
      setConnectionStatus('disconnected');
      setQrCode(null);
      stopPolling();
      toast.success("WhatsApp desconectado!");
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error("Erro ao desconectar: " + (error.message || 'Erro desconhecido'));
    } finally {
      setEvolutionLoading(prev => ({ ...prev, logout: false }));
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('evolution-status', {
          body: {
            api_url: evolutionSettings.api_url,
            api_key: evolutionSettings.api_key,
            instance_name: evolutionSettings.instance_name,
          }
        });
        if (data?.connected) {
          setConnectionStatus('connected');
          setQrCode(null);
          stopPolling();
          toast.success("WhatsApp conectado com sucesso!");
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    loadAgents();
    loadEvolutionSettings();
    
    return () => {
      stopPolling();
    };
  }, []);

  const StatusIndicator = () => {
    const statusConfig = {
      disconnected: { 
        color: 'bg-destructive', 
        text: 'Desconectado', 
        icon: WifiOff,
        textColor: 'text-destructive'
      },
      connecting: { 
        color: 'bg-yellow-500 animate-pulse', 
        text: 'Conectando...', 
        icon: Wifi,
        textColor: 'text-yellow-600'
      },
      connected: { 
        color: 'bg-primary', 
        text: 'Conectado', 
        icon: Wifi,
        textColor: 'text-primary'
      },
    };
    
    const config = statusConfig[connectionStatus];
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config.color}`} />
        <Icon className={`h-4 w-4 ${config.textColor}`} />
        <span className={`font-medium ${config.textColor}`}>{config.text}</span>
      </div>
    );
  };

  const isConfigured = evolutionSettings.api_url && evolutionSettings.api_key && evolutionSettings.instance_name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Agentes</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Bot className="h-7 w-7 text-primary" />
            Agentes de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os agentes de inteligência artificial do sistema
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadAgents}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Loading State */}
      {loading && agents.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-strong animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-5 bg-muted rounded w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Agents Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const IconComponent = agentIcons[agent.slug] || Bot;
            return (
              <Card 
                key={agent.slug} 
                className="glass-strong shadow-premium hover:shadow-green-glow-sm transition-all duration-300 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">
                          {agent.name}
                        </CardTitle>
                        <Badge 
                          variant={agent.active ? 'default' : 'secondary'}
                          className={agent.active 
                            ? 'bg-primary/20 text-primary border-primary/30 mt-1' 
                            : 'bg-muted/50 text-muted-foreground border-muted mt-1'
                          }
                        >
                          {agent.active ? '● Ativo' : '○ Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-muted-foreground text-sm min-h-[40px]">
                    {agent.description}
                  </CardDescription>
                  
                  {/* Agent Stats */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      {agent.model}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      Temp: {agent.temperature}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      Max: {agent.max_tokens}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-end pt-2 border-t border-border/50">
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/admin/agents/${agent.slug}`)}
                      className="bg-primary/15 text-primary hover:bg-primary/25 border-0"
                    >
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* WhatsApp Integration Section */}
      <Card className="glass-strong border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">
                  🔌 Integração WhatsApp (Evolution API)
                </CardTitle>
                <CardDescription>
                  Configure a conexão com WhatsApp para os agentes de IA
                </CardDescription>
              </div>
            </div>
            <StatusIndicator />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API Evolution</Label>
              <Input
                id="api_url"
                placeholder="https://sua-evolution-api.com"
                value={evolutionSettings.api_url}
                onChange={(e) => setEvolutionSettings(prev => ({ ...prev, api_url: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Sua chave de API"
                  value={evolutionSettings.api_key}
                  onChange={(e) => setEvolutionSettings(prev => ({ ...prev, api_key: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input
                id="instance_name"
                placeholder="minha-instancia"
                value={evolutionSettings.instance_name}
                onChange={(e) => setEvolutionSettings(prev => ({ ...prev, instance_name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret (opcional)</Label>
              <Input
                id="webhook_secret"
                type="password"
                placeholder="Secret para validação"
                value={evolutionSettings.webhook_secret}
                onChange={(e) => setEvolutionSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
              />
            </div>
          </div>

          {/* Webhook URL & Instructions */}
          <WebhookInstructions />

          {/* Activation Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Power className={`h-5 w-5 ${evolutionSettings.active ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="space-y-0.5">
                <Label htmlFor="active" className="text-base font-medium cursor-pointer">
                  Ativar Integração
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, mensagens do WhatsApp serão processadas pelos agentes
                </p>
              </div>
            </div>
            <Switch
              id="active"
              checked={evolutionSettings.active}
              onCheckedChange={(checked) => 
                setEvolutionSettings(prev => ({ ...prev, active: checked }))
              }
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={saveEvolutionSettings}
              disabled={evolutionLoading.save}
            >
              {evolutionLoading.save ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
            
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={!isConfigured || evolutionLoading.test}
            >
              {evolutionLoading.test ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            
            <Button
              variant="outline"
              onClick={checkEvolutionStatus}
              disabled={!isConfigured || evolutionLoading.status}
            >
              {evolutionLoading.status ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verificar Status
            </Button>
          </div>

          <Separator />

          {/* Instance Actions */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Ações da Instância</h4>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={createInstance}
                disabled={!isConfigured || evolutionLoading.createInstance}
              >
                {evolutionLoading.createInstance ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Instância
              </Button>
              
              <Button
                variant="secondary"
                onClick={generateQRCode}
                disabled={!isConfigured || evolutionLoading.connect || connectionStatus === 'connected'}
              >
                {evolutionLoading.connect ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Gerar QR Code
              </Button>
              
              <Button
                variant="secondary"
                onClick={configureWebhook}
                disabled={!isConfigured || evolutionLoading.webhook}
              >
                {evolutionLoading.webhook ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Configurar Webhook
              </Button>
              
              {connectionStatus === 'connected' && (
                <Button
                  variant="destructive"
                  onClick={disconnectInstance}
                  disabled={evolutionLoading.logout}
                >
                  {evolutionLoading.logout ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          {qrCode && connectionStatus !== 'connected' && (
            <div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-primary">
                <QrCode className="h-5 w-5" />
                <p className="font-medium">Escaneie o QR Code com seu WhatsApp</p>
              </div>
              <img 
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg border"
              />
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Aguardando conexão...</p>
              </div>
            </div>
          )}

          {/* Connection Success */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-primary">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground">
                  Os agentes de IA agora podem receber e responder mensagens.
                </p>
              </div>
            </div>
          )}

          {/* Not Configured Warning */}
          {!isConfigured && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <XCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-600">Configuração Incompleta</p>
                <p className="text-sm text-muted-foreground">
                  Preencha a URL da API, API Key e Nome da Instância para habilitar a integração.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sobre os Agentes de IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os agentes de IA podem ser configurados com prompts personalizados para atender 
                às necessidades específicas do seu negócio. Configure o modelo de linguagem, 
                temperatura, limite de tokens e personalize as instruções de cada agente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
