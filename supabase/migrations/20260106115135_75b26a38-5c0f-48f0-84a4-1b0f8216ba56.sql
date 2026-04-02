-- =============================================
-- MIGRATION: Queue Robustness Infrastructure
-- =============================================

-- 1) TABLE: inbound_messages (idempotency and audit)
CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  remote_jid text NOT NULL,
  message_id text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  media_base64 text,
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  UNIQUE(channel, remote_jid, message_id)
);

-- 2) TABLE: processing_locks (prevent concurrent processing per user)
CREATE TABLE IF NOT EXISTS public.processing_locks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) TABLE: message_queue (job queue with retry)
CREATE TABLE IF NOT EXISTS public.message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inbound_message_id uuid NOT NULL REFERENCES public.inbound_messages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inbound_message_id)
);

-- =============================================
-- INDICES
-- =============================================

-- inbound_messages indices
CREATE INDEX IF NOT EXISTS idx_inbound_messages_user_received 
  ON public.inbound_messages(user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_messages_processed 
  ON public.inbound_messages(processed, received_at);

-- message_queue indices
CREATE INDEX IF NOT EXISTS idx_message_queue_status_next_run 
  ON public.message_queue(status, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_message_queue_user_created 
  ON public.message_queue(user_id, created_at DESC);

-- processing_locks index
CREATE INDEX IF NOT EXISTS idx_processing_locks_until 
  ON public.processing_locks(locked_until);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- inbound_messages: admin read-only
CREATE POLICY "Admins can view inbound_messages"
  ON public.inbound_messages FOR SELECT
  USING (is_admin());

-- processing_locks: admin read-only
CREATE POLICY "Admins can view processing_locks"
  ON public.processing_locks FOR SELECT
  USING (is_admin());

-- message_queue: admin read-only
CREATE POLICY "Admins can view message_queue"
  ON public.message_queue FOR SELECT
  USING (is_admin());

-- =============================================
-- TRIGGER: Update updated_at on message_queue
-- =============================================

CREATE TRIGGER update_message_queue_updated_at
  BEFORE UPDATE ON public.message_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();