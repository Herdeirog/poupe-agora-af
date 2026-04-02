import { AlertTriangle, Mail, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";

interface EmailConfigAlertProps {
  isConfigured?: boolean;
}

export default function EmailConfigAlert({ isConfigured = false }: EmailConfigAlertProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySecret = () => {
    navigator.clipboard.writeText("RESEND_API_KEY");
    setCopied(true);
    toast.success("Nome do secret copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConfigured) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notificações por Email
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Configurado</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                RESEND_API_KEY está configurada e notificações por email estão ativas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Configuração de Email (Notificações)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-background/50 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground mb-1">RESEND_API_KEY não configurada</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para enviar notificações por email quando membros são removidos ou bloqueados do 
                Plano Família, você precisa configurar a chave da API do Resend.
              </p>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Como configurar:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Crie uma conta em <span className="text-primary">resend.com</span></li>
                  <li>Gere uma API key em <span className="text-primary">resend.com/api-keys</span></li>
                  <li>Adicione como secret no Supabase: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">RESEND_API_KEY</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySecret}
            className="gap-2"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar nome do secret"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://resend.com/api-keys", "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Resend
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://supabase.com/dashboard/project/zjqknkdtugzppquhoovx/settings/functions", "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Secrets Supabase
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            Sem essa configuração, notificações serão enviadas apenas via WhatsApp (se configurado).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
