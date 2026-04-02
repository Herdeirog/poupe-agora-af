import { useState } from 'react';
import { useSupportTickets } from '@/hooks/useUserProfile';
import { AppBreadcrumb } from '@/components/app/AppBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, HelpCircle, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  { q: 'Como adicionar uma transação?', a: 'Acesse Transações > Adicionar e preencha os dados.' },
  { q: 'Como funciona a integração com WhatsApp?', a: 'Vincule seu número em Perfil e envie mensagens para registrar gastos.' },
  { q: 'Posso cancelar minha assinatura?', a: 'Sim, acesse Meu Plano e clique em Cancelar.' },
  { q: 'Como criar uma meta?', a: 'Acesse Metas > Nova Meta e defina título, valor e prazo.' },
];

export default function AppSupport() {
  const { tickets, createTicket } = useSupportTickets();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });

  const handleSubmit = () => {
    if (!form.subject || !form.message) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    createTicket(form);
    toast({ title: 'Ticket criado' });
    setDialogOpen(false);
    setForm({ subject: '', message: '' });
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Suporte' }]} />
      
      <div className="flex items-center justify-between fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suporte</h1>
          <p className="text-muted-foreground">Central de ajuda</p>
        </div>
        <button 
          className="btn-glass flex items-center gap-2"
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
      </div>

      {/* FAQ */}
      <div className="glass-strong p-6 rounded-2xl fade-in-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-circle icon-circle-info">
            <HelpCircle className="h-5 w-5 text-user-info" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Perguntas Frequentes</h3>
        </div>
        
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem 
              key={i} 
              value={`faq-${i}`}
              className="glass-card rounded-xl border-none px-4"
            >
              <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline py-4">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Tickets */}
      <div className="glass-strong p-6 rounded-2xl fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="icon-circle icon-circle-warning">
              <Ticket className="h-5 w-5 text-user-warning" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Meus Tickets</h3>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="btn-premium flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Novo Ticket
              </button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-border/50">
              <DialogHeader>
                <DialogTitle className="text-foreground">Abrir Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assunto</Label>
                  <Input 
                    value={form.subject} 
                    onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Mensagem</Label>
                  <Textarea 
                    value={form.message} 
                    onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                    className="glass-input min-h-[120px]"
                  />
                </div>
                <button onClick={handleSubmit} className="btn-premium w-full">
                  Enviar
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {tickets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 glass-card rounded-xl">
            Nenhum ticket
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="glass-card p-4 rounded-xl transition-all duration-200 hover:border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-foreground">{t.subject}</p>
                  <span className={cn(
                    'badge-premium',
                    t.status === 'open' ? 'badge-income' : 'badge-info'
                  )}>
                    {t.status === 'open' ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
