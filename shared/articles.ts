import { z } from "zod";

export const ARTICLE_TYPES = ["article", "tip", "technique", "news"] as const;
export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export const ARTICLE_REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const TIP_TOPICS = [
  { slug: "montagem-e-apresentacao", name: "Montagem e apresentação" },
  { slug: "ornamentacao", name: "Ornamentação" },
  { slug: "preparo", name: "Preparo" },
  { slug: "equipamentos-uso", name: "Uso de equipamentos" },
  { slug: "equipamentos-compra", name: "Escolha de equipamentos" },
  { slug: "negocios", name: "Negócios na culinária" },
] as const;
export const articleSourceSchema = z.object({ name: z.string().trim().min(1).max(200), title: z.string().trim().min(1).max(300), url: z.string().url().max(2048) });
const coverStockSchema = z.object({ mode: z.literal("stock"), provider: z.string().trim().min(1).max(40), sourceImageUrl: z.string().url().max(2048).refine((value) => value.startsWith("https://")), sourcePageUrl: z.string().url().max(2048).refine((value) => value.startsWith("https://")), author: z.string().max(200), license: z.string().trim().min(1).max(120), attributionText: z.string().max(400) });
const coverGenerateSchema = z.object({ mode: z.literal("generate"), imagePrompt: z.string().trim().min(1).max(2000) });

export const articleInputSchema = z.object({
  type: z.enum(ARTICLE_TYPES), title: z.string().trim().min(5).max(180), slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  excerpt: z.string().trim().min(20).max(160), categorySlug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  tipTopic: z.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), bodyMd: z.string().trim().min(1).max(30000), structured: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(articleSourceSchema).max(20).default([]), tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]), relatedTopics: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  cover: z.discriminatedUnion("mode", [coverStockSchema, coverGenerateSchema]), coverImageAlt: z.string().trim().min(8).max(240), status: z.enum(["draft", "published"]).default("draft"), aiModel: z.string().trim().min(1).max(120), generationMeta: z.record(z.string(), z.unknown()),
}).superRefine((article, ctx) => {
  if (article.type === "tip" && !article.tipTopic) ctx.addIssue({ code: "custom", path: ["tipTopic"], message: "Dica exige tipTopic." });
  if (article.type !== "tip" && article.tipTopic) ctx.addIssue({ code: "custom", path: ["tipTopic"], message: "tipTopic só pode ser usado em dicas." });
  if (article.type !== "tip" && article.sources.length === 0) ctx.addIssue({ code: "custom", path: ["sources"], message: "Conteúdo não promocional exige fontes." });
  if (article.relatedTopics.length === 1) ctx.addIssue({ code: "custom", path: ["relatedTopics"], message: "Informe ao menos dois temas relacionados." });
  if (new Set(article.tags).size !== article.tags.length) ctx.addIssue({ code: "custom", path: ["tags"], message: "Tags repetidas." });
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type Article = ArticleInput & { id: string; slug: string; coverImageUrl: string | null; coverImageAlt: string | null; publishedAt: Date | null; createdAt: Date; updatedAt: Date };
