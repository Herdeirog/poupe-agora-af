-- Criar enum para status da assinatura
CREATE TYPE subscription_status AS ENUM ('ativa', 'pendente', 'cancelada', 'suspensa', 'trial');

-- Criar enum para origem da assinatura
CREATE TYPE subscription_origin AS ENUM ('perfectpay', 'asaas', 'qify', 'hotmart', 'manual');

-- Criar enum para planos
CREATE TYPE subscription_plan AS ENUM ('gratuito', 'mensal', 'trimestral', 'semestral', 'anual', 'vitalicio', 'trial', 'premium');

-- Criar tabela subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status subscription_status NOT NULL DEFAULT 'trial',
    plan subscription_plan NOT NULL DEFAULT 'gratuito',
    origin subscription_origin NOT NULL DEFAULT 'manual',
    amount NUMERIC(10, 2) DEFAULT 0,
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscriptions"
ON public.subscriptions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

-- Criar tabela subscription_payments (histórico de pagamentos)
CREATE TABLE public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscription_payments
CREATE POLICY "Admins can view all payments"
ON public.subscription_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payments"
ON public.subscription_payments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments"
ON public.subscription_payments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payments"
ON public.subscription_payments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));