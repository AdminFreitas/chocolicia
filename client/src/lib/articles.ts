export type ArticleSummary = {
  id: string;
  type: "article" | "tip" | "technique" | "news";
  slug: string;
  title: string;
  excerpt: string | null;
  tipTopic: string | null;
  coverImageUrl: string;
  coverImageAlt: string;
  coverImageVariants: { w480?: string; w800?: string; w1280?: string; avif480?: string; avif800?: string; avif1280?: string };
  publishedAt: string | null;
  updatedAt: string;
};

export type ArticleRecord = ArticleSummary & {
  subcategorySlug: string | null;
  bodyMd: string;
  structured: Record<string, unknown> | null;
  sources: Array<{ name: string; title: string; url: string }>;
  tags: string[];
  relatedTopics: string[];
  coverImageSource: Record<string, unknown> | null;
  coverImageIsAi: boolean;
  createdAt: string;
};

export async function fetchArticles(signal?: AbortSignal): Promise<ArticleSummary[]> {
  const response = await fetch("/api/articles", { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Não foi possível carregar as dicas.");
  const data = await response.json() as { items?: unknown };
  if (!Array.isArray(data.items)) throw new Error("A resposta de dicas é inválida.");
  return data.items as ArticleSummary[];
}

export async function fetchArticle(slug: string, signal?: AbortSignal): Promise<ArticleRecord | null> {
  const response = await fetch(`/api/articles/${encodeURIComponent(slug)}`, { signal, headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível carregar esta dica.");
  return await response.json() as ArticleRecord;
}

