import { BarChart3, Target, MessageCircle, Brain, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Visualize todas suas finanças em tempo real com gráficos interativos e relatórios detalhados.",
  },
  {
    icon: Target,
    title: "Metas Financeiras",
    description: "Defina objetivos personalizados e acompanhe seu progresso com indicadores visuais claros.",
  },
  {
    icon: MessageCircle,
    title: "Integração WhatsApp",
    description: "Registre transações rapidamente enviando mensagens pelo WhatsApp. Simples e prático.",
  },
  {
    icon: Brain,
    title: "Insights com IA",
    description: "Receba recomendações personalizadas baseadas nos seus hábitos de consumo e economia.",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Seus dados financeiros protegidos com criptografia de ponta e backups automáticos.",
  },
  {
    icon: Zap,
    title: "Automações",
    description: "Configure alertas, lembretes e categorizações automáticas para economizar tempo.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-user-bg-secondary/50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="badge-premium badge-income mb-4 inline-block fade-in-up">
            Recursos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-user-text-primary mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Por que escolher o{" "}
            <span className="text-user-accent">Poupe Agora</span>?
          </h2>
          <p className="text-user-text-secondary text-lg max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Ferramentas poderosas para você ter controle total das suas finanças pessoais.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card p-6 hover:shadow-premium transition-all duration-300 group fade-in-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <div className="icon-circle icon-circle-success p-3 mb-4 group-hover:shadow-green-glow-sm transition-shadow duration-300">
                <feature.icon className="h-6 w-6 text-user-accent" />
              </div>
              <h3 className="text-xl font-semibold text-user-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-user-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
