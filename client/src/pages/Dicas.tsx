import { BookOpen, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import { fetchArticleTopics, fetchArticles } from "@/lib/articles";
import type { PublishedArticleSummary, TipTopic } from "@shared/tipTopics";

type LoadState = "loading" | "ready" | "error";

function formatPublishedDate(value: PublishedArticleSummary["publishedAt"]): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function ArticleCard({ article, topics }: { article: PublishedArticleSummary; topics: TipTopic[] }) {
  const topic = topics.find((item) => item.slug === article.tipTopic);
  const date = formatPublishedDate(article.publishedAt);
  const image = article.coverImageVariants?.w800 ?? article.coverImageUrl;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-white shadow-sm">
      {image ? (
        <img
          src={image}
          alt={article.coverImageAlt ?? ""}
          loading="lazy"
          width="800"
          height="533"
          className="aspect-[3/2] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[3/2] place-items-center bg-[#F3E5D0]/60 text-[#8A5A44]" aria-hidden="true">
          <BookOpen className="h-10 w-10" />
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="eyebrow">{topic?.name ?? "Dica de confeitaria"}</p>
          {date && <time className="text-xs text-[#8A5A44]" dateTime={new Date(article.publishedAt as string | Date).toISOString()}>{date}</time>}
        </div>
        <h2 className="mt-2 font-display text-2xl text-[#5A3428]">{article.title}</h2>
        {article.excerpt && <p className="mt-2 text-sm leading-6 text-[#8A5A44]">{article.excerpt}</p>}
      </div>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-white">
          <div className="aspect-[3/2] animate-pulse bg-[#F3E5D0]" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-28 animate-pulse rounded bg-[#F3E5D0]" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-[#F3E5D0]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#F3E5D0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dicas() {
  const [articles, setArticles] = useState<PublishedArticleSummary[]>([]);
  const [topics, setTopics] = useState<TipTopic[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");

    Promise.all([fetchArticles(controller.signal), fetchArticleTopics(controller.signal)])
      .then(([articleItems, topicItems]) => {
        setArticles(articleItems);
        setTopics(topicItems.filter((topic) => topic.active));
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });

    return () => controller.abort();
  }, [attempt]);

  const visibleArticles = useMemo(
    () => selectedTopic ? articles.filter((article) => article.tipTopic === selectedTopic) : articles,
    [articles, selectedTopic],
  );

  return (
    <RecipeSiteChrome>
      <RecipePageMeta
        title="Dicas de confeitaria | Chocolícia"
        description="Dicas práticas de preparo, apresentação e confeitaria para deixar cada doce ainda mais especial."
        path="/dicas"
      />
      <main>
        <section className="bg-[#F3E5D0]/55 px-4 py-12 md:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Aprenda com a Chocolícia</p>
            <h1 className="section-title text-[#5A3428]">Dicas para preparar e apresentar doces</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#8A5A44]">
              Orientações práticas de confeitaria, com cuidado em cada detalhe.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8" aria-live="polite">
          {state === "loading" && (
            <>
              <p className="mb-5 text-sm text-[#8A5A44]" role="status">A carregar dicas…</p>
              <LoadingCards />
            </>
          )}

          {state === "error" && (
            <div className="rounded-2xl border border-[#D9A83E]/35 bg-white px-5 py-10 text-center" role="alert">
              <p className="font-display text-xl text-[#5A3428]">Não foi possível carregar as dicas.</p>
              <p className="mt-2 text-sm text-[#8A5A44]">A ligação pode estar temporariamente indisponível. Tente novamente.</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="button-gold mt-5 inline-flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </button>
            </div>
          )}

          {state === "ready" && (
            <>
              {topics.length > 0 && (
                <nav className="mb-8 flex flex-wrap gap-2" aria-label="Filtrar dicas por tópico">
                  <button
                    type="button"
                    aria-pressed={selectedTopic === null}
                    onClick={() => setSelectedTopic(null)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${selectedTopic === null ? "border-[#5A3428] bg-[#5A3428] text-white" : "border-[#5A3428]/20 bg-white text-[#5A3428] hover:bg-[#F3E5D0]/60"}`}
                  >Todas as dicas</button>
                  {topics.map((topic) => (
                    <button
                      key={topic.slug}
                      type="button"
                      aria-pressed={selectedTopic === topic.slug}
                      onClick={() => setSelectedTopic(topic.slug)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${selectedTopic === topic.slug ? "border-[#5A3428] bg-[#5A3428] text-white" : "border-[#5A3428]/20 bg-white text-[#5A3428] hover:bg-[#F3E5D0]/60"}`}
                    >{topic.name}</button>
                  ))}
                </nav>
              )}

              {articles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#D9A83E]/45 px-5 py-12 text-center text-[#8A5A44]">
                  Novas dicas chegam em breve. Volte para descobrir os próximos conteúdos da Chocolícia.
                </p>
              ) : visibleArticles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#D9A83E]/45 px-5 py-12 text-center text-[#8A5A44]">
                  Ainda não há dicas neste tópico. Escolha outro assunto para continuar.
                </p>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {visibleArticles.map((article) => <ArticleCard key={article.id} article={article} topics={topics} />)}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
