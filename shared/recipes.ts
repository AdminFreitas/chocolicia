import { z } from "zod";

export const RECIPE_CATEGORIES = [
  "Bolos",
  "Brigadeiros e docinhos",
  "Tortas",
  "Sobremesas",
  "Chocolates",
  "Festas e buffet",
  "Datas especiais",
] as const;

export const recipeCategorySchema = z.enum(RECIPE_CATEGORIES);
export type RecipeCategory = z.infer<typeof recipeCategorySchema>;

export const ingredientSchema = z.object({
  quantity: z.string().max(80).default(""),
  unit: z.string().max(40).default(""),
  name: z.string().trim().min(1).max(180),
  note: z.string().max(180).optional(),
});

export const ingredientSectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  items: z.array(ingredientSchema).min(1).max(80),
});

export const recipeStepSchema = z.object({
  title: z.string().max(120).optional(),
  instruction: z.string().trim().min(1).max(1200),
});

export const recipeFaqSchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(1200),
});

export const recipeInputSchema = z.object({
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: z.string().trim().min(5).max(180),
  excerpt: z.string().trim().min(20).max(160),
  category: recipeCategorySchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  coverImageUrl: z.string().url().max(2048),
  coverImageAlt: z.string().trim().min(8).max(240),
  imagePrompt: z.string().max(2000).default(""),
  coverImageVariants: z.object({
    w480: z.string().url().optional(),
    w800: z.string().url().optional(),
    w1280: z.string().url().optional(),
    avif480: z.string().url().optional(),
    avif800: z.string().url().optional(),
    avif1280: z.string().url().optional(),
  }).default({}),
  ingredients: z.array(ingredientSectionSchema).min(1).max(20),
  steps: z.array(recipeStepSchema).min(2).max(30),
  tips: z.array(z.string().trim().min(1).max(1000)).max(12).default([]),
  storageNotes: z.string().max(3000).default(""),
  faq: z.array(recipeFaqSchema).max(12).default([]),
  prepTimeMin: z.number().int().min(1).max(1440),
  cookTimeMin: z.number().int().min(0).max(1440).default(0),
  servings: z.number().int().min(1).max(500),
  difficulty: z.enum(["Fácil", "Média", "Difícil"]),
  status: z.enum(["draft", "published"]).default("published"),
  publishedAt: z.coerce.date().optional(),
  aiModel: z.string().max(120).optional(),
  generationMeta: z.record(z.string(), z.unknown()).default({}),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export type RecipeSummary = Pick<
  RecipeInput,
  | "slug"
  | "title"
  | "excerpt"
  | "category"
  | "coverImageUrl"
  | "coverImageAlt"
  | "coverImageVariants"
  | "prepTimeMin"
  | "cookTimeMin"
  | "servings"
  | "difficulty"
  | "publishedAt"
> & { id: string };

export type RecipeRecord = RecipeSummary & Omit<RecipeInput, "slug" | "publishedAt"> & {
  slug: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const recipeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(9),
  cursor: z.string().max(200).optional(),
  category: recipeCategorySchema.optional(),
  q: z.string().trim().max(100).optional(),
});
