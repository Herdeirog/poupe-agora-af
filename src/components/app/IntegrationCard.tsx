import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Lock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export type IntegrationStatus = "connected" | "disconnected" | "blocked" | "coming_soon";

interface IntegrationCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  status: IntegrationStatus;
  detailsUrl?: string;
  onAction?: () => void;
}

const statusConfig: Record<IntegrationStatus, {
  badge: { label: string; className: string; icon: ReactNode };
  actionLabel: string;
  actionVariant: "default" | "secondary" | "outline" | "destructive";
}> = {
  connected: {
    badge: {
      label: "Conectado",
      className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
      icon: <Check className="w-3 h-3 mr-1" />,
    },
    actionLabel: "Ver detalhes",
    actionVariant: "outline",
  },
  disconnected: {
    badge: {
      label: "Não conectado",
      className: "bg-muted text-muted-foreground border-border",
      icon: <X className="w-3 h-3 mr-1" />,
    },
    actionLabel: "Conectar",
    actionVariant: "default",
  },
  blocked: {
    badge: {
      label: "Premium",
      className: "bg-amber-500/15 text-amber-500 border-amber-500/20",
      icon: <Lock className="w-3 h-3 mr-1" />,
    },
    actionLabel: "Fazer upgrade",
    actionVariant: "secondary",
  },
  coming_soon: {
    badge: {
      label: "Em breve",
      className: "bg-blue-500/15 text-blue-500 border-blue-500/20",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    actionLabel: "Saiba mais",
    actionVariant: "outline",
  },
};

export function IntegrationCard({
  icon,
  title,
  description,
  status,
  detailsUrl,
  onAction,
}: IntegrationCardProps) {
  const config = statusConfig[status];
  const isDisabled = status === "coming_soon";

  const ActionButton = () => (
    <Button
      variant={config.actionVariant}
      size="sm"
      disabled={isDisabled}
      onClick={onAction}
      className={cn(
        "w-full mt-4",
        status === "blocked" && "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-0"
      )}
    >
      {config.actionLabel}
    </Button>
  );

  return (
    <Card className="group border-0 bg-background/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 ring-1 ring-white/10 hover:ring-white/20 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              status === "connected"
                ? "bg-white/10 shadow-[0_0_20px_-5px_rgba(255,255,255,0.15)]"
                : status === "blocked"
                ? "bg-amber-500/10"
                : "bg-white/5 grayscale"
            )}
          >
            {icon}
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", config.badge.className)}
          >
            {config.badge.icon}
            {config.badge.label}
          </Badge>
        </div>

        <h3 className="font-semibold text-lg mt-4">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {description}
        </p>

        {detailsUrl && !isDisabled ? (
          <Link to={detailsUrl}>
            <ActionButton />
          </Link>
        ) : (
          <ActionButton />
        )}
      </CardContent>
    </Card>
  );
}
