import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { useRoute } from "wouter";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import RecipePageMeta from "@/components/RecipePageMeta";
import { BreadcrumbSchema } from "@/seo/JsonLd";
import { SITE } from "@/config/site";
import { fetchTip, formatTipDate, type TipDetailRecord } from "@/lib/tips";
import NotFound from "@/pages/NotFound";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function inlineText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function TipContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];
  const flushLists = () => {
    if (unordered.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="my-5 list-disc space-y-2 pl-6">{unordered.map((item, index) => <li key={index}>{inlineText(item)}</li>)}</ul>);
      unordered = [];
    }
    if (ordered.length) {
      blocks.push(<ol key={`ol-${blocks.length}`} className="my-5 list-decimal space-y-2 pl-6">{ordered.map((item, index) => <li key={index}>{inlineText(item)}</li>)}</ol>);
      ordered = [];
    }
  };
  lines.forEach((line, index) => {
    const value = line.trim();
    if (!value) { flushLists(); return; }
    const heading = value.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushLists();
      const level = heading[1].length;
      const className = level === 1 ? "mt-8 font-display text-3xl text-[#5A3428]" : level === 2 ? "mt-7 font-display text-2xl text-[#5A3428]" : "mt-6 text-lg font-semibold text-[#5A3428]";
      blocks.push(level === 1 ? <h2 key={index} className={className}>{inlineText(heading[2])}</h2> : level === 2 ? <h2 key={index} className={className}>{inlineText(heading[2])}</h2> : <h3 key={index} className={className}>{inlineText(heading[2])}</h3>);
      return;
    }
    if (/^[-*]\s+/.test(value)) { if (ordered.length) flushLists(); unordered.push(value.replace(/^[-*]\s+/, "")); return; }
    if (/^\d+\.\s+/.test(value)) { if (unordered.length) flushLists(); ordered.push(value.replace(/^\d+\.\s+/, "")); return; }
    flushLists();
    if (value.startsWith("> ")) blocks.push(<blockquote key={index} className="my-5 border-l-4 border-[#D9A83E] pl-5 italic text-[#8A5A44]">{inlineText(value.slice(2))}</blockquote>);
    else blocks.push(<p key={index} className="my-4 text-base leading-8 text-[#5A3428]">{inlineText(value)}</p>);
  });
  flushLists();
  return <div className="tip-content">{blocks}</div>;
}

function TipSkeleton() {
  return <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-label="Carregando dica" aria-busy="true"><div className="recipe-skeleton h-4 w-32 rounded" /><div className="recipe-skeleton mt-6 h-12 max-w-3xl rounded" /><div className="recipe-skeleton mt-4 h-5 max-w-xl rounded" /><div className="recipe-skeleton mt-8 aspect-[16/8] rounded-2xl" /><div className="mt-10 space-y-4"><div className="recipe-skeleton h-5 w-full rounded" /><div className="recipe-skeleton h-5 w-full rounded" /><div className="recipe-skeleton h-5 w-4/5 rounded" /></div></div>;
}

export default function TipDetail() {
  const [, params] = useRoute("/dicas/:slug");
  const slug = params?.slug ?? "";
  const [item, setItem] = useState<TipDetailRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setStatus("loading");
    setItem(null);
    fetchTip(slug, controller.signal)
      .then((result) => {
        if (result) { setItem(result); setStatus("ready"); }
        else setStatus("missing");
      })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setStatus("error"); });
    return () => controller.abort();
  }, [retry, slug]);

  if (status === "missing") return <NotFound />;
  if (status === "loading") return <RecipeSiteChrome section="tips"><main><TipSkeleton /></main></RecipeSiteChrome>;
  if (status === "error" || !item) return (
    <RecipeSiteChrome section="tips">
      <main className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="eyebrow">Ops, algo não correu bem</p>
        <h1 className="mt-3 font-display text-4xl text-[#5A3428]">Não foi possível carregar a dica</h1>
        <p className="mt-3 max-w-lg leading-7 text-[#8A5A44]">Tente novamente ou volte para a lista de dicas.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => setRetry((value) => value + 1)} className="button-gold">Tentar novamente</button><a href="/dicas" className="button-outline">Ver dicas</a></div>
      </main>
    </RecipeSiteChrome>
  );

  const { tip } = item;
  const date = formatTipDate(tip.publishedAt);
  const path = `/dicas/${encodeURIComponent(tip.slug)}`;
  return (
    <RecipeSiteChrome section="tips">
      <RecipePageMeta title={tip.metaTitle || tip.title} description={tip.metaDescription || tip.excerpt || "Dicas práticas de confeitaria e preparo da Chocolícia."} path={path} image={tip.coverImageUrl || undefined} />
      <BreadcrumbSchema items={[{ name: "Início", url: SITE.url }, { name: "Dicas", url: `${SITE.url}/dicas` }, { name: tip.title, url: `${SITE.url}${path}` }]} />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12 lg:px-8" aria-label="Conteúdo da dica">
          <a href="/dicas" className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A5A44] hover:text-[#5A3428]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas as dicas</a>
          <header className="mt-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#8A5A44]"><span>{item.topicName || "Dica"}</span>{date && <><span aria-hidden="true">·</span><time dateTime={tip.publishedAt ?? undefined}>{date}</time></>}{item.authorName && <><span aria-hidden="true">·</span><span>{item.authorName}</span></>}</div>
            <h1 className="mt-3 font-display text-4xl leading-tight text-[#5A3428] md:text-5xl">{tip.title}</h1>
            {tip.excerpt && <p className="mt-4 max-w-3xl text-lg leading-8 text-[#8A5A44]">{tip.excerpt}</p>}
          </header>
          {tip.coverImageUrl ? <img src={tip.coverImageUrl} alt={tip.coverImageAlt || tip.title} className="mt-8 aspect-[16/8] w-full rounded-2xl object-cover" fetchPriority="high" /> : <div className="mt-8 flex aspect-[16/8] items-center justify-center rounded-2xl bg-[#F3E5D0] text-[#D9A83E]"><Lightbulb className="h-20 w-20" aria-hidden="true" /></div>}
          <div className="mx-auto mt-8 max-w-3xl"><TipContent content={tip.content} /></div>
          {item.images?.filter((image) => image.imageUrl).map((image, index) => <figure key={`${image.imageId || image.imageUrl}-${index}`} className="mx-auto mt-8 max-w-3xl"><img src={image.imageUrl!} alt={image.altText || tip.title} loading="lazy" className="w-full rounded-2xl object-cover" />{image.caption && <figcaption className="mt-2 text-center text-xs text-[#8A5A44]">{image.caption}</figcaption>}</figure>)}
          {item.relatedTags?.length > 0 && <div className="mx-auto mt-8 flex max-w-3xl flex-wrap gap-2">{item.relatedTags.map((tag) => <span key={tag.slug} className="rounded-full border border-[#D9A83E]/40 px-3 py-1 text-xs text-[#8A5A44]">{tag.name}</span>)}</div>}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#D9A83E]/30 bg-[#F3E5D0]/45 p-6 text-center"><p className="font-display text-2xl text-[#5A3428]">Gostou da dica?</p><p className="mt-2 text-sm leading-6 text-[#8A5A44]">Explore mais conteúdos práticos para suas criações.</p><a href="/dicas" className="button-gold mt-4 inline-flex">Mais dicas</a></div>
        </section>
      </main>
    </RecipeSiteChrome>
  );
}
