import { Link } from "react-router-dom";
import { ArrowRight, Play, TrendingUp, PiggyBank, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

const HeroSection = () => {
  const { formatCurrency } = useFormatCurrency();
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-user-bg-primary">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-user-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-user-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-user-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 badge-premium badge-income mb-6 fade-in-up">
              <span className="w-2 h-2 bg-user-accent rounded-full animate-pulse" />
              <span>Novo: Integração com WhatsApp</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-user-text-primary mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
              Controle suas finanças com{" "}
              <span className="text-user-accent">inteligência</span>
            </h1>

            <p className="text-lg md:text-xl text-user-text-secondary mb-8 max-w-xl mx-auto lg:mx-0 fade-in-up" style={{ animationDelay: "0.2s" }}>
              Organize receitas, despesas e metas financeiras em um só lugar. 
              Insights automáticos com IA para você economizar mais.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/app">
                <Button className="btn-premium text-lg px-8 py-6 group">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button className="btn-glass text-lg px-8 py-6 group">
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start fade-in-up" style={{ animationDelay: "0.4s" }}>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-user-bg-glass border-2 border-user-bg-primary flex items-center justify-center text-xs font-medium text-user-accent"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-user-text-primary font-semibold">+10.000 usuários</p>
                <p className="text-user-text-secondary text-sm">Confiam no Poupe Agora</p>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="glass-strong p-6 rounded-2xl shadow-premium">
              {/* Mock Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-user-text-secondary text-sm">Saldo Total</p>
                  <p className="text-3xl font-bold value-highlight">{formatCurrency(12450)}</p>
                </div>
                <div className="icon-circle icon-circle-success p-3">
                  <TrendingUp className="h-6 w-6 text-user-accent" />
                </div>
              </div>

              {/* Mock Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-circle icon-circle-success p-1.5">
                      <PiggyBank className="h-4 w-4 text-user-success" />
                    </div>
                    <span className="text-user-text-secondary text-sm">Receitas</span>
                  </div>
                  <p className="text-xl font-bold text-user-success">{formatCurrency(8500)}</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="icon-circle icon-circle-danger p-1.5">
                      <Target className="h-4 w-4 text-user-danger" />
                    </div>
                    <span className="text-user-text-secondary text-sm">Despesas</span>
                  </div>
                  <p className="text-xl font-bold text-user-danger">{formatCurrency(3200)}</p>
                </div>
              </div>

              {/* Mock Progress */}
              <div className="glass-card p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-user-text-secondary text-sm">Meta do Mês</span>
                  <span className="text-user-accent text-sm font-medium">75%</span>
                </div>
                <div className="progress-premium h-3">
                  <div className="progress-fill" style={{ width: "75%" }} />
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 glass-card p-3 shadow-green-glow-sm scale-in" style={{ animationDelay: "0.6s" }}>
              <p className="text-user-accent font-bold">+{formatCurrency(2300)}</p>
              <p className="text-user-text-secondary text-xs">Este mês</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
