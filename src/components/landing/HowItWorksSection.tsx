import { UserPlus, CreditCard, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Crie sua conta",
    description: "Cadastre-se em menos de 1 minuto. Sem complicação, sem burocracia.",
  },
  {
    number: "02",
    icon: CreditCard,
    title: "Registre transações",
    description: "Adicione receitas e despesas manualmente ou via WhatsApp.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Acompanhe e economize",
    description: "Visualize relatórios, receba insights e alcance suas metas financeiras.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="badge-premium badge-info mb-4 inline-block fade-in-up">
            Simples
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-user-text-primary mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Como <span className="text-user-accent">Funciona</span>?
          </h2>
          <p className="text-user-text-secondary text-lg max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Três passos simples para transformar sua vida financeira.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-user-accent/30 to-transparent" />

          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative text-center fade-in-up"
              style={{ animationDelay: `${0.2 * (index + 1)}s` }}
            >
              {/* Number Badge */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-user-accent text-user-bg-primary font-bold text-lg mb-6 shadow-green-glow">
                {step.number}
              </div>

              {/* Icon Card */}
              <div className="glass-strong p-8 rounded-2xl mb-6 hover:shadow-premium transition-all duration-300 group">
                <div className="icon-circle icon-circle-success p-4 mx-auto group-hover:shadow-green-glow-sm transition-shadow duration-300">
                  <step.icon className="h-8 w-8 text-user-accent" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-user-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-user-text-secondary">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
