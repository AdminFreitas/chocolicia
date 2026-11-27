# Neon / Drizzle schema alignment

## Scope

This change is limited to the Chocolícia website repository. It does not access or modify Neon, deploy the site, or change the Python agent repository.

## Source of truth

The Drizzle definitions in `drizzle/schema.ts` were aligned to the Production table/column/index inventory supplied and verified in the database audit. The schema includes the existing recipes, tips, topic, author, tag, image, tip-image and tip-tag tables. The removed `articles`, `article_images` and `article_tags` entities are intentionally not defined here.

## Preview discrepancy

The read-only audit found that Preview still stores the two tips idempotency indexes as JSONB expression indexes and lacks the three physical idempotency columns and the `tips_review_status_idx` index.

The migration `drizzle/0003_tips_agent_idempotency.sql` is the narrowly scoped reconciliation for tips. It:

1. Adds the three physical columns if absent.
2. Copies legacy values from `generation_meta` without overwriting existing column values.
3. Replaces the legacy JSONB idempotency index with a unique index on physical `agent_idempotency_key`. `agent_topic_slug` is not globally unique; its former unique index is removed.
4. Adds the review-status index.

**No migration was executed against Neon by this work.** The migration uses `ADD COLUMN IF NOT EXISTS`, checks whether the idempotency index still points to a JSONB expression, and replaces it when necessary. It preserves table rows. Before running it in any environment, verify the connection target and check for duplicate legacy idempotency keys.

## Reference data

Production's `tip_topics` was reported empty; Preview has six rows. No topic seed was added because topic names/slugs must be taken from the existing Preview data and approved for Production, not guessed. `authors`, `tags`, `images`, `tip_images` and `tip_tags` are structurally represented; empty tables are not seeded by this change.

## Remaining integration work

- Review the Drizzle schema against the current full PostgreSQL catalog and run the repository's type-check/build/CI.
- Reconcile the existing open content/API PRs before merging: some still reference the removed `articles` tables or an alternate editorial schema.
- Apply migration `0003_tips_agent_idempotency` to Preview through the repository migration process only after verifying the target branch; then verify columns/index definitions read-only.
- Populate approved topic reference data in Production through a separately reviewed data operation.
- Update the Python agent/API contract in a separate task. This PR does not claim end-to-end generation or publication is working.

## Recipe idempotency columns

Drizzle also defines the three recipe agent idempotency fields. Migration `0004_recipes_agent_idempotency.sql` adds them to the existing `recipes` table, backfills from `generation_meta` without overwriting physical values, checks for duplicate non-null keys, and creates unique indexes. It has not been executed against Neon. Production and Preview must be inspected separately before applying it.

## Tip publication visibility

Public tips queries require `status = published`, `review_status = approved`, and non-null `published_at`. Pending and rejected tips are excluded.
