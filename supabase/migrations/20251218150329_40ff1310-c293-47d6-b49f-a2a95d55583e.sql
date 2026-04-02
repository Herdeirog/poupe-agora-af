-- Create user_reminders table for financial reminders
CREATE TABLE public.user_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Enable Row Level Security
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: users manage own reminders
CREATE POLICY "Users manage own reminders"
ON public.user_reminders FOR ALL
USING (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_user_reminders_user_id ON public.user_reminders(user_id);
CREATE INDEX idx_user_reminders_status ON public.user_reminders(status);
CREATE INDEX idx_user_reminders_date ON public.user_reminders(date);

-- Create trigger for updated_at
CREATE TRIGGER update_user_reminders_updated_at
  BEFORE UPDATE ON public.user_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_timestamp();