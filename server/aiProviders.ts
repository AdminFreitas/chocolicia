type TextMessage = { role: "system" | "user" | "assistant"; content: string };
type TextResult = { content: string; provider: string; model: string };
type ImageResult = { image: Buffer; provider: string; model: string };

function providersFromEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  const values = (raw ? raw.split(",") : fallback).map((value) => value.trim().toLowerCase()).filter(Boolean);
  return [...new Set(values)];
}

function requireKey(provider: string, keyName: string): string {
  const value = process.env[keyName]?.trim();
  if (!value) throw new Error(`${provider}: variável ${keyName} não configurada`);
  return value;
}

async function readJson(response: Response): Promise<any> {
  const payload = await response.text();
  let parsed: any;
  try { parsed = payload ? JSON.parse(payload) : {}; } catch { parsed = { error: payload }; }
  if (!response.ok) {
    const message = typeof parsed?.error === "string" ? parsed.error : parsed?.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parsed;
}

async function generateWithGemini(messages: TextMessage[]): Promise<TextResult> {
  const key = requireKey("gemini", "GEMINI_API_KEY");
  const model = process.env.GEMINI_TEXT_MODEL || process.env.RECIPES_TEXT_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages.filter((message) => message.role === "system").map((message) => message.content).join("\n") }] },
      contents: messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
    }),
  });
  const data = await readJson(response);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("")?.trim();
  if (!text) throw new Error("Gemini não retornou texto");
  return { content: text, provider: "gemini", model };
}

async function generateWithOpenAICompatible(provider: string, messages: TextMessage[]): Promise<TextResult> {
  const config = provider === "groq"
    ? { keyName: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", model: process.env.GROQ_TEXT_MODEL || process.env.RECIPES_TEXT_MODEL || "llama-3.3-70b-versatile" }
    : provider === "openrouter"
      ? { keyName: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", model: process.env.OPENROUTER_TEXT_MODEL || process.env.RECIPES_TEXT_MODEL || "openai/gpt-4o-mini" }
      : { keyName: "OPENAI_API_KEY", baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", model: process.env.RECIPES_TEXT_MODEL || "gpt-4.1-mini" };
  const key = requireKey(provider, config.keyName);
  const response = await fetch(`${config.baseUrl.replace(/\\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.8, response_format: { type: "json_object" } }),
  });
  const data = await readJson(response);
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${provider} não retornou texto`);
  return { content: text, provider, model: config.model };
}

export async function generateRecipeText(messages: TextMessage[]): Promise<TextResult> {
  const errors: string[] = [];
  for (const provider of providersFromEnv("RECIPES_TEXT_PROVIDERS", ["gemini", "groq", "openrouter", "openai"])) {
    try {
      if (provider === "gemini") return await generateWithGemini(messages);
      if (provider === "groq" || provider === "openrouter" || provider === "openai") return await generateWithOpenAICompatible(provider, messages);
      errors.push(`${provider}: provedor desconhecido`);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }
  throw new Error(`Nenhum provedor de texto disponível. ${errors.join(" | ")}`);
}

async function generateWithGeminiImage(prompt: string): Promise<ImageResult> {
  const key = requireKey("gemini", "GEMINI_API_KEY");
  const model = process.env.GEMINI_IMAGE_MODEL || process.env.RECIPES_IMAGE_MODEL || "imagen-4.0-generate-001";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
  });
  const data = await readJson(response);
  const encoded = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!encoded) throw new Error("Gemini Imagen não retornou imagem");
  return { image: Buffer.from(encoded, "base64"), provider: "gemini", model };
}

async function generateWithOpenAIImage(prompt: string): Promise<ImageResult> {
  const key = requireKey("openai", "OPENAI_API_KEY");
  const model = process.env.RECIPES_IMAGE_MODEL || "gpt-image-1";
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\\/$/, "");
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, size: "1024x1024", response_format: "b64_json" }),
  });
  const data = await readJson(response);
  const encoded = data?.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI não retornou imagem");
  return { image: Buffer.from(encoded, "base64"), provider: "openai", model };
}

export async function generateRecipeImage(prompt: string): Promise<ImageResult> {
  const errors: string[] = [];
  for (const provider of providersFromEnv("RECIPES_IMAGE_PROVIDERS", ["gemini", "openai"])) {
    try {
      if (provider === "gemini") return await generateWithGeminiImage(prompt);
      if (provider === "openai") return await generateWithOpenAIImage(prompt);
      errors.push(`${provider}: provedor desconhecido`);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }
  throw new Error(`Nenhum provedor de imagem disponível. ${errors.join(" | ")}`);
}
