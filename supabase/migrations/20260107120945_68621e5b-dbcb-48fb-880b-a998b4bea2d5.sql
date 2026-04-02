-- Reset pending messages in queue to be reprocessed
UPDATE message_queue 
SET status = 'queued', 
    last_error = NULL, 
    attempts = 0,
    next_run_at = NOW()
WHERE status IN ('queued', 'failed');

-- Mark corresponding inbound messages as unprocessed
UPDATE inbound_messages 
SET processed = false, 
    processed_at = NULL
WHERE id IN (
  SELECT inbound_message_id 
  FROM message_queue 
  WHERE status = 'queued'
);