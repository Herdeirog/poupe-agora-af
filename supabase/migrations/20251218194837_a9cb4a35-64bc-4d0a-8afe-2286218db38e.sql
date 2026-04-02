-- =============================================
-- TABELAS DO SISTEMA DE PLANO FAMÍLIA
-- =============================================

-- 1. Tabela principal de planos família
CREATE TABLE public.family_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'family' CHECK (plan_type IN ('family', 'family_plus')),
  max_members INTEGER NOT NULL DEFAULT 4,
  invites_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Membros do plano família
CREATE TABLE public.family_members (
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

-- 3. Histórico de ações do plano família
CREATE TABLE public.family_action_history (
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

-- 4. Fila de notificações família
CREATE TABLE public.family_notifications (
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

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_family_plans_admin ON public.family_plans(admin_user_id);
CREATE INDEX idx_family_members_plan ON public.family_members(family_plan_id);
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_email ON public.family_members(email);
CREATE INDEX idx_family_members_status ON public.family_members(status);
CREATE INDEX idx_family_action_history_plan ON public.family_action_history(family_plan_id);
CREATE INDEX idx_family_action_history_created ON public.family_action_history(created_at DESC);
CREATE INDEX idx_family_notifications_plan ON public.family_notifications(family_plan_id);
CREATE INDEX idx_family_notifications_status ON public.family_notifications(status);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_notifications ENABLE ROW LEVEL SECURITY;

-- family_plans policies
CREATE POLICY "Admins can manage all family plans"
ON public.family_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own family plan"
ON public.family_plans FOR SELECT
USING (admin_user_id = auth.uid());

CREATE POLICY "Users can update own family plan"
ON public.family_plans FOR UPDATE
USING (admin_user_id = auth.uid());

-- family_members policies
CREATE POLICY "Admins can manage all family members"
ON public.family_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Plan admins can manage their members"
ON public.family_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_plans 
    WHERE id = family_plan_id AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Members can view their own membership"
ON public.family_members FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- family_action_history policies
CREATE POLICY "Admins can view all family action history"
ON public.family_action_history FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Plan admins can view their history"
ON public.family_action_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_plans 
    WHERE id = family_plan_id AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Plan admins can insert history"
ON public.family_action_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_plans 
    WHERE id = family_plan_id AND admin_user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- family_notifications policies
CREATE POLICY "Admins can manage all family notifications"
ON public.family_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Plan admins can view their notifications"
ON public.family_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_plans 
    WHERE id = family_plan_id AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view notifications sent to them"
ON public.family_notifications FOR SELECT
USING (target_user_id = auth.uid());

-- =============================================
-- TRIGGER para updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_family_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_family_plans_updated_at
  BEFORE UPDATE ON public.family_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_family_updated_at();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_family_updated_at();