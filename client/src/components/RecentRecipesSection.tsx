import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import RecipeCard from "@/components/RecipeCard";
import { fetchFeaturedRecipes, type RecipeSummary } from "@/lib/recipes";

export default function RecentRecipesSection() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchFeaturedRecipes(controller.signal)
      .then((items) => setRecipes(items.slice(0, 3)))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <section id="receitas-recentes" data-reveal className="reveal bg-[#F3E5D0]/45 px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
          <div>
            <p className="eyebrow mb-3">Da nossa cozinha para a sua</p>
            <h2 className="section-title">Receitas com carinho</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#8A5A44]">Ideias doces, explicadas passo a passo para preparar e compartilhar em casa.</p>
          </div>
          <a href="/receitas" className="text-cta">Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>

        {loading && <div className="grid gap-4 md:grid-cols-[2fr_1fr] md:gap-6" aria-label="Carregando receitas" aria-busy="true"><div className="recipe-skeleton aspect-[2/1] rounded-2xl" /><div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-6"><div className="recipe-skeleton aspect-[3/2] rounded-2xl" /><div className="recipe-skeleton aspect-[3/2] rounded-2xl" /></div></div>}
        {error && <div className="rounded-xl border border-[#D9A83E]/30 bg-[#FFF9F0] p-5 text-sm text-[#8A5A44]" role="status">As receitas não estão disponíveis neste momento. <a href="/receitas" className="font-semibold underline underline-offset-4">Visitar todas as receitas</a>.</div>}
        {!loading && !error && recipes.length === 0 && <div className="rounded-xl border border-dashed border-[#D9A83E]/50 bg-[#FFF9F0]/70 p-8 text-center text-sm text-[#8A5A44]">Em breve, novas receitas feitas com carinho.</div>}
        {!loading && recipes.length > 0 && (
          <div className="grid items-start gap-4 md:grid-cols-[2fr_1fr] md:gap-6">
            <RecipeCard recipe={recipes[0]} featured />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-6">
              {recipes.slice(1, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} compact />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
