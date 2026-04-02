import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, Bell, FileBarChart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Home', url: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Agenda', url: '/app/agenda', icon: CalendarClock },
  { title: 'Lembretes', url: '/app/reminders', icon: Bell },
  { title: 'Relatórios', url: '/app/reports', icon: FileBarChart },
  { title: 'Perfil', url: '/app/profile', icon: User },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== '/app/dashboard' && location.pathname.startsWith(item.url));
          
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] min-h-[44px] rounded-lg transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground active:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium leading-tight">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
