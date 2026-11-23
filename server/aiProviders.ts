import { Buffer } from "node:buffer";

type ChatMessage = { role: "system" | "user"; content: string };
const textDefaults = ["gemini", "groq", "openrouter", "openai"];
const imageDefaults = ["gemini", "openai"];

function providers(name: string, defaults: string[]) {
  const value = process.env[name]?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return value?.length ? value : defaults;
}
function key(provider: string) {
  return ({ gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY, openrouter: process.env.OPENROUTER_API_KEY, openai: process.env.OPENAI_API_KEY } as Record<string, string | undefined>)[provider];
}
function textModel(provider: string) {
  return ({ gemini: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash", groq: process.env.GROQ_TEXT_MODEL ?? "llama-3.3-70b-versatile", openrouter: process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini", openai: process.env.RECIPES_TEXT_MODEL ?? "gpt-4.1-mini" } as Record<string, string>)[provider];
}
function imageModel(provider: string) {
  return ({ gemini: process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-generate-001", openai: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1" } as Record<string, string>)[provider];
}
function base(provider: string) {
  return ({ groq: "https://api.groq.com/openai/v1", openrouter: "https://openrouter.ai/api/v1", openai: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "") } as Record<string, string>)[provider];
}

async function textGemini(messages: ChatMessage[]) {
  const token = key("gemini");
  if (!token) throw new Error("GEMINI_API_KEY não está configurada");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${textModel("gemini")}:generateContent?key=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: messages.find((item) => item.role === "system")?.content ?? "" }] }, contents: [{ role: "user", parts: [{ text: messages.find((item) => item.role === "user")?.content ?? "" }] }], generationConfig: { temperature: 0.8, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Gemini respondeu HTTP ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini devolveu uma resposta vazia");
  return content;
}

async function textCompatible(provider: string, messages: ChatMessage[]) {
  const token = key(provider);
  if (!token || !base(provider)) throw new Error(`credencial/base ausente para ${provider}`);
  const response = await fetch(`${base(provider)}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(provider === "openrouter" ? { "HTTP-Referer": process.env.SITE_PUBLIC_URL ?? "https://www.chocolicia.site", "X-Title": "Chocolícia" } : {}) },
    body: JSON.stringify({ model: textModel(provider), temperature: 0.8, response_format: { type: "json_object" }, messages }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`${provider} respondeu HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${provider} devolveu uma resposta vazia`);
  return content;
}

export async function generateRecipeText(messages: ChatMessage[]) {
  const failures: string[] = [];
  for (const provider of providers("RECIPES_TEXT_PROVIDERS", textDefaults)) {
    if (!key(provider)) { failures.push(`${provider}: credencial ausente`); continue; }
    try { return { provider, model: textModel(provider), content: provider === "gemini" ? await textGemini(messages) : await textCompatible(provider, messages) }; }
    catch (error) { failures.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`); }
  }
  throw new Error(`nenhum provedor de texto disponível (${failures.join("; ")})`);
}

async function imageGemini(prompt: string) {
  const token = key("gemini");
  if (!token) throw new Error("GEMINI_API_KEY não está configurada");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel("gemini")}:predict?key=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "16:9" } }), signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Imagen respondeu HTTP ${response.status}`);
  const payload = await response.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
  const encoded = payload.predictions?.[0]?.bytesBase64Encoded;
  if (!encoded) throw new Error("Imagen não devolveu uma imagem codificada");
  return Buffer.from(encoded, "base64");
}
async function imageOpenai(prompt: string) {
  const token = key("openai");
  if (!token) throw new Error("OPENAI_API_KEY não está configurada para imagens");
  const response = await fetch(`${base("openai")}/images/generations`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: imageModel("openai"), prompt, size: "1536x1024", quality: "medium", output_format: "png" }), signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`OpenAI respondeu HTTP ${response.status}`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI não devolveu uma imagem codificada");
  return Buffer.from(encoded, "base64");
}
export async function generateRecipeImage(prompt: string) {
  const failures: string[] = [];
  for (const provider of providers("RECIPES_IMAGE_PROVIDERS", imageDefaults)) {
    if (!key(provider)) { failures.push(`${provider}: credencial ausente`); continue; }
    try { return { provider, model: imageModel(provider), image: provider === "gemini" ? await imageGemini(prompt) : await imageOpenai(prompt) }; }
    catch (error) { failures.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`); }
  }
  throw new Error(`nenhum provedor de imagem disponível (${failures.join("; ")})`);
}
