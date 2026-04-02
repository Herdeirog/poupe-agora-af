-- Add response_content column to agent_runs for proper deduplication caching
ALTER TABLE agent_runs 
ADD COLUMN IF NOT EXISTS response_content TEXT;

COMMENT ON COLUMN agent_runs.response_content IS 'Cached response content for deduplication';