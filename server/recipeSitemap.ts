import { SITE } from "../client/src/config/site";
import { getPublishedRecipeSlugs } from "./recipeDb";
import { getPublishedArticleSlugs } from "./articlesDb";

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function generateRecipesSitemap() {
  const [recipes, articles] = await Promise.all([getPublishedRecipeSlugs(), getPublishedArticleSlugs()]);
  const staticPaths = ["/", "/receitas", "/dicas", "/buffet-para-festas", "/bolos-personalizados", "/doces-para-festas", "/areas-atendidas"];
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...staticPaths.map((page) => `<url><loc>${xmlEscape(`${SITE.url}${page === "/" ? "/" : page}`)}</loc><lastmod>${today}</lastmod></url>`),
    ...recipes.map((recipe) => `<url><loc>${xmlEscape(`${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`)}</loc><lastmod>${recipe.updatedAt.toISOString()}</lastmod></url>`),
    ...articles.map((article) => `<url><loc>${xmlEscape(`${SITE.url}/dicas/${encodeURIComponent(article.slug)}`)}</loc><lastmod>${(article.updatedAt ?? new Date(0)).toISOString()}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}
