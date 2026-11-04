import { SITE } from "../client/src/config/site";
import type { Recipe } from "../drizzle/schema";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function plainText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function minutes(value: number) {
  return `PT${Math.max(0, value)}M`;
}

function recipeJsonLd(recipe: Recipe) {
  const ingredientList = recipe.ingredients.flatMap((section) => section.items.map((item) =>
    [item.quantity, item.unit, item.name, item.note].filter(Boolean).join(" ").trim(),
  ));
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.excerpt,
    image: [recipe.coverImageUrl],
    author: { "@type": "Organization", name: "Chocolícia" },
    datePublished: recipe.publishedAt?.toISOString(),
    recipeCategory: recipe.category,
    keywords: recipe.tags.join(", "),
    prepTime: minutes(recipe.prepTimeMin),
    cookTime: minutes(recipe.cookTimeMin),
    totalTime: minutes(recipe.prepTimeMin + recipe.cookTimeMin),
    recipeYield: `${recipe.servings} porções`,
    recipeIngredient: ingredientList,
    recipeInstructions: recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title || `Passo ${index + 1}`,
      text: step.instruction,
    })),
  };
}

function recipeBody(recipe: Recipe) {
  const ingredientSections = recipe.ingredients.map((section) => `
    <section><h2>${escapeHtml(section.name)}</h2><ul>${section.items.map((item) => `<li>${escapeHtml([item.quantity, item.unit, item.name, item.note].filter(Boolean).join(" "))}</li>`).join("")}</ul></section>`).join("");
  const steps = recipe.steps.map((step, index) => `<li><strong>Passo ${index + 1}${step.title ? ` — ${escapeHtml(step.title)}` : ""}:</strong> ${escapeHtml(step.instruction)}</li>`).join("");
  return `<main id="recipe-prerender" class="recipe-prerender" lang="pt-BR">
    <article><p>${escapeHtml(recipe.category)}</p><h1>${escapeHtml(recipe.title)}</h1><p>${escapeHtml(recipe.excerpt)}</p>
    <img src="${escapeHtml(recipe.coverImageUrl)}" alt="${escapeHtml(recipe.coverImageAlt)}" width="1200" height="800" fetchpriority="high" />
    <p>Preparo: ${recipe.prepTimeMin} min · Total: ${recipe.prepTimeMin + recipe.cookTimeMin} min · Rende ${recipe.servings} porções · ${escapeHtml(recipe.difficulty)}</p>
    <p>Publicado em ${recipe.publishedAt?.toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }) ?? ""}</p>
    <h2>Ingredientes</h2>${ingredientSections}<h2>Modo de preparo</h2><ol>${steps}</ol>
    ${recipe.tips.length ? `<section><h2>Dicas da Chocolícia</h2><ul>${recipe.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul></section>` : ""}
    ${recipe.storageNotes ? `<section><h2>Como conservar</h2><p>${escapeHtml(recipe.storageNotes)}</p></section>` : ""}
    ${recipe.faq.length ? `<section><h2>Perguntas frequentes</h2>${recipe.faq.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join("")}</section>` : ""}
    <p><a href="/receitas">Ver todas as receitas da Chocolícia</a></p></article></main>`;
}

export function renderRecipePageHtml(template: string, recipe: Recipe | null) {
  if (!recipe) {
    const body = '<main id="recipe-prerender" lang="pt-BR"><h1>Receita não encontrada</h1><p>Esta receita não está disponível.</p><a href="/receitas">Voltar às receitas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Receita não encontrada | Chocolícia</title>")
      .replace("<head>", '<head><meta name="robots" content="noindex,follow" />')
      .replace('<div id="root"></div>', `<div id="root" data-recipe-prerendered="true">${body}</div>`);
  }
  const canonical = `${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`;
  const description = escapeHtml(recipe.excerpt);
  const title = escapeHtml(`${recipe.title} | Receitas Chocolícia`);
  const image = escapeHtml(recipe.coverImageUrl);
  const jsonLd = JSON.stringify(recipeJsonLd(recipe)).replace(/</g, "\\u003c");
  const head = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${jsonLd}</script>`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<link rel="canonical"[^>]*\/?\s*>/g, "")
    .replace(/<meta property="og:[^>]*\/?\s*>/g, "")
    .replace(/<meta name="twitter:[^>]*\/?\s*>/g, "")
    .replace(/<meta name="description"[^>]*\/?\s*>/g, "")
    .replace("<head>", `<head>${head}`);
  html = html.replace('<div id="root"></div>', `<div id="root" data-recipe-prerendered="true">${recipeBody(recipe)}</div>`);
  return html;
}

export function renderDynamicRecipeFallback(title: string, description: string) {
  return `<main id="recipe-prerender" lang="pt-BR"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main>`;
}
