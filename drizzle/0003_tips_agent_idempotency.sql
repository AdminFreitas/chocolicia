-- Idempotent schema alignment for the existing tips table.
-- No table recreation and no row deletion. Safe when columns/indexes already exist.

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS agent_idempotency_key varchar,
  ADD COLUMN IF NOT EXISTS agent_topic_slug varchar,
  ADD COLUMN IF NOT EXISTS agent_request_hash varchar;

UPDATE public.tips
SET
  agent_idempotency_key = COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key'),
  agent_topic_slug = COALESCE(agent_topic_slug, generation_meta ->> 'agent_topic_slug'),
  agent_request_hash = COALESCE(agent_request_hash, generation_meta ->> 'agent_request_hash')
WHERE generation_meta IS NOT NULL;

DO $migration$
DECLARE
  existing_definition text;
BEGIN
  SELECT indexdef INTO existing_definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'tips_agent_idempotency_key_uidx';
  IF existing_definition IS NOT NULL
     AND existing_definition NOT LIKE '%(agent_idempotency_key)%' THEN
    EXECUTE 'DROP INDEX public.tips_agent_idempotency_key_uidx';
  END IF;

  SELECT indexdef INTO existing_definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'tips_agent_topic_slug_uidx';
  IF existing_definition IS NOT NULL
     AND existing_definition NOT LIKE '%(agent_topic_slug)%' THEN
    EXECUTE 'DROP INDEX public.tips_agent_topic_slug_uidx';
  END IF;
END $migration$;

CREATE UNIQUE INDEX IF NOT EXISTS tips_agent_idempotency_key_uidx
  ON public.tips (agent_idempotency_key);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tips_agent_topic_slug_uidx
  ON public.tips (agent_topic_slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tips_review_status_idx
  ON public.tips (review_status);
