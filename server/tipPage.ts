import type { getPublishedTipBySlug } from "./tipsDb";
type TipPageData = Awaited<ReturnType<typeof getPublishedTipBySlug>>;
export function renderTipPageHtml(template: string, tip: TipPageData) {
  if (!tip) return template.replace("<title>Chocolícia</title>", "<title>Conteúdo não encontrado | Chocolícia</title>");
  const title = escapeHtml(tip.title); const description = escapeHtml(tip.metaDescription ?? tip.excerpt); const canonical = escapeHtml(tip.canonicalUrl ?? `/dicas/${tip.slug}`);
  return template.replace("<title>Chocolícia</title>", `<title>${title} | Chocolícia</title>`).replace("</head>", `<meta name="description" content="${description}"><link rel="canonical" href="${canonical}"></head>`).replace("<body", `<body data-tip-prerendered="true" data-tip-slug="${escapeHtml(tip.slug)}"`);
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)); }
