-- Criar tabela de planos para gerenciamento no admin
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  period TEXT DEFAULT '/mês',
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa pode ver planos ativos (landing page)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (active = true);

-- Política: admins podem gerenciar todos os planos
CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir planos padrão
INSERT INTO public.plans (name, description, price, period, features, active, popular) VALUES
  ('Gratuito', 'Para começar a organizar suas finanças', 0, '/mês', '["Até 50 transações/mês", "1 meta financeira", "Categorias básicas"]'::jsonb, true, false),
  ('Básico', 'Para quem quer mais controle', 19.90, '/mês', '["Transações ilimitadas", "5 metas financeiras", "Categorias personalizadas", "Relatórios básicos"]'::jsonb, true, false),
  ('Premium', 'Para controle total das finanças', 39.90, '/mês', '["Tudo do Básico", "Metas ilimitadas", "Relatórios avançados", "Integrações", "Suporte prioritário"]'::jsonb, true, true),
  ('Elite', 'Para famílias e pequenos negócios', 79.90, '/mês', '["Tudo do Premium", "Múltiplos perfis", "Consultoria financeira", "API acesso"]'::jsonb, true, false)
ON CONFLICT DO NOTHING;