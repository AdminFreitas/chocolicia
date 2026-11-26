-- Idempotent alignment for tips idempotency fields.
-- topicSlug/topic_id remains the category; agentTopicSlug is publication metadata.
-- No table recreation and no row deletion.

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS agent_idempotency_key varchar(128),
  ADD COLUMN IF NOT EXISTS agent_topic_slug varchar(180),
  ADD COLUMN IF NOT EXISTS agent_request_hash varchar(64);

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
  IF EXISTS (
    SELECT 1 FROM public.tips
    WHERE agent_idempotency_key IS NOT NULL
    GROUP BY agent_idempotency_key HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tips contains duplicate agent_idempotency_key values; reconcile duplicates before creating the unique index';
  END IF;

  SELECT indexdef INTO existing_definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'tips_agent_idempotency_key_uidx';
  IF existing_definition IS NOT NULL
     AND (existing_definition NOT ILIKE '%CREATE UNIQUE INDEX%'
       OR existing_definition NOT ILIKE '%(agent_idempotency_key)%') THEN
    EXECUTE 'DROP INDEX public.tips_agent_idempotency_key_uidx';
  END IF;
END $migration$;

-- This key is not globally unique; remove the former unique index if present.
DROP INDEX IF EXISTS public.tips_agent_topic_slug_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS tips_agent_idempotency_key_uidx
  ON public.tips (agent_idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tips_review_status_idx
  ON public.tips (review_status);
