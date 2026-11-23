import { storagePutPublic } from "./storage";

const IMAGE_HOSTS: Record<string, string[]> = {
  pexels: ["images.pexels.com"],
  pixabay: ["cdn.pixabay.com"],
  wikimedia: ["upload.wikimedia.org"],
  openverse: ["upload.wikimedia.org", "images.unsplash.com", "images.pexels.com", "cdn.pixabay.com"],
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const WIDTHS = [480, 800, 1280] as const;

type Cover =
  | { mode: "stock"; provider: string; sourceImageUrl: string; sourcePageUrl: string; author: string; license: string; attributionText: string }
  | { mode: "generate"; imagePrompt: string };

export type ProcessedCover = {
  url: string;
  variants: { w480?: string; w800?: string; w1280?: string; avif480?: string; avif800?: string; avif1280?: string };
  source: Record<string, unknown>;
  isAi: boolean;
};

function allowedImageUrl(value: string, provider: string): URL {
  const url = new URL(value);
  const hosts = IMAGE_HOSTS[provider.toLowerCase()];
  if (url.protocol !== "https:" || !hosts?.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
      url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("A origem da imagem não está autorizada.");
  }
  return url;
}

async function downloadStockImage(cover: Extract<Cover, { mode: "stock" }>): Promise<Buffer> {
  let url = allowedImageUrl(cover.sourceImageUrl, cover.provider);
  for (let redirects = 0; redirects <= 2; redirects++) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (response.status >= 300 && response.status < 400) {
      if (redirects === 2) throw new Error("A imagem excedeu o limite de redirecionamentos.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento da imagem sem destino.");
      url = allowedImageUrl(new URL(location, url).toString(), cover.provider);
      continue;
    }
    if (!response.ok) throw new Error(`O provedor de imagem respondeu HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")) {
      throw new Error("O provedor não retornou uma imagem JPEG, PNG ou WebP.");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("A imagem excede o limite de 10 MB.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("A imagem excede o limite de 10 MB.");
    return bytes;
  }
  throw new Error("Não foi possível obter a imagem.");
}

async function generateImage(prompt: string): Promise<Buffer> {
  if ((process.env.AGENT_IMAGE_GENERATION_ENABLED ?? "false").toLowerCase() !== "true") {
    throw new Error("A geração de imagens por IA está desabilitada.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("O provedor de imagens não está configurado.");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`O provedor de imagens respondeu HTTP ${response.status}.`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("O provedor de imagens não retornou conteúdo.");
  return Buffer.from(encoded, "base64");
}

export async function processAgentCover(
  cover: Cover,
  slug: string,
): Promise<ProcessedCover> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default ?? sharpModule;
  const sourceBytes = cover.mode === "stock"
    ? await downloadStockImage(cover)
    : await generateImage(cover.imagePrompt);
  const metadata = await sharp(sourceBytes).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || metadata.width < 1280 || !metadata.height) {
    throw new Error("A imagem não corresponde ao formato ou à resolução mínima exigida.");
  }

  const variants: ProcessedCover["variants"] = {};
  for (const width of WIDTHS) {
    const resized = sharp(sourceBytes).rotate().resize({ width, withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 55, effort: 4 }).toBuffer(),
    ]);
    const [webpObject, avifObject] = await Promise.all([
      storagePutPublic(`articles/${slug}-${width}.webp`, webp, "image/webp"),
      storagePutPublic(`articles/${slug}-${width}.avif`, avif, "image/avif"),
    ]);
    variants[`w${width}` as "w480" | "w800" | "w1280"] = webpObject.url;
    variants[`avif${width}` as "avif480" | "avif800" | "avif1280"] = avifObject.url;
  }
  const url = variants.w1280;
  if (!url) throw new Error("A imagem processada não tem variante de capa.");
  return {
    url,
    variants,
    isAi: cover.mode === "generate",
    source: cover.mode === "stock"
      ? {
          mode: "stock",
          provider: cover.provider,
          sourceImageUrl: cover.sourceImageUrl,
          sourcePageUrl: cover.sourcePageUrl,
          author: cover.author,
          license: cover.license,
          attributionText: cover.attributionText,
        }
      : { mode: "generate", imagePrompt: cover.imagePrompt, model: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1" },
  };
}
