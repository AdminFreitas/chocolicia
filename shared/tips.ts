import { z } from "zod";

export const TIP_TYPES = ["dica", "tecnica", "materia"] as const;
export const TIP_TOPICS = [
  { slug: "montagem-e-apresentacao", name: "Montagem e apresentação", description: "Acabamento, embalagem e apresentação de doces.", sortOrder: 1 },
  { slug: "ornamentacao", name: "Ornamentação", description: "Decoração, coberturas e acabamento.", sortOrder: 2 },
  { slug: "preparo", name: "Preparo", description: "Técnicas, ponto e correção de preparo.", sortOrder: 3 },
  { slug: "equipamentos-uso", name: "Uso de equipamentos", description: "Uso, limpeza e manutenção.", sortOrder: 4 },
  { slug: "equipamentos-compra", name: "Escolha de equipamentos", description: "Critérios para escolher equipamentos.", sortOrder: 5 },
  { slug: "negocios", name: "Negócios na culinária", description: "Organização e operação de negócios de doces.", sortOrder: 6 },
] as const;
const coverStock = z.object({ mode: z.literal("stock"), provider: z.string().trim().min(1).max(40), sourceImageUrl: z.string().url().refine((v) => v.startsWith("https://")), sourcePageUrl: z.string().url().refine((v) => v.startsWith("https://")), author: z.string().max(200), license: z.string().trim().min(1).max(120), attributionText: z.string().max(400) });
const coverGenerate = z.object({ mode: z.literal("generate"), imagePrompt: z.string().trim().min(1).max(2000) });
export const tipInputSchema = z.object({
  type: z.enum(TIP_TYPES), title: z.string().trim().min(5).max(180), slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), excerpt: z.string().trim().min(20).max(160),
  bodyMd: z.string().trim().min(1).max(30000), tipTopic: z.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), authorId: z.number().int().positive().optional(), authorSlug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), structured: z.record(z.string(), z.unknown()).optional(), sources: z.array(z.object({ name: z.string().min(1).max(200), title: z.string().min(1).max(300), url: z.string().url() })).max(20).default([]),
  cover: z.discriminatedUnion("mode", [coverStock, coverGenerate]), coverImageAlt: z.string().trim().min(8).max(240), tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]), relatedTopics: z.array(z.string().trim().min(1).max(120)).max(6).default([]),
  metaTitle: z.string().trim().max(180).optional(), metaDescription: z.string().trim().max(320).optional(), canonicalUrl: z.string().url().optional(), status: z.enum(["draft", "published"]).default("draft"), aiModel: z.string().trim().min(1).max(120), generationMeta: z.record(z.string(), z.unknown()),
}).superRefine((value, ctx) => { if (value.type === "dica" && !value.tipTopic) ctx.addIssue({ code: "custom", path: ["tipTopic"], message: "Dica exige tópico." }); if (new Set(value.tags).size !== value.tags.length) ctx.addIssue({ code: "custom", path: ["tags"], message: "Tags repetidas." }); });
export type TipInput = z.infer<typeof tipInputSchema>;
