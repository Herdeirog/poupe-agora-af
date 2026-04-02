import { useState } from 'react';
import { useUserPlan } from '@/hooks/useUserProfile';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { FamilyMembersSection } from '@/components/app/FamilyMembersSection';
import { FamilyUpgradeConfirmModal } from '@/components/app/FamilyUpgradeConfirmModal';

export default function AppPlan() {
  const { plan, trialDays } = useUserPlan();
  const { formatCurrency } = useFormatCurrency();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const plans = [
    {
      name: 'Mensal',
      price: 29.90,
      period: '/mês',
      type: 'monthly',
      features: ['Transações ilimitadas', 'Metas financeiras', 'Integração WhatsApp', 'Relatórios básicos']
    },
    {
      name: 'Anual',
      price: 249.90,
      period: '/ano',
      type: 'annual',
      features: ['Tudo do mensal', 'Economia de 30%', 'Relatórios avançados', 'Suporte prioritário'],
      popular: true
    },
    {
      name: 'Família',
      price: 49.90,
      period: '/mês',
      type: 'family',
      features: ['Até 5 membros', 'Tudo do anual', 'Gestão compartilhada', 'Permissões por membro'],
      isFamily: true,
      badge: '👨‍👩‍👧‍👦'
    },
  ];

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Meu Plano' }]} />

      <div>
        <h1 className="text-3xl font-bold">Meu Plano</h1>
        <p className="text-muted-foreground">Gerencie sua assinatura</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={plan?.status === 'active' ? 'default' : 'secondary'}>
                {plan?.status === 'active' ? 'Ativo' : plan?.status === 'trial' ? `Trial (${trialDays}d)` : 'Pendente'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="font-medium">{plan?.type === 'monthly' ? 'Mensal' : plan?.type === 'annual' ? 'Anual' : 'Free'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativado em</p>
              <p className="font-medium">{plan?.activatedAt ? formatDate(plan.activatedAt) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="font-medium">{plan?.price ? formatCurrency(plan.price) : '-'}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <Button variant="outline">Alterar plano</Button>
            <Button variant="destructive">Cancelar assinatura</Button>
          </div>
        </CardContent>
      </Card>



      {/* Family Members Section */}
      <FamilyMembersSection />

      {/* Plan Options */}
      <div>
        <h2 className="text-xl font-bold mb-4">Opções de Plano</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card key={p.name} className={`relative ${p.popular ? 'border-primary' : ''} ${p.isFamily ? 'border-accent bg-accent/5' : ''}`}>
              {p.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Mais Popular
                </div>
              )}
              {p.isFamily && (
                <div className="bg-gradient-to-r from-accent to-primary text-primary-foreground text-center py-1 text-sm font-medium flex items-center justify-center gap-2">
                  <span>{p.badge}</span>
                  <span>Plano Família</span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {p.name}
                  {p.isFamily && (
                    <Badge variant="outline" className="text-xs border-accent text-accent">
                      Novo
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {formatCurrency(p.price)}
                  <span className="text-sm font-normal text-muted-foreground">{p.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full mt-6 ${p.isFamily ? 'bg-gradient-to-r from-accent to-primary hover:opacity-90' : ''}`}
                  onClick={p.isFamily && plan?.type !== p.type ? () => setUpgradeModalOpen(true) : undefined}
                >
                  {plan?.type === p.type ? 'Plano atual' : 'Escolher'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Family Upgrade Modal */}
      <FamilyUpgradeConfirmModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentPlanPrice={plan?.price}
      />
    </div>
  );
}
