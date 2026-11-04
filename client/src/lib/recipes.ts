export const RECIPE_CATEGORIES = [
  "Bolos",
  "Brigadeiros e docinhos",
  "Tortas",
  "Sobremesas",
  "Chocolates",
  "Festas e buffet",
  "Datas especiais",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export type RecipeIngredient = {
  quantity: string;
  unit: string;
  name: string;
  note?: string;
};

export type RecipeIngredientSection = {
  name: string;
  items: RecipeIngredient[];
};

export type RecipeStep = { title?: string; instruction: string };
export type RecipeFaq = { question: string; answer: string };

export type RecipeSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: RecipeCategory;
  tags?: string[];
  coverImageUrl: string;
  coverImageAlt: string;
  coverImageVariants: { w480?: string; w800?: string; w1280?: string; avif480?: string; avif800?: string; avif1280?: string };
  prepTimeMin: number;
  cookTimeMin: number;
  servings: number;
  difficulty: "Fácil" | "Média" | "Difícil";
  status?: "draft" | "published";
  publishedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RecipeRecord = RecipeSummary & {
  ingredients: RecipeIngredientSection[];
  steps: RecipeStep[];
  tips: string[];
  storageNotes: string;
  faq: RecipeFaq[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeListResponse = {
  items: RecipeSummary[];
  nextCursor: string | null;
};

export async function fetchFeaturedRecipes(signal?: AbortSignal): Promise<RecipeSummary[]> {
  const response = await fetch("/api/recipes/featured", { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Não foi possível carregar as receitas em destaque.");
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("A resposta de receitas em destaque é inválida.");
  return data as RecipeSummary[];
}

export async function fetchRecipes(
  params: { limit?: number; cursor?: string; category?: RecipeCategory; q?: string },
  signal?: AbortSignal,
): Promise<RecipeListResponse> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 9) });
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.category) query.set("category", params.category);
  if (params.q?.trim()) query.set("q", params.q.trim());
  const response = await fetch(`/api/recipes?${query.toString()}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Não foi possível carregar as receitas.");
  const data = (await response.json()) as RecipeListResponse;
  if (!data || !Array.isArray(data.items) || !(data.nextCursor === null || typeof data.nextCursor === "string")) {
    throw new Error("A resposta da lista de receitas é inválida.");
  }
  return data;
}

export async function fetchRecipe(slug: string, signal?: AbortSignal): Promise<RecipeRecord | null> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(slug)}`, { signal, headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível carregar esta receita.");
  return (await response.json()) as RecipeRecord;
}

export function recipeImage(recipe: RecipeSummary, width: 480 | 800 | 1280 = 800): string {
  const variants = recipe.coverImageVariants;
  return (width === 480 ? variants?.w480 : width === 800 ? variants?.w800 : variants?.w1280) || recipe.coverImageUrl;
}

export function formatRecipeDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

export function recipeDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}
