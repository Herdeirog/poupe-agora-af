import { useState } from 'react';
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { resetPassword } from '@/services/authService';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'email' | 'code' | 'password';

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordValidation = {
    minLength: newPassword.length >= 6,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0
  };

  const isPasswordValid = passwordValidation.minLength && passwordValidation.hasSpecialChar;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Generate a random 6-digit code for simulation
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(resetCode);
    setStep('code');
    toast.success('Código de verificação gerado!');
    setIsLoading(false);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (code !== generatedCode) {
      toast.error('Código inválido');
      setIsLoading(false);
      return;
    }

    setStep('password');
    setIsLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isPasswordValid) {
      toast.error('A senha não atende aos requisitos');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      handleClose();
    } else {
      toast.error(result.error || 'Erro ao enviar email de recuperação');
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setGeneratedCode('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleBack = () => {
    if (step === 'code') {
      setStep('email');
      setCode('');
      setGeneratedCode('');
    } else if (step === 'password') {
      setStep('code');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'email' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'email' && 'Recuperar senha'}
            {step === 'code' && 'Verificar código'}
            {step === 'password' && 'Nova senha'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Digite seu email para receber o código de recuperação'}
            {step === 'code' && 'Digite o código de 6 dígitos enviado'}
            {step === 'password' && 'Digite sua nova senha'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Enviar código'}
            </Button>
          </form>
        )}

        {/* Step 2: Code */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            {/* Simulated code display */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                📧 Código enviado para {email}
              </p>
              <p className="text-xs text-muted-foreground mb-1">(Simulação - código exibido abaixo)</p>
              <div className="flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <span className="text-2xl font-mono font-bold text-primary tracking-widest">
                  {generatedCode}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Digite o código</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Verificando...' : 'Verificar código'}
            </Button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="space-y-1 text-sm">
              <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                {passwordValidation.minLength ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                Mínimo 6 caracteres
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-500' : 'text-muted-foreground'}`}>
                {passwordValidation.hasSpecialChar ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                Pelo menos um caractere especial (!@#$%...)
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {confirmPassword && !passwordValidation.passwordsMatch && (
                <p className="text-sm text-destructive">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isPasswordValid || !passwordValidation.passwordsMatch}
            >
              {isLoading ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
