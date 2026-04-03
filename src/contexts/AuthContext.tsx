import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { runMigration } from '@/services/MigrationService';

interface User {
    id: string;
    email: string;
    nome: string;
    is_admin: boolean;
    ativo: boolean;
    whatsapp: string | null;
    phone: string | null;
    app_metadata?: {
        is_admin?: boolean;
        ativo?: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isCliente: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const isLoadingRef = useRef(false);
    const initializedRef = useRef(false);

    async function loadUserProfile(authUser: any): Promise<User | null> {
        try {
            // Buscar perfil e role em paralelo para não sofrer timeout duplo
            const [profileResult, roleResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, full_name, whatsapp, ativo')
                    .eq('id', authUser.id)
                    .maybeSingle(),
                supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', authUser.id)
                    .eq('role', 'admin')
                    .maybeSingle()
            ]);

            const profile = profileResult.data;
            const hasAdminRole = !!roleResult.data;
            const is_admin = authUser.app_metadata?.is_admin || hasAdminRole;
            const ativo = profile?.ativo !== undefined ? profile.ativo : true;

            return {
                id: authUser.id,
                email: authUser.email ?? '',
                nome: profile?.full_name || authUser.email?.split('@')[0] || 'Usuário',
                is_admin,
                ativo,
                whatsapp: profile?.whatsapp || null,
                phone: null,
                app_metadata: authUser.app_metadata,
            };
        } catch (err) {
            console.error('[AuthProvider] Error loading profile:', err);
            // Em caso de erro, ainda retorna o usuário básico (sem bloquear o app)
            return {
                id: authUser.id,
                email: authUser.email ?? '',
                nome: authUser.email?.split('@')[0] || 'Usuário',
                is_admin: authUser.app_metadata?.is_admin || false,
                ativo: true,
                whatsapp: null,
                phone: null,
                app_metadata: authUser.app_metadata,
            };
        }
    }

    useEffect(() => {
        // Failsafe: se nada resolver em 10s, libera o loading
        const failsafe = setTimeout(() => {
            console.warn('[AuthProvider] Failsafe timeout: forcing loading=false');
            setLoading(false);
        }, 10000);

        async function initialize() {
            if (initializedRef.current) return;
            initializedRef.current = true;

            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const userProfile = await loadUserProfile(session.user);
                    if (userProfile) {
                        if (!userProfile.ativo) {
                            await supabase.auth.signOut();
                            setUser(null);
                        } else {
                            setUser(userProfile);
                            // Migration silenciosa
                            setTimeout(() => {
                                runMigration(session.user.id).catch(() => {});
                            }, 1000);
                        }
                    }
                }
            } catch (err) {
                console.error('[AuthProvider] Init error:', err);
            } finally {
                clearTimeout(failsafe);
                setLoading(false);
            }
        }

        initialize();

        // Listener para mudanças de sessão (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthProvider] Auth event:', event);

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
                return;
            }

            if (event === 'SIGNED_IN' && session?.user) {
                // Só recarrega se ainda não tem usuário ou é outro usuário
                if (!user || user.id !== session.user.id) {
                    if (isLoadingRef.current) return;
                    isLoadingRef.current = true;
                    try {
                        const userProfile = await loadUserProfile(session.user);
                        if (userProfile) {
                            if (!userProfile.ativo) {
                                await supabase.auth.signOut();
                                setUser(null);
                            } else {
                                setUser(userProfile);
                            }
                        }
                    } finally {
                        isLoadingRef.current = false;
                        setLoading(false);
                    }
                }
                return;
            }

            // INITIAL_SESSION — já tratado pelo initialize()
            if (event === 'INITIAL_SESSION') {
                // Se o initialize já completou e não há sessão, liberar loading
                if (!session) {
                    setLoading(false);
                }
            }
        });

        return () => {
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function signOut() {
        sessionStorage.setItem('explicit_logout', 'true');
        setUser(null);
        await supabase.auth.signOut();
        window.location.href = '/auth';
    }

    const isAuthenticated = !!user;
    const isAdmin = user?.is_admin === true;
    const isCliente = !isAdmin && isAuthenticated;

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated,
            isAdmin,
            isCliente,
            isLoading: loading,
            signOut,
            logout: signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
    return ctx;
}
