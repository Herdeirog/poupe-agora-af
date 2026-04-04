import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, Eye, EyeOff, AlertTriangle, Mail } from 'lucide-react';
import { useBrandingContext } from '@/contexts/BrandingContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAccountDeactivated, setIsAccountDeactivated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logoUrl, platformName } = useBrandingContext();

  // Clear explicit logout flag when arriving at auth page (allows legacy user to be loaded on next visit)
  sessionStorage.removeItem('explicit_logout');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password || (!isLogin && !name)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (authError) throw new Error(authError.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : authError.message);
        if (!authData.user) throw new Error('Usuário não encontrado');

        const user = authData.user;
        let nomeDisplay = user.email?.split('@')[0] || 'Usuário';
        let isAdmin = false;

        // Verificar se conta está ativa e buscar role de admin
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, is_admin, ativo')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            // Verificar se conta está desativada
            if (profile.ativo === false) {
              await supabase.auth.signOut();
              setIsAccountDeactivated(true);
              setLoading(false);
              return;
            }

            if (profile.full_name) nomeDisplay = profile.full_name;
          }

          // VERIFICAR ROLE NA TABELA user_roles (fonte de verdade para roles)
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

          // Admin se tiver role na tabela user_roles OU app_metadata OU profile.is_admin
          isAdmin = !!roleData || user.app_metadata?.is_admin === true || profile?.is_admin === true;

          console.log('[Auth] Admin check:', {
            hasRoleInTable: !!roleData,
            appMetadata: user.app_metadata?.is_admin,
            profileIsAdmin: profile?.is_admin,
            finalIsAdmin: isAdmin
          });

        } catch (err) {
          console.warn('Erro ao buscar perfil/roles (Auth.tsx):', err);
          // Fallback para metadata se query falhar
          if (user.app_metadata?.is_admin) {
            isAdmin = true;
          }
        }

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${nomeDisplay}!`,
        });

        const targetRoute = isAdmin ? '/admin' : '/app/dashboard';

        console.log('[Auth] Login successful, navigating to:', targetRoute);
        console.log('[Auth] User:', { id: user.id, email: user.email, is_admin: isAdmin });

        navigate(targetRoute);

      } else {
        // --- REGISTER FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name,
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Perfil é criado automaticamente via Trigger no banco (handle_new_user)
          // Aguardar breve momento para propagação se necessário, ou confiar no trigger


          toast({
            title: "Conta criada com sucesso!",
            description: "Você já pode fazer login com suas credenciais.",
          });

          setIsLogin(true); // Switch to login view
        }
      }

    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      toast({
        title: isLogin ? "Erro ao fazer login" : "Erro ao criar conta",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          {/* LOGO */}
          <div className="flex flex-col items-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-16 w-auto max-w-[200px] object-contain mb-4" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">
              {platformName}
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {isLogin ? 'Digite suas credenciais para acessar' : 'Preencha os dados abaixo para começar'}
            </p>
          </div>

          {/* AVISO DE CONTA DESATIVADA */}
          {isAccountDeactivated && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-orange-400 font-medium">Conta desativada</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Sua conta foi desativada temporariamente. Para reativá-la, entre em contato com nosso suporte:
                  </p>
                  <a 
                    href="mailto:suporte@poupeagora.com"
                    className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-flex items-center gap-1"
                  >
                    <Mail className="h-4 w-4" />
                    suporte@poupeagora.com
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleAuth} className="space-y-4">

            {!isLogin && (
              <div className="fade-in">
                <Label htmlFor="name" className="text-slate-300">
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="text-slate-300">
                  Senha
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                isLogin ? 'Entrar' : 'Cadastrar'
              )}
            </Button>
          </form>

          {/* FOOTER */}
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <p className="text-center text-slate-500 text-sm">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
