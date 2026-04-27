-- Adiciona coluna preferences na tabela profiles para armazenar preferências do usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Insere configuração padrão de trial no global_settings
INSERT INTO public.global_settings (key, value, description)
VALUES (
  'trial_settings',
  '{"enabled": true, "days": 7}'::jsonb,
  'Configurações do período de trial para novos usuários'
)
ON CONFLICT (key) DO NOTHING;
