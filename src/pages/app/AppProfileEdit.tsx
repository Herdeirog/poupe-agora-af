import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Camera, Trash2 } from 'lucide-react';
import { AvatarCropperModal } from '@/components/app/AvatarCropperModal';

// Phone mask utility
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10 || digits.length === 11;
}

export default function AppProfileEdit() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    avatar: profile?.avatar || ''
  });

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    // Convert to base64 and open cropper
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTempImageSrc(base64);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setFormData(prev => ({ ...prev, avatar: croppedImage }));
    toast({
      title: 'Foto ajustada',
      description: 'A foto foi recortada com sucesso.'
    });
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive'
      });
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um telefone válido no formato (00) 00000-0000.',
        variant: 'destructive'
      });
      return;
    }

    updateProfile(formData);
    toast({
      title: 'Perfil atualizado',
      description: 'Suas informações foram salvas com sucesso.'
    });
    navigate('/app/profile');
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Perfil', href: '/app/profile' }, { label: 'Editar' }]} />
      
      <div>
        <h1 className="text-3xl font-bold">Editar Perfil</h1>
        <p className="text-muted-foreground">Atualize suas informações pessoais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>Clique na foto para alterar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div 
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className="h-32 w-32 border-4 border-primary/20 transition-opacity group-hover:opacity-80">
                <AvatarImage src={formData.avatar} alt={formData.name} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {formData.name ? getInitials(formData.name) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 rounded-full p-3">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex gap-2 w-full">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleAvatarClick}
              >
                <Camera className="h-4 w-4 mr-2" />
                Alterar
              </Button>
              {formData.avatar && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleRemoveAvatar}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              JPG, PNG ou GIF. Máximo 5MB.
            </p>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Atualize suas informações de contato</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: (00) 00000-0000
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button type="submit">
                  Salvar alterações
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/app/profile')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Avatar Cropper Modal */}
      <AvatarCropperModal
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
