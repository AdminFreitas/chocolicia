import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { authors, images, tags, tipImages, tipTags, tipTopics, tips } from "../drizzle/schema";
import type { TipInput } from "../shared/tips";
import { getDb } from "./db";

export class TipPersistenceError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode: number) {
    super(message);
    this.name = "TipPersistenceError";
  }
}

async function existingByAgentKeys(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: TipInput) {
  const predicates = [];
  if (input.agentIdempotencyKey) predicates.push(eq(tips.agentIdempotencyKey, input.agentIdempotencyKey));
  if (input.agentTopicSlug) predicates.push(eq(tips.agentTopicSlug, input.agentTopicSlug));
  if (!predicates.length) return null;
  const rows = await db.select().from(tips).where(or(...predicates)).limit(2);
  if (rows.length > 1) {
    throw new TipPersistenceError("idempotency_conflict", "A chave e o tópico de idempotência apontam para dicas diferentes.", 409);
  }
  return rows[0] ?? null;
}

function validateExisting(existing: typeof tips.$inferSelect, input: TipInput) {
  if (input.agentRequestHash && existing.agentRequestHash && input.agentRequestHash !== existing.agentRequestHash) {
    throw new TipPersistenceError("idempotency_payload_conflict", "A chave de idempotência já foi usada com outro conteúdo.", 409);
  }
  return existing;
}

export async function createTipIdempotently(input: TipInput & { slug: string }) {
  const db = await getDb();
  if (!db) throw new TipPersistenceError("database_unavailable", "Banco de dados indisponível.", 503);

  const existing = await existingByAgentKeys(db, input);
  if (existing) return { tip: validateExisting(existing, input), created: false };

  const topicRows = await db.select({ id: tipTopics.id }).from(tipTopics)
    .where(and(eq(tipTopics.slug, input.topicSlug), eq(tipTopics.active, true))).limit(1);
  const topic = topicRows[0];
  if (!topic) throw new TipPersistenceError("topic_not_found", `Não existe tópico ativo com slug "${input.topicSlug}". Cadastre o tópico de referência antes de enviar a dica.`, 422);

  if (input.authorId != null) {
    const authorRows = await db.select({ id: authors.id }).from(authors)
      .where(and(eq(authors.id, input.authorId), eq(authors.active, true))).limit(1);
    if (!authorRows[0]) throw new TipPersistenceError("author_not_found", "O autor informado não existe ou está inativo.", 422);
  }

  const tagRows = input.tags.length
    ? await db.select({ id: tags.id, slug: tags.slug }).from(tags).where(inArray(tags.slug, input.tags))
    : [];
  const foundTagSlugs = new Set(tagRows.map((tag) => tag.slug));
  const missingTags = input.tags.filter((slug) => !foundTagSlugs.has(slug));
  if (missingTags.length) {
    throw new TipPersistenceError("tag_not_found", `Tags não cadastradas: ${missingTags.join(", ")}. Cadastre-as antes de enviar a dica.`, 422);
  }

  const imageIds = [...new Set(input.images.flatMap((image) => image.imageId ? [image.imageId] : []))];
  if (imageIds.length) {
    const foundImages = await db.select({ id: images.id }).from(images).where(inArray(images.id, imageIds));
    const foundIds = new Set(foundImages.map((image) => image.id));
    const missingIds = imageIds.filter((id) => !foundIds.has(id));
    if (missingIds.length) throw new TipPersistenceError("image_not_found", "Uma ou mais imagens não existem no catálogo de imagens.", 422);
  }

  const now = new Date();
  const publishedAt = input.status === "published" ? (input.publishedAt ?? now) : null;
  let result: typeof tips.$inferSelect;
  try {
    result = await db.transaction(async (tx) => {
    const [tip] = await tx.insert(tips).values({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: input.content,
      tipType: input.tipType,
      topicId: topic.id,
      authorId: input.authorId ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImageAlt: input.coverImageAlt ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      tags: input.tags,
      generationMeta: input.generationMeta,
      status: input.status,
      reviewStatus: input.reviewStatus,
      publishedAt,
      agentIdempotencyKey: input.agentIdempotencyKey ?? null,
      agentTopicSlug: input.agentTopicSlug ?? null,
      agentRequestHash: input.agentRequestHash ?? null,
      updatedAt: now,
    }).returning();

    if (input.images.length) {
      await tx.insert(tipImages).values(input.images.map((image) => ({
        tipId: tip.id,
        imageId: image.imageId ?? null,
        imageUrl: image.imageUrl ?? null,
        altText: image.altText ?? null,
        caption: image.caption ?? null,
        imageRole: image.imageRole,
        sortOrder: image.sortOrder,
      })));
    }
    if (tagRows.length) {
      await tx.insert(tipTags).values(tagRows.map((tag) => ({ tipId: tip.id, tagId: tag.id })));
    }
    return tip;
    });
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      const raced = await existingByAgentKeys(db, input);
      if (raced) return { tip: validateExisting(raced, input), created: false };
    }
    throw error;
  }
  return { tip: result, created: true };
}

export async function listPublishedTips(limit = 20) {
  const db = await getDb();
  if (!db) throw new TipPersistenceError("database_unavailable", "Banco de dados indisponível.", 503);
  return db.select({
    tip: tips,
    topicName: tipTopics.name,
    topicSlug: tipTopics.slug,
  }).from(tips)
    .leftJoin(tipTopics, eq(tips.topicId, tipTopics.id))
    .where(and(eq(tips.status, "published"), isNotNull(tips.publishedAt)))
    .orderBy(desc(tips.publishedAt), desc(tips.id))
    .limit(Math.min(Math.max(limit, 1), 50));
}

export async function getPublishedTipBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new TipPersistenceError("database_unavailable", "Banco de dados indisponível.", 503);
  const rows = await db.select({
    tip: tips,
    topicName: tipTopics.name,
    topicSlug: tipTopics.slug,
  }).from(tips)
    .leftJoin(tipTopics, eq(tips.topicId, tipTopics.id))
    .where(and(eq(tips.slug, slug), eq(tips.status, "published"), isNotNull(tips.publishedAt)))
    .limit(1);
  return rows[0] ?? null;
}
