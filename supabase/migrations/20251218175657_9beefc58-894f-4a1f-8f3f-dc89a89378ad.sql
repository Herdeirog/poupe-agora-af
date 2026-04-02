-- Create commitment_reminders table
CREATE TABLE public.commitment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  commitment_id UUID NOT NULL REFERENCES public.financial_commitments(id) ON DELETE CASCADE,
  timing TEXT NOT NULL DEFAULT 'same_day',
  custom_days INTEGER,
  recurrence_mode TEXT DEFAULT 'all_occurrences',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'active',
  next_alert_date DATE NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.commitment_reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own reminders
CREATE POLICY "Users manage own commitment reminders"
  ON public.commitment_reminders
  FOR ALL
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_commitment_reminders_user_id ON public.commitment_reminders(user_id);
CREATE INDEX idx_commitment_reminders_commitment_id ON public.commitment_reminders(commitment_id);
CREATE INDEX idx_commitment_reminders_next_alert ON public.commitment_reminders(next_alert_date, status);

-- Create trigger for updated_at
CREATE TRIGGER update_commitment_reminders_updated_at
  BEFORE UPDATE ON public.commitment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_timestamp();