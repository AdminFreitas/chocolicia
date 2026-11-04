import { ArrowUpRight, Clock3, UsersRound } from "lucide-react";
import type { RecipeSummary } from "@/lib/recipes";
import { formatRecipeDate, recipeDuration, recipeImage } from "@/lib/recipes";

type Props = { recipe: RecipeSummary; compact?: boolean; featured?: boolean; className?: string };

export default function RecipeCard({ recipe, compact = false, featured = false, className = "" }: Props) {
  const total = recipe.prepTimeMin + recipe.cookTimeMin;
  const webpSrcSet = [
    recipe.coverImageVariants?.w480 && `${recipe.coverImageVariants.w480} 480w`,
    recipe.coverImageVariants?.w800 && `${recipe.coverImageVariants.w800} 800w`,
    recipe.coverImageVariants?.w1280 && `${recipe.coverImageVariants.w1280} 1280w`,
  ].filter(Boolean).join(", ");
  const avifSrcSet = [
    recipe.coverImageVariants?.avif480 && `${recipe.coverImageVariants.avif480} 480w`,
    recipe.coverImageVariants?.avif800 && `${recipe.coverImageVariants.avif800} 800w`,
    recipe.coverImageVariants?.avif1280 && `${recipe.coverImageVariants.avif1280} 1280w`,
  ].filter(Boolean).join(", ");
  const date = formatRecipeDate(recipe.publishedAt);

  return (
    <a
      href={`/receitas/${encodeURIComponent(recipe.slug)}`}
      className={`recipe-card group block overflow-hidden rounded-2xl border border-[#D9A83E]/25 bg-[#FFF9F0] shadow-[0_16px_45px_rgba(58,36,29,.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D9A83E] ${featured ? "recipe-card-featured" : ""} ${compact ? "recipe-card-compact" : ""} ${className}`}
      aria-label={`Ver receita: ${recipe.title}`}
    >
      <div className={`relative overflow-hidden bg-[#F3E5D0] ${featured ? "aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[32rem]" : compact ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <picture className="absolute inset-0 block h-full w-full">
          {avifSrcSet && <source type="image/avif" srcSet={avifSrcSet} sizes={featured ? "(min-width: 1024px) 66vw, 100vw" : compact ? "(min-width: 1024px) 34vw, 50vw" : "(min-width: 1024px) 33vw, 100vw"} />}
          <img
            src={recipeImage(recipe, featured ? 1280 : compact ? 480 : 800)}
            srcSet={webpSrcSet || undefined}
            sizes={featured ? "(min-width: 1024px) 66vw, 100vw" : compact ? "(min-width: 1024px) 34vw, 50vw" : "(min-width: 1024px) 33vw, 100vw"}
            width="1280"
            height="960"
            alt={recipe.coverImageAlt}
            loading={featured ? "eager" : "lazy"}
            fetchPriority={featured ? "high" : "auto"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </picture>
        <span className="recipe-category-chip absolute left-4 top-4 rounded-full border border-[#F3CD73]/60 px-3 py-1 text-[.65rem] font-semibold uppercase tracking-[.14em] text-[#F3CD73]">{recipe.category}</span>
        {(featured || compact) && <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#3A241D]/90 via-[#3A241D]/25 to-transparent p-4 text-[#FFF9F0] md:p-5">
          <h3 className={`line-clamp-2 font-display font-medium leading-tight ${featured ? "text-3xl md:text-5xl" : "text-lg md:text-xl"}`}>{recipe.title}</h3>
          {featured && <><p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[#FFF9F0]/80">{recipe.excerpt}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#FFF9F0]/70"><span>{date}</span><span>{recipeDuration(total)}</span><span>{recipe.servings} porções</span></div></>}
        </div>}
      </div>
      {!featured && !compact && <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8A5A44]">
          {date && <time dateTime={recipe.publishedAt ?? undefined}>{date}</time>}
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{recipeDuration(total)}</span>
          <span className="inline-flex items-center gap-1"><UsersRound className="h-3.5 w-3.5" aria-hidden="true" />{recipe.servings} porções</span>
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-2xl font-medium leading-tight text-[#5A3428]">{recipe.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8A5A44]">{recipe.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#5A3428] underline decoration-[#D9A83E]/80 underline-offset-4">
          Ver receita <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>}
    </a>
  );
}
