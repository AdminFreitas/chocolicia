export type TipTopic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
};

export type TipArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  articleType: "dica" | "tecnica";
  topic: { slug: string; name: string };
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type TipArticleImage = {
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  position: number;
};

export type TipArticleSource = {
  name: string;
  title: string;
  url: string;
};

export type TipArticleDetail = TipArticleSummary & {
  content: string;
  author: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  images: TipArticleImage[];
  sources: TipArticleSource[];
};

export type TipPage = {
  items: TipArticleSummary[];
  nextCursor: string | null;
};

type TipQuery = {
  limit?: number;
  topic?: string;
  cursor?: string;
};

export async function fetchTipTopics(
  signal?: AbortSignal
): Promise<TipTopic[]> {
  const response = await fetch("/api/articles/topics", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Não foi possível carregar os assuntos das dicas.");
  }
  const data = (await response.json()) as { items?: unknown };
  if (!Array.isArray(data.items)) {
    throw new Error("A resposta de assuntos é inválida.");
  }
  return data.items as TipTopic[];
}

export async function fetchTips(
  query: TipQuery = {},
  signal?: AbortSignal
): Promise<TipPage> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 12));
  if (query.topic) params.set("topic", query.topic);
  if (query.cursor) params.set("cursor", query.cursor);

  const response = await fetch("/api/articles?" + params.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Não foi possível carregar as dicas.");
  }
  const data = (await response.json()) as {
    items?: unknown;
    nextCursor?: unknown;
  };
  if (!Array.isArray(data.items)) {
    throw new Error("A resposta de dicas é inválida.");
  }
  return {
    items: data.items as TipArticleSummary[],
    nextCursor:
      typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

export async function fetchTipArticle(
  slug: string,
  signal?: AbortSignal
): Promise<TipArticleDetail | null> {
  const response = await fetch(
    "/api/articles/" + encodeURIComponent(slug),
    {
      signal,
      headers: { Accept: "application/json" },
    }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Não foi possível carregar esta dica.");
  }
  return (await response.json()) as TipArticleDetail;
}
