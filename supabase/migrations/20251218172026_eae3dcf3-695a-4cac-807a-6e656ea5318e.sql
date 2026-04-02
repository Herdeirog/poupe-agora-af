-- Create recurring_payments table for payment history
CREATE TABLE public.recurring_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to financial_commitments
ALTER TABLE public.financial_commitments 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS total_payments_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_paid NUMERIC DEFAULT 0;

-- Enable RLS on recurring_payments
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- RLS policy for recurring_payments
CREATE POLICY "Users manage own recurring payments"
ON public.recurring_payments
FOR ALL
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_recurring_payments_commitment_id ON public.recurring_payments(commitment_id);
CREATE INDEX idx_recurring_payments_user_id ON public.recurring_payments(user_id);