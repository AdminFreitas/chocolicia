import { z } from "zod";

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(value => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "O URL deve usar HTTP ou HTTPS.");

const articleImageInputSchema = z.object({
  imageUrl: httpUrlSchema,
  altText: z.string().trim().max(500).nullable().optional(),
  caption: z.string().trim().max(5_000).nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
});

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "O slug deve usar apenas minúsculas, números e hífen simples."
  );

export const articleInputSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    slug: slugSchema,
    excerpt: z.string().trim().max(10_000).nullable().optional(),
    content: z.string().min(1).max(1_000_000),
    articleType: z.enum(["dica", "tecnica", "materia"]),
    status: z.enum(["draft", "published"]).default("draft"),
    categoryId: z.string().uuid().nullable().optional(),
    topicId: z.string().uuid().nullable().optional(),
    categorySlug: slugSchema.nullable().optional(),
    topicSlug: slugSchema.nullable().optional(),
    coverImageUrl: httpUrlSchema.nullable().optional(),
    coverImageAlt: z.string().trim().max(500).nullable().optional(),
    seoTitle: z.string().trim().max(1_000).nullable().optional(),
    seoDescription: z.string().trim().max(5_000).nullable().optional(),
    author: z.string().trim().max(500).nullable().optional(),
    aiModel: z.string().trim().max(500).nullable().optional(),
    generationMeta: z.record(z.string(), z.unknown()).default({}),
    tags: z
      .array(z.string().trim().min(1).max(200))
      .max(100)
      .default([])
      .superRefine((tags, context) => {
        if (new Set(tags).size !== tags.length) {
          context.addIssue({
            code: "custom",
            message: "As tags não podem repetir-se.",
          });
        }
      }),
    images: z.array(articleImageInputSchema).max(100).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.categoryId && value.categorySlug) {
      context.addIssue({
        code: "custom",
        path: ["categorySlug"],
        message: "Envie categoryId ou categorySlug, não ambos.",
      });
    }
    if (value.topicId && value.topicSlug) {
      context.addIssue({
        code: "custom",
        path: ["topicSlug"],
        message: "Envie topicId ou topicSlug, não ambos.",
      });
    }
  });

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticleImageInput = z.infer<typeof articleImageInputSchema>;
