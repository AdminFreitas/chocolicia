import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Copy, Printer, UsersRound, UtensilsCrossed } from "lucide-react";
import { useRoute } from "wouter";
import RecipeCard from "@/components/RecipeCard";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import { BreadcrumbSchema, FAQSchema } from "@/seo/JsonLd";
import { SITE, WA_ORCAMENTO, waLink } from "@/config/site";
import { fetchRecipe, fetchRecipes, formatRecipeDate, recipeDuration, recipeImage, type RecipeRecord, type RecipeSummary } from "@/lib/recipes";
import NotFound from "@/pages/NotFound";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toIsoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${rest ? `${rest}M` : hours ? "" : "0M"}`;
}

function RecipeJsonLd({ recipe }: { recipe: RecipeRecord }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.excerpt,
    image: [recipeImage(recipe, 1280)],
    author: { "@type": "Organization", name: SITE.fullName, url: SITE.url },
    datePublished: recipe.publishedAt ?? recipe.createdAt,
    prepTime: toIsoDuration(recipe.prepTimeMin),
    cookTime: toIsoDuration(recipe.cookTimeMin),
    totalTime: toIsoDuration(recipe.prepTimeMin + recipe.cookTimeMin),
    recipeYield: `${recipe.servings} porções`,
    recipeCategory: recipe.category,
    keywords: recipe.tags?.join(", "),
    recipeIngredient: recipe.ingredients.flatMap((section) => section.items.map((item) => [item.quantity, item.unit, item.name, item.note ? `(${item.note})` : ""].filter(Boolean).join(" "))),
    recipeInstructions: recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title || `Passo ${index + 1}`,
      text: step.instruction,
    })),
    aggregateRating: undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}

function RecipeSkeleton() {
  return <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-label="Carregando receita" aria-busy="true"><div className="recipe-skeleton h-4 w-36 rounded" /><div className="recipe-skeleton mt-6 h-14 max-w-2xl rounded" /><div className="recipe-skeleton mt-4 h-5 max-w-xl rounded" /><div className="recipe-skeleton mt-8 aspect-[2/1] rounded-2xl" /><div className="mt-10 grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div className="recipe-skeleton h-80 rounded-2xl" /><div className="recipe-skeleton h-96 rounded-2xl" /></div></div>;
}

export default function RecipeDetail() {
  const [, params] = useRoute("/receitas/:slug");
  const slug = params?.slug ?? "";
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [related, setRelated] = useState<RecipeSummary[]>([]);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setStatus("loading");
    setRecipe(null);
    setChecked(new Set());
    fetchRecipe(slug, controller.signal)
      .then((result) => {
        if (result) { setRecipe(result); setStatus("ready"); }
        else setStatus("missing");
      })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setStatus("error"); })
      .finally(() => undefined);
    return () => controller.abort();
  }, [retry, slug]);

  useEffect(() => {
    if (!recipe) return;
    const controller = new AbortController();
    fetchRecipes({ limit: 9, category: recipe.category }, controller.signal)
      .then((page) => setRelated(page.items.filter((item) => item.slug !== recipe.slug).slice(0, 3)))
      .catch(() => { if (!controller.signal.aborted) setRelated([]); });
    return () => controller.abort();
  }, [recipe]);

  const canonicalPath = `/receitas/${encodeURIComponent(slug)}`;
  const ingredientsTotal = recipe?.ingredients.reduce((total, section) => total + section.items.length, 0) ?? 0;
  const completedCount = checked.size;
  const date = formatRecipeDate(recipe?.publishedAt);
  const shareText = useMemo(() => recipe ? `Confira esta receita da Chocolícia: ${recipe.title}` : "", [recipe]);

  async function copyLink() {
    setCopyStatus("");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(window.location.href);
      else {
        const field = document.createElement("textarea");
        field.value = window.location.href;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("clipboard unavailable");
      }
      setCopyStatus("Link copiado!");
    } catch {
      setCopyStatus("Não foi possível copiar o link.");
    }
  }

  async function copyIngredients() {
    if (!recipe) return;
    const text = recipe.ingredients.map((section) => `${section.name}\n${section.items.map((item) => `• ${[item.quantity, item.unit].filter(Boolean).join(" ")} ${item.name}${item.note ? ` (${item.note})` : ""}`.trim()).join("\n")}`).join("\n\n");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("clipboard unavailable");
      }
      setCopyStatus("Lista de ingredientes copiada!");
    } catch {
      setCopyStatus("Não foi possível copiar os ingredientes.");
    }
  }

  if (status === "missing") return <NotFound />;

  if (status === "loading") return <RecipeSiteChrome><main><RecipeSkeleton /></main></RecipeSiteChrome>;

  if (status === "error" || !recipe) return (
    <RecipeSiteChrome>
      <main className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="eyebrow">Ops, algo não correu bem</p>
        <h1 className="mt-3 font-display text-4xl text-[#5A3428]">Não foi possível carregar a receita</h1>
        <p className="mt-3 max-w-lg leading-7 text-[#8A5A44]">Tente novamente. Se o problema continuar, volte à lista de receitas.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => setRetry((current) => current + 1)} className="button-gold">Tentar novamente</button><a href="/receitas" className="button-outline">Ver receitas</a></div>
      </main>
    </RecipeSiteChrome>
  );

  const image = recipeImage(recipe, 1280);

  return (
    <RecipeSiteChrome>
      <RecipePageMeta title={`${recipe.title} | Receita da Chocolícia`} description={recipe.excerpt} path={canonicalPath} image={image} />
      <RecipeJsonLd recipe={recipe} />
      {recipe.faq.length > 0 && <FAQSchema items={recipe.faq} />}
      <BreadcrumbSchema items={[{ name: "Início", url: `${SITE.url}/` }, { name: "Receitas", url: `${SITE.url}/receitas` }, { name: recipe.title, url: `${SITE.url}${canonicalPath}` }]} />
      <main>
        <section className="bg-[#F3E5D0]/50 px-4 pb-9 pt-6 md:px-6 md:pb-12 lg:px-8" aria-labelledby="recipe-title">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Trilha de navegação" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#8A5A44]"><a href="/" className="underline-offset-4 hover:underline">Início</a><span aria-hidden="true">/</span><a href="/receitas" className="underline-offset-4 hover:underline">Receitas</a><span aria-hidden="true">/</span><span aria-current="page">{recipe.title}</span></nav>
            <div className="max-w-4xl">
              <a href="/receitas" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-[#8A5A44] hover:text-[#5A3428]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas as receitas</a>
              <p className="eyebrow mb-3">{recipe.category}</p>
              <h1 id="recipe-title" className="font-display text-5xl font-medium leading-[1.05] tracking-[-.035em] text-[#5A3428] md:text-7xl">{recipe.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#8A5A44] md:text-lg md:leading-8">{recipe.excerpt}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#8A5A44]"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" /> Preparo {recipeDuration(recipe.prepTimeMin)}</span>{recipe.cookTimeMin > 0 && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" /> Cozimento {recipeDuration(recipe.cookTimeMin)}</span>}<span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4" aria-hidden="true" /> {recipe.servings} porções</span><span>{recipe.difficulty}</span>{date && <time dateTime={recipe.publishedAt ?? undefined}>{date}</time>}</div>
            </div>
            <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)] lg:items-stretch">
              <div className="overflow-hidden rounded-2xl border border-[#D9A83E]/20 bg-[#F3E5D0] shadow-[0_20px_55px_rgba(58,36,29,.1)]"><picture><source type="image/avif" srcSet={[recipe.coverImageVariants?.avif480 && `${recipe.coverImageVariants.avif480} 480w`, recipe.coverImageVariants?.avif800 && `${recipe.coverImageVariants.avif800} 800w`, recipe.coverImageVariants?.avif1280 && `${recipe.coverImageVariants.avif1280} 1280w`].filter(Boolean).join(", ") || undefined} sizes="(min-width: 1024px) 66vw, 100vw" /><img src={image} srcSet={[recipe.coverImageVariants?.w480 && `${recipe.coverImageVariants.w480} 480w`, recipe.coverImageVariants?.w800 && `${recipe.coverImageVariants.w800} 800w`, recipe.coverImageVariants?.w1280 && `${recipe.coverImageVariants.w1280} 1280w`].filter(Boolean).join(", ") || undefined} sizes="(min-width: 1024px) 66vw, 100vw" width="1280" height="853" alt={recipe.coverImageAlt} loading="eager" fetchPriority="high" className="aspect-[3/2] w-full object-cover lg:aspect-auto lg:h-full" /></picture></div>
              <aside className="flex flex-col justify-between rounded-2xl border border-[#D9A83E]/25 bg-[#FFF9F0] p-5 md:p-6">
                <div><p className="eyebrow">Ficha da receita</p><h2 className="mt-2 font-display text-2xl">Vamos preparar?</h2><p className="mt-2 text-sm leading-6 text-[#8A5A44]">Organize os ingredientes e siga as etapas no seu ritmo.</p><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-[#F3E5D0]/60 p-3"><Clock3 className="mb-2 h-4 w-4 text-[#8A5A44]" aria-hidden="true" /><span className="block text-[#8A5A44]">Tempo total</span><strong>{recipeDuration(recipe.prepTimeMin + recipe.cookTimeMin)}</strong></div><div className="rounded-xl bg-[#F3E5D0]/60 p-3"><UtensilsCrossed className="mb-2 h-4 w-4 text-[#8A5A44]" aria-hidden="true" /><span className="block text-[#8A5A44]">Rendimento</span><strong>{recipe.servings} porções</strong></div></div></div>
                <div className="mt-5 flex flex-wrap gap-2 print:hidden"><button type="button" onClick={copyIngredients} className="button-outline !min-h-10 !px-3 !py-2 text-xs"><Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copiar ingredientes</button><button type="button" onClick={copyLink} className="button-outline !min-h-10 !px-3 !py-2 text-xs"><Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copiar link</button><button type="button" onClick={() => window.print()} className="button-outline !min-h-10 !px-3 !py-2 text-xs"><Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Imprimir receita</button><a href={waLink(`${shareText}\n${typeof window !== "undefined" ? window.location.href : ""}`)} target="_blank" rel="noreferrer" className="button-gold !min-h-10 !px-3 !py-2 text-xs">Compartilhar no WhatsApp</a></div>
                <p className="mt-2 min-h-5 text-xs text-[#8A5A44]" role="status" aria-live="polite">{copyStatus}</p>
              </aside>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-14 lg:px-8">
          <aside className="self-start rounded-2xl border border-[#D9A83E]/30 bg-white/60 p-5 md:p-7 lg:sticky lg:top-28" aria-labelledby="ingredients-title">
            <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Tudo à mão</p><h2 id="ingredients-title" className="mt-2 font-display text-3xl">Ingredientes</h2></div><span className="rounded-full bg-[#D9A83E]/20 px-3 py-1 text-xs font-semibold">{completedCount}/{ingredientsTotal}</span></div>
            <p className="mt-2 text-xs text-[#8A5A44]">Toque para marcar o que já separou.</p>
            <div className="mt-5 space-y-6">{recipe.ingredients.map((section, sectionIndex) => <section key={`${section.name}-${sectionIndex}`}><h3 className="mb-3 border-b border-[#D9A83E]/30 pb-2 font-display text-xl">{section.name}</h3><ul className="space-y-3">{section.items.map((ingredient, itemIndex) => {
              const key = `${sectionIndex}-${itemIndex}`;
              const isChecked = checked.has(key);
              const id = `ingredient-${sectionIndex}-${itemIndex}`;
              return <li key={key}><label htmlFor={id} className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm leading-6 transition-colors hover:bg-[#F3E5D0]/50 focus-within:outline focus-within:outline-2 focus-within:outline-[#D9A83E] ${isChecked ? "text-[#8A5A44]/65 line-through" : "text-[#5A3428]"}`}><Checkbox id={id} checked={isChecked} onCheckedChange={(value) => setChecked((current) => { const next = new Set(current); if (value === true) next.add(key); else next.delete(key); return next; })} className="mt-1 h-5 w-5 shrink-0 border-[#8A5A44]/50 data-[state=checked]:border-[#5A3428] data-[state=checked]:bg-[#5A3428] data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-[#D9A83E]" /><span><strong className="font-semibold">{[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}</strong>{ingredient.quantity || ingredient.unit ? " " : ""}{ingredient.name}{ingredient.note && <span className="block text-xs text-[#8A5A44]">{ingredient.note}</span>}</span></label></li>;
            })}</ul></section>)}</div>
          </aside>

          <div className="min-w-0">
            <section aria-labelledby="method-title">
              <p className="eyebrow">Mãos à obra</p><h2 id="method-title" className="mt-2 font-display text-3xl md:text-4xl">Modo de preparo</h2>
              <ol className="mt-6 space-y-6">{recipe.steps.map((step, index) => <li key={`${index}-${step.title ?? "passo"}`} className="flex gap-4 md:gap-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D9A83E]/20 font-display text-xl text-[#5A3428]">{index + 1}</span><div className="border-b border-[#5A3428]/10 pb-5"><h3 className="font-display text-xl text-[#5A3428]">{step.title || `Passo ${index + 1}`}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#8A5A44] md:text-base">{step.instruction}</p></div></li>)}</ol>
            </section>

            {recipe.tips.length > 0 && <section className="mt-10 rounded-2xl bg-[#F3E5D0]/65 p-5 md:mt-12 md:p-7" aria-labelledby="tips-title"><p className="eyebrow">Um toque a mais</p><h2 id="tips-title" className="mt-2 font-display text-2xl">Dicas da Chocolícia</h2><ul className="mt-4 space-y-3">{recipe.tips.map((tip, index) => <li key={`${index}-${tip}`} className="flex gap-3 text-sm leading-7 text-[#8A5A44]"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A83E]" aria-hidden="true" />{tip}</li>)}</ul></section>}

            {recipe.storageNotes && <section className="mt-7 rounded-2xl border border-[#D9A83E]/30 p-5 md:p-7" aria-labelledby="storage-title"><p className="eyebrow">Para aproveitar depois</p><h2 id="storage-title" className="mt-2 font-display text-2xl">Como conservar</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#8A5A44]">{recipe.storageNotes}</p></section>}

            {recipe.faq.length > 0 && <section className="mt-10" aria-labelledby="recipe-faq-title"><p className="eyebrow">Mais informações</p><h2 id="recipe-faq-title" className="mt-2 font-display text-3xl">Perguntas frequentes</h2><Accordion type="single" collapsible className="faq-list mt-5 overflow-hidden rounded-xl border border-[#D9A83E]/35 bg-[#FFF9F0] px-4">{recipe.faq.map((item, index) => <AccordionItem className="faq-item border-[#D9A83E]/25" value={`faq-${index}`} key={`${index}-${item.question}`}><AccordionTrigger className="text-left text-[#5A3428] hover:no-underline">{item.question}</AccordionTrigger><AccordionContent className="leading-7 text-[#8A5A44]">{item.answer}</AccordionContent></AccordionItem>)}</Accordion></section>}
          </div>
        </div>

        {related.length > 0 && <section className="bg-[#F3E5D0]/45 px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-labelledby="more-recipes-title"><div className="mx-auto max-w-7xl"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2">Continue se inspirando</p><h2 id="more-recipes-title" className="font-display text-3xl md:text-4xl">Mais receitas</h2></div><a href="/receitas" className="text-cta">Ver todas <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" /></a></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <RecipeCard key={item.id} recipe={item} />)}</div></div></section>}
        <section className="bg-[#F3E5D0]/55 px-4 py-10 text-center md:px-6 md:py-14"><p className="font-display text-2xl">Prefere encomendar? Peça o seu</p><p className="mt-2 text-sm text-[#8A5A44]">Conte-nos a sua ideia e preparemos algo feito à mão para a sua celebração.</p><a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" className="button-gold mt-5">Pedir pelo WhatsApp</a></section>
      </main>
    </RecipeSiteChrome>
  );
}
