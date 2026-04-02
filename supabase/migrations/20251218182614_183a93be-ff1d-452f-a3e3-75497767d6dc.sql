-- Adicionar colunas de controle admin na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agenda_blocked BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminders_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_disabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Adicionar colunas de limites na tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS agenda_enabled BOOLEAN DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_installments INTEGER DEFAULT 3;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;