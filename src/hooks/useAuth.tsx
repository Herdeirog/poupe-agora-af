import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { runMigration } from '@/services/MigrationService';
import { syncLegacyIdentity } from '@/services/IdentitySyncService';

// Ajustando interface para permitir app_metadata
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
        provider?: string;
        providers?: string[];
    };
}


// Removido useNavigate para evitar loops de redirecionamento dentro do hook
// A responsabilidade de redirecionar é dos componentes (ProtectedRoute)

// Concurrency guard to prevent multiple simultaneous profile loads
let isLoadingProfile = false;

// Load legacy user from localStorage (for users who haven't migrated to Supabase Auth)
function loadLegacyUser(): User | null {
    // Don't load legacy user if explicit logout occurred
    if (sessionStorage.getItem('explicit_logout') === 'true') {
        console.log('[Auth] Explicit logout detected, skipping legacy user load');
        return null;
    }

    try {
        const stored = localStorage.getItem('poupe_agora_user');
        if (stored) {
            const legacyUser = JSON.parse(stored);
            console.log('[Auth] Legacy user found in localStorage:', legacyUser.name || legacyUser.nome);
            return {
                id: legacyUser.id || 'legacy-user',
                email: legacyUser.email || '',
                nome: legacyUser.name || legacyUser.nome || 'Usuário',
                is_admin: false,
                ativo: true,
                whatsapp: legacyUser.whatsapp || null,
                phone: legacyUser.phone || null,
            };
        }
    } catch (e) {
        console.warn('[Auth] Error loading legacy user:', e);
    }
    return null;
}

