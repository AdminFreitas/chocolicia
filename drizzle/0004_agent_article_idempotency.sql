-- Serialize concurrent agent article submissions by their idempotency key and topic.
-- NULL JSON fields remain unconstrained for articles created outside the agent.
CREATE UNIQUE INDEX IF NOT EXISTS "articles_agent_idempotency_key_uidx"
  ON "articles" USING btree (("generation_meta" ->> 'agent_idempotency_key'));

CREATE UNIQUE INDEX IF NOT EXISTS "articles_agent_topic_slug_uidx"
  ON "articles" USING btree (("generation_meta" ->> 'agent_topic_slug'));
