-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create goal_reminders table for weekly reminders
CREATE TABLE public.goal_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  day_of_week integer NOT NULL DEFAULT 1,
  time_of_day time NOT NULL DEFAULT '09:00',
  status text NOT NULL DEFAULT 'active',
  next_alert_date date,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users manage own goal reminders" ON public.goal_reminders
  FOR ALL USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_goal_reminders_next_alert ON public.goal_reminders(next_alert_date) WHERE status = 'active';
CREATE INDEX idx_goal_reminders_goal ON public.goal_reminders(goal_id);

-- Create trigger for updated_at
CREATE TRIGGER update_goal_reminders_updated_at
  BEFORE UPDATE ON public.goal_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();