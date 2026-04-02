-- Create global_settings table for system-wide configurations
CREATE TABLE public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global_settings
CREATE POLICY "Anyone can view global settings"
  ON public.global_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage global settings"
  ON public.global_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currency setting
INSERT INTO public.global_settings (key, value, description) VALUES
('display_currency', '"BRL"', 'Moeda de exibição global do sistema');

-- Create currency_rates table
CREATE TABLE public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'BRL',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  source text DEFAULT 'manual',
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for currency_rates
CREATE POLICY "Anyone can view currency rates"
  ON public.currency_rates
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage currency rates"
  ON public.currency_rates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_currency_rates_updated_at
  BEFORE UPDATE ON public.currency_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial exchange rates (approximate values)
INSERT INTO public.currency_rates (base_currency, target_currency, rate) VALUES
('BRL', 'BRL', 1.0),
('BRL', 'USD', 0.17),
('BRL', 'EUR', 0.16),
('BRL', 'AOA', 148.50),
('BRL', 'MZN', 10.80);

-- Create indexes for better performance
CREATE INDEX idx_global_settings_key ON public.global_settings(key);
CREATE INDEX idx_currency_rates_currencies ON public.currency_rates(base_currency, target_currency);