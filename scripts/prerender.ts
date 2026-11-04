/**
 * Pré-renderiza rotas públicas em HTML estático após vite build + SSR bundle.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SITE } from "../client/src/config/site.ts";
import {
  generateLlmsFullTxt,
  generateLlmsTxt,
  generatePageMarkdownFiles,
  generateRobotsTxt,
} from "../client/src/seo/buildArtifacts.ts";
import { getRouteMeta, PRERENDER_PATHS, type RouteMeta } from "../client/src/seo/routeMeta.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distPublic = path.resolve(root, "dist", "public");
const ssrDist = path.resolve(root, "dist", "server");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, content: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ✓ ${path.relative(root, filePath)}`);
}

function getRouteStylesheet(routePath: string): string {
  if (routePath !== "/promocao" && routePath !== "/promocoes") return "";
  const assetsDir = path.join(distPublic, "assets");
  const stylesheet = fs.readdirSync(assetsDir).find((file) => /^Promotion-[A-Za-z0-9_-]+\.css$/.test(file));
  if (!stylesheet) throw new Error("Folha de estilos da página /promocao não encontrada no build.");
  return `<link rel="stylesheet" crossorigin href="/assets/${stylesheet}">`;
}

function readTemplate(): string {
  return fs.readFileSync(path.join(distPublic, "index.html"), "utf-8");
}

function injectMeta(template: string, meta: RouteMeta, body: string): string {
  const canonical = `<link rel="canonical" href="${meta.canonical}" />`;
  const robotsMeta = meta.robots
    ? `\n    <meta name="robots" content="${meta.robots}" />`
    : "";
  const lcpPreload = meta.path === "/"
    ? '<link rel="preload" as="image" href="/images/bolo-aniversario.webp" fetchpriority="high" />'
    : "";
  const shareImage = meta.ogImage ?? SITE.ogImage;
  const routeStylesheet = getRouteStylesheet(meta.path);

  const headInjection = `
    ${lcpPreload}
    ${routeStylesheet}
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    ${canonical}${robotsMeta}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:title" content="${meta.ogTitle}" />
    <meta property="og:description" content="${meta.ogDescription}" />
    <meta property="og:image" content="${shareImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.ogTitle}" />
    <meta name="twitter:description" content="${meta.ogDescription}" />
    <meta name="twitter:image" content="${shareImage}" />`;

  let html = template
    .replace(/<title>.*?<\/title>/s, "")
    .replace(/<link rel="canonical"[^>]*\/>/g, "")
    .replace(/<meta property="og:[^>]*\/>/g, "")
    .replace(/<meta name="twitter:[^>]*\/>/g, "")
    .replace(/<meta name="description"[^>]*\/>/g, "");

  html = html.replace("<head>", `<head>${headInjection}`);
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  return html;
}

function outPathForRoute(routePath: string): string {
  if (routePath === "/") return path.join(distPublic, "index.html");
  if (routePath === "/404") return path.join(distPublic, "404.html");
  return path.join(distPublic, routePath.slice(1), "index.html");
}

async function prerender() {
  console.log("\n🎂 Chocolícia – pré-renderização SSG\n");

  const ssrEntryPath = path.join(ssrDist, "entry-server.js");
  if (!fs.existsSync(ssrEntryPath)) {
    console.error(
      `❌ Bundle SSR não encontrado: ${ssrEntryPath}\n` +
        "   Execute 'pnpm build' (vite build --ssr) antes do prerender."
    );
    process.exit(1);
  }

  const { render } = (await import(pathToFileURL(ssrEntryPath).href)) as {
    render: (url: string) => string;
  };
  const template = readTemplate();
  // Mantém uma cópia limpa; os endpoints dinâmicos não devem partir do HTML já prerenderizado da Home.
  writeFile(path.join(root, "dist", "recipe-shell.html"), template);

  for (const routePath of PRERENDER_PATHS) {
    const meta = getRouteMeta(routePath);
    try {
      const body = render(routePath);
      writeFile(outPathForRoute(routePath), injectMeta(template, meta, body));
    } catch (err) {
      console.warn(`  ⚠ Falha ao renderizar ${routePath}:`, err);
      writeFile(outPathForRoute(routePath), injectMeta(template, meta, ""));
    }
  }

  writeFile(path.join(distPublic, "robots.txt"), generateRobotsTxt());
  // O sitemap é servido dinamicamente pela rota/API, para incluir receitas publicadas após este build.
  writeFile(path.join(distPublic, "llms.txt"), generateLlmsTxt());
  writeFile(path.join(distPublic, "llms-full.txt"), generateLlmsFullTxt());

  for (const { filename, content } of generatePageMarkdownFiles()) {
    writeFile(path.join(distPublic, filename), content);
  }

  console.log("\n✅ Pré-renderização concluída.\n");
}

prerender().catch((err) => {
  console.error("❌ Erro na pré-renderização:", err);
  process.exit(1);
});
