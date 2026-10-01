/**
 * Gera client/public/images/og-image.jpg (1200×630) a partir de foto real + logo.
 * TODO: substituir por arte final de social quando disponível.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "client", "public", "images");
const outPath = path.join(imagesDir, "og-image.jpg");
const bgPath = path.join(imagesDir, "mesa-personalizada.webp");
const logoPath = path.join(imagesDir, "logo.png");

async function main() {
  if (!fs.existsSync(bgPath) || !fs.existsSync(logoPath)) {
    console.warn("[og-image] Imagens base ausentes; pulando geração.");
    return;
  }

  const logoBuffer = await sharp(logoPath).resize(320, undefined, { fit: "inside" }).png().toBuffer();

  await sharp(bgPath)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .composite([{ input: logoBuffer, gravity: "centre" }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);

  console.log(`[og-image] Gerado ${path.relative(root, outPath)}`);
}

main().catch((err) => {
  console.error("[og-image] Falha:", err);
  process.exit(1);
});
