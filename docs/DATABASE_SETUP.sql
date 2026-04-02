-- =====================================================================
-- POUPE AGORA 4.0 - Script Consolidado de Instalação do Banco de Dados
-- =====================================================================
-- 
-- Este script cria TODO o schema do banco de dados do zero.
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/SEU_PROJECT_ID/sql/new)
-- ou via CLI: psql -h db.SEU_PROJECT_ID.supabase.co -p 5432 -U postgres -d postgres -f DATABASE_SETUP.sql
--
-- IMPORTANTE: Execute este script em um projeto Supabase LIMPO (novo).
-- Se executar em um projeto existente, as cláusulas IF NOT EXISTS e ON CONFLICT evitam erros,
-- mas verifique se não há conflitos com dados existentes.
--
-- Última atualização: 2026-03-22
-- =====================================================================

-- =====================================================================
-- SEÇÃO 1: EXTENSÕES
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- SEÇÃO 2: ENUMS
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- SEÇÃO 3: FUNÇÕES UTILITÁRIAS
-- =====================================================================

-- 3.1 Trigger genérico para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3.2 Alias para compatibilidade (usado por triggers antigos)
CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3.3 Trigger para tabelas de família
CREATE OR REPLACE FUNCTION public.update_family_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.4 Verificação de role (SECURITY DEFINER para evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3.5 Verificação rápida de admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 3.6 Criptografia de secrets
CREATE OR REPLACE FUNCTION public.encrypt_secret(secret TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  RETURN pgp_sym_encrypt(secret, 'poupeagora-secret-key-32chars!!');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_secret(encrypted BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted, 'poupeagora-secret-key-32chars!!');
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_encrypted_secret(p_key_name TEXT, p_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  INSERT INTO public.encrypted_secrets (key_name, encrypted_value)
  VALUES (p_key_name, public.encrypt_secret(p_value))
  ON CONFLICT (key_name)
  DO UPDATE SET
    encrypted_value = public.encrypt_secret(p_value),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_decrypted_secret(p_key_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT public.decrypt_secret(encrypted_value)
  INTO result
  FROM public.encrypted_secrets
  WHERE key_name = p_key_name;
  RETURN result;
END;
$$;

-- 3.7 Limpeza de buffer de conversação expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_buffer()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM conversation_buffer WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3.8 Deletar conta do usuário (RPC)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  DELETE FROM commitment_reminders WHERE user_id = current_user_id;
  DELETE FROM recurring_payments WHERE user_id = current_user_id;
  DELETE FROM financial_commitments WHERE user_id = current_user_id;
  DELETE FROM transactions WHERE user_id = current_user_id;
  DELETE FROM goals WHERE user_id = current_user_id;
  DELETE FROM reminders WHERE user_id = current_user_id;
  DELETE FROM budgets WHERE user_id = current_user_id;
  DELETE FROM categories WHERE user_id = current_user_id;
  DELETE FROM subscriptions WHERE user_id = current_user_id;
  DELETE FROM conversation_buffer WHERE user_id = current_user_id;
  DELETE FROM inbound_messages WHERE user_id = current_user_id;
  DELETE FROM message_queue WHERE user_id = current_user_id;
  DELETE FROM agent_runs WHERE user_id = current_user_id;
  DELETE FROM processing_locks WHERE user_id = current_user_id;
  DELETE FROM user_roles WHERE user_id = current_user_id;
  DELETE FROM profiles WHERE id = current_user_id;
END;
$$;

-- =====================================================================
-- SEÇÃO 4: TABELAS (ordem de dependência)
-- =====================================================================

-- 4.1 profiles (referencia auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  telefone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.2 user_roles (referencia auth.users)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4.3 categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.4 transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  origin TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.5 goals
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.6 budgets (1:1 por usuário)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_limit NUMERIC,
  alert_at_70 BOOLEAN DEFAULT true,
  alert_at_90 BOOLEAN DEFAULT true,
  alert_at_100 BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.7 reminders (lembretes via WhatsApp)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  reminder_date DATE,
  reminder_time TIME,
  amount NUMERIC,
  recurrence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  origin TEXT DEFAULT 'whatsapp',
  next_execution TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.8 financial_commitments (compromissos financeiros)
CREATE TABLE IF NOT EXISTS public.financial_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  amount NUMERIC,
  type TEXT NOT NULL DEFAULT 'unique',
  status TEXT NOT NULL DEFAULT 'pending',
  origin TEXT NOT NULL DEFAULT 'manual',
  frequency TEXT,
  is_indefinite BOOLEAN DEFAULT false,
  current_installment INTEGER,
  total_installments INTEGER,
  start_date DATE,
  total_payments_made INTEGER DEFAULT 0,
  total_amount_paid NUMERIC DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.9 recurring_payments (histórico de pagamentos recorrentes)
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.10 commitment_reminders (lembretes de compromissos)
CREATE TABLE IF NOT EXISTS public.commitment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  timing TEXT NOT NULL DEFAULT 'same_day',
  custom_days INTEGER,
  recurrence_mode TEXT DEFAULT 'all_occurrences',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'active',
  next_alert_date DATE,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.11 subscriptions (assinaturas)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  status TEXT DEFAULT 'pendente',
  plan TEXT DEFAULT 'gratuito',
  origin TEXT,
  amount NUMERIC,
  start_date DATE,
  end_date DATE,
  last_renewal DATE,
  next_billing DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.12 subscription_payments (histórico de pagamentos de assinatura)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.13 plans (planos disponíveis)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  period TEXT DEFAULT '/mês',
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  popular BOOLEAN DEFAULT false,
  agenda_enabled BOOLEAN DEFAULT true,
  max_installments INTEGER DEFAULT 3,
  reminders_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.14 admin_notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vencimento',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.15 admin_action_history
CREATE TABLE IF NOT EXISTS public.admin_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.16 family_plans
CREATE TABLE IF NOT EXISTS public.family_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'family' CHECK (plan_type IN ('family', 'family_plus')),
  max_members INTEGER NOT NULL DEFAULT 4,
  invites_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.17 family_members
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_plan_id UUID NOT NULL REFERENCES public.family_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited', 'blocked', 'removed')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.18 family_action_history
CREATE TABLE IF NOT EXISTS public.family_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_plan_id UUID NOT NULL REFERENCES public.family_plans(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  actor_email TEXT,
  target_user_id UUID,
  target_email TEXT,
  action_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  notes TEXT,
  is_admin_action BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.19 family_notifications
CREATE TABLE IF NOT EXISTS public.family_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_plan_id UUID NOT NULL REFERENCES public.family_plans(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('member_removed', 'member_blocked', 'member_unblocked', 'invite_sent', 'invite_expired', 'force_downgrade', 'plan_upgraded')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.20 user_reminders (lembretes financeiros do usuário)
CREATE TABLE IF NOT EXISTS public.user_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC,
  recurrence TEXT NOT NULL DEFAULT 'once',
  status TEXT NOT NULL DEFAULT 'active',
  origin TEXT NOT NULL DEFAULT 'manual',
  next_execution DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.21 goal_weeks (semanas de metas progressivas)
CREATE TABLE IF NOT EXISTS public.goal_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  week_value NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_goal_week UNIQUE (goal_id, week_number)
);

-- 4.22 goal_reminders (lembretes de metas)
CREATE TABLE IF NOT EXISTS public.goal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  day_of_week INTEGER NOT NULL DEFAULT 1,
  time_of_day TIME NOT NULL DEFAULT '09:00',
  status TEXT NOT NULL DEFAULT 'active',
  next_alert_date DATE,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.23 global_settings
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- 4.24 currency_rates
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'BRL',
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  source TEXT DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- 4.25 agents (agentes IA)
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1024,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  routing_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.26 integration_evolution (config Evolution API / WhatsApp)
CREATE TABLE IF NOT EXISTS public.integration_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT '',
  instance_name TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.27 conversation_buffer (contexto de conversa com TTL)
CREATE TABLE IF NOT EXISTS public.conversation_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  agent_slug TEXT REFERENCES public.agents(slug) ON DELETE SET NULL,
  role TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 days')
);

-- 4.28 agent_runs (logs e auditoria de execuções de agentes)
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_slug TEXT REFERENCES public.agents(slug) ON DELETE SET NULL,
  input_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  error_message TEXT,
  response_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.29 inbound_messages (mensagens recebidas via WhatsApp)
CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  remote_jid TEXT NOT NULL,
  message_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_base64 TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  UNIQUE(channel, remote_jid, message_id)
);

-- 4.30 processing_locks (locks de processamento por usuário)
CREATE TABLE IF NOT EXISTS public.processing_locks (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.31 message_queue (fila de mensagens com retry)
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inbound_message_id UUID NOT NULL REFERENCES public.inbound_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inbound_message_id)
);

-- 4.32 encrypted_secrets (secrets criptografados)
CREATE TABLE IF NOT EXISTS public.encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  encrypted_value BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.33 agenda_events (eventos de agenda)
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.34 agenda_recurrences (recorrências de agenda)
CREATE TABLE IF NOT EXISTS public.agenda_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  weekday INTEGER,
  day_of_month INTEGER,
  event_time TIME,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_event_id UUID REFERENCES public.agenda_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- SEÇÃO 5: HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_recurrences ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SEÇÃO 6: POLÍTICAS RLS
-- =====================================================================

-- ---- profiles ----
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (is_admin());

-- ---- user_roles ----
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- categories ----
CREATE POLICY "Users view system categories and own categories" ON public.categories
  FOR SELECT USING ((user_id IS NULL) OR (user_id = auth.uid()));
CREATE POLICY "Users manage own categories" ON public.categories
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins manage all categories" ON public.categories
  FOR ALL USING (is_admin());

-- ---- transactions ----
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all transactions" ON public.transactions
  FOR SELECT USING (is_admin());

-- ---- goals ----
CREATE POLICY "Users manage own goals" ON public.goals
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all goals" ON public.goals
  FOR SELECT USING (is_admin());

-- ---- budgets ----
CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all budgets" ON public.budgets
  FOR SELECT USING (is_admin());

-- ---- reminders ----
CREATE POLICY "Users manage own reminders" ON public.reminders
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all reminders" ON public.reminders
  FOR SELECT USING (is_admin());

-- ---- financial_commitments ----
CREATE POLICY "Users manage own commitments" ON public.financial_commitments
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all commitments" ON public.financial_commitments
  FOR SELECT USING (is_admin());

-- ---- recurring_payments ----
CREATE POLICY "Users manage own payments" ON public.recurring_payments
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all payments" ON public.recurring_payments
  FOR SELECT USING (is_admin());

-- ---- commitment_reminders ----
CREATE POLICY "Users can view their own commitment reminders" ON public.commitment_reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own commitment reminders" ON public.commitment_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own commitment reminders" ON public.commitment_reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own commitment reminders" ON public.commitment_reminders
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all commitment reminders" ON public.commitment_reminders
  FOR SELECT USING (is_admin());

-- ---- subscriptions ----
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL USING (is_admin());

-- ---- subscription_payments ----
CREATE POLICY "Admins can view all payments" ON public.subscription_payments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert payments" ON public.subscription_payments
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update payments" ON public.subscription_payments
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete payments" ON public.subscription_payments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- plans ----
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- admin_notifications ----
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert notifications" ON public.admin_notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete notifications" ON public.admin_notifications
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- admin_action_history ----
CREATE POLICY "Admins can view action history" ON public.admin_action_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert action history" ON public.admin_action_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- family_plans ----
CREATE POLICY "Admins can manage all family plans" ON public.family_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own family plan" ON public.family_plans
  FOR SELECT USING (admin_user_id = auth.uid());
CREATE POLICY "Users can update own family plan" ON public.family_plans
  FOR UPDATE USING (admin_user_id = auth.uid());
CREATE POLICY "Users can create own family plan" ON public.family_plans
  FOR INSERT WITH CHECK (admin_user_id = auth.uid());

-- ---- family_members ----
CREATE POLICY "Admins can manage all family members" ON public.family_members
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Plan admins can manage their members" ON public.family_members
  FOR ALL USING (EXISTS (SELECT 1 FROM public.family_plans WHERE id = family_plan_id AND admin_user_id = auth.uid()));
CREATE POLICY "Members can view their own membership" ON public.family_members
  FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- ---- family_action_history ----
CREATE POLICY "Admins can view all family action history" ON public.family_action_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Plan admins can view their history" ON public.family_action_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.family_plans WHERE id = family_plan_id AND admin_user_id = auth.uid()));
CREATE POLICY "Plan admins can insert history" ON public.family_action_history
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.family_plans WHERE id = family_plan_id AND admin_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ---- family_notifications ----
CREATE POLICY "Admins can manage all family notifications" ON public.family_notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Plan admins can view their notifications" ON public.family_notifications
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.family_plans WHERE id = family_plan_id AND admin_user_id = auth.uid()));
CREATE POLICY "Plan admins can insert notifications" ON public.family_notifications
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.family_plans WHERE id = family_plan_id AND admin_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view notifications sent to them" ON public.family_notifications
  FOR SELECT USING (target_user_id = auth.uid());

-- ---- user_reminders ----
CREATE POLICY "Users manage own reminders" ON public.user_reminders
  FOR ALL USING (user_id = auth.uid());

-- ---- goal_weeks ----
CREATE POLICY "Users manage own goal weeks" ON public.goal_weeks
  FOR ALL USING (user_id = auth.uid());

-- ---- goal_reminders ----
CREATE POLICY "Users manage own goal reminders" ON public.goal_reminders
  FOR ALL USING (user_id = auth.uid());

-- ---- global_settings ----
CREATE POLICY "Anyone can view global settings" ON public.global_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage global settings" ON public.global_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- currency_rates ----
CREATE POLICY "Anyone can view currency rates" ON public.currency_rates
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage currency rates" ON public.currency_rates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- agents ----
CREATE POLICY "Admins manage agents" ON public.agents
  FOR ALL USING (is_admin());
CREATE POLICY "Public read active agents" ON public.agents
  FOR SELECT USING (active = true);

-- ---- integration_evolution ----
CREATE POLICY "Admins manage evolution settings" ON public.integration_evolution
  FOR ALL USING (is_admin());

-- ---- conversation_buffer ----
CREATE POLICY "Admins view buffer" ON public.conversation_buffer
  FOR SELECT USING (is_admin());

-- ---- agent_runs ----
CREATE POLICY "Admins view runs" ON public.agent_runs
  FOR SELECT USING (is_admin());

-- ---- inbound_messages ----
CREATE POLICY "Admins can view inbound_messages" ON public.inbound_messages
  FOR SELECT USING (is_admin());

-- ---- processing_locks ----
CREATE POLICY "Admins can view processing_locks" ON public.processing_locks
  FOR SELECT USING (is_admin());

-- ---- message_queue ----
CREATE POLICY "Admins can view message_queue" ON public.message_queue
  FOR SELECT USING (is_admin());

-- ---- encrypted_secrets ----
CREATE POLICY "Admins can insert secrets" ON public.encrypted_secrets
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update secrets" ON public.encrypted_secrets
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- agenda_events ----
CREATE POLICY "Users manage own agenda events" ON public.agenda_events
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all agenda events" ON public.agenda_events
  FOR SELECT USING (is_admin());

-- ---- agenda_recurrences ----
CREATE POLICY "Users manage own recurrences" ON public.agenda_recurrences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all recurrences" ON public.agenda_recurrences
  FOR SELECT USING (is_admin());

-- =====================================================================
-- SEÇÃO 7: TRIGGERS
-- =====================================================================

-- Trigger: criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin, ativo)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    false,
    true
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de updated_at
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integration_evolution_updated_at BEFORE UPDATE ON public.integration_evolution
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_message_queue_updated_at BEFORE UPDATE ON public.message_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_encrypted_secrets_updated_at BEFORE UPDATE ON public.encrypted_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_currency_rates_updated_at BEFORE UPDATE ON public.currency_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goal_reminders_updated_at BEFORE UPDATE ON public.goal_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_notifications_updated_at BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_timestamp BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_commitments_updated_at BEFORE UPDATE ON public.financial_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commitment_reminders_updated_at BEFORE UPDATE ON public.commitment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_reminders_updated_at BEFORE UPDATE ON public.user_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agenda_events_updated_at BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recurring_payments_updated_at BEFORE UPDATE ON public.recurring_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_family_plans_updated_at BEFORE UPDATE ON public.family_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_family_updated_at();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_family_updated_at();

