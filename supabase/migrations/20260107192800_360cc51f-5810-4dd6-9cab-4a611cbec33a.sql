-- Tabela de compromissos financeiros
CREATE TABLE IF NOT EXISTS public.financial_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  amount NUMERIC,
  type TEXT NOT NULL DEFAULT 'unique' CHECK (type IN ('unique', 'recurring', 'installment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'whatsapp', 'google')),
  category_id UUID REFERENCES public.categories(id),
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly')),
  is_indefinite BOOLEAN,
  current_installment INTEGER,
  total_installments INTEGER,
  start_date DATE,
  total_payments_made INTEGER DEFAULT 0,
  total_amount_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de histórico de pagamentos recorrentes
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para financial_commitments
CREATE POLICY "Users manage own commitments" ON public.financial_commitments
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins view all commitments" ON public.financial_commitments
  FOR SELECT USING (is_admin());

-- Políticas para recurring_payments
CREATE POLICY "Users manage own payments" ON public.recurring_payments
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins view all payments" ON public.recurring_payments
  FOR SELECT USING (is_admin());

-- Índices para performance
CREATE INDEX idx_financial_commitments_user_id ON public.financial_commitments(user_id);
CREATE INDEX idx_financial_commitments_date ON public.financial_commitments(date);
CREATE INDEX idx_financial_commitments_status ON public.financial_commitments(status);
CREATE INDEX idx_recurring_payments_commitment_id ON public.recurring_payments(commitment_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_commitments_updated_at
  BEFORE UPDATE ON public.financial_commitments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_payments_updated_at
  BEFORE UPDATE ON public.recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();