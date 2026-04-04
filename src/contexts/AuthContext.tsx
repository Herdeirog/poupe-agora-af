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
    const userRef = useRef<User | null>(null);

    // Mantém a ref sincronizada com o state
    const setUserAndRef = (u: User | null) => {
        userRef.current = u;
        setUser(u);
    };

    function buildFallbackUser(authUser: any): User {
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

    async function loadUserProfile(authUser: any): Promise<User> {
        // Timeout de 5s para não travar o app
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
        );

        try {
            const [profileResult, roleResult] = await Promise.race([
                Promise.all([
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
                ]),
                timeout
            ]);

            // Se deu erro de permissão, usa fallback sem travar
            if (profileResult.error) {
                console.warn('[AuthProvider] Profile query error:', profileResult.error.message);
            }
            if (roleResult.error) {
                console.warn('[AuthProvider] Role query error:', roleResult.error.message);
            }

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
            console.warn('[AuthProvider] Profile load failed, using fallback:', (err as Error).message);
            return buildFallbackUser(authUser);
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
                            setUserAndRef(null);
                        } else {
                            setUserAndRef(userProfile);
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
                setUserAndRef(null);
                setLoading(false);
                return;
            }

            if (event === 'SIGNED_IN' && session?.user) {
                // Usa ref para evitar stale closure — user no closure é sempre null
                if (!userRef.current || userRef.current.id !== session.user.id) {
                    if (isLoadingRef.current) return;
                    isLoadingRef.current = true;
                    try {
                        const userProfile = await loadUserProfile(session.user);
                        if (userProfile) {
                            if (!userProfile.ativo) {
                                await supabase.auth.signOut();
                                setUserAndRef(null);
                            } else {
                                setUserAndRef(userProfile);
                            }
                        }
                    } finally {
                        isLoadingRef.current = false;
                        setLoading(false);
                    }
                } else {
                    // Usuário já carregado — garante que loading é liberado
                    setLoading(false);
                }
                return;
            }

            // INITIAL_SESSION — libera loading independente de ter sessão ou não
            if (event === 'INITIAL_SESSION') {
                if (!session) {
                    setLoading(false);
                }
                // Se tem sessão, o initialize() já está tratando — não duplicar
            }
        });

        return () => {
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function signOut() {
        sessionStorage.setItem('explicit_logout', 'true');
        setUserAndRef(null);
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
