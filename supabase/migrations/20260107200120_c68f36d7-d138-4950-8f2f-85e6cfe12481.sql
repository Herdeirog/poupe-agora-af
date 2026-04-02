-- Create commitment_reminders table for WhatsApp notifications
CREATE TABLE IF NOT EXISTS public.commitment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  timing TEXT NOT NULL DEFAULT 'same_day', -- 'same_day', '1_day_before', '3_days_before', 'custom'
  custom_days INTEGER, -- Used when timing = 'custom'
  recurrence_mode TEXT DEFAULT 'all_occurrences', -- 'all_occurrences', 'next_only'
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  next_alert_date DATE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(commitment_id, timing) -- Prevent duplicate reminders for same commitment/timing
);

-- Enable RLS
ALTER TABLE public.commitment_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own commitment reminders"
  ON public.commitment_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own reminders
CREATE POLICY "Users can create their own commitment reminders"
  ON public.commitment_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update their own commitment reminders"
  ON public.commitment_reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own commitment reminders"
  ON public.commitment_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all reminders (for edge function access with service key)
CREATE POLICY "Admins can view all commitment reminders"
  ON public.commitment_reminders
  FOR SELECT
  USING (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_commitment_reminders_updated_at
  BEFORE UPDATE ON public.commitment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_commitment_reminders_next_alert 
  ON public.commitment_reminders(next_alert_date, status) 
  WHERE status = 'active';

CREATE INDEX idx_commitment_reminders_user 
  ON public.commitment_reminders(user_id);

CREATE INDEX idx_commitment_reminders_commitment 
  ON public.commitment_reminders(commitment_id);