import { Bell, Search, User, Moon, Sun, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MobileAdminSidebar } from "./MobileAdminSidebar";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

const THEME_KEY = 'poupe_theme_preference';

export function AdminTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currencyInfo } = useCurrencyContext();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return true; // Default to dark for admin
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between glass-topbar px-4 lg:px-6 animate-fade-in">
      {/* Mobile Menu + Search */}
      <div className="flex items-center gap-2 lg:gap-4 flex-1">
        <MobileAdminSidebar />
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar usuários, transações..."
            className="h-9 w-full glass-input pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Currency Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-sm border border-primary/20">
          <span className="text-base">{currencyInfo.flag}</span>
          <span className="text-primary font-medium">{currencyInfo.code}</span>
        </div>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-white/[0.06] text-muted-foreground hover:text-primary transition-all duration-200"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary green-glow-sm"></span>
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-2 hover:bg-white/[0.06] transition-all duration-200"
            >
              <Avatar className="h-8 w-8 border border-primary/40 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {user?.nome?.substring(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">{user?.nome || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass border-white/[0.12]">
            <DropdownMenuLabel className="text-foreground">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem className="text-muted-foreground hover:text-foreground hover:bg-white/[0.04] cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground hover:bg-white/[0.04] cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir para o Site
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
