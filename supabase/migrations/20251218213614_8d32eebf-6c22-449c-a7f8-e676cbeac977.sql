
-- ========================================
-- ADICIONAR FOREIGN KEYS COM ON DELETE CASCADE
-- Para garantir integridade referencial e evitar dados órfãos
-- ========================================

-- 1. FINANCIAL_COMMITMENTS -> AUTH.USERS
ALTER TABLE public.financial_commitments
ADD CONSTRAINT financial_commitments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. COMMITMENT_REMINDERS -> AUTH.USERS
ALTER TABLE public.commitment_reminders
ADD CONSTRAINT commitment_reminders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. RECURRING_PAYMENTS -> AUTH.USERS
ALTER TABLE public.recurring_payments
ADD CONSTRAINT recurring_payments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. USER_REMINDERS -> AUTH.USERS
ALTER TABLE public.user_reminders
ADD CONSTRAINT user_reminders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 5. ADMIN_ACTION_HISTORY -> PROFILES (admin_id)
-- Primeiro permitir NULL para preservar histórico se admin for removido
ALTER TABLE public.admin_action_history
ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE public.admin_action_history
ADD CONSTRAINT admin_action_history_admin_id_fkey
FOREIGN KEY (admin_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 6. ADMIN_ACTION_HISTORY -> PROFILES (target_user_id)
ALTER TABLE public.admin_action_history
ADD CONSTRAINT admin_action_history_target_user_id_fkey
FOREIGN KEY (target_user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;
