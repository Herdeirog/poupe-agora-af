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

// DEFINIR MENU COM VALORES PADRÃO SEMPRE
const menuItems = [
    {
        name: 'Dashboard',
        icon: LayoutDashboard,
        href: '/admin',
        className: '',
    },
    {
        name: 'Usuários',
        icon: Users,
        href: '/admin/users',
        className: '',
    },
    {
        name: 'Planos Família',
        icon: UsersRound,
        href: '/admin/family-plans',
        className: '',
    },
    {
        name: 'Financeiro',
        icon: CreditCard,
        href: '/admin/plans',
        className: '',
    },
    {
        name: 'Assinaturas',
        icon: FileText,
        href: '/admin/subscriptions',
        className: '',
    },
    {
        name: 'Notificações',
        icon: Bell,
        href: '/admin/notifications',
        className: '',
    },
    {
        name: 'Agentes',
        icon: Bot,
        href: '/admin/agents',
        className: '',
    },
    {
        name: 'Configurações',
        icon: Settings,
        href: '/admin/settings',
        className: '',
    },
] as const;

export function AdminLayout() {
    const { user, signOut } = useAuth(true);
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logoUrl, platformName } = useBrandingContext();

    // PROTEÇÃO: Se não tem usuário, não renderiza nada
    if (!user) {
        return null;
    }

    const getInitials = (name: string) => {
        return name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'AD';
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed h-full z-50">
                <div className="p-6">
                    {/* LOGO */}
                    <div className="flex items-center gap-2 mb-8">
                        {logoUrl ? (
                            <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[160px] object-contain" />
                        ) : (
                            <>
                                <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">{platformName.charAt(0)}</span>
                                </div>
                                <span className="text-xl font-bold text-white">
                                    {platformName}
                                </span>
                            </>
                        )}
                    </div>

                    {/* NAVEGAÇÃO */}
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                        isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* USER INFO */}
                    <div className="mt-auto pt-6 border-t border-slate-800">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 p-2 rounded-lg transition-colors">
                                    <Avatar className="h-9 w-9 border border-slate-700">
                                        <AvatarFallback className="bg-emerald-500 text-white font-medium">
                                            {getInitials(user.nome)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white truncate">
                                            {user.nome?.split(' ')[0] || 'Admin'}
                                        </p>
                                        <p className="text-xs text-slate-400">Administrador</p>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
                                <DropdownMenuLabel className="text-slate-400">Minha Conta</DropdownMenuLabel>
                                <DropdownMenuItem className="text-white focus:bg-slate-800">
                                    {user.email}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                <DropdownMenuItem
                                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
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
            <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[140px] object-contain" />
                    ) : (
                        <>
                            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">{platformName.charAt(0)}</span>
                            </div>
                            <span className="text-white font-bold">{platformName}</span>
                        </>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-slate-400"
                >
                    {sidebarOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </Button>
            </div>

            {/* MOBILE SIDEBAR */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-sm pt-20 px-6">
                    <nav className="space-y-2">
                        {/* Mesmo conteúdo da sidebar desktop */}

                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                        isActive
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'text-slate-400 hover:bg-slate-800/50'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}

                    </nav>
                </div>
            )}

            {/* CONTEÚDO PRINCIPAL */}
            <main className="lg:pl-64 min-h-screen">
                <div className="p-6 lg:p-10 w-full min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
