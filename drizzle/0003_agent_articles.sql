CREATE TYPE "public"."article_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(180) NOT NULL,
  "type" varchar(24) NOT NULL,
  "title" varchar(180) NOT NULL,
  "excerpt" varchar(160) NOT NULL,
  "body_md" text NOT NULL,
  "tip_topic" varchar(60),
  "subcategory_slug" varchar(120),
  "cover_image_url" text NOT NULL,
  "cover_image_alt" varchar(240) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "article_status" DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "generation_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_uidx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "articles" USING btree ("status", "published_at" DESC NULLS LAST);
