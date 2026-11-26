import { z } from "zod";

const slugSchema = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const tipImageInputSchema = z.object({
  imageId: z.string().uuid().optional(),
  imageUrl: z.string().url().max(2048).optional(),
  altText: z.string().trim().max(240).optional(),
  caption: z.string().trim().max(1000).optional(),
  imageRole: z.enum(["cover", "inline"]).default("inline"),
  sortOrder: z.number().int().min(0).max(100).default(0),
}).refine((image) => Boolean(image.imageId || image.imageUrl), {
  message: "Informe imageId ou imageUrl para cada imagem.",
});

const tipInputBaseSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(5).max(180),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(30).max(50000),
  tipType: z.string().trim().min(1).max(32).default("dica"),
  topicSlug: slugSchema,
  authorId: z.number().int().positive().optional().nullable(),
  coverImageUrl: z.string().url().max(2048).optional().nullable(),
  coverImageAlt: z.string().trim().max(240).optional().nullable(),
  metaTitle: z.string().trim().max(180).optional().nullable(),
  metaDescription: z.string().trim().max(320).optional().nullable(),
  canonicalUrl: z.string().url().max(2048).optional().nullable(),
  tags: z.array(slugSchema).max(30).default([]),
  images: z.array(tipImageInputSchema).max(30).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  reviewStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
  publishedAt: z.coerce.date().optional().nullable(),
  generationMeta: z.record(z.string(), z.unknown()).default({}),
  agentIdempotencyKey: z.string().trim().min(8).max(128).optional(),
  agentTopicSlug: slugSchema.optional(),
  agentRequestHash: z.string().trim().min(16).max(64).optional(),
});

export const tipInputSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = { ...(value as Record<string, unknown>) };
  const aliases: Array<[string, string]> = [
    ["agent_idempotency_key", "agentIdempotencyKey"],
    ["agent_topic_slug", "agentTopicSlug"],
    ["agent_request_hash", "agentRequestHash"],
    ["topic_slug", "topicSlug"],
    ["review_status", "reviewStatus"],
    ["tip_type", "tipType"],
    ["generation_meta", "generationMeta"],
    ["published_at", "publishedAt"],
    ["author_id", "authorId"],
    ["cover_image_url", "coverImageUrl"],
    ["cover_image_alt", "coverImageAlt"],
    ["meta_title", "metaTitle"],
    ["meta_description", "metaDescription"],
    ["canonical_url", "canonicalUrl"],
  ];
  for (const [snake, camel] of aliases) {
    if (input[camel] === undefined && input[snake] !== undefined) input[camel] = input[snake];
    delete input[snake];
  }
  return input;
}, tipInputBaseSchema).refine((input) => Boolean(input.agentIdempotencyKey || input.agentTopicSlug), {
  message: "Informe agentIdempotencyKey ou agentTopicSlug para garantir idempotência.",
  path: ["agentIdempotencyKey"],
});

export type TipInput = z.infer<typeof tipInputSchema>;
