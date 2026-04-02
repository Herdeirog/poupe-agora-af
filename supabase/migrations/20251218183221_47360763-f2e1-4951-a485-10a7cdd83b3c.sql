-- Create admin action history table
CREATE TABLE public.admin_action_history (
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

-- Enable RLS
ALTER TABLE public.admin_action_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view and insert
CREATE POLICY "Admins can view action history"
  ON public.admin_action_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert action history"
  ON public.admin_action_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));