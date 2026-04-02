import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-user-accent/10 via-user-bg-primary to-user-accent/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-user-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="glass-strong p-12 md:p-16 rounded-3xl shadow-premium text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 badge-premium badge-income mb-6 fade-in-up">
            <Sparkles className="h-4 w-4" />
            <span>Comece hoje mesmo</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-user-text-primary mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Pronto para transformar suas{" "}
            <span className="text-user-accent">finanças</span>?
          </h2>

          <p className="text-user-text-secondary text-lg md:text-xl mb-10 max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Junte-se a mais de 10.000 pessoas que já estão economizando mais e vivendo melhor com o Poupe Agora.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/app">
              <Button className="btn-premium text-lg px-10 py-6 group">
                Criar Conta Grátis
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/app">
              <Button className="btn-glass text-lg px-10 py-6">
                Ver Demonstração
              </Button>
            </Link>
          </div>

          <p className="text-user-text-secondary text-sm mt-6 fade-in-up" style={{ animationDelay: "0.4s" }}>
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
