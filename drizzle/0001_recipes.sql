CREATE TYPE "public"."recipe_status" AS ENUM('draft', 'published', 'failed');--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(180) NOT NULL,
	"excerpt" varchar(160) NOT NULL,
	"category" varchar(80) NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"cover_image_url" text NOT NULL,
	"cover_image_alt" varchar(240) NOT NULL,
	"image_prompt" text DEFAULT '' NOT NULL,
	"cover_image_variants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storage_notes" text DEFAULT '' NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prep_time_min" integer NOT NULL,
	"cook_time_min" integer DEFAULT 0 NOT NULL,
	"servings" integer NOT NULL,
	"difficulty" varchar(24) NOT NULL,
	"status" "recipe_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"ai_model" varchar(120),
	"generation_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_slug_uidx" ON "recipes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "recipes_status_published_at_idx" ON "recipes" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recipes_category_idx" ON "recipes" USING btree ("category");