import { useUserProfile, useUserPlan } from '@/hooks/useUserProfile';
import { Bell, User, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MobileSidebar } from './MobileSidebar';

const THEME_KEY = 'poupe_theme_preference';

export function AppTopbar() {
  const { profile } = useUserProfile();
  const { plan, trialDays } = useUserPlan();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="h-16 border-b border-border bg-card px-4 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 lg:gap-4">
        <MobileSidebar />
        {plan?.status === 'trial' && trialDays > 0 && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Trial: {trialDays} dias restantes
          </Badge>
        )}
        {plan?.status === 'active' && (
          <Badge variant="default" className="hidden sm:inline-flex">Premium</Badge>
        )}
        {plan?.status === 'pending' && (
          <Badge variant="destructive" className="hidden sm:inline-flex">Pendente</Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium hidden sm:inline">{user?.nome || profile?.name || 'Usuário'}</span>
        </div>

        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