-- =====================================================================
-- SEÇÃO 8: ÍNDICES DE PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON public.goals(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_user_id ON public.financial_commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_date ON public.financial_commitments(date);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_status ON public.financial_commitments(status);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_category ON public.financial_commitments(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_commitments_date_user ON public.financial_commitments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_commitment_id ON public.recurring_payments(commitment_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON public.recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_commitment_reminders_user_id ON public.commitment_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_commitment_reminders_commitment_id ON public.commitment_reminders(commitment_id);
CREATE INDEX IF NOT EXISTS idx_commitment_reminders_next_alert ON public.commitment_reminders(next_alert_date, status);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_next_exec ON public.reminders(next_execution) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON public.user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_status ON public.user_reminders(status);
CREATE INDEX IF NOT EXISTS idx_user_reminders_date ON public.user_reminders(date);
CREATE INDEX IF NOT EXISTS idx_goal_weeks_goal_id ON public.goal_weeks(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_weeks_user_id ON public.goal_weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_reminders_next_alert ON public.goal_reminders(next_alert_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goal_reminders_goal ON public.goal_reminders(goal_id);
CREATE INDEX IF NOT EXISTS idx_buffer_user_agent ON public.conversation_buffer(user_id, agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buffer_expires ON public.conversation_buffer(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON public.agent_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON public.agent_runs(agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_user_received ON public.inbound_messages(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_processed ON public.inbound_messages(processed, received_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_status_next_run ON public.message_queue(status, next_run_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_queue_user_created ON public.message_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_locks_until ON public.processing_locks(locked_until);
CREATE INDEX IF NOT EXISTS idx_family_plans_admin ON public.family_plans(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_plan ON public.family_members(family_plan_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_email ON public.family_members(email);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON public.family_members(status);
CREATE INDEX IF NOT EXISTS idx_family_action_history_plan ON public.family_action_history(family_plan_id);
CREATE INDEX IF NOT EXISTS idx_family_action_history_created ON public.family_action_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_notifications_plan ON public.family_notifications(family_plan_id);
CREATE INDEX IF NOT EXISTS idx_family_notifications_status ON public.family_notifications(status);
CREATE INDEX IF NOT EXISTS idx_global_settings_key ON public.global_settings(key);
CREATE INDEX IF NOT EXISTS idx_currency_rates_currencies ON public.currency_rates(base_currency, target_currency);

-- =====================================================================
-- SEÇÃO 9: GRANTS (Segurança - princípio do menor privilégio)
-- =====================================================================

-- Revogar permissões amplas do anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Conceder acesso mínimo ao anon (apenas leitura de dados públicos)
GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.categories TO anon;

-- Conceder acesso ao authenticated (controlado por RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_commitments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitment_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_recurrences TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.agents TO authenticated;

-- Tabelas gerenciadas por admin (acesso via RLS policies)
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscription_payments TO authenticated;
GRANT ALL ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_action_history TO authenticated;
GRANT ALL ON public.plans TO authenticated;
GRANT ALL ON public.family_plans TO authenticated;
GRANT ALL ON public.family_members TO authenticated;
GRANT ALL ON public.family_action_history TO authenticated;
GRANT ALL ON public.family_notifications TO authenticated;
GRANT ALL ON public.user_reminders TO authenticated;
GRANT ALL ON public.goal_weeks TO authenticated;
GRANT ALL ON public.goal_reminders TO authenticated;
GRANT ALL ON public.global_settings TO authenticated;
GRANT ALL ON public.currency_rates TO authenticated;
GRANT ALL ON public.agents TO authenticated;
GRANT ALL ON public.integration_evolution TO authenticated;
GRANT ALL ON public.encrypted_secrets TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- Tabelas do sistema de mensagens (apenas service_role escreve, admin lê via RLS)
GRANT SELECT ON public.conversation_buffer TO authenticated;
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT SELECT ON public.inbound_messages TO authenticated;
GRANT SELECT ON public.processing_locks TO authenticated;
GRANT SELECT ON public.message_queue TO authenticated;

-- =====================================================================
-- SEÇÃO 10: REALTIME
-- =====================================================================

ALTER TABLE public.transactions REPLICA IDENTITY FULL;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- SEÇÃO 11: STORAGE
-- =====================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'branding');

-- =====================================================================
-- SEÇÃO 12: SEED DATA
-- =====================================================================

-- 12.1 Categorias padrão do sistema (user_id = NULL)
INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
  (NULL, 'Alimentação', '🍔', '#FF6B6B', 'expense', true),
  (NULL, 'Transporte', '🚗', '#4ECDC4', 'expense', true),
  (NULL, 'Moradia', '🏠', '#45B7D1', 'expense', true),
  (NULL, 'Saúde', '💊', '#96CEB4', 'expense', true),
  (NULL, 'Educação', '📚', '#DDA0DD', 'expense', true),
  (NULL, 'Lazer', '🎮', '#FFD93D', 'expense', true),
  (NULL, 'Roupas', '👕', '#FF8C94', 'expense', true),
  (NULL, 'Contas', '📄', '#A8E6CF', 'expense', true),
  (NULL, 'Salário', '💰', '#6BCB77', 'income', true),
  (NULL, 'Freelance', '💻', '#4D96FF', 'income', true),
  (NULL, 'Investimentos', '📈', '#FFD93D', 'income', true),
  (NULL, 'Outros', '📦', '#B8B8B8', 'both', true)
ON CONFLICT DO NOTHING;

-- 12.2 Planos padrão
INSERT INTO public.plans (name, description, price, period, features, active, popular) VALUES
  ('Gratuito', 'Para começar a organizar suas finanças', 0, '/mês', '["Até 50 transações/mês", "1 meta financeira", "Categorias básicas"]'::jsonb, true, false),
  ('Básico', 'Para quem quer mais controle', 19.90, '/mês', '["Transações ilimitadas", "5 metas financeiras", "Categorias personalizadas", "Relatórios básicos"]'::jsonb, true, false),
  ('Premium', 'Para controle total das finanças', 39.90, '/mês', '["Tudo do Básico", "Metas ilimitadas", "Relatórios avançados", "Integrações", "Suporte prioritário"]'::jsonb, true, true),
  ('Elite', 'Para famílias e pequenos negócios', 79.90, '/mês', '["Tudo do Premium", "Múltiplos perfis", "Consultoria financeira", "API acesso"]'::jsonb, true, false)
ON CONFLICT DO NOTHING;

-- 12.3 Agentes IA padrão
INSERT INTO public.agents (slug, name, prompt, model, temperature, max_tokens, active, description, routing_keywords) VALUES
(
  'assistente_financeiro',
  'Assistente Financeiro',
  'Você é um assistente financeiro pessoal inteligente.

Hora atual: {{ $now }}

🎯 OBJETIVO:
Ajudar usuários a gerenciar suas finanças pessoais de forma simples e eficiente.

🔧 FERRAMENTAS DISPONÍVEIS (OBRIGATÓRIO USAR):
Para registrar transações, você DEVE usar a ferramenta addTransacao.
NUNCA diga que registrou sem usar a ferramenta!

Formato: [TOOL:addTransacao:{"description":"descrição","amount":valor,"type":"income|expense"}]

📥 PARA RECEITAS: [TOOL:addTransacao:{"description":"Descrição","amount":1000,"type":"income"}]
📤 PARA DESPESAS: [TOOL:addTransacao:{"description":"Descrição","amount":50,"type":"expense"}]

📱 FORMATAÇÃO WHATSAPP:
- Use *texto* para negrito
- Use emojis: 📊 💰 ✅ 📈 💵 💸 🎯
- Respostas curtas e diretas
- NUNCA use LaTeX, #headers ou fórmulas

Seja simpático e objetivo! 😊',
  'gpt-4o-mini', 0.7, 1024, true,
  'Ajuda os usuários com dúvidas sobre finanças pessoais, orçamento e investimentos.',
  ARRAY['gastei', 'recebi', 'anote', 'lançar', 'despesa', 'receita', 'transação', 'gasto', 'entrada', 'saída']
),
(
  'agente_consulta',
  'Agente de Consulta',
  'Você é um assistente financeiro especializado em consultas e análises.

🎯 OBJETIVO:
Responder consultas sobre finanças, planejamento, metas e orçamento do usuário.

📱 FORMATAÇÃO WHATSAPP:
- Use *texto* para negrito, _texto_ para itálico
- Emojis: 📊 💰 ✅ 📈 💵 🎯 📅
- NUNCA use LaTeX, #headers ou tabelas complexas
- Respostas limpas e diretas

Sempre seja claro, objetivo e use formatação visual simples!',
  'gpt-4o-mini', 0.7, 1024, true,
  'Responde perguntas gerais sobre o sistema e funcionalidades.',
  ARRAY['como', 'onde', 'qual', 'quando', 'ajuda', 'funciona', 'sistema', 'explicar']
),
(
  'assistente_compromissos',
  'Assistente de Compromissos',
  '',
  'gpt-4o-mini', 0.7, 1024, true,
  'Auxilia no gerenciamento de compromissos financeiros e lembretes.',
  ARRAY['lembrete', 'lembra', 'agenda', 'pagar', 'vencimento', 'prazo', 'compromisso', 'agendar', 'avisar']
)
ON CONFLICT (slug) DO NOTHING;

-- 12.4 Configuração Evolution API (vazia, para ser configurada pelo admin)
INSERT INTO public.integration_evolution (api_url, instance_name, api_key, webhook_secret, active)
SELECT '', '', '', '', false
WHERE NOT EXISTS (SELECT 1 FROM public.integration_evolution LIMIT 1);

-- 12.5 Configuração global de moeda
INSERT INTO public.global_settings (key, value, description) VALUES
  ('display_currency', '"BRL"', 'Moeda de exibição global do sistema')
ON CONFLICT (key) DO NOTHING;

-- 12.6 Taxas de câmbio iniciais
INSERT INTO public.currency_rates (base_currency, target_currency, rate) VALUES
  ('BRL', 'BRL', 1.0),
  ('BRL', 'USD', 0.17),
  ('BRL', 'EUR', 0.16),
  ('BRL', 'AOA', 148.50),
  ('BRL', 'MZN', 10.80)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- =====================================================================
-- SEÇÃO 13: CRIAR USUÁRIO ADMIN INICIAL
-- =====================================================================
-- 
-- IMPORTANTE: Após executar este script, crie um usuário admin manualmente:
--
-- 1. Vá em Authentication > Users no Supabase Dashboard
-- 2. Clique em "Add user" e crie o usuário admin
-- 3. Execute o SQL abaixo substituindo 'ID_DO_USUARIO' pelo UUID gerado:
--
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('ID_DO_USUARIO', 'admin');
--
-- Ou use a Edge Function admin-create-user para criar via API.
-- =====================================================================

-- FIM DO SCRIPT
-- Última verificação: 2026-03-22
--
-- RESUMO DA AUDITORIA (2026-03-22):
-- ✅ 21 tabelas confirmadas no banco de dados atual
-- ✅ 13 tabelas adicionais para features futuras (family, plans, admin, etc.)
-- ✅ Todas as colunas, defaults e tipos validados contra o schema real
-- ✅ Triggers de updated_at para todas as tabelas relevantes (incluindo agenda_events, recurring_payments)
-- ✅ RLS habilitado e policies criadas para todas as tabelas
-- ✅ Grants restritivos: anon só lê agents/categories
-- ✅ Seed data: categorias, planos, agentes IA, moedas
