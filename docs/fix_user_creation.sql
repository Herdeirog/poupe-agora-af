-- SCRIPT DE CORREÇÃO PARA CRIAÇÃO DE USUÁRIOS
-- Execute este script no SQL Editor do Supabase para corrigir o erro "Database error creating new user"

-- 1. Garantir que a tabela ROLES tenha os tipos básicos
INSERT INTO public.roles (name) VALUES ('admin'), ('client') 
ON CONFLICT (name) DO NOTHING;

-- 2. Garantir que a tabela PROFILES tenha as colunas necessárias
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id);

-- 3. Redefinir a função de Trigger com tratamento de erros robusto e caminho seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Importante para evitar conflitos de schema
AS $$
DECLARE
  v_role_id uuid;
  v_name text;
  v_tipo text;
BEGIN
  -- Buscar ID da role 'client'
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'client' LIMIT 1;
  
  -- Definir nome (fallback para email se não houver metadados)
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.email
  );

  -- Definir tipo (baseado no metadado ou padrão 'cliente')
  v_tipo := coalesce(
    new.raw_user_meta_data->>'tipo',
    'cliente'
  );

  -- Inserir perfil
  INSERT INTO public.profiles (id, full_name, role_id, email, tipo)
  VALUES (
    new.id, 
    v_name, 
    v_role_id, 
    new.email,
    v_tipo
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Logar erro mas permitir criação do usuário (evita bloqueio total, perfil pode ser criado depois)
    RAISE WARNING 'Erro ao criar perfil automaticamente: %', SQLERRM;
    RETURN new;
END;
$$;

-- 4. Garantir que a Trigger está conectada corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Permissões básicas (caso RLS ou permissões estejam bloqueando)
-- Atualizado em: 2026-04-04 - Grants granulares em vez de ALL para anon
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;

-- Acesso mínimo ao anon
GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.global_settings TO anon;

-- Acesso ao authenticated (controlado por RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_commitments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitment_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_recurrences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;

-- Storage GRANTs
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
