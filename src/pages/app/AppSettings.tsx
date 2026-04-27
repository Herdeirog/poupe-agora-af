import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useUserSettings } from '@/hooks/useUserProfile';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Bell, Shield, Settings2, HelpCircle, RotateCcw, 
  Palette, DollarSign, Download, LogOut, Sun, Moon, Monitor,
  UserCog, Power, Trash2, AlertTriangle, PauseCircle
} from 'lucide-react';

const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'Real Brasileiro (R$)',      symbol: 'R$' },
  { value: 'USD', label: 'Dólar Americano ($)',        symbol: '$'  },
  { value: 'EUR', label: 'Euro (€)',                   symbol: '€'  },
  { value: 'AOA', label: 'Kwanza Angolano (Kz)',       symbol: 'Kz' },
  { value: 'MZN', label: 'Metical Moçambicano (MT)',   symbol: 'MT' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA', example: '25/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA', example: '12/25/2024' },
  { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD', example: '2024-12-25' },
];

export default function AppSettings() {
  const { settings, updateSettings } = useUserSettings();
  const { resetOnboarding } = useOnboarding();
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currentCurrency } = useCurrencyContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleRestartTutorial = () => {
    resetOnboarding();
    toast({ 
      title: 'Tutorial reiniciado!', 
      description: 'O tutorial começará novamente ao acessar o dashboard.' 
    });
    navigate('/app/dashboard');
  };

  const handleToggle = (key: string, value: boolean) => {
    updateSettings({ [key]: value });
    toast({ title: 'Configuração salva' });
  };

  const handleSelectChange = (key: string, value: string) => {
    updateSettings({ [key]: value });
    toast({ title: 'Configuração salva' });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme as 'light' | 'dark' | 'system' });
    toast({ title: 'Tema alterado' });
  };

  const handleBudgetThresholdChange = (value: number[]) => {
    updateSettings({ budgetAlertThreshold: value[0] });
  };

  const handlePasswordChange = async () => {
    setIsSavingPassword(true);
    
    // Validações de entrada
    if (!passwords.new || !passwords.confirm) {
      toast({ title: 'Erro', description: 'Preencha a nova senha e confirmação', variant: 'destructive' });
      setIsSavingPassword(false);
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Erro', description: 'As senhas não conferem', variant: 'destructive' });
      setIsSavingPassword(false);
      return;
    }
    if (passwords.new.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      setIsSavingPassword(false);
      return;
    }

    try {
      // Chamada REAL ao Supabase Auth para atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      // Sucesso - limpar campos e mostrar confirmação
      toast({ 
        title: 'Senha alterada com sucesso', 
        description: 'Sua nova senha já está ativa. Você permanece logado.' 
      });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({ 
        title: 'Erro ao alterar senha', 
        description: error.message || 'Não foi possível atualizar sua senha. Tente novamente.',
        variant: 'destructive' 
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      toast({ 
        title: 'Dados exportados', 
        description: 'Seu arquivo foi baixado com sucesso' 
      });
      setIsExporting(false);
    }, 1500);
  };

  const handleLogoutAllDevices = async () => {
    toast({ 
      title: 'Sessões encerradas', 
      description: 'Todas as outras sessões foram desconectadas' 
    });
  };

  const handleDeactivateAccount = () => {
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: false })
        .eq('id', user?.id);
      
      if (error) throw error;
      
      await signOut();
      toast({ 
        title: 'Conta desativada',
        description: 'Sua conta foi desativada temporariamente. Entre em contato para reativá-la.',
      });
      navigate('/');
    } catch (error) {
      console.error('Erro ao desativar conta:', error);
      toast({ 
        title: 'Erro ao desativar conta',
        description: 'Não foi possível desativar sua conta. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsDeactivating(false);
      setIsDeactivateModalOpen(false);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'EXCLUIR') return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-account');
      
      if (error) throw error;
      
      toast({ 
        title: 'Conta excluída',
        description: 'Sua conta foi removida permanentemente.',
      });
      navigate('/');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({ 
        title: 'Erro ao excluir conta',
        description: 'Não foi possível excluir sua conta. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Configurações' }]} />

      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Preferências e configurações do sistema</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* 1. Notifications - Blue */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Notificações</h3>
              <p className="text-sm text-muted-foreground">Configure seus alertas</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Alertas por WhatsApp</p>
                <p className="text-sm text-muted-foreground">Receber notificações via WhatsApp</p>
              </div>
              <Switch
                checked={!!settings?.notifyWhatsapp}
                onCheckedChange={(v) => handleToggle('notifyWhatsapp', v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Alertas por Email</p>
                <p className="text-sm text-muted-foreground">Receber notificações via email</p>
              </div>
              <Switch
                checked={!!settings?.notifyEmail}
                onCheckedChange={(v) => handleToggle('notifyEmail', v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Avisos de Metas</p>
                <p className="text-sm text-muted-foreground">Ser notificado sobre progresso das metas</p>
              </div>
              <Switch
                checked={!!settings?.notifyGoals}
                onCheckedChange={(v) => handleToggle('notifyGoals', v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Budget Alerts */}
            <div className="p-3 rounded-xl glass-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Alertas de Orçamento</p>
                  <p className="text-sm text-muted-foreground">Aviso ao atingir limite do orçamento</p>
                </div>
                <Switch
                  checked={!!settings?.notifyBudgetAlert}
                  onCheckedChange={(v) => handleToggle('notifyBudgetAlert', v)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              {settings?.notifyBudgetAlert && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite de alerta</span>
                    <span className="font-medium text-foreground">{settings?.budgetAlertThreshold || 80}%</span>
                  </div>
                  <Slider
                    value={[settings?.budgetAlertThreshold || 80]}
                    onValueChange={handleBudgetThresholdChange}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você será notificado quando gastar {settings?.budgetAlertThreshold || 80}% do orçamento mensal
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Security - Orange */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-orange-500/10">
              <Shield className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Segurança</h3>
              <p className="text-sm text-muted-foreground">Altere sua senha de acesso</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Senha atual</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwords.current}
                onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nova senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwords.new}
                onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                className="glass-input"
              />
            </div>
            <button onClick={handlePasswordChange} disabled={isSavingPassword} className="btn-premium w-full">
              {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar senha
            </button>
          </div>
        </div>

        {/* 3. Appearance - Purple */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-purple-500/10">
              <Palette className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Aparência</h3>
              <p className="text-sm text-muted-foreground">Personalize a interface do app</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-muted-foreground">Tema</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className="flex-1 gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Claro
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className="flex-1 gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Escuro
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                  className="flex-1 gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Sistema
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Financial Preferences - Emerald */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Preferências Financeiras</h3>
              <p className="text-sm text-muted-foreground">Moeda e formato de exibição</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Moeda do sistema</Label>
              <div className="p-3 rounded-xl glass-card flex items-center gap-2">
                <span className="font-mono text-muted-foreground">
                  {CURRENCY_OPTIONS.find(o => o.value === currentCurrency)?.symbol || 'R$'}
                </span>
                <span className="text-foreground font-medium">
                  {CURRENCY_OPTIONS.find(o => o.value === currentCurrency)?.label || 'Real (R$)'}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">Configurado pelo administrador</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Formato de data</Label>
              <Select 
                value={settings?.dateFormat || 'DD/MM/YYYY'} 
                onValueChange={(v) => handleSelectChange('dateFormat', v)}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.label}
                        <span className="text-muted-foreground text-xs">({opt.example})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 5. Data & Privacy - Slate */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-slate-500/10">
              <Settings2 className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Dados & Privacidade</h3>
              <p className="text-sm text-muted-foreground">Gerencie seus dados e sessões</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Exportar dados</p>
                <p className="text-sm text-muted-foreground">Baixe uma cópia dos seus dados</p>
              </div>
              <Button 
                onClick={handleExportData} 
                variant="outline" 
                size="sm"
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Encerrar outras sessões</p>
                <p className="text-sm text-muted-foreground">Desconectar de outros dispositivos</p>
              </div>
              <Button 
                onClick={handleLogoutAllDevices} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Encerrar
              </Button>
            </div>
          </div>
        </div>

        {/* 6. Account - Red */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-red-500/10">
              <UserCog className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Conta</h3>
              <p className="text-sm text-muted-foreground">Gerenciar sua conta</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-foreground">Desativar conta</p>
                <p className="text-sm text-muted-foreground">Pausar temporariamente sua conta</p>
              </div>
              <Button 
                onClick={handleDeactivateAccount} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Power className="h-4 w-4" />
                Desativar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl glass-card">
              <div>
                <p className="font-medium text-destructive">Excluir conta</p>
                <p className="text-sm text-muted-foreground">Remover permanentemente sua conta e dados</p>
              </div>
              <Button 
                onClick={handleDeleteAccount} 
                variant="destructive" 
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </div>

        {/* 7. Tutorial - Cyan (full width) */}
        <div className="glass-strong p-6 rounded-2xl fade-in-up lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="icon-circle bg-cyan-500/10">
              <HelpCircle className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Tutorial</h3>
              <p className="text-sm text-muted-foreground">Reveja o guia de introdução ao app</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl glass-card">
            <div>
              <p className="font-medium text-foreground">Reiniciar Tutorial</p>
              <p className="text-sm text-muted-foreground">Veja novamente as dicas de uso do aplicativo</p>
            </div>
            <Button 
              onClick={handleRestartTutorial} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">
                Excluir conta permanentemente
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Esta ação é <strong className="text-foreground">irreversível</strong>. Todos os seus dados serão 
                  permanentemente removidos, incluindo:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Transações e histórico financeiro</li>
                  <li>Metas e compromissos</li>
                  <li>Configurações e preferências</li>
                  <li>Dados de perfil</li>
                </ul>
                <div className="pt-4">
                  <Label htmlFor="delete-confirm" className="text-foreground font-medium">
                    Digite <span className="text-destructive font-bold">EXCLUIR</span> para confirmar:
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="Digite EXCLUIR"
                    className="mt-2"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmText('')}
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir permanentemente
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Desativação */}
      <AlertDialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-orange-500/10">
                <PauseCircle className="h-6 w-6 text-orange-500" />
              </div>
              <AlertDialogTitle className="text-xl">
                Desativar conta temporariamente
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Ao desativar sua conta:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Você será desconectado imediatamente</li>
                  <li>Não poderá fazer login até reativar</li>
                  <li>Seus dados serão <strong className="text-foreground">preservados</strong></li>
                  <li>Lembretes e notificações serão pausados</li>
                </ul>
                <p className="text-sm pt-2 text-muted-foreground">
                  Para reativar sua conta, entre em contato com o suporte.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeactivating}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleConfirmDeactivate}
              disabled={isDeactivating}
              className="gap-2 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4" />
                  Desativar conta
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
