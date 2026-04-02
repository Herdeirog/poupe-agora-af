-- Phase 1: Enable Realtime for transactions table

-- 1.1) Set REPLICA IDENTITY FULL for complete row data in UPDATE/DELETE events
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- 1.2) Add transactions table to supabase_realtime publication
-- Using idempotent approach with exception handling
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
END $$;