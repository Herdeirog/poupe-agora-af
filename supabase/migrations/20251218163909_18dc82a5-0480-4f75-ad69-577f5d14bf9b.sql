-- Create financial_commitments table
CREATE TABLE public.financial_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  amount NUMERIC,
  type TEXT NOT NULL DEFAULT 'unique',
  status TEXT NOT NULL DEFAULT 'pending',
  origin TEXT NOT NULL DEFAULT 'manual',
  frequency TEXT,
  is_indefinite BOOLEAN DEFAULT false,
  current_installment INTEGER,
  total_installments INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_financial_commitments_user_id ON public.financial_commitments(user_id);
CREATE INDEX idx_financial_commitments_date ON public.financial_commitments(date);
CREATE INDEX idx_financial_commitments_status ON public.financial_commitments(status);

-- Enable RLS
ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users manage own commitments" 
ON public.financial_commitments 
FOR ALL 
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_financial_commitments_timestamp
  BEFORE UPDATE ON public.financial_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_subscription_timestamp();