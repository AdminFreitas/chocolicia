import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Search } from "lucide-react";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import RecipePageMeta from "@/components/RecipePageMeta";
import { Input } from "@/components/ui/input";
import { fetchTips, formatTipDate, type TipListItem } from "@/lib/tips";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function TipCard({ item }: { item: TipListItem }) {
  const { tip } = item;
  const date = formatTipDate(tip.publishedAt);
  return (
    <a
      href={`/dicas/${encodeURIComponent(tip.slug)}`}
      className="group block overflow-hidden rounded-2xl border border-[#D9A83E]/25 bg-[#FFF9F0] shadow-[0_16px_45px_rgba(58,36,29,.07)] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D9A83E]"
      aria-label={`Ler dica: ${tip.title}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F3E5D0]">
        {tip.coverImageUrl ? (
          <img src={tip.coverImageUrl} alt={tip.coverImageAlt || tip.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[#D9A83E]"><Lightbulb className="h-16 w-16" aria-hidden="true" /></div>
        )}
        <span className="absolute left-4 top-4 rounded-full border border-[#F3CD73]/60 bg-[#3A241D]/75 px-3 py-1 text-[.65rem] font-semibold uppercase tracking-[.14em] text-[#F3CD73]">{item.topicName || "Dica"}</span>
      </div>
      <div className="p-5 md:p-6">
        {date && <time dateTime={tip.publishedAt ?? undefined} className="text-xs text-[#8A5A44]">{date}</time>}{item.authorName && <span className="ml-2 text-xs text-[#8A5A44]">· {item.authorName}</span>}
        <h2 className="mt-2 line-clamp-2 font-display text-2xl font-medium leading-tight text-[#5A3428]">{tip.title}</h2>
        {tip.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#8A5A44]">{tip.excerpt}</p>}
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#5A3428] underline decoration-[#D9A83E]/80 underline-offset-4">Ler dica <span aria-hidden="true">↗</span></span>
      </div>
    </a>
  );
}

export default function Tips() {
  const [items, setItems] = useState<TipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetchTips(50, controller.signal)
      .then(setItems)
      .catch((reason: unknown) => { if (!isAbortError(reason)) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const topics = useMemo(() => {
    const values = new Map<string, string>();
    for (const item of items) {
      if (item.topicSlug && item.topicName) values.set(item.topicSlug, item.topicName);
    }
    return Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter(({ tip, topicSlug }) => {
      const matchesTopic = !topic || topicSlug === topic;
      const matchesQuery = !needle || [tip.title, tip.excerpt || "", tip.content].some((value) => value.toLocaleLowerCase("pt-BR").includes(needle));
      return matchesTopic && matchesQuery;
    });
  }, [items, query, topic]);

  return (
    <RecipeSiteChrome section="tips">
      <RecipePageMeta title="Dicas de confeitaria e preparo | Chocolícia" description="Aprenda técnicas, acabamento, preparo e uso de equipamentos com as dicas práticas da Chocolícia." path="/dicas" />
      <main>
        <section className="bg-[#F3E5D0]/55 px-4 py-10 md:px-6 md:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Aprenda com a Chocolícia</p>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><h1 className="section-title text-[#5A3428]">Dicas para fazer melhor</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#8A5A44] md:text-lg">Orientações práticas de preparo, acabamento, apresentação e rotina para deixar suas criações ainda mais especiais.</p></div>
              <Lightbulb className="hidden h-14 w-14 text-[#D9A83E] md:block" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="bg-[#F3E5D0]/65 px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-labelledby="tips-list-title">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><p className="eyebrow mb-2">Conhecimento que ajuda na prática</p><h2 id="tips-list-title" className="font-display text-3xl text-[#5A3428] md:text-4xl">Todas as dicas</h2></div>
              <label className="relative block w-full sm:max-w-sm">
                <span className="sr-only">Buscar dicas</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A5A44]" aria-hidden="true" />
                <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar uma dica" className="min-h-12 w-full rounded-full border border-[#5A3428]/20 bg-white/80 py-3 pl-12 pr-4 text-sm text-[#5A3428] placeholder:text-[#8A5A44]/75" />
              </label>
            </div>

            {topics.length > 0 && <div className="mb-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar dicas por assunto">
              <button type="button" aria-pressed={!topic} onClick={() => setTopic("")} className={`recipe-filter ${!topic ? "is-active" : ""}`}>Todos os assuntos</button>
              {topics.map(([slug, name]) => <button key={slug} type="button" aria-pressed={topic === slug} onClick={() => setTopic(slug)} className={`recipe-filter ${topic === slug ? "is-active" : ""}`}>{name}</button>)}
            </div>}

            {loading && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Carregando dicas" aria-busy="true">{[0,1,2,3,4,5].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-[#FFF9F0]"><div className="recipe-skeleton aspect-[16/10]" /><div className="space-y-3 p-5"><div className="recipe-skeleton h-3 w-1/3 rounded" /><div className="recipe-skeleton h-6 w-4/5 rounded" /><div className="recipe-skeleton h-4 w-full rounded" /></div></div>)}</div>}
            {!loading && error && <div className="rounded-2xl border border-[#D9A83E]/30 bg-white/70 p-8 text-center"><p className="text-[#8A5A44]">Não foi possível carregar as dicas agora.</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="button-outline mt-4">Tentar novamente</button></div>}
            {!loading && !error && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-[#D9A83E]/50 bg-white/40 p-10 text-center"><Lightbulb className="mx-auto h-10 w-10 text-[#D9A83E]" aria-hidden="true" /><h3 className="mt-3 font-display text-2xl text-[#5A3428]">{items.length ? "Nenhuma dica encontrada" : "Novas dicas chegam em breve"}</h3><p className="mt-2 text-sm text-[#8A5A44]">{items.length ? "Tente outro termo ou assunto." : "Estamos preparando conteúdos práticos para compartilhar com você."}</p></div>}
            {!loading && !error && filtered.length > 0 && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <TipCard key={item.tip.id} item={item} />)}</div>}
          </div>
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
