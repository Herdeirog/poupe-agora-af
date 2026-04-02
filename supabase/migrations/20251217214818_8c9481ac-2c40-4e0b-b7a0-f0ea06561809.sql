-- Corrigir função update_subscription_timestamp com search_path
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;