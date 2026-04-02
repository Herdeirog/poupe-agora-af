import { Calendar, Sheet, Building2, Link2, Sparkles } from "lucide-react";
import { IntegrationCard, IntegrationStatus } from "@/components/app/IntegrationCard";

const integrations: Array<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: IntegrationStatus;
  detailsUrl?: string;
}> = [
  {
    id: "google-calendar",
    icon: <Calendar className="w-6 h-6 text-blue-500" />,
    title: "Google Agenda",
    description: "Sincronize seus compromissos automaticamente com sua agenda do Google.",
    status: "disconnected",
    detailsUrl: "/app/integrations/google",
  },
  {
    id: "sheets",
    icon: <Sheet className="w-6 h-6 text-emerald-500" />,
    title: "Planilhas",
    description: "Exporte seus dados financeiros para Google Sheets automaticamente.",
    status: "coming_soon",
  },
  {
    id: "bank",
    icon: <Building2 className="w-6 h-6 text-violet-500" />,
    title: "Banco Digital",
    description: "Sincronize extratos bancários e importe transações automaticamente.",
    status: "coming_soon",
  },
];

export default function AppIntegrations() {
  return (
    <div className="container max-w-4xl py-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <Link2 className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Conecte serviços externos para potencializar sua gestão financeira
          </p>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            icon={integration.icon}
            title={integration.title}
            description={integration.description}
            status={integration.status}
            detailsUrl={integration.detailsUrl}
          />
        ))}
      </div>

      {/* Info Section */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Novas integrações em breve</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos trabalhando para trazer mais integrações que vão automatizar suas tarefas e economizar seu tempo.
          </p>
        </div>
      </div>
    </div>
  );
}
