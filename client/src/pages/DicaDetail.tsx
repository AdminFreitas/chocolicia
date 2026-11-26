import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import NotFound from "@/pages/NotFound";
import { SITE } from "@/config/site";
import { fetchTip, type TipRecord } from "@/lib/tips";

function renderBody(markdown: string) {
  return markdown.split(/\r?\n/).map((line, index) => {
    const text = line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim();
    if (!text) return null;
    if (/^#{1,6}\s+/.test(line)) return <h2 key={index} className="mt-8 font-display text-2xl text-[#5A3428]">{text}</h2>;
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) return <p key={index} className="ml-5 list-item list-disc leading-7 text-[#6D5146]">{text}</p>;
    return <p key={index} className="leading-7 text-[#6D5146]">{text}</p>;
  });
}

function ArticleJsonLd({ article }: { article: TipRecord }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? "",
    image: [article.coverImageUrl],
    author: { "@type": "Person", name: article.authorName ?? "Chocolícia" },
    publisher: { "@type": "Organization", name: SITE.fullName, url: SITE.url },
    datePublished: article.publishedAt ?? article.createdAt,
    dateModified: article.updatedAt,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function DicaDetail() {
  const [, params] = useRoute("/dicas/:slug");
  const slug = params?.slug ?? "";
  const [article, setArticle] = useState<TipRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetchTip(slug, controller.signal)
      .then((result) => { setArticle(result); setState(result ? "ready" : "missing"); })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [slug]);

  if (state === "missing") return <NotFound />;
  if (state === "loading") return <RecipeSiteChrome><main className="mx-auto max-w-4xl px-4 py-16" role="status">Carregando dica…</main></RecipeSiteChrome>;
  if (state === "error" || !article) return <RecipeSiteChrome><main className="mx-auto max-w-4xl px-4 py-16" role="alert">Não foi possível carregar esta dica.</main></RecipeSiteChrome>;

  const canonical = `/dicas/${encodeURIComponent(article.slug)}`;
  const source = article.coverImageSource;
  const attribution = typeof source?.attributionText === "string" ? source.attributionText : "";
  return <RecipeSiteChrome>
    <RecipePageMeta title={`${article.title} | Dicas Chocolícia`} description={article.excerpt ?? ""} path={canonical} image={article.coverImageUrl} />
    <ArticleJsonLd article={article} />
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-[#8A5A44]"><a href="/">Início</a> / <a href="/dicas">Dicas</a> / <span aria-current="page">{article.title}</span></nav>
      <article>
        <p className="eyebrow">{article.tipTopic?.replaceAll("-", " ") ?? "Conteúdo educativo"}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-[#5A3428] md:text-6xl">{article.title}</h1>
        <p className="mt-4 text-lg leading-8 text-[#8A5A44]">{article.excerpt}</p>
        <figure className="my-8 overflow-hidden rounded-2xl">
          <picture>
            <source type="image/avif" srcSet={article.coverImageVariants.avif1280 ?? undefined} />
            <img src={article.coverImageVariants.w1280 ?? article.coverImageUrl} alt={article.coverImageAlt} width="1280" height="853" fetchPriority="high" className="aspect-[3/2] w-full object-cover" />
          </picture>
          <figcaption className="mt-2 text-xs text-[#8A5A44]">Imagem ilustrativa{article.coverImageIsAi ? " — gerada por inteligência artificial" : ""}{attribution ? `. ${attribution}` : ""}</figcaption>
        </figure>
        <div className="space-y-4">{renderBody(article.bodyMd)}</div>
        {article.sources.length > 0 && <section className="mt-10 border-t border-[#D9A83E]/30 pt-6" aria-labelledby="sources-title">
          <h2 id="sources-title" className="font-display text-2xl text-[#5A3428]">Fontes consultadas</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#6D5146]">
            {article.sources.map((sourceItem, index) => <li key={`${sourceItem.url}-${index}`}><a className="underline" href={sourceItem.url} rel="noreferrer">{sourceItem.name}: {sourceItem.title}</a></li>)}
          </ul>
        </section>}
        <p className="mt-8 text-sm text-[#8A5A44]">Conteúdo elaborado pela Equipe Chocolícia com apoio de inteligência artificial.</p>
        <a href="/dicas" className="mt-6 inline-block font-semibold text-[#5A3428]">← Voltar às dicas</a>
      </article>
    </main>
  </RecipeSiteChrome>;
}
