import { AlertTriangle, XCircle, Info, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'config';
  message: string;
  date?: string;
}

interface AdminAlertsSectionProps {
  alerts?: AdminAlert[];
}

// Dados mockados para demonstração
const mockAlerts: AdminAlert[] = [
  { 
    id: '1', 
    type: 'warning', 
    message: 'Uso elevado de parcelamentos (8 de 10 permitidos)' 
  },
  { 
    id: '2', 
    type: 'error', 
    message: 'Recurso bloqueado: Google Agenda não disponível no plano Free' 
  },
  { 
    id: '3', 
    type: 'info', 
    message: 'Integração WhatsApp desativada pelo admin em 15/12/2024' 
  },
  { 
    id: '4', 
    type: 'config', 
    message: '⚠️ PENDENTE: Configurar secrets da Evolution API (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)' 
  },
];

export default function AdminAlertsSection({ alerts = mockAlerts }: AdminAlertsSectionProps) {
  const getAlertConfig = (type: AdminAlert['type']) => {
    const config = {
      warning: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'border-amber-500/30 bg-amber-500/10',
        iconColor: 'text-amber-500',
      },
      error: {
        icon: <XCircle className="h-4 w-4" />,
        className: 'border-destructive/30 bg-destructive/10',
        iconColor: 'text-destructive',
      },
      info: {
        icon: <Info className="h-4 w-4" />,
        className: 'border-blue-500/30 bg-blue-500/10',
        iconColor: 'text-blue-500',
      },
      config: {
        icon: <Settings className="h-4 w-4" />,
        className: 'border-primary/30 bg-primary/10',
        iconColor: 'text-primary',
      },
    };
    return config[type];
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Alertas
      </h3>
      
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config = getAlertConfig(alert.type);
          return (
            <Alert key={alert.id} className={config.className}>
              <div className="flex items-start gap-3">
                <span className={config.iconColor}>{config.icon}</span>
                <AlertDescription className="text-foreground">
                  {alert.message}
                </AlertDescription>
              </div>
            </Alert>
          );
        })}
      </div>
    </div>
  );
}
