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
  generateSitemapXml,
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

function readTemplate(): string {
  return fs.readFileSync(path.join(distPublic, "index.html"), "utf-8");
}

function injectMeta(template: string, meta: RouteMeta, body: string): string {
  const canonical = `<link rel="canonical" href="${meta.canonical}" />`;
  const robotsMeta = meta.robots
    ? `\n    <meta name="robots" content="${meta.robots}" />`
    : "";

  const headInjection = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    ${canonical}${robotsMeta}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:title" content="${meta.ogTitle}" />
    <meta property="og:description" content="${meta.ogDescription}" />
    <meta property="og:image" content="${SITE.ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.ogTitle}" />
    <meta name="twitter:description" content="${meta.ogDescription}" />
    <meta name="twitter:image" content="${SITE.ogImage}" />`;

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
  writeFile(path.join(distPublic, "sitemap.xml"), generateSitemapXml());
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
