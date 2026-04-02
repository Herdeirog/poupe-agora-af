import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, X, Bell, Lock, ArrowLeft, Star, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type ConnectionState = "disconnected" | "connected" | "blocked";

export default function AppGoogleIntegration() {
  // Mock state control - change this to test different visual states
  const [mockState, setMockState] = useState<ConnectionState>("disconnected");
  const { toast } = useToast();

  const handleConnect = () => {
    // Simular conexão para demo
    setMockState("connected");
    toast({
      title: "Conectado com sucesso!",
      description: "Sua conta Google foi vinculada.",
    });
  };

  const handleDisconnect = () => {
    setMockState("disconnected");
    toast({
      title: "Desconectado",
      description: "Sua conta Google foi desvinculada.",
    });
  };

  const handleTestReminder = () => {
    toast({
      title: "Lembrete enviado!",
      description: "Você receberá uma notificação no WhatsApp em instantes.",
      duration: 3000,
    });
  };

  const handleUpgrade = () => {
    toast({
      title: "Redirecionando...",
      description: "Você será direcionado para a página de planos.",
    });
  };

  // Status Badge Component
  const StatusBadge = () => {
    switch (mockState) {
      case "connected":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20 px-4 py-1.5 text-sm font-medium">
            <Check className="w-3.5 h-3.5 mr-2" />
            Conectado
          </Badge>
        );
      case "blocked":
        return (
          <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20 px-4 py-1.5 text-sm font-medium">
            <Lock className="w-3.5 h-3.5 mr-2" />
            Recurso Premium
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground px-4 py-1.5 text-sm font-medium">
            <X className="w-3.5 h-3.5 mr-2" />
            Não conectado
          </Badge>
        );
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6 animate-in fade-in duration-500">
      {/* Back Link */}
      <Link
        to="/app/integrations"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Integrações
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Google Agenda</h1>
        <p className="text-muted-foreground text-lg">
          Sincronize seus compromissos automaticamente com o Google Agenda e receba lembretes no WhatsApp.
        </p>
      </div>

      {/* DEV: State Selector (remove in production) */}
      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <p className="text-xs text-yellow-500 mb-2 font-medium">🔧 Controle de Estado (Dev)</p>
        <div className="flex gap-2">
          {(["disconnected", "connected", "blocked"] as ConnectionState[]).map((state) => (
            <Button
              key={state}
              size="sm"
              variant={mockState === state ? "default" : "outline"}
              onClick={() => setMockState(state)}
              className="text-xs"
            >
              {state === "disconnected" && "Desconectado"}
              {state === "connected" && "Conectado"}
              {state === "blocked" && "Bloqueado"}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-0 bg-background/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 ring-1 ring-white/10 relative overflow-hidden">
        {/* Status Badge */}
        <div className="absolute top-0 right-0 p-4">
          <StatusBadge />
        </div>

        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-white/5">
          <div
            className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500",
              mockState === "connected"
                ? "bg-white/10 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)]"
                : mockState === "blocked"
                ? "bg-amber-500/10"
                : "bg-white/5 grayscale"
            )}
          >
            <Calendar
              className={cn(
                "w-12 h-12 transition-colors duration-300",
                mockState === "connected"
                  ? "text-blue-500"
                  : mockState === "blocked"
                  ? "text-amber-500"
                  : "text-muted-foreground"
              )}
            />
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <CardTitle className="text-2xl">Google Agenda</CardTitle>
            <CardDescription className="text-base">
              {mockState === "blocked"
                ? "Este recurso está disponível apenas para planos Premium."
                : "Sincronize seus eventos e receba notificações inteligentes."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {/* Feature Cards - Only show for non-blocked state */}
          {mockState !== "blocked" && (
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-medium mt-2">Sincronização Total</h3>
                <p className="text-sm text-muted-foreground">
                  Seus compromissos atualizados em tempo real.
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="p-2 w-fit rounded-lg bg-green-500/10 text-green-500">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="font-medium mt-2">Lembretes WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Receba avisos diretos no seu celular.
                </p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="p-2 w-fit rounded-lg bg-purple-500/10 text-purple-500">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-medium mt-2">Mais Produtividade</h3>
                <p className="text-sm text-muted-foreground">
                  Organize seu dia a dia sem esforço.
                </p>
              </div>
            </div>
          )}

          {/* Premium Benefits - Only show for blocked state */}
          {mockState === "blocked" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <h3 className="font-semibold flex items-center gap-2 text-amber-500">
                  <Star className="w-5 h-5" />
                  Desbloqueie com Premium
                </h3>
                <ul className="mt-3 space-y-2">
                  {[
                    "Sincronização automática de eventos",
                    "Lembretes personalizados no WhatsApp",
                    "Integração em tempo real",
                    "Suporte prioritário",
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Connection Status Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-black/20 border border-white/5">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-medium">Status da Conexão</p>

              {mockState === "connected" && (
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">
                    Conectado como:{" "}
                    <span className="text-foreground font-medium">usuario@gmail.com</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Última sincronização: Há 5 minutos
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    🔔 Lembretes ativos: <span className="text-emerald-500">Ativado</span>
                  </p>
                </div>
              )}

              {mockState === "disconnected" && (
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Google para ativar a sincronização de compromissos.
                </p>
              )}

              {mockState === "blocked" && (
                <p className="text-sm text-muted-foreground">
                  Faça upgrade para desbloquear esta integração.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {mockState === "connected" && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTestReminder}
                    className="border-white/10 hover:bg-white/5"
                  >
                    Testar lembrete
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                </>
              )}

              {mockState === "disconnected" && (
                <Button
                  onClick={handleConnect}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                >
                  Conectar Google Agenda
                </Button>
              )}

              {mockState === "blocked" && (
                <Button
                  onClick={handleUpgrade}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Fazer upgrade
                </Button>
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <Shield className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-500">Seus dados estão seguros</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Usamos OAuth 2.0 para autenticação. Nunca armazenamos sua senha do Google.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
