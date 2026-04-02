
-- =====================================================
-- SECURITY HARDENING: Restrict Anonymous Access
-- =====================================================
-- This migration revokes overly broad anon grants that were
-- previously set by fix_user_creation.sql and re-establishes
-- proper least-privilege access.

-- Step 1: Revoke ALL from anon on sensitive system tables
REVOKE ALL ON public.inbound_messages FROM anon;
REVOKE ALL ON public.message_queue FROM anon;
REVOKE ALL ON public.conversation_buffer FROM anon;
REVOKE ALL ON public.processing_locks FROM anon;
REVOKE ALL ON public.agent_runs FROM anon;
REVOKE ALL ON public.encrypted_secrets FROM anon;
REVOKE ALL ON public.integration_evolution FROM anon;

-- Step 2: Revoke ALL from anon on user data tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE ALL ON public.transactions FROM anon;
REVOKE ALL ON public.goals FROM anon;
REVOKE ALL ON public.budgets FROM anon;
REVOKE ALL ON public.categories FROM anon;
REVOKE ALL ON public.reminders FROM anon;
REVOKE ALL ON public.financial_commitments FROM anon;
REVOKE ALL ON public.recurring_payments FROM anon;
REVOKE ALL ON public.commitment_reminders FROM anon;
REVOKE ALL ON public.agenda_events FROM anon;
REVOKE ALL ON public.agenda_recurrences FROM anon;

-- Step 3: Re-grant minimal anon access where needed
-- agents: has "Public read active agents" RLS policy
GRANT SELECT ON public.agents TO anon;
-- categories: system/default categories may be needed before login
GRANT SELECT ON public.categories TO anon;

-- Step 4: Ensure authenticated role has proper grants
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
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.agents TO authenticated;
