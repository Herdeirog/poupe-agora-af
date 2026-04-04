import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  Bell,
  FileText,
  Wallet,
  Menu,
  X,
  UsersRound,
  Coins,
  LogOut,
  Bot,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "Usuários", icon: Users, path: "/admin/users" },
  { title: "Planos Família", icon: UsersRound, path: "/admin/family-plans" },
  { title: "Assinaturas", icon: CreditCard, path: "/admin/subscriptions" },
  { title: "Transações", icon: Wallet, path: "/admin/transactions" },
  { title: "Notificações", icon: Bell, path: "/admin/notifications" },
  { title: "Relatórios", icon: FileText, path: "/admin/reports" },
  { title: "Agentes", icon: Bot, path: "/admin/agents" },
  { title: "Configurações", icon: Settings, path: "/admin/settings" },
  { title: "Moeda", icon: Coins, path: "/admin/settings?tab=currency" },
];

export function MobileAdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { logoUrl, platformName } = useBrandingContext();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    navigate("/auth");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 sidebar-premium">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary green-glow-sm">
                  <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">{platformName}</span>
              </>
            )}
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
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
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "sidebar-item-active bg-primary/15 text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive && "text-primary")} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer com Logout */}
        <div className="p-3 border-t border-border/50">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
