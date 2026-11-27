import { SITE } from "../client/src/config/site";
import { getPublishedTipBySlug } from "./tipsDb";

type PublishedTip = NonNullable<Awaited<ReturnType<typeof getPublishedTipBySlug>>>;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function markdownToHtml(content: string) {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
      paragraph = [];
    }
    if (unordered.length) {
      blocks.push(`<ul>${unordered.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      unordered = [];
    }
    if (ordered.length) {
      blocks.push(`<ol>${ordered.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      ordered = [];
    }
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const level = Math.min(3, heading[1].length + 1);
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (paragraph.length || ordered.length) flush();
      unordered.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (paragraph.length || unordered.length) flush();
      ordered.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }
    if (line.startsWith("> ")) {
      flush();
      blocks.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }
    if (unordered.length || ordered.length) flush();
    paragraph.push(line);
  }
  flush();
  return blocks.join("\n");
}

function publishedDate(value: Date | null) {
  return value?.toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }) ?? "";
}

function tipJsonLd(item: PublishedTip) {
  const { tip, topicName } = item;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: tip.title,
    description: tip.excerpt,
    url: tip.canonicalUrl || `${SITE.url}/dicas/${encodeURIComponent(tip.slug)}`,
    datePublished: tip.publishedAt?.toISOString(),
    dateModified: tip.updatedAt?.toISOString(),
    image: tip.coverImageUrl ? [tip.coverImageUrl] : undefined,
    about: topicName || "Dicas de confeitaria",
    mainEntity: {
      "@type": "CreativeWork",
      name: tip.title,
      text: tip.content,
      author: { "@type": "Organization", name: item.authorName || "Chocolícia" },
    },
  };
}

function tipBody(item: PublishedTip) {
  const { tip, topicName, images, relatedTags } = item;
  const cover = tip.coverImageUrl
    ? `<img src="${escapeHtml(tip.coverImageUrl)}" alt="${escapeHtml(tip.coverImageAlt || tip.title)}" width="1200" height="800" fetchpriority="high" />`
    : "";
  const relatedImages = images.filter((image) => image.imageUrl).map((image) =>
    `<figure><img src="${escapeHtml(image.imageUrl!)}" alt="${escapeHtml(image.altText || tip.title)}" loading="lazy" /><figcaption>${escapeHtml(image.caption || "")}</figcaption></figure>`,
  ).join("");
  const tags = relatedTags.length
    ? `<ul aria-label="Assuntos relacionados">${relatedTags.map((tag) => `<li>${escapeHtml(tag.name)}</li>`).join("")}</ul>`
    : "";
  return `<main id="tip-prerender" class="tip-prerender" lang="pt-BR">
    <div><p>${escapeHtml(topicName || "Dica")}</p><h1>${escapeHtml(tip.title)}</h1>
    <p>${escapeHtml(tip.excerpt || "")}</p>
    <p>Publicado em ${publishedDate(tip.publishedAt)}${item.authorName ? ` · ${escapeHtml(item.authorName)}` : ""}</p>
    ${cover}<div class="tip-prerender-content">${markdownToHtml(tip.content)}</div>
    ${relatedImages}${tags}<p><a href="/dicas">Ver todas as dicas da Chocolícia</a></p></div></main>`;
}

export function renderTipPageHtml(template: string, item: PublishedTip | null) {
  if (!item) {
    const body = '<main id="tip-prerender" lang="pt-BR"><h1>Dica não encontrada</h1><p>Esta dica não está disponível.</p><a href="/dicas">Voltar às dicas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Dica não encontrada | Chocolícia</title>")
      .replace("<head>", '<head><meta name="robots" content="noindex,follow" />')
      .replace('<div id="root"></div>', `<div id="root" data-tip-prerendered="true">${body}</div>`);
  }
  const { tip } = item;
  const canonical = escapeHtml(tip.canonicalUrl || `${SITE.url}/dicas/${encodeURIComponent(tip.slug)}`);
  const title = escapeHtml(tip.metaTitle || `${tip.title} | Dicas Chocolícia`);
  const description = escapeHtml(tip.metaDescription || tip.excerpt || "Dicas práticas de confeitaria e preparo da Chocolícia.");
  const image = tip.coverImageUrl ? escapeHtml(tip.coverImageUrl) : SITE.ogImage;
  const jsonLd = JSON.stringify(tipJsonLd(item)).replace(/</g, "\\u003c");
  const head = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
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
  html = html.replace('<div id="root"></div>', `<div id="root" data-tip-prerendered="true">${tipBody(item)}</div>`);
  return html;
}

export function renderDynamicTipFallback(title: string, description: string) {
  return `<main id="tip-prerender" lang="pt-BR"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main>`;
}
