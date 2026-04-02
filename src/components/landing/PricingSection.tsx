import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

const PricingSection = () => {
  const { formatCurrency } = useFormatCurrency();
  
  const { data: plans, isLoading } = useQuery({
    queryKey: ['landing-plans'],
    queryFn: async () => {
      // Busca apenas planos ativos
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-user-bg-secondary/50" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="badge-premium badge-income mb-4 inline-block fade-in-up">
            Preços
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-user-text-primary mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Planos que cabem no seu{" "}
            <span className="text-user-accent">bolso</span>
          </h2>
          <p className="text-user-text-secondary text-lg max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Escolha o plano ideal para suas necessidades. Cancele quando quiser.
          </p>
        </div>

        {/* Pricing Cards */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all duration-300 fade-in-up ${plan.popular
                  ? "glass-strong border-2 border-user-accent shadow-green-glow-sm scale-105"
                  : "glass-card hover:shadow-premium"
                  }`}
                style={{ animationDelay: `${0.15 * (index + 1)}s` }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 badge-premium badge-income px-4 py-1">
                      <Sparkles className="h-3 w-3" />
                      Mais Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-user-text-primary mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold value-highlight">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-user-text-secondary">{plan.period}</span>
                  </div>
                  <p className="text-user-text-secondary text-sm mt-2">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features?.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-user-accent/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-user-accent" />
                      </div>
                      <span className="text-user-text-secondary text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/app" className="block">
                  <Button
                    className={`w-full ${plan.popular ? "btn-premium" : "btn-glass"
                      }`}
                  >
                    {/* Texto do botão dinâmico ou padrão */}
                    {plan.price === 0 ? "Começar Grátis" : "Assinar Agora"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
