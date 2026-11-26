-- Add the physical recipe idempotency columns used by server/recipeDb.ts.
-- Safe to rerun when columns or the expected index already exist; preserves rows.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS agent_topic_slug varchar,
  ADD COLUMN IF NOT EXISTS agent_idempotency_key varchar,
  ADD COLUMN IF NOT EXISTS agent_request_hash varchar;

UPDATE public.recipes
SET
  agent_topic_slug = COALESCE(agent_topic_slug, generation_meta ->> 'agent_topic_slug'),
  agent_idempotency_key = COALESCE(agent_idempotency_key, generation_meta ->> 'agent_idempotency_key'),
  agent_request_hash = COALESCE(agent_request_hash, generation_meta ->> 'agent_request_hash')
WHERE generation_meta IS NOT NULL;

DO $migration$
DECLARE
  existing_definition text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.recipes
    WHERE agent_idempotency_key IS NOT NULL
    GROUP BY agent_idempotency_key HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'recipes contains duplicate agent_idempotency_key values; reconcile duplicates before creating the unique index';
  END IF;

  SELECT indexdef INTO existing_definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'recipes_agent_idempotency_key_uidx';
  IF existing_definition IS NOT NULL
     AND (existing_definition NOT ILIKE '%CREATE UNIQUE INDEX%'
       OR existing_definition NOT ILIKE '%(agent_idempotency_key)%') THEN
    EXECUTE 'DROP INDEX public.recipes_agent_idempotency_key_uidx';
  END IF;
END $migration$;

-- A publication/pauta slug is metadata, not a request idempotency key.
DROP INDEX IF EXISTS public.recipes_agent_topic_slug_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_agent_idempotency_key_uidx
  ON public.recipes (agent_idempotency_key);
