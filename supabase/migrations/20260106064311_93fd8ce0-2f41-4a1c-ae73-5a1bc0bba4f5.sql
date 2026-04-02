-- =============================================
-- FASE 1: Função para atualizar timestamps
-- =============================================

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- FASE 2: Tabelas para Infraestrutura de Agentes WhatsApp
-- =============================================

-- 2.1 Tabela agents (configuração dos 3 agentes)
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  temperature numeric NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer NOT NULL DEFAULT 1024 CHECK (max_tokens >= 1 AND max_tokens <= 8192),
  active boolean NOT NULL DEFAULT true,
  description text,
  routing_keywords text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agents" ON public.agents
  FOR ALL USING (is_admin());

CREATE POLICY "Public read active agents" ON public.agents
  FOR SELECT USING (active = true);

-- 2.2 Tabela integration_evolution (config Evolution API)
CREATE TABLE public.integration_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL DEFAULT '',
  instance_name text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  webhook_secret text,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_integration_evolution_updated_at
  BEFORE UPDATE ON public.integration_evolution
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para integration_evolution
ALTER TABLE public.integration_evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage evolution settings" ON public.integration_evolution
  FOR ALL USING (is_admin());

-- 2.3 Tabela conversation_buffer (contexto de conversa com TTL)
CREATE TABLE public.conversation_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  agent_slug text REFERENCES public.agents(slug) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio')),
  content text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '2 days')
);

-- Índices para performance
CREATE INDEX idx_buffer_user_agent ON public.conversation_buffer(user_id, agent_slug, created_at DESC);
CREATE INDEX idx_buffer_expires ON public.conversation_buffer(expires_at);

-- RLS para conversation_buffer (service role e admin)
ALTER TABLE public.conversation_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view buffer" ON public.conversation_buffer
  FOR SELECT USING (is_admin());

-- 2.4 Tabela agent_runs (logs e auditoria)
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_slug text REFERENCES public.agents(slug) ON DELETE SET NULL,
  input_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'error')),
  latency_ms integer,
  tokens_in integer,
  tokens_out integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_agent_runs_user ON public.agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX idx_agent_runs_agent ON public.agent_runs(agent_slug, created_at DESC);

-- RLS para agent_runs
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view runs" ON public.agent_runs
  FOR SELECT USING (is_admin());

-- 2.5 Tabela reminders (para Assistente de Compromissos)
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  reminder_date date,
  reminder_time time,
  amount numeric,
  recurrence text CHECK (recurrence IS NULL OR recurrence IN ('once', 'daily', 'weekly', 'monthly', 'yearly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
  origin text DEFAULT 'whatsapp',
  next_execution timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_reminders_user ON public.reminders(user_id, created_at DESC);
CREATE INDEX idx_reminders_next_exec ON public.reminders(next_execution) WHERE status = 'pending';

-- RLS para reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON public.reminders
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins view all reminders" ON public.reminders
  FOR SELECT USING (is_admin());

-- =============================================
-- SEED: Agentes iniciais e config Evolution
-- =============================================

-- Inserir os 3 agentes padrão
INSERT INTO public.agents (slug, name, prompt, model, temperature, max_tokens, active, description, routing_keywords) VALUES
(
  'assistente_financeiro',
  'Assistente Financeiro',
  '',
  'gpt-4o-mini',
  0.7,
  1024,
  true,
  'Ajuda os usuários com dúvidas sobre finanças pessoais, orçamento e investimentos.',
  ARRAY['gastei', 'recebi', 'anote', 'lançar', 'despesa', 'receita', 'transação', 'gasto', 'entrada', 'saída']
),
(
  'agente_consulta',
  'Agente de Consulta',
  '',
  'gpt-4o-mini',
  0.7,
  1024,
  true,
  'Responde perguntas gerais sobre o sistema e funcionalidades.',
  ARRAY['como', 'onde', 'qual', 'quando', 'ajuda', 'funciona', 'sistema', 'explicar']
),
(
  'assistente_compromissos',
  'Assistente de Compromissos',
  '',
  'gpt-4o-mini',
  0.7,
  1024,
  true,
  'Auxilia no gerenciamento de compromissos financeiros e lembretes.',
  ARRAY['lembrete', 'lembra', 'agenda', 'pagar', 'vencimento', 'prazo', 'compromisso', 'agendar', 'avisar']
)
ON CONFLICT (slug) DO NOTHING;

-- Inserir config inicial Evolution (vazia, para ser configurada pelo admin)
INSERT INTO public.integration_evolution (api_url, instance_name, api_key, webhook_secret, active)
VALUES ('', '', '', '', false);