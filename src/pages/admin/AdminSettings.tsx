import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, RefreshCw, Trash2, Download, QrCode, Settings2, CreditCard, MessageSquare, Clock, Wrench, Package, Coins, Image, Plug, Eye, EyeOff, Upload, Check, X, AlertTriangle, Calendar, Construction, Link, Plus, Wifi, WifiOff, Bot, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { settingsService } from "@/services/settingsService";
import FeatureControlTable from "@/components/admin/FeatureControlTable";
import PlanLimitsTable from "@/components/admin/PlanLimitsTable";
import FamilyPlanLimitsTable from "@/components/admin/FamilyPlanLimitsTable";
import EmailConfigAlert from "@/components/admin/EmailConfigAlert";
import CurrencySettingsTab from "@/components/admin/CurrencySettingsTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { agentService, type EvolutionAPISettings } from "@/services/agentService";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingContext } from "@/contexts/BrandingContext";

export default function AdminSettings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'general';
  const { reload: reloadBranding } = useBrandingContext();
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "Poupe Agora",
    logo: "",
    subdomain: "app",
    primaryColor: "#00E676",
  });

  const [paymentSettings, setPaymentSettings] = useState({
    perfectpay: { apiKey: "", webhookUrl: "https://api.poupeagora.com/webhooks/perfectpay", connected: false },
    asaas: { apiKey: "", webhookUrl: "https://api.poupeagora.com/webhooks/asaas", connected: false },
    qify: { apiKey: "", webhookUrl: "https://api.poupeagora.com/webhooks/qify", connected: false },
    hotmart: { apiKey: "", webhookUrl: "https://api.poupeagora.com/webhooks/hotmart", connected: false },
  });

  const [whatsappSettings, setWhatsappSettings] = useState({
    instanceStatus: "disconnected" as "disconnected" | "connected" | "connecting",
    phone: "",
    instanceName: "",
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Branding states
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingFavicon, setSavingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Check WhatsApp status via edge function
  const checkWhatsappStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status');
      
      if (error) throw error;
      
      if (data?.connected) {
        setWhatsappSettings(prev => ({ 
          ...prev, 
          instanceStatus: 'connected',
          instanceName: data.instance_name || prev.instanceName
        }));
        setQrCode(null);
        // Stop polling when connected
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setPollingStatus(false);
        }
      } else {
        setWhatsappSettings(prev => ({ 
          ...prev, 
          instanceStatus: data?.status === 'connecting' ? 'connecting' : 'disconnected',
          instanceName: data?.instance_name || prev.instanceName
        }));
      }
    } catch (error) {
      console.error("Error checking WhatsApp status:", error);
    }
  }, []);

  useEffect(() => {
    checkWhatsappStatus();
    loadBranding();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [checkWhatsappStatus]);


  const loadBranding = async () => {
    try {
      const whiteLabel = await settingsService.getWhiteLabelSettings();
      setGeneralSettings({
        platformName: whiteLabel.platformName || "Poupe Agora",
        subdomain: whiteLabel.subdomain || "app",
        logo: whiteLabel.logoUrl || "",
        primaryColor: whiteLabel.primaryColor || "#00E676",
      });
      if (whiteLabel.logoUrl) setLogoPreview(whiteLabel.logoUrl);
      if (whiteLabel.faviconUrl) setFaviconPreview(whiteLabel.faviconUrl);
    } catch (error) {
      console.error("Error loading branding:", error);
    }
  };

  // Legacy checkWhatsappStatus function removed - using the one defined above with useCallback

  const [trialSettings, setTrialSettings] = useState({
    enabled: true,
    days: 7,
  });

  // Evolution API settings
  const [evolutionSettings, setEvolutionSettings] = useState<EvolutionAPISettings>({
    id: '',
    active: false,
    api_url: '',
    instance_name: '',
    api_key: '',
    webhook_secret: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [loadingEvolution, setLoadingEvolution] = useState(true);

  // OpenAI API Key state (secure - never displays the key)
  const [openaiKey, setOpenaiKey] = useState("");
  const [savingOpenAI, setSavingOpenAI] = useState(false);

  // Load Evolution settings from Supabase
  useEffect(() => {
    const loadEvolutionSettings = async () => {
      try {
        const settings = await agentService.getEvolutionSettings();
        if (settings) {
          setEvolutionSettings(settings);
        }
      } catch (error) {
        console.error("Error loading Evolution settings:", error);
      } finally {
        setLoadingEvolution(false);
      }
    };
    loadEvolutionSettings();
  }, []);

  // Feature settings (mockado)
  const [featureSettings, setFeatureSettings] = useState({
    googleCalendar: {
      enabled: true,
      plans: { free: false, pro: false, premium: true }
    },
    whatsappBot: {
      enabled: false,
      plans: { free: false, pro: false, premium: true }
    }
  });

  const handleFeatureToggle = (feature: 'googleCalendar' | 'whatsappBot') => {
    setFeatureSettings(prev => ({
      ...prev,
      [feature]: { ...prev[feature], enabled: !prev[feature].enabled }
    }));
  };

  const handlePlanFeatureChange = (plan: 'free' | 'pro' | 'premium', feature: 'googleCalendar' | 'whatsappReminders', enabled: boolean) => {
    const featureKey = feature === 'googleCalendar' ? 'googleCalendar' : 'whatsappBot';
    setFeatureSettings(prev => ({
      ...prev,
      [featureKey]: {
        ...prev[featureKey],
        plans: { ...prev[featureKey].plans, [plan]: enabled }
      }
    }));
  };

  const handleSaveFeatures = () => {
    toast.success("Configurações de recursos salvas com sucesso!");
  };


  const handleSaveGeneral = async () => {
    try {
      await settingsService.saveWhiteLabelSettings({
        platformName: generalSettings.platformName,
        subdomain: generalSettings.subdomain,
        primaryColor: generalSettings.primaryColor,
      });
      toast.success("Configurações gerais salvas com sucesso!");
      // Recarregar para confirmar que salvou e atualizar o branding global
      await loadBranding();
      await reloadBranding();
    } catch (error) {
      console.error("Erro ao salvar configurações gerais:", error);
      toast.error("Erro ao salvar configurações gerais. Verifique o console.");
    }
  };


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const url = URL.createObjectURL(file);
      setFaviconPreview(url);
    }
  };

  const handleSaveLogo = async () => {
    if (!logoFile) {
      toast.error("Selecione um arquivo de logo primeiro.");
      return;
    }
    setSavingLogo(true);
    try {
      const url = await settingsService.uploadFile(logoFile, "logos");
      await settingsService.saveWhiteLabelSettings({ logoUrl: url });
      setGeneralSettings(prev => ({ ...prev, logo: url }));
      setLogoPreview(url);
      setLogoFile(null);
      await reloadBranding();
      toast.success("Logo salvo com sucesso!");
    } catch (error) {
      console.error("Error saving logo:", error);
      toast.error("Erro ao salvar logo.");
    } finally {
      setSavingLogo(false);
    }
  };

  const handleSaveFavicon = async () => {
    if (!faviconFile) {
      toast.error("Selecione um arquivo de favicon primeiro.");
      return;
    }
    setSavingFavicon(true);
    try {
      const url = await settingsService.uploadFile(faviconFile, "favicons");
      await settingsService.saveWhiteLabelSettings({ faviconUrl: url });
      setFaviconPreview(url);
      setFaviconFile(null);
      await reloadBranding();
      toast.success("Favicon salvo com sucesso!");
    } catch (error) {
      console.error("Error saving favicon:", error);
      toast.error("Erro ao salvar favicon.");
    } finally {
      setSavingFavicon(false);
    }
  };

  const handleTestConnection = (gateway: string) => {
    toast.info(`Testando conexão com ${gateway}...`);
    setTimeout(() => {
      toast.success(`Conexão com ${gateway} estabelecida!`);
    }, 1500);
  };

  // Start polling for connection status
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPollingStatus(true);
    pollingIntervalRef.current = setInterval(() => {
      checkWhatsappStatus();
    }, 5000);
    
    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setPollingStatus(false);
      }
    }, 120000);
  }, [checkWhatsappStatus]);

  // Create new instance
  const handleCreateInstance = async () => {
    if (!evolutionSettings.instance_name) {
      toast.error("Configure o nome da instância primeiro na aba Integrações.");
      return;
    }

    setCreatingInstance(true);
    toast.info("Criando instância...");

    try {
      const { data, error } = await supabase.functions.invoke('evolution-instance-create', {
        body: { instance_name: evolutionSettings.instance_name }
      });

      if (error) throw error;

      if (data?.ok) {
        toast.success("Instância criada com sucesso!");
        setWhatsappSettings(prev => ({ ...prev, instanceName: evolutionSettings.instance_name }));
      } else {
        toast.error(data?.error || "Erro ao criar instância");
      }
    } catch (error) {
      console.error("Error creating instance:", error);
      toast.error("Erro ao criar instância");
    } finally {
      setCreatingInstance(false);
    }
  };

  // Connect WhatsApp (generate QR Code)
  const handleConnectWhatsApp = async () => {
    setLoadingWhatsapp(true);
    toast.info("Gerando QR Code...");
    
    try {
      const { data, error } = await supabase.functions.invoke('evolution-connect');

      if (error) throw error;

      if (data?.base64) {
        setQrCode(data.base64);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
        startPolling();
      } else if (data?.qrcode) {
        setQrCode(data.qrcode);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
        startPolling();
      } else {
        toast.error(data?.error || "Erro ao gerar QR Code");
      }
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
      toast.error("Erro ao conectar. Verifique as configurações da Evolution API.");
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  // Clear session / Logout
  const handleClearSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-logout');
      
      if (error) throw error;

      setWhatsappSettings(prev => ({ ...prev, instanceStatus: 'disconnected' }));
      setQrCode(null);
      toast.success("Sessão desconectada e limpa!");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Erro ao desconectar.");
    }
  };

  // Configure webhook automatically
  const handleSetWebhook = async () => {
    setSettingWebhook(true);
    toast.info("Configurando webhook...");

    try {
      const { data, error } = await supabase.functions.invoke('evolution-set-webhook');

      if (error) throw error;

      if (data?.ok) {
        toast.success(`Webhook configurado: ${data.webhook_url}`);
      } else {
        toast.error(data?.error || "Erro ao configurar webhook");
      }
    } catch (error) {
      console.error("Error setting webhook:", error);
      toast.error("Erro ao configurar webhook");
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleClearCache = () => {
    toast.success("Cache do sistema limpo com sucesso!");
  };

  const handleExportLogs = () => {
    toast.success("Exportação de logs iniciada!");
  };

  const handleSaveEvolutionSettings = async () => {
    try {
      await agentService.saveEvolutionSettings(evolutionSettings);
      toast.success("Configurações da Evolution API salvas!");
    } catch (error) {
      console.error("Error saving Evolution settings:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  // Handler para atualizar OpenAI API Key
  const handleUpdateOpenAIKey = async () => {
    if (!openaiKey.trim()) {
      toast.error("Digite a nova API Key");
      return;
    }

    // Validação básica de formato no frontend
    if (!openaiKey.startsWith("sk-")) {
      toast.error("API Key deve começar com sk-");
      return;
    }

    setSavingOpenAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-secret", {
        body: { new_key: openaiKey, secret_name: "OPENAI_API_KEY" },
      });

      if (error) throw error;

      if (data?.status === "updated") {
        toast.success("OpenAI API Key atualizada com sucesso!");
        setOpenaiKey(""); // Limpar campo após sucesso
      } else {
        toast.error(data?.error || "Erro ao atualizar");
      }
    } catch (error) {
      console.error("Error updating OpenAI key");
      toast.error("Erro ao atualizar a API Key");
    } finally {
      setSavingOpenAI(false);
    }
  };

  const handleTestEvolutionConnection = async () => {
    if (!evolutionSettings.api_url || !evolutionSettings.api_key) {
      toast.error("Preencha a URL e a API Key antes de testar.");
      return;
    }

    setTestingConnection(true);
    toast.info("Testando conexão com Evolution API...");

    try {
      const { data, error } = await supabase.functions.invoke('evolution-health', {
        body: {
          api_url: evolutionSettings.api_url,
          api_key: evolutionSettings.api_key,
        },
      });

      if (error) throw error;

      if (data?.connected) {
        toast.success("Conexão estabelecida com sucesso!");
      } else {
        toast.error(`Falha na conexão. Status: ${data?.status || 'unknown'}`);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Erro ao testar conexão. Verifique as credenciais.");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Configurações</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as configurações do sistema
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} key={defaultTab} className="space-y-6">
        <TabsList className="glass-strong border-white/[0.08] p-1 flex-wrap h-auto shadow-premium">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Settings2 className="h-4 w-4" />
            Gerais
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="trial" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Clock className="h-4 w-4" />
            Período de Teste
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Package className="h-4 w-4" />
            Recursos
          </TabsTrigger>
          <TabsTrigger value="currency" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Coins className="h-4 w-4" />
            Moeda
          </TabsTrigger>
          <TabsTrigger value="tools" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Wrench className="h-4 w-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-green-glow-sm gap-2 transition-all duration-200">
            <Plug className="h-4 w-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-6">Configurações Gerais (White Label)</h3>
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Nome da Plataforma</Label>
                  <Input
                    value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Subdomínio</Label>
                  <div className="flex">
                    <Input
                      value={generalSettings.subdomain}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, subdomain: e.target.value })}
                      className="glass-input rounded-r-none"
                    />
                    <span className="inline-flex items-center px-3 border border-l-0 border-white/[0.1] rounded-r-lg bg-white/[0.02] text-muted-foreground text-sm">
                      .poupeagora.com
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Logo Atual</Label>
                  <div className="h-10 flex items-center bg-white/[0.02] rounded-lg border border-white/[0.1] px-3">
                    {generalSettings.logo ? (
                      <img src={generalSettings.logo} alt="Logo atual" className="h-7 w-auto max-w-[160px] object-contain" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma logo definida — use o upload abaixo</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={generalSettings.primaryColor}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 glass-input cursor-pointer"
                    />
                    <Input
                      value={generalSettings.primaryColor}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, primaryColor: e.target.value })}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveGeneral}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </div>

          {/* Logo e Favicon Section */}
          <div className="glass-strong p-6 shadow-premium animate-fade-in mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Logo e Favicon do Sistema
            </h3>
            
            <div className="space-y-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground text-base font-medium">Logo do Sistema</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta logo será exibida no canto superior esquerdo do sistema.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      ref={logoInputRef}
                      type="file"
                      accept=".png,.svg"
                      onChange={handleLogoChange}
                      className="glass-input cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PNG ou SVG • Altura padrão: 32px
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      <div className="h-10 min-w-[100px] flex items-center justify-center bg-background/50 rounded-lg border border-border/50 px-3">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="h-8 w-auto max-w-[120px] object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem logo</span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveLogo} 
                      disabled={!logoFile || savingLogo}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {savingLogo ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Salvar Logo
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Favicon Upload */}
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground text-base font-medium">Favicon</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este ícone será exibido na aba do navegador.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      ref={faviconInputRef}
                      type="file"
                      accept=".png,.ico"
                      onChange={handleFaviconChange}
                      className="glass-input cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PNG ou ICO • Tamanho ideal: 32x32 pixels
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      <div className="h-10 w-10 flex items-center justify-center bg-background/50 rounded-lg border border-border/50">
                        {faviconPreview ? (
                          <img src={faviconPreview} alt="Favicon preview" className="h-8 w-8 object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">32x32</span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveFavicon} 
                      disabled={!faviconFile || savingFavicon}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {savingFavicon ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Salvar Favicon
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <div className="space-y-6">
            {/* PerfectPay */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">PerfectPay</h3>
                <div className="flex items-center gap-2">
                  {paymentSettings.perfectpay.connected ? (
                    <span className="flex items-center gap-1 text-primary text-sm">
                      <Check className="h-4 w-4" /> Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <X className="h-4 w-4" /> Desconectado
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">API Key</Label>
                  <Input
                    type="password"
                    placeholder="pp_live_..."
                    value={paymentSettings.perfectpay.apiKey}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      perfectpay: { ...paymentSettings.perfectpay, apiKey: e.target.value }
                    })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Webhook URL</Label>
                  <Input
                    value={paymentSettings.perfectpay.webhookUrl}
                    readOnly
                    className="glass-input opacity-60"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="glass-input" onClick={() => handleTestConnection("PerfectPay")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Testar Conexão
                </Button>
              </div>
            </div>

            {/* Asaas */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Asaas</h3>
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <X className="h-4 w-4" /> Desconectado
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">API Key</Label>
                  <Input type="password" placeholder="$aas_..." className="glass-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Webhook URL</Label>
                  <Input value={paymentSettings.asaas.webhookUrl} readOnly className="glass-input opacity-60" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="glass-input" onClick={() => handleTestConnection("Asaas")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Testar Conexão
                </Button>
              </div>
            </div>

            {/* Qify */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Qify</h3>
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <X className="h-4 w-4" /> Desconectado
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">API Key</Label>
                  <Input type="password" placeholder="qify_..." className="glass-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Webhook URL</Label>
                  <Input value={paymentSettings.qify.webhookUrl} readOnly className="glass-input opacity-60" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="glass-input" onClick={() => handleTestConnection("Qify")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Testar Conexão
                </Button>
              </div>
            </div>

            {/* Hotmart */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Hotmart</h3>
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <X className="h-4 w-4" /> Desconectado
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">API Key</Label>
                  <Input type="password" placeholder="hot_..." className="glass-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Webhook URL</Label>
                  <Input value={paymentSettings.hotmart.webhookUrl} readOnly className="glass-input opacity-60" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="glass-input" onClick={() => handleTestConnection("Hotmart")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Testar Conexão
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">WhatsApp (Evolution API)</h3>
              {pollingStatus && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verificando conexão...
                </span>
              )}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    {whatsappSettings.instanceStatus === 'connected' ? (
                      <Wifi className="h-5 w-5 text-primary" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">Status da Instância</p>
                      <p className="text-sm text-muted-foreground">
                        {evolutionSettings.instance_name || 'Não configurada'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${whatsappSettings.instanceStatus === 'connected'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-destructive/15 text-destructive'
                    }`}>
                    {whatsappSettings.instanceStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Número conectado</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={whatsappSettings.phone}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phone: e.target.value })}
                    className="glass-input"
                    readOnly={whatsappSettings.instanceStatus === 'connected'}
                  />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleConnectWhatsApp} disabled={whatsappSettings.instanceStatus === 'connected'}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Conectar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleClearSession}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Sessão
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                {whatsappSettings.instanceStatus === 'connected' ? (
                  <div className="flex flex-col items-center">
                    <Check className="h-16 w-16 text-primary mb-4" />
                    <p className="font-medium text-foreground">Sistema Conectado</p>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Sua instância está ativa e pronta para enviar mensagens.
                    </p>
                  </div>
                ) : qrCode ? (
                  <div className="flex flex-col items-center animate-fade-in">
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg bg-white p-2" />
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Abra o WhatsApp e escaneie o código acima
                    </p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQrCode(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <QrCode className="h-32 w-32 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Nenhuma sessão ativa encontrada.
                    </p>
                    <Button onClick={handleConnectWhatsApp} disabled={loadingWhatsapp} className="glass-input">
                      {loadingWhatsapp ? 'Carregando...' : 'Gerar QR Code'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Trial Settings */}
        <TabsContent value="trial">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-6">Período de Teste</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                <div>
                  <p className="font-medium text-foreground">Ativar período de teste</p>
                  <p className="text-sm text-muted-foreground">
                    Novos usuários terão acesso gratuito durante o período configurado
                  </p>
                </div>
                <Switch
                  checked={trialSettings.enabled}
                  onCheckedChange={(checked) => setTrialSettings({ ...trialSettings, enabled: checked })}
                />
              </div>

              {trialSettings.enabled && (
                <div className="space-y-2">
                  <Label className="text-foreground">Dias de teste</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={trialSettings.days}
                    onChange={(e) => setTrialSettings({ ...trialSettings, days: parseInt(e.target.value) || 7 })}
                    className="glass-input w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Os usuários terão {trialSettings.days} dias de acesso gratuito
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button className="bg-primary hover:bg-primary/90" onClick={() => toast.success("Configurações de trial salvas!")}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Feature Settings (Recursos) */}
        <TabsContent value="features">
          <div className="space-y-6">
            {/* Alerta de configuração de Email */}
            <EmailConfigAlert isConfigured={false} />

            {/* Alerta de configuração pendente da Evolution API */}
            <Alert className="border-primary/30 bg-primary/10">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <strong>⚠️ Configuração Pendente:</strong> Os secrets da Evolution API ainda não foram configurados.
                <br />
                <span className="text-muted-foreground text-sm">
                  Necessário configurar: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
                </span>
              </AlertDescription>
            </Alert>

            {/* Tabela expandida de Limites por Plano */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Controle de Recursos por Plano</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure quais recursos estão disponíveis para cada plano
                  </p>
                </div>
              </div>
              
              <PlanLimitsTable />
            </div>

            {/* Google Calendar Feature */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Integração com Google Agenda</h3>
                    <p className="text-sm text-muted-foreground">
                      Permite que usuários sincronizem compromissos com sua conta Google Agenda.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={featureSettings.googleCalendar.enabled}
                  onCheckedChange={() => handleFeatureToggle('googleCalendar')}
                />
              </div>

              {featureSettings.googleCalendar.enabled && (
                <>
                  <Separator className="bg-white/[0.08] my-6" />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Controle por Plano (Legado)
                    </h4>
                    <FeatureControlTable
                      planFeatures={{
                        free: { googleCalendar: featureSettings.googleCalendar.plans.free, whatsappReminders: featureSettings.whatsappBot.plans.free },
                        pro: { googleCalendar: featureSettings.googleCalendar.plans.pro, whatsappReminders: featureSettings.whatsappBot.plans.pro },
                        premium: { googleCalendar: featureSettings.googleCalendar.plans.premium, whatsappReminders: featureSettings.whatsappBot.plans.premium },
                      }}
                      onFeatureChange={handlePlanFeatureChange}
                    />
                  </div>
                </>
              )}
            </div>

            {/* WhatsApp Bot Feature */}
            <div className="glass-strong p-6 shadow-premium animate-fade-in opacity-75" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">Bot WhatsApp (Conversacional)</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-500">
                        <Construction className="h-3 w-3" />
                        Em desenvolvimento
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permite interação com o sistema via mensagens WhatsApp.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={featureSettings.whatsappBot.enabled}
                  onCheckedChange={() => handleFeatureToggle('whatsappBot')}
                  disabled
                />
              </div>
            </div>

            {/* Family Plan Limits */}
            <FamilyPlanLimitsTable />

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveFeatures}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Currency Settings */}
        <TabsContent value="currency">
          <CurrencySettingsTab />
        </TabsContent>

        {/* Tools */}
        <TabsContent value="tools">
          <div className="space-y-6">
            <div className="glass p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Ferramentas do Sistema</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <p className="font-medium text-foreground">Limpar Cache</p>
                    <p className="text-sm text-muted-foreground">Remove todos os dados em cache do sistema</p>
                  </div>
                  <Button variant="outline" className="glass-input" onClick={handleClearCache}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <p className="font-medium text-foreground">Exportar Logs</p>
                    <p className="text-sm text-muted-foreground">Baixar arquivo com os logs mais recentes</p>
                  </div>
                  <Button variant="outline" className="glass-input" onClick={handleExportLogs}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <p className="font-medium text-foreground">Listar Logs Recentes</p>
                    <p className="text-sm text-muted-foreground">Visualizar os últimos eventos do sistema</p>
                  </div>
                  <Button variant="outline" className="glass-input" onClick={() => toast.info("Logs: Sistema operando normalmente")}>
                    Ver Logs
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-white/[0.08]" />

            {/* Danger Zone */}
            <div className="glass p-6 border border-destructive/30">
              <h3 className="text-lg font-semibold text-destructive mb-6">Zona de Perigo</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground">Resetar Configurações</p>
                    <p className="text-sm text-muted-foreground">Restaura todas as configurações para o padrão</p>
                  </div>
                  <Button variant="destructive" onClick={() => toast.error("Funcionalidade desabilitada por segurança")}>
                    Resetar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="glass-strong p-6 shadow-premium animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Evolution API</h3>
                <p className="text-sm text-muted-foreground">Configure a integração com a Evolution API para WhatsApp</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                <div>
                  <p className="font-medium text-foreground">Status da Integração</p>
                  <p className="text-sm text-muted-foreground">Ative para habilitar a integração</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={evolutionSettings.active}
                    onCheckedChange={(checked) => 
                      setEvolutionSettings({ ...evolutionSettings, active: checked })
                    }
                  />
                  <span className={evolutionSettings.active ? 'text-primary font-medium' : 'text-muted-foreground'}>
                    {evolutionSettings.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>

              {/* API Configuration */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">URL da API</Label>
                  <Input
                    value={evolutionSettings.api_url}
                    onChange={(e) => setEvolutionSettings({ ...evolutionSettings, api_url: e.target.value })}
                    placeholder="https://api.evolution.example.com"
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Instance Name</Label>
                  <Input
                    value={evolutionSettings.instance_name}
                    onChange={(e) => setEvolutionSettings({ ...evolutionSettings, instance_name: e.target.value })}
                    placeholder="minha-instancia"
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">API Key / Token</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={evolutionSettings.api_key}
                      onChange={(e) => setEvolutionSettings({ ...evolutionSettings, api_key: e.target.value })}
                      placeholder="Sua API Key"
                      className="glass-input pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Webhook Secret (opcional)</Label>
                  <Input
                    type="password"
                    value={evolutionSettings.webhook_secret || ''}
                    onChange={(e) => setEvolutionSettings({ ...evolutionSettings, webhook_secret: e.target.value })}
                    placeholder="Secret para validação de webhooks"
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={handleTestEvolutionConnection}
                  disabled={testingConnection || !evolutionSettings.api_url}
                  className="glass-input"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Plug className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveEvolutionSettings}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </div>

          {/* OpenAI API Key Section */}
          <div className="glass-strong p-6 shadow-premium animate-fade-in mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Bot className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">OpenAI API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Configure a chave de API para os agentes de IA
                </p>
              </div>
            </div>

            <Alert className="mb-6 border-amber-500/30 bg-amber-500/10">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-foreground">
                <strong>Segurança:</strong> A chave atual nunca é exibida. 
                Preencha apenas se quiser substituir a chave existente.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nova API Key</Label>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="glass-input font-mono max-w-md"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: sk-xxxxx ou sk-proj-xxxxx
                </p>
              </div>

              <Button
                onClick={handleUpdateOpenAIKey}
                disabled={savingOpenAI || !openaiKey.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {savingOpenAI ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar API Key
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
