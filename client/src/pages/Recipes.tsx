import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import RecipeCard from "@/components/RecipeCard";
import { WA_ORCAMENTO } from "@/config/site";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import { RECIPE_CATEGORIES, fetchFeaturedRecipes, fetchRecipes, type RecipeCategory, type RecipeSummary } from "@/lib/recipes";
import RecipePageMeta from "@/components/RecipePageMeta";
import { Input } from "@/components/ui/input";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function CardSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Carregando receitas" aria-busy="true">{Array.from({ length: count }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-[#FFF9F0]"><div className="recipe-skeleton aspect-[4/3]" /><div className="space-y-3 p-5"><div className="recipe-skeleton h-3 w-1/3 rounded" /><div className="recipe-skeleton h-6 w-4/5 rounded" /><div className="recipe-skeleton h-4 w-full rounded" /><div className="recipe-skeleton h-4 w-2/3 rounded" /></div></div>)}</div>;
}

export default function Recipes() {
  const [featured, setFeatured] = useState<RecipeSummary[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);
  const [category, setCategory] = useState<RecipeCategory | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RecipeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const loadMoreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchFeaturedRecipes(controller.signal)
      .then((recipes) => setFeatured(recipes.slice(0, 4)))
      .catch((reason: unknown) => { if (!isAbortError(reason)) setFeaturedError(true); })
      .finally(() => { if (!controller.signal.aborted) setFeaturedLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    loadMoreController.current?.abort();
    setLoadingMore(false);
    setLoading(true);
    setError(false);
    setItems([]);
    setNextCursor(null);
    setMoreError(false);
    fetchRecipes({ limit: 9, category: category || undefined, q: query || undefined }, controller.signal)
      .then((page) => { setItems(page.items); setNextCursor(page.nextCursor); })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, listRetry, query]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    loadMoreController.current?.abort();
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await fetchRecipes({ limit: 9, cursor: nextCursor, category: category || undefined, q: query || undefined }, controller.signal);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (reason) {
      if (!isAbortError(reason)) setMoreError(true);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [category, loadingMore, nextCursor, query]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  const showFeatured = !category && !query;

  return (
    <RecipeSiteChrome>
      <RecipePageMeta title="Receitas fáceis e deliciosas | Chocolícia" description="Descubra receitas de bolos, docinhos, sobremesas e chocolates, com ingredientes, dicas e passo a passo da Chocolícia." path="/receitas" />
      <main>
        <section className="bg-[#F3E5D0]/55 px-4 py-10 md:px-6 md:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Receitas da Chocolícia</p>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><h1 className="section-title text-[#5A3428]">Receitas para adoçar o seu dia</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#8A5A44] md:text-lg">Inspiração doce para fazer em casa, com ingredientes, modo de preparo e dicas para cada receita.</p></div>
              <BookOpen className="hidden h-14 w-14 text-[#D9A83E] md:block" aria-hidden="true" />
            </div>
          </div>
        </section>

        {showFeatured && <section className="px-4 pb-10 pt-8 md:px-6 lg:px-8" aria-labelledby="featured-recipes-title">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow mb-2">Escolhas para provar</p><h2 id="featured-recipes-title" className="font-display text-3xl text-[#5A3428] md:text-4xl">Em destaque</h2></div><a href="#todas-as-receitas" className="text-cta">Todas as receitas <span aria-hidden="true">↓</span></a></div>
            {featuredLoading && <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:gap-6" aria-label="Carregando destaques" aria-busy="true"><div className="recipe-skeleton aspect-[4/3] rounded-2xl lg:row-span-3 lg:min-h-[32rem]" /><div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:grid-cols-1 lg:gap-6">{[0,1,2].map((item) => <div key={item} className={`recipe-skeleton aspect-[16/10] rounded-2xl ${item === 2 ? "hidden md:block" : ""}`} />)}</div></div>}
            {featuredError && <p className="rounded-xl border border-[#D9A83E]/30 bg-white/60 p-5 text-sm text-[#8A5A44]" role="status">Não foi possível carregar os destaques. As receitas abaixo continuam disponíveis.</p>}
            {!featuredLoading && !featuredError && featured.length === 0 && <p className="rounded-xl border border-dashed border-[#D9A83E]/50 p-5 text-sm text-[#8A5A44]">Novos destaques chegam em breve.</p>}
            {!featuredLoading && featured.length > 0 && <div className="grid items-stretch gap-4 lg:grid-cols-[2fr_1fr] lg:gap-6"><RecipeCard recipe={featured[0]} featured /><div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:grid-cols-1 lg:gap-6">{featured.slice(1, 4).map((recipe, index) => <div key={recipe.id} className={index === 2 ? "hidden md:block" : ""}><RecipeCard recipe={recipe} compact /></div>)}</div></div>}
          </div>
        </section>}

        <section id="todas-as-receitas" className="scroll-mt-24 bg-[#F3E5D0]/65 px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-labelledby="all-recipes-title">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6"><p className="eyebrow mb-2">Encontre a sua próxima favorita</p><h2 id="all-recipes-title" className="font-display text-3xl text-[#5A3428] md:text-4xl">Todas as receitas</h2></div>
            <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_2fr] lg:items-start">
              <label className="relative block">
                <span className="sr-only">Buscar por título ou ingrediente</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A5A44]" aria-hidden="true" />
                <Input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar receita ou ingrediente" className="min-h-12 w-full rounded-full border border-[#5A3428]/20 bg-white/80 py-3 pl-12 pr-4 text-sm text-[#5A3428] placeholder:text-[#8A5A44]/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9A83E]" />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible" aria-label="Filtrar receitas por categoria">
                <button type="button" aria-pressed={!category} onClick={() => setCategory("")} className={`recipe-filter ${!category ? "is-active" : ""}`}>Todas</button>
                {RECIPE_CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`recipe-filter ${category === item ? "is-active" : ""}`}>{item}</button>)}
              </div>
            </div>

            <div aria-live="polite" aria-busy={loading}>
              {loading && <CardSkeleton />}
              {!loading && error && <div className="rounded-2xl border border-[#D9A83E]/35 bg-white/70 p-7 text-center" role="alert"><p className="font-display text-2xl">Não conseguimos carregar as receitas</p><p className="mt-2 text-sm text-[#8A5A44]">Verifique sua conexão e tente novamente.</p><button type="button" className="button-outline mt-5" onClick={() => { setError(false); setListRetry((current) => current + 1); }}>Tentar novamente</button></div>}
              {!loading && !error && items.length === 0 && <div className="rounded-2xl border border-dashed border-[#D9A83E]/45 px-5 py-12 text-center"><p className="font-display text-2xl text-[#5A3428]">{query || category ? "Nenhuma receita encontrada" : "Em breve, novas receitas por aqui"}</p><p className="mt-2 text-sm text-[#8A5A44]">{query || category ? "Experimente outro termo ou escolha uma categoria diferente." : "Estamos preparando novidades gostosas para partilhar consigo."}</p>{(query || category) && <button type="button" className="text-cta mt-4" onClick={() => { setSearchInput(""); setCategory(""); }}>Limpar filtros</button>}</div>}
              {!loading && !error && items.length > 0 && <>
                <p className="mb-4 text-xs text-[#8A5A44]">{items.length} {items.length === 1 ? "receita encontrada" : "receitas encontradas"}</p>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
                {moreError && <p className="mt-5 text-center text-sm text-[#8A5A44]" role="alert">Não foi possível carregar mais receitas. Tente novamente.</p>}
                {nextCursor && <div className="mt-8 text-center"><button type="button" disabled={loadingMore} onClick={loadMore} className="button-outline min-w-44" aria-busy={loadingMore}>{loadingMore ? "Carregando…" : moreError ? "Tentar novamente" : "Carregar mais receitas"}</button></div>}
              </>}
            </div>
          </div>
        </section>
        <section className="bg-[#3A241D] px-4 py-12 text-center text-[#FFF9F0] md:px-6 md:py-16 lg:px-8" aria-labelledby="recipes-contact-title">
          <div className="mx-auto max-w-4xl"><p className="eyebrow text-[#D9A83E]">Celebrações com sabor</p><h2 id="recipes-contact-title" className="mt-3 font-display text-4xl md:text-6xl">Quer essa delícia para a sua festa?</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#FFF9F0]/75">A Chocolícia prepara doces e bolos artesanais para tornar cada momento ainda mais especial.</p><a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" className="button-gold mt-6">Pedir orçamento pelo WhatsApp</a></div>
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
