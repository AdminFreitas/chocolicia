import { useEffect, useState } from "react";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import { fetchTips, type TipSummary } from "@/lib/tips";

export default function Dicas() {
  const [articles, setArticles] = useState<TipSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetchTips(controller.signal)
      .then(setArticles)
      .catch(() => { if (!controller.signal.aborted) setState("error"); })
      .finally(() => { if (!controller.signal.aborted) setState((current) => current === "error" ? current : "ready"); });
    return () => controller.abort();
  }, []);

  return (
    <RecipeSiteChrome>
      <RecipePageMeta title="Dicas de confeitaria | Chocolícia" description="Dicas práticas de preparo, apresentação e confeitaria para deixar cada doce ainda mais especial." path="/dicas" />
      <main>
        <section className="bg-[#F3E5D0]/55 px-4 py-12 md:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Aprenda com a Chocolícia</p>
            <h1 className="section-title text-[#5A3428]">Dicas para preparar e apresentar doces</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#8A5A44]">Orientações úteis, com fontes consultadas e cuidado em cada detalhe.</p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8" aria-live="polite">
          {state === "loading" && <p role="status">Carregando dicas…</p>}
          {state === "error" && <p role="alert">Não foi possível carregar as dicas. Tente novamente mais tarde.</p>}
          {state === "ready" && articles.length === 0 && <p className="rounded-2xl border border-dashed border-[#D9A83E]/45 px-5 py-12 text-center text-[#8A5A44]">Novas dicas chegam em breve.</p>}
          {state === "ready" && articles.length > 0 && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => <article key={article.id} className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-white shadow-sm">
              <a href={`/dicas/${encodeURIComponent(article.slug)}`} className="block h-full">
                <img src={article.coverImageVariants.w800 ?? article.coverImageUrl} alt={article.coverImageAlt} loading="lazy" width="800" height="533" className="aspect-[3/2] w-full object-cover" />
                <div className="p-5">
                  <p className="eyebrow">{article.type} · {article.tipTopic?.replaceAll("-", " ") ?? "Conteúdo educativo"}</p>
                  <h2 className="mt-2 font-display text-2xl text-[#5A3428]">{article.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#8A5A44]">{article.excerpt}</p>
                  <p className="mt-3 text-xs text-[#8A5A44]">Por {article.authorName ?? "Chocolícia"}</p><span className="mt-4 inline-block text-sm font-semibold text-[#5A3428]">Ler conteúdo →</span>
                </div>
              </a>
            </article>)}
          </div>}
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
