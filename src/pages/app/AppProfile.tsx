import { Link } from 'react-router-dom';
import { useUserProfile, useUserPlan } from '@/hooks/useUserProfile';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, MessageCircle, Pencil, Camera } from 'lucide-react';

export default function AppProfile() {
  const { profile } = useUserProfile();
  const { plan, trialDays } = useUserPlan();
  const { formatCurrency } = useFormatCurrency();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Perfil' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Suas informações pessoais</p>
        </div>
        <Link to="/app/profile/edit">
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={profile?.avatar} alt={profile?.name} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {profile?.name ? getInitials(profile.name) : <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{profile?.name}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            <Link to="/app/profile/edit" className="w-full">
              <Button variant="outline" className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Alterar foto
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Personal Data Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Nome completo</p>
                  <p className="font-medium">{profile?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{profile?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">
                    {profile?.whatsappLinked ? profile.whatsappNumber : 'Não vinculado'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Card */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={profile?.whatsappLinked ? 'default' : 'secondary'}>
                {profile?.whatsappLinked ? 'Vinculado' : 'Não vinculado'}
              </Badge>
            </div>
            {profile?.whatsappLinked && (
              <p className="text-sm text-muted-foreground">
                Você receberá notificações no número {profile.whatsappNumber}
              </p>
            )}
            <Button variant="outline" className="w-full">
              {profile?.whatsappLinked ? 'Trocar número' : 'Vincular WhatsApp'}
            </Button>
          </CardContent>
        </Card>

        {/* Plan Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge 
                variant={
                  plan?.status === 'active' ? 'default' : 
                  plan?.status === 'trial' ? 'secondary' : 'destructive'
                }
              >
                {plan?.status === 'active' ? 'Ativo' : 
                 plan?.status === 'trial' ? `Trial - ${trialDays} dias restantes` : 'Pendente'}
              </Badge>
            </div>
            <p className="text-lg font-medium">
              Plano {plan?.type === 'monthly' ? 'Mensal' : plan?.type === 'annual' ? 'Anual' : 'Gratuito'}
            </p>
            {plan?.price && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(plan.price)}/mês
              </p>
            )}
            <Link to="/app/plan">
              <Button className="w-full">Ver detalhes do plano</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
