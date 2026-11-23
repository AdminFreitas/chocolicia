import { SITE } from "../client/src/config/site";
import type { ArticleRecord } from "../drizzle/schema";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function articleBody(article: ArticleRecord) {
  const paragraphs = article.content.split(/\r?\n/).map((line) => {
    const text = line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim();
    if (!text) return "";
    if (/^#{1,6}\s+/.test(line)) return `<h2>${escapeHtml(text)}</h2>`;
    return `<p>${escapeHtml(text)}</p>`;
  }).join("");
  return `<main id="article-prerender" lang="pt-BR"><article><p>Dica da Chocolícia</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.excerpt ?? "")}</p>${article.coverImageUrl ? `<img src="${escapeHtml(article.coverImageUrl)}" alt="${escapeHtml(article.coverImageAlt ?? article.title)}" width="1280" height="853" />` : ""}<p>Imagem ilustrativa</p>${paragraphs}<p>Conteúdo elaborado pela Equipe Chocolícia com apoio de inteligência artificial.</p><a href="/dicas">Voltar às dicas</a></article></main>`;
}

export function renderArticlePageHtml(template: string, article: ArticleRecord | null) {
  if (!article) {
    const body = '<main id="article-prerender" lang="pt-BR"><h1>Dica não encontrada</h1><p>Este conteúdo não está disponível.</p><a href="/dicas">Voltar às dicas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Dica não encontrada | Chocolícia</title>")
      .replace("<head>", '<head><meta name="robots" content="noindex,follow" />')
      .replace('<div id="root"></div>', `<div id="root" data-article-prerendered="true">${body}</div>`);
  }
  const canonical = `${SITE.url}/dicas/${encodeURIComponent(article.slug)}`;
  const title = escapeHtml(`${article.title} | Dicas Chocolícia`);
  const description = escapeHtml(article.excerpt ?? "");
  const image = article.coverImageUrl ? escapeHtml(article.coverImageUrl) : "";
  const modifiedAt = article.updatedAt ?? new Date(0);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? "",
    image: article.coverImageUrl ? [article.coverImageUrl] : [],
    author: { "@type": "Organization", name: "Equipe Chocolícia" },
    publisher: { "@type": "Organization", name: SITE.fullName, url: SITE.url },
    datePublished: article.publishedAt?.toISOString(),
    dateModified: modifiedAt.toISOString(),
  }).replace(/</g, "\\u003c");
  const head = `<title>${title}</title><meta name="description" content="${description}" /><link rel="canonical" href="${escapeHtml(canonical)}" /><meta property="og:type" content="article" /><meta property="og:url" content="${escapeHtml(canonical)}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:image" content="${image}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${title}" /><meta name="twitter:description" content="${description}" /><meta name="twitter:image" content="${image}" /><script type="application/ld+json">${jsonLd}</script>`;
  const html = template.replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<link rel="canonical"[^>]*\/?\s*>/g, "")
    .replace(/<meta property="og:[^>]*\/?\s*>/g, "")
    .replace(/<meta name="twitter:[^>]*\/?\s*>/g, "")
    .replace(/<meta name="description"[^>]*\/?\s*>/g, "")
    .replace("<head>", `<head>${head}`);
  return html.replace('<div id="root"></div>', `<div id="root" data-article-prerendered="true">${articleBody(article)}</div>`);
}
