import { Star, Quote } from "lucide-react";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

const TestimonialsSection = () => {
  const { formatCurrency } = useFormatCurrency();

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Empreendedora",
      avatar: "MS",
      rating: 5,
      text: `Finalmente consegui organizar minhas finanças pessoais e da empresa. O dashboard é incrível e os insights me ajudaram a economizar ${formatCurrency(2000)} em 3 meses!`,
    },
    {
      name: "João Santos",
      role: "Desenvolvedor",
      avatar: "JS",
      rating: 5,
      text: "A integração com WhatsApp mudou minha vida. Agora registro gastos em segundos, sem precisar abrir o app toda hora. Super prático!",
    },
    {
      name: "Ana Oliveira",
      role: "Professora",
      avatar: "AO",
      rating: 5,
      text: "As metas financeiras me motivam muito! Consegui juntar dinheiro para minha viagem dos sonhos acompanhando o progresso diariamente.",
    },
    {
      name: "Carlos Mendes",
      role: "Autônomo",
      avatar: "CM",
      rating: 5,
      text: "Interface linda e muito fácil de usar. Recomendo para quem quer sair do vermelho e ter controle real do dinheiro.",
    },
  ];
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="badge-premium badge-info mb-4 inline-block fade-in-up">
            Depoimentos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-user-text-primary mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
            O que nossos{" "}
            <span className="text-user-accent">usuários</span> dizem
          </h2>
          <p className="text-user-text-secondary text-lg max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Histórias reais de pessoas que transformaram suas finanças.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="glass-card p-6 hover:shadow-premium transition-all duration-300 fade-in-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="h-8 w-8 text-user-accent/30" />
              </div>

              {/* Text */}
              <p className="text-user-text-secondary mb-6 italic">
                "{testimonial.text}"
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-user-accent/20 flex items-center justify-center text-user-accent font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-user-text-primary font-medium">
                      {testimonial.name}
                    </p>
                    <p className="text-user-text-secondary text-sm">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-user-accent text-user-accent"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
