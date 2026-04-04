import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  Bell,
  FileText,
  ChevronLeft,
  ChevronRight,
  Wallet,
  UsersRound,
  Coins,
  ExternalLink,
  Bot,
  Activity,
  Layers,
  Plug,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useBrandingContext } from "@/contexts/BrandingContext";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    title: "Usuários",
    icon: Users,
    path: "/admin/users",
  },
  {
    title: "Planos Família",
    icon: UsersRound,
    path: "/admin/family-plans",
  },
  {
    title: "Assinaturas",
    icon: CreditCard,
    path: "/admin/subscriptions",
  },
  {
    title: "Transações",
    icon: Wallet,
    path: "/admin/transactions",
  },
  {
    title: "Notificações",
    icon: Bell,
    path: "/admin/notifications",
  },
  {
    title: "Relatórios",
    icon: FileText,
    path: "/admin/reports",
  },
  {
    title: "Agentes",
    icon: Bot,
    path: "/admin/agents",
  },
  {
    title: "Logs de Agentes",
    icon: Activity,
    path: "/admin/agents/logs",
  },
  {
    title: "Evolution API",
    icon: Plug,
    path: "/admin/evolution",
  },
  {
    title: "Debug da Fila",
    icon: Layers,
    path: "/admin/queue",
  },
  {
    title: "Métricas IA",
    icon: Brain,
    path: "/admin/ai-metrics",
  },
  {
    title: "Configurações",
    icon: Settings,
    path: "/admin/settings",
  },
  {
    title: "Moeda",
    icon: Coins,
    path: "/admin/settings?tab=currency",
  },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logoUrl, platformName } = useBrandingContext();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen sidebar-premium transition-all duration-300 hidden lg:block flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.08]">
        {!collapsed && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary green-glow-sm">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">{platformName}</span>
            </div>
          )
        )}
        {collapsed && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-8 mx-auto object-contain" />
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary green-glow-sm">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-2 flex-1">
        {menuItems.map((item) => {
          const itemPath = item.path.split('?')[0];
          const isActive = location.pathname === itemPath && 
            (item.path.includes('?tab=') ? location.search === `?tab=${item.path.split('?tab=')[1]}` : !location.search.includes('tab='));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "sidebar-item-active bg-primary/15 text-primary border-l-[3px] border-primary"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive && "text-primary")} />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Ir para o Site - Fixed at bottom */}
      <div className="p-3 border-t border-white/[0.08]">
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-all duration-200"
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Ir para o Site</span>}
        </NavLink>
      </div>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full glass border-white/[0.12] hover:bg-white/[0.08]"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </aside>
  );
}
