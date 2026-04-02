-- Execute este SQL no Supabase SQL Editor para criar o sistema de planos

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  period TEXT DEFAULT '/mês',
  features JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- Limpar políticas antigas para evitar erro "already exists" ao rodar novamente
DROP POLICY IF EXISTS "Public read active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins read all" ON public.plans;
DROP POLICY IF EXISTS "Admins full access" ON public.plans;

-- 1. Qualquer pessoa (logada ou não) pode VER planos ATIVOS (para a Landing Page)
CREATE POLICY "Public read active plans" ON public.plans FOR SELECT 
USING (active = true);

-- 2. Admins podem VER TUDO (ativos e inativos)
CREATE POLICY "Admins read all" ON public.plans FOR SELECT 
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
  auth.jwt() ->> 'email' = 'admin@nex.com.br'
);

-- 3. Admins podem CRIAR, EDITAR e EXCLUIR
CREATE POLICY "Admins full access" ON public.plans FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
  auth.jwt() ->> 'email' = 'admin@nex.com.br'
);

-- Seed Dados Iniciais (Apenas se a tabela estiver vazia)
INSERT INTO public.plans (name, price, period, description, features, popular, active)
SELECT 'Gratuito', 0, '/mês', 'Perfeito para começar a organizar suas finanças.', '["Dashboard básico", "Até 50 transações/mês", "1 meta financeira", "Relatórios mensais"]'::jsonb, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans);

INSERT INTO public.plans (name, price, period, description, features, popular, active)
SELECT 'Pro', 19.90, '/mês', 'Para quem quer controle total das finanças.', '["Dashboard completo", "Transações ilimitadas", "Metas ilimitadas", "Integração WhatsApp", "Insights com IA", "Relatórios avançados", "Suporte prioritário"]'::jsonb, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans);

INSERT INTO public.plans (name, price, period, description, features, popular, active)
SELECT 'Família', 39.90, '/mês', 'Gerencie as finanças de toda a família.', '["Tudo do Pro", "Até 5 usuários", "Orçamento compartilhado", "Metas familiares", "Relatórios consolidados", "Controle parental"]'::jsonb, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans);
