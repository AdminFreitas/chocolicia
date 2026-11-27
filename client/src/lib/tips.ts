export type TipRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  tipType: string;
  topicId: number | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TipListItem = {
  tip: TipRecord;
  topicName: string | null;
  topicSlug: string | null;
};

export type TipImage = {
  imageId: string | null;
  imageUrl: string | null;
  altText: string | null;
  caption: string | null;
  imageRole: string;
  sortOrder: number;
};

export type TipDetailRecord = TipListItem & {
  images: TipImage[];
  relatedTags: Array<{ slug: string; name: string }>;
};

export async function fetchTips(limit = 50, signal?: AbortSignal): Promise<TipListItem[]> {
  const response = await fetch(`/api/tips?limit=${Math.min(Math.max(limit, 1), 50)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Não foi possível carregar as dicas.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !Array.isArray((data as { items?: unknown }).items)) {
    throw new Error("A resposta da lista de dicas é inválida.");
  }
  return (data as { items: TipListItem[] }).items;
}

export async function fetchTip(slug: string, signal?: AbortSignal): Promise<TipDetailRecord | null> {
  const response = await fetch(`/api/tips/${encodeURIComponent(slug)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Não foi possível carregar esta dica.");
  return (await response.json()) as TipDetailRecord;
}

export function formatTipDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
