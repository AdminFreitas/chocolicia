import fs from "node:fs/promises";
import path from "node:path";
import { getPublishedTipBySlug } from "../tipsDb";
import { renderTipPageHtml } from "../tipPage";

export default async function handler(req: { query?: Record<string, unknown> }, res: { status: (code: number) => any; type: (type: string) => any; setHeader: (name: string, value: string) => any; send: (body: string) => any }) {
  const slug = String(req.query?.slug ?? "");
  const tip = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await getPublishedTipBySlug(slug) : null;
  const template = await fs.readFile(path.resolve(process.cwd(), "dist/tip-shell.html"), "utf8");
  res.status(tip ? 200 : 404).type("html").setHeader("Cache-Control", tip ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store").send(renderTipPageHtml(template, tip));
}
