import RecipeSiteChrome from "@/components/RecipeSiteChrome";

type Props = { detail?: boolean };

export default function RecipeRouteFallback({ detail = false }: Props) {
  return (
    <RecipeSiteChrome>
      <main className="min-h-[70vh] bg-[#FFF9F0] px-4 py-10 md:px-6 md:py-14 lg:px-8" aria-label={detail ? "Carregando receita" : "Carregando receitas"} aria-busy="true">
        <div className="mx-auto max-w-7xl">
          {detail ? (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div className="recipe-skeleton aspect-[3/2] rounded-2xl" />
              <div className="space-y-5 py-2">
                <div className="recipe-skeleton h-3 w-36 rounded" />
                <div className="recipe-skeleton h-12 w-4/5 rounded" />
                <div className="recipe-skeleton h-4 w-full rounded" />
                <div className="recipe-skeleton h-4 w-2/3 rounded" />
                <div className="recipe-skeleton mt-8 h-28 w-full rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              <div className="recipe-skeleton h-3 w-44 rounded" />
              <div className="recipe-skeleton mt-5 h-14 max-w-3xl rounded" />
              <div className="recipe-skeleton mt-4 h-4 max-w-2xl rounded" />
              <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="recipe-skeleton aspect-[4/3] rounded-2xl lg:row-span-3 lg:min-h-[32rem]" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
                  {[0, 1, 2].map((item) => <div key={item} className={`recipe-skeleton aspect-[16/10] rounded-2xl ${item === 2 ? "hidden md:block" : ""}`} />)}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </RecipeSiteChrome>
  );
}
