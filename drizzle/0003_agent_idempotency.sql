ALTER TABLE "public"."recipes" ADD COLUMN IF NOT EXISTS "agent_topic_slug" varchar(180);
--> statement-breakpoint
ALTER TABLE "public"."recipes" ADD COLUMN IF NOT EXISTS "agent_idempotency_key" varchar(128);
--> statement-breakpoint
ALTER TABLE "public"."recipes" ADD COLUMN IF NOT EXISTS "agent_request_hash" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_agent_topic_slug_uidx" ON "public"."recipes" USING btree ("agent_topic_slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_agent_idempotency_key_uidx" ON "public"."recipes" USING btree ("agent_idempotency_key");
