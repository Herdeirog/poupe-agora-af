import { useState, useEffect, useRef } from "react";
import { RefreshCw, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle, MessageSquare, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueJob {
  id: string;
  user_id: string;
  inbound_message_id: string;
  status: string;
  attempts: number;
  next_run_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface InboundMessage {
  id: string;
  user_id: string;
  channel: string;
  remote_jid: string;
  message_id: string;
  message_type: string;
  content: string | null;
  processed: boolean;
  received_at: string;
  processed_at: string | null;
}

interface QueueStats {
  queued: number;
  processing: number;
  done: number;
  failed: number;
}

export default function AdminQueueDebug() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [stats, setStats] = useState<QueueStats>({ queued: 0, processing: 0, done: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [processingWorker, setProcessingWorker] = useState(false);
  const [autoWorker, setAutoWorker] = useState(false);
  const workerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (workerIntervalRef.current) {
        clearInterval(workerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoWorker) {
      workerIntervalRef.current = setInterval(() => {
        runWorker(true);
      }, 10000);
      toast.info("Worker automático ativado (a cada 10s)");
    } else {
      if (workerIntervalRef.current) {
        clearInterval(workerIntervalRef.current);
        workerIntervalRef.current = null;
      }
    }
  }, [autoWorker]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadJobs(), loadMessages(), loadStats()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from("message_queue" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading jobs:", error);
      return;
    }
    setJobs((data as unknown as QueueJob[]) || []);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("inbound_messages" as any)
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }
    setMessages((data as unknown as InboundMessage[]) || []);
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from("message_queue" as any)
      .select("status");

    if (error) {
      console.error("Error loading stats:", error);
      return;
    }

    const statuses = (data as unknown as Array<{ status: string }>) || [];
    setStats({
      queued: statuses.filter(s => s.status === "queued").length,
      processing: statuses.filter(s => s.status === "processing").length,
      done: statuses.filter(s => s.status === "done").length,
      failed: statuses.filter(s => s.status === "failed").length,
    });
  };

  const runWorker = async (silent = false) => {
    if (processingWorker) return;
    
    setProcessingWorker(true);
    if (!silent) toast.info("Processando fila...");

    try {
      const { data, error } = await supabase.functions.invoke("queue-worker");

      if (error) throw error;

      if (!silent) {
        toast.success(`Processados: ${data?.processed || 0}, Falhos: ${data?.failed || 0}, Pulados: ${data?.skipped || 0}`);
      }
      
      await loadData();
    } catch (error) {
      console.error("Error running worker:", error);
      if (!silent) toast.error("Erro ao processar fila");
    } finally {
      setProcessingWorker(false);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("message_queue" as any)
        .update({ 
          status: "queued", 
          next_run_at: new Date().toISOString(),
          last_error: null 
        } as any)
        .eq("id", jobId);

      if (error) throw error;

      toast.success("Job reagendado para reprocessamento");
      await loadData();
    } catch (error) {
      console.error("Error retrying job:", error);
      toast.error("Erro ao reagendar job");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Na Fila</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processando</Badge>;
      case "done":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM HH:mm:ss", { locale: ptBR });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        Admin / <span className="text-foreground">Debug da Fila</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debug da Fila de Mensagens</h1>
          <p className="text-muted-foreground">
            Monitor de jobs e mensagens do WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-worker"
              checked={autoWorker}
              onCheckedChange={setAutoWorker}
            />
            <Label htmlFor="auto-worker" className="text-sm text-muted-foreground">
              Worker Automático
            </Label>
          </div>
          <Button
            onClick={() => runWorker(false)}
            disabled={processingWorker}
            className="bg-primary hover:bg-primary/90"
          >
            {processingWorker ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Processar Fila
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.queued}</p>
              <p className="text-xs text-muted-foreground">Na Fila</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Processando</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.done}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Falhados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="glass-strong">
          <TabsTrigger value="jobs" className="gap-2">
            <Layers className="h-4 w-4" />
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens ({messages.length})
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="text-lg">Últimos 50 Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Próxima Execução</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <span className={job.attempts >= 3 ? "text-red-500 font-medium" : ""}>
                            {job.attempts}/3
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(job.next_run_at)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {job.last_error ? (
                            <span className="text-red-400 text-xs truncate block" title={job.last_error}>
                              {job.last_error.substring(0, 50)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(job.created_at)}
                        </TableCell>
                        <TableCell>
                          {job.status === "failed" && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => retryJob(job.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {jobs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum job encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="text-lg">Últimas 50 Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processada</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Recebida em</TableHead>
                      <TableHead>Processada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell>
                          {msg.processed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {msg.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <span className="text-sm truncate block" title={msg.content || ""}>
                            {msg.content ? msg.content.substring(0, 60) : "-"}
                            {msg.content && msg.content.length > 60 ? "..." : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {msg.remote_jid.split("@")[0]}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(msg.received_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {msg.processed_at ? formatDate(msg.processed_at) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {messages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma mensagem encontrada
                        </TableCell>
                      </TableRow>
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
