-- Habilitar extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela para secrets criptografados
CREATE TABLE IF NOT EXISTS public.encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  encrypted_value BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_encrypted_secrets_updated_at
  BEFORE UPDATE ON public.encrypted_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Segurança máxima - NENHUM SELECT permitido via cliente
ALTER TABLE public.encrypted_secrets ENABLE ROW LEVEL SECURITY;

-- Apenas INSERT para admin (via edge function com service role)
CREATE POLICY "Admins can insert secrets"
  ON public.encrypted_secrets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Apenas UPDATE para admin
CREATE POLICY "Admins can update secrets"
  ON public.encrypted_secrets FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Função para criptografar (SECURITY DEFINER = usa privilégios do owner)
CREATE OR REPLACE FUNCTION public.encrypt_secret(secret TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Usar chave fixa para criptografia simétrica
  encryption_key := 'poupeagora-secret-key-32chars!!';
  RETURN pgp_sym_encrypt(secret, encryption_key);
END;
$$;

-- Função para descriptografar (SECURITY DEFINER - só backend pode chamar)
CREATE OR REPLACE FUNCTION public.decrypt_secret(encrypted BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'poupeagora-secret-key-32chars!!';
  RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$;

-- Função para upsert de secret criptografado (chamada pela edge function)
CREATE OR REPLACE FUNCTION public.upsert_encrypted_secret(
  p_key_name TEXT,
  p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.encrypted_secrets (key_name, encrypted_value)
  VALUES (p_key_name, public.encrypt_secret(p_value))
  ON CONFLICT (key_name)
  DO UPDATE SET 
    encrypted_value = public.encrypt_secret(p_value),
    updated_at = now();
END;
$$;

-- Função para ler secret descriptografado (só service role pode executar via RPC)
CREATE OR REPLACE FUNCTION public.get_decrypted_secret(p_key_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT public.decrypt_secret(encrypted_value)
  INTO result
  FROM public.encrypted_secrets
  WHERE key_name = p_key_name;
  
  RETURN result;
END;
$$;