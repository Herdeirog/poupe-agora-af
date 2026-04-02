import { Checkbox } from "@/components/ui/checkbox";

interface PlanFeatures {
  googleCalendar: boolean;
  whatsappReminders: boolean;
}

interface FeatureControlTableProps {
  planFeatures: {
    free: PlanFeatures;
    pro: PlanFeatures;
    premium: PlanFeatures;
  };
  onFeatureChange: (plan: 'free' | 'pro' | 'premium', feature: keyof PlanFeatures, enabled: boolean) => void;
}

export default function FeatureControlTable({ planFeatures, onFeatureChange }: FeatureControlTableProps) {
  const plans: { key: 'free' | 'pro' | 'premium'; label: string; className: string }[] = [
    { key: 'free', label: 'Free', className: 'badge-gratuito' },
    { key: 'pro', label: 'Pro', className: 'badge-mensal' },
    { key: 'premium', label: 'Premium', className: 'badge-premium' },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="bg-white/[0.02] border-b border-white/[0.08]">
            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Plano</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Google Agenda</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-foreground">Lembretes WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, index) => (
            <tr 
              key={plan.key} 
              className={`border-b border-white/[0.08] last:border-0 ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
            >
              <td className="px-4 py-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${plan.className}`}>
                  {plan.label}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={planFeatures[plan.key].googleCalendar}
                    onCheckedChange={(checked) => onFeatureChange(plan.key, 'googleCalendar', !!checked)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={planFeatures[plan.key].whatsappReminders}
                    onCheckedChange={(checked) => onFeatureChange(plan.key, 'whatsappReminders', !!checked)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
