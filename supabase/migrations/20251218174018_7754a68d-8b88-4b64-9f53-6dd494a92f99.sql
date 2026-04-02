-- Add category_id to financial_commitments for category filtering
ALTER TABLE public.financial_commitments 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_financial_commitments_category ON public.financial_commitments(category_id);
CREATE INDEX idx_financial_commitments_date_user ON public.financial_commitments(user_id, date);