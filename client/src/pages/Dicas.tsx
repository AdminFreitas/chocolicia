import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ImageOff, Lightbulb } from "lucide-react";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import {
  fetchTipArticle,
  fetchTipTopics,
  fetchTips,
  type TipArticleDetail,
  type TipArticleSummary,
  type TipTopic,
} from "@/lib/articles";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function renderArticleContent(content: string): ReactNode[] {
  return content
    .split(/\r?\n{2,}/)
    .map((block, index) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return null;

      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        const heading = lines[0].replace(/^#{1,3}\s+/, "");
        return (
          <h3
            key={index}
            className="font-display text-2xl text-[#5A3428] md:text-3xl"
          >
            {heading}
          </h3>
        );
      }

      const isList = lines.every((line) => /^(?:[-*]|\d+[.)])\s+/.test(line));
      if (isList) {
        return (
          <ul
            key={index}
            className="list-disc space-y-2 pl-6 leading-7 text-[#6D5146]"
          >
            {lines.map((line, itemIndex) => (
              <li key={itemIndex}>
                {line.replace(/^(?:[-*]|\d+[.)])\s+/, "")}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p key={index} className="leading-7 text-[#6D5146]">
          {lines.join(" ")}
        </p>
      );
    })
    .filter(Boolean);
}

function CardSkeleton() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Carregando dicas"
      aria-busy="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-white"
        >
          <div className="recipe-skeleton aspect-[3/2]" />
          <div className="space-y-3 p-5">
            <div className="recipe-skeleton h-3 w-1/3 rounded" />
            <div className="recipe-skeleton h-6 w-4/5 rounded" />
            <div className="recipe-skeleton h-4 w-full rounded" />
            <div className="recipe-skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleExpanded({
  article,
  loading,
  error,
  missing,
}: {
  article: TipArticleDetail | null;
  loading: boolean;
  error: boolean;
  missing: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-5 rounded-xl bg-[#F3E5D0]/55 p-5" role="status">
        Carregando conteúdo…
      </div>
    );
  }
  if (error) {
    return (
      <p className="mt-5 rounded-xl bg-[#F3E5D0]/55 p-5 text-sm text-[#8A5A44]" role="alert">
        Não foi possível carregar o conteúdo desta dica. Feche e tente novamente.
      </p>
    );
  }
  if (missing || !article) {
    return (
      <p className="mt-5 rounded-xl bg-[#F3E5D0]/55 p-5 text-sm text-[#8A5A44]" role="status">
        Este conteúdo não está mais disponível.
      </p>
    );
  }

  return (
    <article className="mt-5 space-y-5 border-t border-[#D9A83E]/25 pt-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A5A44]">
        <span>{article.author ?? "Equipe Chocolícia"}</span>
        {article.publishedAt && (
          <time dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
        )}
      </div>
      <div className="space-y-4">{renderArticleContent(article.content)}</div>
      {article.images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {article.images.map((image, index) => (
            <figure key={image.imageUrl + "-" + index}>
              <img
                src={image.imageUrl}
                alt={image.altText ?? article.title}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
              {image.caption && (
                <figcaption className="mt-2 text-xs text-[#8A5A44]">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Tags do artigo">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#F3E5D0] px-3 py-1 text-xs text-[#6D5146]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {article.sources.length > 0 && (
        <section className="border-t border-[#D9A83E]/25 pt-4">
          <h4 className="font-semibold text-[#5A3428]">Fontes consultadas</h4>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#6D5146]">
            {article.sources.map((source, index) => (
              <li key={source.url + "-" + index}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[#D9A83E] underline-offset-2"
                >
                  {source.name}: {source.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function Dicas() {
  const [topics, setTopics] = useState<TipTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(false);
  const [topicsRetry, setTopicsRetry] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [items, setItems] = useState<TipArticleSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<TipArticleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [detailMissing, setDetailMissing] = useState(false);
  const moreController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setTopicsLoading(true);
    setTopicsError(false);
    fetchTipTopics(controller.signal)
      .then((result) => setTopics(result))
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setTopicsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopicsLoading(false);
      });
    return () => controller.abort();
  }, [topicsRetry]);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    setLoadingMore(false);
    setLoading(true);
    setError(false);
    setMoreError(false);
    setItems([]);
    setNextCursor(null);
    detailController.current?.abort();
    setExpandedSlug(null);
    setExpandedArticle(null);
    fetchTips(
      {
        limit: 9,
        topic: selectedTopic || undefined,
      },
      controller.signal
    )
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedTopic, listRetry]);

  useEffect(() => {
    return () => {
      moreController.current?.abort();
      detailController.current?.abort();
    };
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    moreController.current?.abort();
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await fetchTips(
        {
          limit: 9,
          topic: selectedTopic || undefined,
          cursor: nextCursor,
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setItems((current) => {
          const existing = new Set(current.map((item) => item.id));
          return [...current, ...page.items.filter((item) => !existing.has(item.id))];
        });
        setNextCursor(page.nextCursor);
      }
    } catch (reason) {
      if (!isAbortError(reason)) setMoreError(true);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  const toggleArticle = async (slug: string) => {
    if (expandedSlug === slug) {
      detailController.current?.abort();
      setExpandedSlug(null);
      setExpandedArticle(null);
      setDetailError(false);
      setDetailMissing(false);
      return;
    }

    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setExpandedSlug(slug);
    setExpandedArticle(null);
    setDetailError(false);
    setDetailMissing(false);
    setDetailLoading(true);
    try {
      const result = await fetchTipArticle(slug, controller.signal);
      if (!controller.signal.aborted) {
        setExpandedArticle(result);
        setDetailMissing(result === null);
      }
    } catch (reason) {
      if (!isAbortError(reason)) setDetailError(true);
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  const selectedTopicData = topics.find((topic) => topic.slug === selectedTopic);

  return (
    <RecipeSiteChrome>
      <RecipePageMeta
        title="Dicas de confeitaria | Chocolícia"
        description="Dicas e técnicas de confeitaria, preparo e conservação publicadas pela Chocolícia."
        path="/dicas"
      />
      <main>
        <section className="bg-[#F3E5D0]/55 px-4 py-10 md:px-6 md:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Aprenda com a Chocolícia</p>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="section-title text-[#5A3428]">
                  Dicas para preparar e apresentar doces
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#8A5A44] md:text-lg">
                  Orientações e técnicas de confeitaria organizadas por assunto.
                </p>
              </div>
              <Lightbulb
                className="hidden h-14 w-14 text-[#D9A83E] md:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 md:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#D9A83E]" aria-hidden="true" />
            <h2 className="font-display text-2xl text-[#5A3428]">
              Assuntos
            </h2>
          </div>
          {topicsError && (
            <div
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9A83E]/30 bg-white/70 p-4 text-sm text-[#8A5A44]"
              role="alert"
            >
              <span>Não foi possível carregar os assuntos.</span>
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => setTopicsRetry((value) => value + 1)}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {topicsLoading && (
            <p className="text-sm text-[#8A5A44]" role="status">
              Carregando assuntos…
            </p>
          )}
          {!topicsLoading && topics.length === 0 && !topicsError && (
            <p className="text-sm text-[#8A5A44]">
              Não há assuntos ativos cadastrados no momento.
            </p>
          )}
          {topics.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible"
              aria-label="Filtrar dicas por assunto"
            >
              <button
                type="button"
                aria-pressed={!selectedTopic}
                onClick={() => setSelectedTopic("")}
                className={"recipe-filter " + (!selectedTopic ? "is-active" : "")}
              >
                Todos os assuntos
              </button>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={selectedTopic === topic.slug}
                  onClick={() => setSelectedTopic(topic.slug)}
                  className={
                    "recipe-filter " +
                    (selectedTopic === topic.slug ? "is-active" : "")
                  }
                >
                  {topic.name} ({topic.articleCount})
                </button>
              ))}
            </div>
          )}
          {selectedTopicData?.description && (
            <p className="mt-2 text-sm leading-6 text-[#8A5A44]">
              {selectedTopicData.description}
            </p>
          )}
        </section>

        <section
          className="bg-[#F3E5D0]/45 px-4 py-10 md:px-6 md:py-14 lg:px-8"
          aria-labelledby="tips-list-title"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <p className="eyebrow mb-2">Conteúdo editorial</p>
              <h2
                id="tips-list-title"
                className="font-display text-3xl text-[#5A3428] md:text-4xl"
              >
                {selectedTopicData ? selectedTopicData.name : "Todas as dicas"}
              </h2>
            </div>
            <div aria-live="polite" aria-busy={loading}>
              {loading && <CardSkeleton />}
              {!loading && error && (
                <div
                  className="rounded-2xl border border-[#D9A83E]/35 bg-white/80 p-7 text-center"
                  role="alert"
                >
                  <p className="font-display text-2xl text-[#5A3428]">
                    Não foi possível carregar as dicas
                  </p>
                  <p className="mt-2 text-sm text-[#8A5A44]">
                    Verifique sua conexão e tente novamente.
                  </p>
                  <button
                    type="button"
                    className="button-outline mt-5"
                    onClick={() => setListRetry((value) => value + 1)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {!loading && !error && items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#D9A83E]/45 bg-white/50 px-5 py-12 text-center">
                  <p className="font-display text-2xl text-[#5A3428]">
                    Nenhuma dica publicada neste assunto
                  </p>
                  <p className="mt-2 text-sm text-[#8A5A44]">
                    Os conteúdos aparecem aqui depois de publicados e associados a um assunto ativo.
                  </p>
                </div>
              )}
              {!loading && !error && items.length > 0 && (
                <>
                  <p className="mb-4 text-xs text-[#8A5A44]">
                    {items.length} {items.length === 1 ? "conteúdo carregado" : "conteúdos carregados"}
                  </p>
                  <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((article) => {
                      const expanded = expandedSlug === article.slug;
                      const date = formatDate(article.publishedAt);
                      return (
                        <article
                          key={article.id}
                          className="overflow-hidden rounded-2xl border border-[#D9A83E]/25 bg-[#FFF9F0] shadow-[0_16px_45px_rgba(58,36,29,.07)]"
                        >
                          {article.coverImageUrl ? (
                            <img
                              src={article.coverImageUrl}
                              alt={article.coverImageAlt ?? article.title}
                              width="800"
                              height="533"
                              loading="lazy"
                              className="aspect-[3/2] w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 bg-[#F3E5D0] text-[#8A5A44]">
                              <ImageOff className="h-8 w-8" aria-hidden="true" />
                              <span className="text-xs">Imagem não cadastrada</span>
                            </div>
                          )}
                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8A5A44]">
                              <span className="rounded-full bg-[#F3E5D0] px-3 py-1">
                                {article.topic.name}
                              </span>
                              <span>{article.articleType === "tecnica" ? "Técnica" : "Dica"}</span>
                            </div>
                            {date && (
                              <time
                                dateTime={article.publishedAt ?? undefined}
                                className="mt-3 block text-xs text-[#8A5A44]"
                              >
                                {date}
                              </time>
                            )}
                            <h3 className="mt-2 font-display text-2xl leading-tight text-[#5A3428]">
                              {article.title}
                            </h3>
                            {article.excerpt && (
                              <p className="mt-2 text-sm leading-6 text-[#8A5A44]">
                                {article.excerpt}
                              </p>
                            )}
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={"tip-detail-" + article.slug}
                              onClick={() => void toggleArticle(article.slug)}
                              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5A3428] underline decoration-[#D9A83E] underline-offset-4"
                            >
                              {expanded ? "Fechar conteúdo" : "Ler conteúdo"}
                              <ChevronDown
                                className={"h-4 w-4 transition-transform " + (expanded ? "rotate-180" : "")}
                                aria-hidden="true"
                              />
                            </button>
                            {expanded && (
                              <div id={"tip-detail-" + article.slug}>
                                <ArticleExpanded
                                  article={expandedArticle}
                                  loading={detailLoading}
                                  error={detailError}
                                  missing={detailMissing}
                                />
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {moreError && (
                    <p className="mt-5 text-center text-sm text-[#8A5A44]" role="alert">
                      Não foi possível carregar mais conteúdos. Tente novamente.
                    </p>
                  )}
                  {nextCursor && (
                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => void loadMore()}
                        className="button-outline min-w-44"
                        aria-busy={loadingMore}
                      >
                        {loadingMore
                          ? "Carregando…"
                          : moreError
                            ? "Tentar novamente"
                            : "Carregar mais dicas"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