export function useAuth(requireAdmin = false) { // requireAdmin mantido apenas para compatibilidade de assinatura, mas logica movida
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        let mounted = true;

        // Failsafe: Extend timeout to 10s to allow for slower connections
        const timeoutId = setTimeout(() => {
            if (mounted) {
                console.warn("[Auth] Check timed out (10s), forcing load completion.");
                setLoading(false);
            }
        }, 10000);

        async function initAuth() {
            try {
                console.log("[Auth] Checking initial session...");

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("[Auth] Error getting session:", error);
                    // On Supabase error, try legacy user fallback
                    const legacyUser = loadLegacyUser();
                    if (mounted) {
                        if (legacyUser) {
                            setUser(legacyUser);
                            console.log('[Auth] Using legacy user after Supabase error');
                        }
                        setLoading(false);
                    }
                    return;
                }

                if (session) {
                    console.log("[Auth] Session found for:", session.user.email);
                    if (mounted) await loadUserProfile(session.user, mounted);
                } else {
                    console.log("[Auth] No Supabase session found, checking localStorage...");
                    const legacyUser = loadLegacyUser();
                    if (mounted) {
                        if (legacyUser) {
                            setUser(legacyUser);
                            console.log('[Auth] Legacy user loaded successfully');
                            
                            // Trigger identity sync to Supabase (async, non-blocking, silent)
                            setTimeout(() => {
                                syncLegacyIdentity()
                                    .then(profileId => {
                                        if (profileId) {
                                            console.log('[Auth] Identity synced to Supabase, profile_id:', profileId);
                                        }
                                    })
                                    .catch(err => console.warn('[Auth] Identity sync error (non-critical):', err));
                            }, 0);
                        }
                        setLoading(false);
                    }
                }

            } catch (e) {
                console.error("[Auth] Init Error:", e);
                // On any error, try legacy user fallback
                const legacyUser = loadLegacyUser();
                if (mounted) {
                    if (legacyUser) setUser(legacyUser);
                    setLoading(false);
                }
            }
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] Auth State Change: ${event}`, session?.user?.email);

            if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                }
            } else if (event === 'SIGNED_IN' && session) {
                // Apenas recarrega se user for null ou diferente
                if (mounted) {
                    await loadUserProfile(session.user, mounted);
                }
            } else if (event === 'INITIAL_SESSION') {
                // Já tratado pelo initAuth, mas se vier delay...
                console.log('[Auth] INITIAL_SESSION event received.');
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    async function loadUserProfile(authUser: any, mounted: boolean) {
        // Guard: Prevent concurrent executions
        if (isLoadingProfile) {
            console.warn('[Auth] Profile load already in progress, skipping');
            return;
        }

        isLoadingProfile = true;

        try {
            console.log('[Auth] Loading profile for user:', authUser.email);

            let profile = null;
            let hasAdminRole = false;
            
            try {
                // Create a promise that rejects after 5 seconds
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
                );

                // Race the profile query against the timeout
                const { data, error } = await Promise.race([
                    supabase
                        .from('profiles')
                        .select('id, email, full_name, whatsapp, ativo')
                        .eq('id', authUser.id)
                        .maybeSingle(),
                    timeoutPromise
                ]) as any;

                if (error) {
                    console.error('[Auth] Profile query error:', error.message);
                } else {
                    profile = data;
                    if (profile) console.log('[Auth] Profile loaded from DB:', profile?.full_name);
                    else console.warn('[Auth] No profile row found in DB.');
                }

                // Check admin role from user_roles table
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', authUser.id)
                    .eq('role', 'admin')
                    .maybeSingle();
                
                hasAdminRole = !!roleData;
                if (hasAdminRole) console.log('[Auth] Admin role found in user_roles');

            } catch (e: any) {
                console.warn('[Auth] Profile fetch exception:', e.message || e);
            }

            const profileData = profile || {};
            const is_admin = authUser.app_metadata?.is_admin || hasAdminRole;
            const ativo = authUser.app_metadata?.ativo !== undefined ? authUser.app_metadata.ativo : (profileData.ativo !== undefined ? profileData.ativo : true);

            const userProfile: User = {
                id: authUser.id,
                email: authUser.email,
                nome: profileData.full_name || authUser.email?.split('@')[0] || 'Usuário',
                is_admin,
                ativo,
                whatsapp: profileData.whatsapp || null,
                phone: profileData.phone || null,
                app_metadata: authUser.app_metadata
            };

            console.log('[Auth] User profile created:', { nome: userProfile.nome, is_admin: userProfile.is_admin });

            // Se inativo, signOut mas o redirecionamento quem faz é quem consome o hook ao ver user=null
            if (!userProfile.ativo) {
                console.warn('[Auth] User is inactive, signing out');
                await supabase.auth.signOut();
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                    toast({ title: "Conta inativa", description: "Entre em contato com suporte.", variant: "destructive" });
                }
                return;
            }

            if (mounted) {
                console.log('[Auth] Setting user and loading=false');
                setUser(userProfile);
                setLoading(false);
                
                // Run silent migration from localStorage to Supabase (async, non-blocking)
                setTimeout(() => {
                    runMigration(authUser.id).catch(err =>
                        console.warn('[Auth] Migration error (non-critical):', err)
                    );
                }, 0);

                // Clean up legacy localStorage keys (data now lives in Supabase)
                const legacyKeys = [
                    'poupe_agora_user', 'poupe_agora_transacoes', 'poupe_agora_categorias',
                    'poupe_agora_metas', 'poupe_agora_orcamento', 'poupe_agora_lembretes',
                    'poupe_agora_financial_commitments', 'poupe_agora_lembretes_financeiros',
                    'supabase_migrated', 'supabase_identity_synced',
                    'admin_action_history', 'admin_user_controls', 'family_action_history',
                    'onboarding_state',
                ];
                legacyKeys.forEach(key => localStorage.removeItem(key));
                console.log('[Auth] Legacy localStorage keys cleaned up');
            }

        } catch (error) {
            console.error('[Auth] Error loadUserProfile:', error);
            if (mounted) setLoading(false);
        } finally {
            isLoadingProfile = false;
        }
    }

    async function signOut() {
        // Set flag to prevent legacy user from being loaded after explicit logout
        sessionStorage.setItem('explicit_logout', 'true');
        await supabase.auth.signOut();
        setUser(null);
        // O redirecionamento deve ser feito pelo componente que chama, ou via renderização condicional
        window.location.href = '/auth'; // Force reload to clear states
    }

    // Computed properties for route guards
    const isAuthenticated = !!user;
    const isAdmin = user?.is_admin === true;
    const isCliente = !isAdmin && isAuthenticated;
    const isLoading = loading;

    return { 
        user, 
        loading, 
        signOut, 
        logout: signOut, // Alias for backward compatibility
        isAuthenticated,
        isAdmin,
        isCliente,
        isLoading
    };
}
