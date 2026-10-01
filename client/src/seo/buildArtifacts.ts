/**
 * Geração de robots.txt, sitemap, llms e .md — mesma fonte usada no build SSG.
 */

import { SITE } from "@/config/site";
import { routeMeta, type RouteMeta } from "@/seo/routeMeta";

export function getSitemapRoutes(): RouteMeta[] {
  return Object.values(routeMeta).filter((r) => r.inSitemap !== false);
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
`;
}

export function generateSitemapXml(): string {
  const today = new Date().toISOString().split("T")[0];
  const routes = getSitemapRoutes();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${r.canonical}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.path === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${r.path === "/" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

export function generateLlmsTxt(): string {
  return `# ${SITE.fullName}

> A Chocolícia oferece doces artesanais, bolos personalizados e buffet para festas e eventos. Sua base fica em Niterói, RJ, e atende também São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro. O site serve para apresentar os serviços e receber pedidos de orçamento, não para venda em carrinho.

## Páginas principais

- [Início](${SITE.url}/) – Serviços, contato e formulário de orçamento.
- [Buffet para Festas](${SITE.url}/buffet-para-festas) – Informações sobre buffet para diferentes tipos de eventos.
- [Bolos Personalizados](${SITE.url}/bolos-personalizados) – Informações sobre bolos personalizados.
- [Doces para Festas](${SITE.url}/doces-para-festas) – Informações sobre doces artesanais para festas.
- [Áreas Atendidas](${SITE.url}/areas-atendidas) – Base em Niterói e cidades atendidas no estado do Rio de Janeiro.

## Atendimento e orçamento

Base: Niterói, RJ. Atendimento: Niterói, São Gonçalo, Maricá, Itaboraí e todo o estado do RJ.
Para conversar sobre um pedido, contate a Chocolícia pelo WhatsApp ${SITE.whatsappDisplay}, telefone, e-mail ou formulário do site.

## Contato

- WhatsApp e telefone: ${SITE.whatsappDisplay} (https://wa.me/${SITE.whatsappNumber})
- E-mail: ${SITE.email}
- Instagram: ${SITE.instagram}
`;
}

export function generateLlmsFullTxt(): string {
  return `# ${SITE.fullName}

## Sobre

A Chocolícia trabalha com doces artesanais, bolos personalizados e buffet para festas e eventos. A base fica em Niterói, no estado do Rio de Janeiro. Este site apresenta os serviços e permite solicitar orçamento por WhatsApp, telefone ou formulário; não é uma loja virtual.

## Serviços

### Buffet para festas

Serviço de buffet para festas infantis, aniversários, festas de 15 anos e eventos corporativos. Para conversar sobre uma comemoração, informe a ocasião, a cidade e o que procura.

### Bolos personalizados

Bolos personalizados para festas e comemorações. Ao pedir informações, compartilhe a ocasião, a data desejada e as referências que gostaria de considerar.

### Doces para festas

Doces artesanais para festas e eventos. Entre em contato para conversar sobre as opções e os detalhes do pedido.

## Áreas atendidas

A Chocolícia tem base em Niterói e atende São Gonçalo, Maricá, Itaboraí e todo o estado do Rio de Janeiro.

## Perguntas frequentes

**Quais serviços a Chocolícia oferece?**
Doces artesanais, bolos personalizados e buffet para festas e eventos.

**Onde fica a base da Chocolícia?**
A base fica em Niterói, no estado do Rio de Janeiro.

**Quais regiões são atendidas?**
Niterói, São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro.

**Como pedir orçamento?**
Entre em contato pelo WhatsApp, telefone, e-mail ou formulário no site e conte os detalhes do pedido.

## Contato

- Nome: ${SITE.fullName}
- Base: ${SITE.city}, ${SITE.state}, Brasil
- WhatsApp e telefone: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
- E-mail: ${SITE.email}
- Instagram: ${SITE.instagram}
- Site: ${SITE.url}
`;
}

export function generatePageMarkdownFiles(): Array<{ filename: string; content: string }> {
  return [
    {
      filename: "home.md",
      content: `# Chocolícia – Doces, Bolos e Buffet para Festas em Niterói e Região

A Chocolícia oferece doces artesanais, bolos personalizados e buffet completo para festas e eventos em Niterói, São Gonçalo, Maricá, Itaboraí e toda a Região Metropolitana do Rio de Janeiro.

**URL:** ${SITE.url}/

## Serviços

- Buffet para festas e eventos → ${SITE.url}/buffet-para-festas
- Bolos personalizados → ${SITE.url}/bolos-personalizados
- Doces para festas → ${SITE.url}/doces-para-festas

## Contato

WhatsApp: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
E-mail: ${SITE.email}
`,
    },
    {
      filename: "buffet-para-festas.md",
      content: `# Buffet para Festas e Eventos em Niterói e RJ | Chocolícia

**URL:** ${SITE.url}/buffet-para-festas

Buffet artesanal para aniversários, festas infantis, 15 anos, casamentos e eventos corporativos em Niterói e Região Metropolitana do Rio de Janeiro.

WhatsApp: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
`,
    },
    {
      filename: "bolos-personalizados.md",
      content: `# Bolos Personalizados para Festas em Niterói | Chocolícia

**URL:** ${SITE.url}/bolos-personalizados

Bolos artesanais sob encomenda em Niterói e Região Metropolitana do Rio de Janeiro.

WhatsApp: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
`,
    },
    {
      filename: "doces-para-festas.md",
      content: `# Doces para Festas – Brigadeiros e Trufas em Niterói | Chocolícia

**URL:** ${SITE.url}/doces-para-festas

Brigadeiros artesanais, trufas e docinhos finos para festas em Niterói e região.

WhatsApp: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
`,
    },
    {
      filename: "areas-atendidas.md",
      content: `# Áreas Atendidas pela Chocolícia no Rio de Janeiro

**URL:** ${SITE.url}/areas-atendidas

Sede em Niterói; atendimento em São Gonçalo, Maricá, Itaboraí e demais cidades do RJ sob consulta.

WhatsApp: ${SITE.whatsappDisplay} — https://wa.me/${SITE.whatsappNumber}
`,
    },
  ];
}
