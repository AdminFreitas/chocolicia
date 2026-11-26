# Neon / Drizzle schema alignment

## Scope

This change is limited to the Chocolícia website repository. It does not access or modify Neon, deploy the site, or change the Python agent repository.

## Source of truth

The Drizzle definitions in `drizzle/schema.ts` were aligned to the Production table/column/index inventory supplied and verified in the database audit. The schema includes the existing recipes, tips, topic, author, tag, image, tip-image and tip-tag tables. The removed `articles`, `article_images` and `article_tags` entities are intentionally not defined here.

## Preview discrepancy

The read-only audit found that Preview still stores the two tips idempotency indexes as JSONB expression indexes and lacks the three physical idempotency columns and the `tips_review_status_idx` index.

The manual SQL at `drizzle/manual/preview-sync-tips-idempotency.sql` is the narrowly scoped reconciliation for that existing Preview schema. It:

1. Adds the three physical columns if absent.
2. Copies legacy values from `generation_meta` without overwriting existing column values.
3. Replaces the two legacy JSONB indexes with unique indexes on the physical columns.
4. Adds the review-status index.

**This SQL has not been executed.** Apply it only to the identified Preview branch after verifying the connection target and checking for duplicate legacy keys. Do not use it as an automatic Production deployment migration.

## Reference data

Production's `tip_topics` was reported empty; Preview has six rows. No topic seed was added because topic names/slugs must be taken from the existing Preview data and approved for Production, not guessed. `authors`, `tags`, `images`, `tip_images` and `tip_tags` are structurally represented; empty tables are not seeded by this change.

## Remaining integration work

- Review the Drizzle schema against the current full PostgreSQL catalog and run the repository's type-check/build/CI.
- Reconcile the existing open content/API PRs before merging: some still reference the removed `articles` tables or an alternate editorial schema.
- Apply the Preview-only SQL manually and verify columns/index definitions read-only.
- Populate approved topic reference data in Production through a separately reviewed data operation.
- Update the Python agent/API contract in a separate task. This PR does not claim end-to-end generation or publication is working.
