import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    UsersRound,
    CreditCard,
    FileText,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandingContext } from '@/contexts/BrandingContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
    { name: 'Dashboard',     icon: LayoutDashboard, href: '/admin' },
    { name: 'Usuários',      icon: Users,            href: '/admin/users' },
    { name: 'Planos Família',icon: UsersRound,       href: '/admin/family-plans' },
    { name: 'Financeiro',    icon: CreditCard,       href: '/admin/plans' },
    { name: 'Assinaturas',   icon: FileText,         href: '/admin/subscriptions' },
    { name: 'Notificações',  icon: Bell,             href: '/admin/notifications' },
    { name: 'Agentes',       icon: Bot,              href: '/admin/agents' },
    { name: 'Configurações', icon: Settings,         href: '/admin/settings' },
] as const;

export function AdminLayout() {
    const { user, signOut } = useAuth(true);
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logoUrl, platformName } = useBrandingContext();

    if (!user) return null;

    const getInitials = (name: string) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

    const NavLink = ({ item }: { item: typeof menuItems[number] }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
            <Link
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive ? 'sidebar-item-active' : 'text-muted-foreground sidebar-item-hover border-l-3 border-transparent'
                )}
            >
                <Icon className="h-5 w-5" />
                {item.name}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden lg:flex flex-col w-64 sidebar-premium fixed h-full z-50">
                <div className="p-6 flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-8">
                        {logoUrl ? (
                            <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[32px] object-contain" />
                        ) : (
                            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
                                <span className="text-primary font-bold text-xl">{platformName.charAt(0)}</span>
                            </div>
                        )}
                        <span className="text-xl font-bold text-foreground">{platformName}</span>
                    </div>

                    {/* Nav */}
                    <nav className="space-y-1 flex-1">
                        {menuItems.map(item => <NavLink key={item.href} item={item} />)}
                    </nav>

                    {/* User */}
                    <div className="pt-6 border-t border-sidebar-border">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 w-full hover:bg-sidebar-accent p-2 rounded-lg transition-colors">
                                    <Avatar className="h-9 w-9 border border-sidebar-border">
                                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                                            {getInitials(user.nome)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {user.nome?.split(' ')[0] || 'Admin'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Administrador</p>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                                <DropdownMenuLabel className="text-muted-foreground">Minha Conta</DropdownMenuLabel>
                                <DropdownMenuItem className="text-foreground focus:bg-accent">
                                    {user.email}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    onClick={() => signOut()}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <div className="lg:hidden flex items-center justify-between p-4 sidebar-premium border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[32px] object-contain" />
                    ) : (
                        <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold text-xl">{platformName.charAt(0)}</span>
                        </div>
                    )}
                    <span className="text-foreground font-bold">{platformName}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-muted-foreground"
                >
                    {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* MOBILE SIDEBAR */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 sidebar-premium backdrop-blur-sm pt-20 px-6">
                    <nav className="space-y-2">
                        {menuItems.map(item => <NavLink key={item.href} item={item} />)}
                    </nav>
                </div>
            )}

            {/* MAIN CONTENT */}
            <main className="lg:pl-64 min-h-screen bg-background">
                <div className="p-6 lg:p-10 w-full min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
