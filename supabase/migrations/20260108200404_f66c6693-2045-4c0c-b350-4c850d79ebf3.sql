-- Função RPC para deletar todos os dados de um usuário
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Obter ID do usuário autenticado
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Deletar dados de todas as tabelas relacionadas ao usuário
  DELETE FROM commitment_reminders WHERE user_id = current_user_id;
  DELETE FROM recurring_payments WHERE user_id = current_user_id;
  DELETE FROM financial_commitments WHERE user_id = current_user_id;
  DELETE FROM transactions WHERE user_id = current_user_id;
  DELETE FROM goals WHERE user_id = current_user_id;
  DELETE FROM reminders WHERE user_id = current_user_id;
  DELETE FROM budgets WHERE user_id = current_user_id;
  DELETE FROM categories WHERE user_id = current_user_id;
  DELETE FROM subscriptions WHERE user_id = current_user_id;
  DELETE FROM conversation_buffer WHERE user_id = current_user_id;
  DELETE FROM inbound_messages WHERE user_id = current_user_id;
  DELETE FROM message_queue WHERE user_id = current_user_id;
  DELETE FROM agent_runs WHERE user_id = current_user_id;
  DELETE FROM processing_locks WHERE user_id = current_user_id;
  DELETE FROM user_roles WHERE user_id = current_user_id;
  DELETE FROM profiles WHERE id = current_user_id;
  
  -- Nota: O usuário auth.users será deletado via admin API na edge function
END;
$$;