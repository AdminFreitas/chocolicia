-- Manual, read-before-apply alignment for the existing Neon Preview branch.
-- This script was NOT executed by this GitHub change.
-- Preview was observed to have tips rows = 0 at the time of the read-only audit.

BEGIN;

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS agent_idempotency_key varchar(128),
  ADD COLUMN IF NOT EXISTS agent_topic_slug varchar(180),
  ADD COLUMN IF NOT EXISTS agent_request_hash varchar(64);

-- Preserve legacy values when present; never overwrite a value already in a column.
UPDATE public.tips
SET
  agent_idempotency_key = COALESCE(
    agent_idempotency_key,
    generation_meta ->> 'agent_idempotency_key'
  ),
  agent_topic_slug = COALESCE(
    agent_topic_slug,
    generation_meta ->> 'agent_topic_slug'
  ),
  agent_request_hash = COALESCE(
    agent_request_hash,
    generation_meta ->> 'agent_request_hash'
  )
WHERE generation_meta IS NOT NULL;

-- These names were previously attached to JSONB expressions in Preview.
DROP INDEX IF EXISTS public.tips_agent_idempotency_key_uidx;
DROP INDEX IF EXISTS public.tips_agent_topic_slug_uidx;

CREATE UNIQUE INDEX tips_agent_idempotency_key_uidx
  ON public.tips (agent_idempotency_key);

CREATE UNIQUE INDEX tips_agent_topic_slug_uidx
  ON public.tips (agent_topic_slug);

CREATE INDEX IF NOT EXISTS tips_review_status_idx
  ON public.tips (review_status);

COMMIT;
