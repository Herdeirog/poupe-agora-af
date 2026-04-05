import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  CreditCard,
  User,
  Settings,
  HelpCircle,
  Tags,
  Calendar,
  FileBarChart,
  Link2,
  Bell,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandingContext } from '@/contexts/BrandingContext';

const menuItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Transações', url: '/app/transactions', icon: ArrowLeftRight },
  { title: 'Agenda', url: '/app/agenda', icon: CalendarClock },
  { title: 'Lembretes', url: '/app/reminders', icon: Bell },
  { title: 'Calendário', url: '/app/calendar', icon: Calendar },
  { title: 'Relatórios', url: '/app/reports', icon: FileBarChart },
  { title: 'Metas', url: '/app/goals', icon: Target },
  { title: 'Categorias', url: '/app/categories', icon: Tags },
  { title: 'Integrações', url: '/app/integrations', icon: Link2 },
  { title: 'Meu Plano', url: '/app/plan', icon: CreditCard },
  { title: 'Perfil', url: '/app/profile', icon: User },
  { title: 'Configurações', url: '/app/settings', icon: Settings },
  { title: 'Suporte', url: '/app/support', icon: HelpCircle },
];

export function AppSidebar() {
  const location = useLocation();
  const { logoUrl, platformName } = useBrandingContext();

  return (
    <aside className="hidden lg:flex w-64 min-h-screen sidebar-premium flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[32px] object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center green-glow-sm">
              <span className="text-primary font-bold text-lg">{platformName.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">{platformName}</h1>
            <p className="text-xs text-muted-foreground">Painel do Usuário</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.url);
            return (
              <li key={item.url}>
                <NavLink
                  to={item.url}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'sidebar-item-active'
                      : 'text-muted-foreground hover:text-foreground sidebar-item-hover border-l-3 border-transparent'
                  )}
                >
                  <item.icon className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : ''
                  )} />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 {platformName}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Versão 2.0 Premium
          </p>
        </div>
      </div>
    </aside>
  );
}
