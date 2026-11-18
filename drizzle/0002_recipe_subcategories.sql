ALTER TABLE "recipes" ADD COLUMN "subcategory" varchar(120);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "subcategory_slug" varchar(120);
--> statement-breakpoint
CREATE INDEX "recipes_subcategory_slug_idx" ON "recipes" USING btree ("subcategory_slug");
