-- =====================================================================
-- SCRIPT DE CORREÇÃO PARA CRIAÇÃO DE USUÁRIOS
-- =====================================================================
-- Execute no SQL Editor do Supabase para corrigir o erro:
-- "Database error creating new user"
--
-- Atualizado em: 2026-04-04
-- =====================================================================

-- 1. Garantir que a tabela PROFILES tenha as colunas necessárias
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- 2. Redefinir a função de Trigger (alinhada com BACKUP_SQL.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin, ativo)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil automaticamente: %', SQLERRM;
    RETURN new;
END;
$$;

-- 3. Garantir que a Trigger está conectada corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Permissões
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

-- Storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
