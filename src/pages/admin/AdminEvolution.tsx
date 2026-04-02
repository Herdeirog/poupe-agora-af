import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  QrCode, 
  LogOut, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Loader2,
  Inbox,
  Send
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface EvolutionSettings {
  id: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  active: boolean;
}

interface InboundMessage {
  id: string;
  remote_jid: string;
  message_type: string;
  content: string | null;
  processed: boolean;
  received_at: string;
}

interface QueueJob {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_run_at: string;
  created_at: string;
}

interface DailyStats {
  date: string;
  total: number;
  processed: number;
  pending: number;
}

export default function AdminEvolution() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<EvolutionSettings | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  
  // Statistics
  const [totalMessages, setTotalMessages] = useState(0);
  const [processedMessages, setProcessedMessages] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);
  const [queueStats, setQueueStats] = useState({ queued: 0, processing: 0, done: 0, failed: 0 });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  
  // Logs
  const [recentMessages, setRecentMessages] = useState<InboundMessage[]>([]);
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);

  // Load settings
  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('integration_evolution')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  }, []);

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!settings?.instance_name) return;
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status');
      
      if (!error && data) {
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        if (data.connected) {
          setQrCode(null);
          setPollingActive(false);
        }
      } else {
        setConnectionStatus('unknown');
      }
    } catch (err) {
      console.error('Error checking status:', err);
      setConnectionStatus('unknown');
    } finally {
      setCheckingStatus(false);
    }
  }, [settings?.instance_name]);

  // Generate QR Code
  const handleGenerateQr = async () => {
    setGeneratingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-connect');
      
      if (error) throw error;
      
      if (data?.qrcode) {
        setQrCode(data.qrcode);
        setPollingActive(true);
        toast({ title: "QR Code gerado", description: "Escaneie com o WhatsApp" });
      } else if (data?.connected) {
        setConnectionStatus('connected');
        toast({ title: "Já conectado", description: "A instância já está conectada" });
      }
    } catch (err: any) {
      toast({ 
        title: "Erro ao gerar QR Code", 
        description: err.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setGeneratingQr(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.functions.invoke('evolution-logout');
      
      if (error) throw error;
      
      setConnectionStatus('disconnected');
      setQrCode(null);
      toast({ title: "Desconectado", description: "Sessão encerrada com sucesso" });
    } catch (err: any) {
      toast({ 
        title: "Erro ao desconectar", 
        description: err.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoggingOut(false);
    }
  };

  // Load statistics
  const loadStatistics = useCallback(async () => {
    // Total and processed messages
    const { count: total } = await supabase
      .from('inbound_messages')
      .select('*', { count: 'exact', head: true });
    
    const { count: processed } = await supabase
      .from('inbound_messages')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true);
    
    setTotalMessages(total || 0);
    setProcessedMessages(processed || 0);
    setPendingMessages((total || 0) - (processed || 0));

    // Queue stats
    const { data: queueData } = await supabase
      .from('message_queue')
      .select('status');
    
    if (queueData) {
      const stats = { queued: 0, processing: 0, done: 0, failed: 0 };
      queueData.forEach(item => {
        if (item.status in stats) {
          stats[item.status as keyof typeof stats]++;
        }
      });
      setQueueStats(stats);
    }

    // Daily stats for last 7 days
    const days: DailyStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { count: dayTotal } = await supabase
        .from('inbound_messages')
        .select('*', { count: 'exact', head: true })
        .gte('received_at', `${dateStr}T00:00:00`)
        .lt('received_at', `${dateStr}T23:59:59`);
      
      const { count: dayProcessed } = await supabase
        .from('inbound_messages')
        .select('*', { count: 'exact', head: true })
        .gte('received_at', `${dateStr}T00:00:00`)
        .lt('received_at', `${dateStr}T23:59:59`)
        .eq('processed', true);
      
      days.push({
        date: format(date, 'EEE', { locale: ptBR }),
        total: dayTotal || 0,
        processed: dayProcessed || 0,
        pending: (dayTotal || 0) - (dayProcessed || 0)
      });
    }
    setDailyStats(days);
  }, []);

  // Load recent messages
  const loadRecentMessages = useCallback(async () => {
    const { data } = await supabase
      .from('inbound_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);
    
    if (data) {
      setRecentMessages(data);
    }
  }, []);

  // Load queue jobs
  const loadQueueJobs = useCallback(async () => {
    const { data } = await supabase
      .from('message_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setQueueJobs(data);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSettings();
    loadStatistics();
    loadRecentMessages();
    loadQueueJobs();
  }, [loadSettings, loadStatistics, loadRecentMessages, loadQueueJobs]);

  // Check status when settings load
  useEffect(() => {
    if (settings?.instance_name) {
      checkStatus();
    }
  }, [settings?.instance_name, checkStatus]);

  // Polling when waiting for QR scan
  useEffect(() => {
    if (!pollingActive) return;
    
    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    // Stop after 2 minutes
    const timeout = setTimeout(() => {
      setPollingActive(false);
      setQrCode(null);
    }, 120000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pollingActive, checkStatus]);

  const successRate = totalMessages > 0 
    ? Math.round((processedMessages / totalMessages) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evolution API</h1>
        <p className="text-muted-foreground">Dashboard de conexão WhatsApp e estatísticas</p>
      </div>

      {/* Connection Status Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Status da Conexão
            </CardTitle>
            <CardDescription>
              {settings?.instance_name ? `Instância: ${settings.instance_name}` : 'Nenhuma instância configurada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                className={connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
              >
                {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'disconnected' ? 'Desconectado' : 'Desconhecido'}
              </Badge>
              {settings?.api_url && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {settings.api_url}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Verificar
              </Button>
              
              {connectionStatus !== 'connected' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateQr}
                  disabled={generatingQr}
                >
                  {generatingQr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Gerar QR Code
                </Button>
              )}
              
              {connectionStatus === 'connected' && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              {qrCode ? 'Escaneie com o WhatsApp para conectar' : 'Clique em "Gerar QR Code" para conectar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[200px]">
            {qrCode ? (
              <div className="relative">
                <img src={qrCode} alt="QR Code" className="rounded-lg max-w-[200px]" />
                {pollingActive && (
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Aguardando conexão...
                    </span>
                  </div>
                )}
              </div>
            ) : connectionStatus === 'connected' ? (
              <div className="text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>WhatsApp conectado</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum QR Code gerado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-white/[0.08]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mensagens</p>
                <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
              </div>
              <Inbox className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass border-white/[0.08]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processadas</p>
                <p className="text-2xl font-bold text-green-400">{processedMessages}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass border-white/[0.08]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-2xl font-bold text-yellow-400">{queueStats.queued + queueStats.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass border-white/[0.08]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-foreground">{successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card className="glass border-white/[0.08]">
        <CardHeader>
          <CardTitle>Mensagens por Dia (Últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="processed" name="Processadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pendentes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Logs */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="messages">Mensagens Recebidas</TabsTrigger>
          <TabsTrigger value="queue">Fila de Processamento</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card className="glass border-white/[0.08]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs de Webhook</CardTitle>
                <CardDescription>Últimas 50 mensagens recebidas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadRecentMessages}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/[0.08] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.08]">
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Remetente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma mensagem recebida
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentMessages.map((msg) => (
                        <TableRow key={msg.id} className="border-white/[0.08]">
                          <TableCell className="text-sm">
                            {format(parseISO(msg.received_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate">
                            {msg.remote_jid.split('@')[0]}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {msg.message_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {msg.content || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={msg.processed ? 'default' : 'secondary'}
                              className={msg.processed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
                            >
                              {msg.processed ? 'Processada' : 'Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card className="glass border-white/[0.08]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fila de Processamento</CardTitle>
                <CardDescription>Últimos 20 jobs</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadQueueJobs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/[0.08] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.08]">
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Último Erro</TableHead>
                      <TableHead>Próxima Execução</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum job na fila
                        </TableCell>
                      </TableRow>
                    ) : (
                      queueJobs.map((job) => (
                        <TableRow key={job.id} className="border-white/[0.08]">
                          <TableCell className="font-mono text-xs">
                            {job.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                job.status === 'done' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                job.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                job.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              }
                            >
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.attempts}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {job.last_error || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(parseISO(job.next_run_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
