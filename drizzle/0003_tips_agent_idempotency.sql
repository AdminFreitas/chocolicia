-- Align tips agent idempotency fields with the physical API contract.
-- Preserve every row; fail before backfill if legacy keys conflict or exceed limits.

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS agent_idempotency_key varchar(128),
  ADD COLUMN IF NOT EXISTS agent_topic_slug varchar(180),
  ADD COLUMN IF NOT EXISTS agent_request_hash varchar(64);
--> statement-breakpoint
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tips
    GROUP BY COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key')
    HAVING COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key') IS NOT NULL
       AND COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'tips contains duplicate agent idempotency keys; no rows were backfilled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tips
    WHERE length(COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key')) > 128
       OR length(COALESCE(agent_topic_slug, generation_meta ->> 'agent_topic_slug')) > 180
       OR length(COALESCE(agent_request_hash, generation_meta ->> 'agent_request_hash')) > 64
  ) THEN
    RAISE EXCEPTION 'tips contains agent metadata longer than the API contract; no rows were backfilled';
  END IF;
END $migration$;
--> statement-breakpoint
UPDATE public.tips
SET
  agent_idempotency_key = COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key'),
  agent_topic_slug = COALESCE(agent_topic_slug, generation_meta ->> 'agent_topic_slug'),
  agent_request_hash = COALESCE(agent_request_hash, generation_meta ->> 'agent_request_hash')
WHERE generation_meta IS NOT NULL;
--> statement-breakpoint
ALTER TABLE public.tips
  ALTER COLUMN agent_idempotency_key TYPE varchar(128),
  ALTER COLUMN agent_topic_slug TYPE varchar(180),
  ALTER COLUMN agent_request_hash TYPE varchar(64);
--> statement-breakpoint
DROP INDEX IF EXISTS public.tips_agent_idempotency_key_uidx;
--> statement-breakpoint
DROP INDEX IF EXISTS public.tips_agent_topic_slug_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX tips_agent_idempotency_key_uidx
  ON public.tips (agent_idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tips_review_status_idx
  ON public.tips (review_status);
