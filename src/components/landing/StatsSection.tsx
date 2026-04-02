import { Users, PiggyBank, Star, TrendingUp } from "lucide-react";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

const StatsSection = () => {
  const { symbol } = useFormatCurrency();

  const stats = [
    {
      icon: Users,
      value: "10.000+",
      label: "Usuários Ativos",
    },
    {
      icon: PiggyBank,
      value: `${symbol} 5M+`,
      label: "Economizados",
    },
    {
      icon: Star,
      value: "4.9",
      label: "Avaliação Média",
    },
    {
      icon: TrendingUp,
      value: "98%",
      label: "Satisfação",
    },
  ];
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-user-bg-primary via-user-accent/5 to-user-bg-primary" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="glass-strong p-8 md:p-12 rounded-3xl shadow-premium">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="icon-circle icon-circle-success p-3 mx-auto mb-4">
                  <stat.icon className="h-6 w-6 text-user-accent" />
                </div>
                <p className="text-3xl md:text-4xl font-bold value-highlight mb-2">
                  {stat.value}
                </p>
                <p className="text-user-text-secondary text-sm md:text-base">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
