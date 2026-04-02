import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlanLimits {
  agendaFinanceira: boolean;
  parcelamentos: number | 'unlimited';
  lembretes: boolean;
  googleCalendar: boolean;
  whatsappReminders: boolean;
}

interface PlanLimitsTableProps {
  planLimits: {
    free: PlanLimits;
    pro: PlanLimits;
    premium: PlanLimits;
  };
  onLimitChange: (
    plan: 'free' | 'pro' | 'premium', 
    feature: keyof PlanLimits, 
    value: boolean | number | 'unlimited'
  ) => void;
}

type FeatureType = 'all' | 'integration' | 'limit' | 'feature';
type PlanFilter = 'all' | 'free' | 'pro' | 'premium';

const featureLabels: Record<keyof PlanLimits, { label: string; type: FeatureType }> = {
  agendaFinanceira: { label: 'Agenda Financeira', type: 'feature' },
  parcelamentos: { label: 'Parcelamentos', type: 'limit' },
  lembretes: { label: 'Lembretes', type: 'feature' },
  googleCalendar: { label: 'Google Agenda', type: 'integration' },
  whatsappReminders: { label: 'WhatsApp', type: 'integration' },
};

// Dados mockados para demonstração
const defaultPlanLimits: PlanLimitsTableProps['planLimits'] = {
  free: {
    agendaFinanceira: true,
    parcelamentos: 3,
    lembretes: false,
    googleCalendar: false,
    whatsappReminders: false,
  },
  pro: {
    agendaFinanceira: true,
    parcelamentos: 10,
    lembretes: true,
    googleCalendar: false,
    whatsappReminders: true,
  },
  premium: {
    agendaFinanceira: true,
    parcelamentos: 'unlimited',
    lembretes: true,
    googleCalendar: true,
    whatsappReminders: true,
  },
};

export default function PlanLimitsTable({ 
  planLimits = defaultPlanLimits, 
  onLimitChange 
}: Partial<PlanLimitsTableProps>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeatureType>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');

  const plans: { key: 'free' | 'pro' | 'premium'; label: string; className: string }[] = [
    { key: 'free', label: 'Free', className: 'badge-gratuito' },
    { key: 'pro', label: 'Pro', className: 'badge-mensal' },
    { key: 'premium', label: 'Premium', className: 'badge-premium' },
  ];

  const filteredPlans = useMemo(() => {
    if (planFilter === 'all') return plans;
    return plans.filter(p => p.key === planFilter);
  }, [planFilter]);

  const filteredFeatures = useMemo(() => {
    const features = Object.keys(featureLabels) as (keyof PlanLimits)[];
    
    return features.filter(feature => {
      const { label, type } = featureLabels[feature];
      
      // Search filter
      if (searchTerm && !label.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && type !== typeFilter) {
        return false;
      }
      
      return true;
    });
  }, [searchTerm, typeFilter]);

  const handleChange = (
    plan: 'free' | 'pro' | 'premium', 
    feature: keyof PlanLimits, 
    value: boolean | number | 'unlimited'
  ) => {
    if (onLimitChange) {
      onLimitChange(plan, feature, value);
    }
  };

  const limits = planLimits || defaultPlanLimits;

  const renderCell = (plan: 'free' | 'pro' | 'premium', feature: keyof PlanLimits) => {
    const value = limits[plan][feature];
    
    if (feature === 'parcelamentos') {
      if (value === 'unlimited') {
        return <span className="text-sm text-primary font-medium">Ilimitado</span>;
      }
      return (
        <Input
          type="number"
          min={0}
          max={100}
          value={value as number}
          onChange={(e) => handleChange(plan, feature, parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-center glass-input"
        />
      );
    }
    
    return (
      <Checkbox
        checked={value as boolean}
        onCheckedChange={(checked) => handleChange(plan, feature, !!checked)}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recurso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 glass-input"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FeatureType)}>
            <SelectTrigger className="w-[150px] glass-input">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="glass border-white/[0.12]">
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="feature">Funcionalidades</SelectItem>
              <SelectItem value="limit">Limites</SelectItem>
              <SelectItem value="integration">Integrações</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as PlanFilter)}>
            <SelectTrigger className="w-[130px] glass-input">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent className="glass border-white/[0.12]">
              <SelectItem value="all">Todos os Planos</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.08]">
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Recurso</th>
                {filteredPlans.map(plan => (
                  <th key={plan.key} className="px-4 py-3 text-center text-sm font-medium text-foreground">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${plan.className}`}>
                      {plan.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={filteredPlans.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum recurso encontrado
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feature, index) => (
                  <tr 
                    key={feature} 
                    className={`border-b border-white/[0.08] last:border-0 ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{featureLabels[feature].label}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({featureLabels[feature].type === 'integration' ? 'Integração' : 
                            featureLabels[feature].type === 'limit' ? 'Limite' : 'Funcionalidade'})
                        </span>
                      </div>
                    </td>
                    {filteredPlans.map(plan => (
                      <td key={plan.key} className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          {renderCell(plan.key, feature)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Exibindo {filteredFeatures.length} de {Object.keys(featureLabels).length} recursos
        </span>
        <span>
          {filteredPlans.length} plano(s) selecionado(s)
        </span>
      </div>
    </div>
  );
}
