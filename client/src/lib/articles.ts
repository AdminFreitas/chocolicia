import type { PublishedArticleSummary, TipTopic } from "@shared/tipTopics";

async function readItems<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("A API de dicas está temporariamente indisponível.");

  const payload = await response.json() as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error("A resposta da API de dicas é inválida.");
  return payload.items as T[];
}

export function fetchArticles(signal?: AbortSignal): Promise<PublishedArticleSummary[]> {
  return readItems<PublishedArticleSummary>("/api/articles?type=tip&limit=24", signal);
}

export function fetchArticleTopics(signal?: AbortSignal): Promise<TipTopic[]> {
  return readItems<TipTopic>("/api/articles/topics", signal);
}
