import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O Poupe Agora é realmente gratuito?",
    answer: "Sim! Oferecemos um plano gratuito completo com dashboard básico, até 50 transações por mês e uma meta financeira. Você pode usar sem pagar nada e fazer upgrade quando quiser.",
  },
  {
    question: "Como funciona a integração com WhatsApp?",
    answer: "É simples! Depois de configurar, basta enviar uma mensagem como 'gastei 50 reais no mercado' e a transação é registrada automaticamente. Disponível nos planos Pro e Família.",
  },
  {
    question: "Meus dados financeiros estão seguros?",
    answer: "Absolutamente! Utilizamos criptografia de ponta a ponta, servidores seguros e nunca compartilhamos seus dados com terceiros. Sua privacidade é nossa prioridade.",
  },
  {
    question: "Posso cancelar minha assinatura a qualquer momento?",
    answer: "Sim! Não há fidelidade. Você pode cancelar quando quiser pelo próprio app, sem burocracia. Seus dados permanecem salvos por 30 dias após o cancelamento.",
  },
  {
    question: "Como os insights com IA funcionam?",
    answer: "Nossa IA analisa seus padrões de gastos e identifica oportunidades de economia. Você recebe sugestões personalizadas como 'Você gastou 30% mais em delivery este mês' com dicas práticas.",
  },
  {
    question: "Consigo exportar meus dados?",
    answer: "Sim! Você pode exportar todas suas transações e relatórios em formato CSV ou PDF a qualquer momento, em todos os planos.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="absolute inset-0 bg-user-bg-secondary/50" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="badge-premium badge-income mb-4 inline-block fade-in-up">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-user-text-primary mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
            Perguntas{" "}
            <span className="text-user-accent">Frequentes</span>
          </h2>
          <p className="text-user-text-secondary text-lg max-w-2xl mx-auto fade-in-up" style={{ animationDelay: "0.2s" }}>
            Tire suas dúvidas sobre o Poupe Agora.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card border-none px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-user-text-primary hover:text-user-accent hover:no-underline py-5 text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-user-text-secondary pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
