import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRecipeImage, generateRecipeText } from "./aiProviders";

const messages = [
  { role: "system" as const, content: "Responda JSON." },
  { role: "user" as const, content: "Crie uma receita." },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const geminiText = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const chatText = (text: string) => ({ choices: [{ message: { content: text } }] });

describe("aiProviders", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    for (const name of [
      "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "OPENAI_BASE_URL",
      "GEMINI_TEXT_MODEL", "RECIPES_TEXT_MODEL", "RECIPES_TEXT_PROVIDERS", "RECIPES_IMAGE_PROVIDERS",
      "GEMINI_IMAGE_MODEL", "RECIPES_IMAGE_MODEL",
    ]) vi.stubEnv(name, "");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("usa gemini-3.8-flash como modelo de texto padrão do Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fetchMock.mockResolvedValueOnce(jsonResponse(geminiText("{}")));

    const result = await generateRecipeText(messages);

    expect(result).toEqual({ content: "{}", provider: "gemini", model: "gemini-3.8-flash" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/models/gemini-3.8-flash:generateContent");
  });

  it("respeita GEMINI_TEXT_MODEL quando configurado", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_TEXT_MODEL", "gemini-3.8-flash");
    fetchMock.mockResolvedValueOnce(jsonResponse(geminiText("{}")));

    const result = await generateRecipeText(messages);

    expect(result.model).toBe("gemini-3.8-flash");
  });

  it("cai para o Groq quando o Gemini falha", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: "indisponível" } }, 503))
      .mockResolvedValueOnce(jsonResponse(chatText("{\"ok\":true}")));

    const result = await generateRecipeText(messages);

    expect(result.provider).toBe("groq");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://api.groq.com/openai/v1/chat/completions");
  });

  it("segue a ordem de RECIPES_TEXT_PROVIDERS e informa todas as falhas", async () => {
    vi.stubEnv("RECIPES_TEXT_PROVIDERS", "openrouter,desconhecido");

    await expect(generateRecipeText(messages)).rejects.toThrow(/openrouter: variável OPENROUTER_API_KEY não configurada.*desconhecido: provedor desconhecido/s);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normaliza barras finais em OPENAI_BASE_URL no texto", async () => {
    vi.stubEnv("RECIPES_TEXT_PROVIDERS", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://proxy.example.com/v1//");
    fetchMock.mockResolvedValueOnce(jsonResponse(chatText("{}")));

    await generateRecipeText(messages);

    expect(String(fetchMock.mock.calls[0][0])).toBe("https://proxy.example.com/v1/chat/completions");
  });

  it("gera imagem pelo Gemini e cai para a OpenAI quando ele falha", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://proxy.example.com/v1/");
    const png = Buffer.from("imagem-de-teste").toString("base64");
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: "cota" } }, 429))
      .mockResolvedValueOnce(jsonResponse({ data: [{ b64_json: png }] }));

    const result = await generateRecipeImage("bolo de chocolate");

    expect(result.provider).toBe("openai");
    expect(result.image.toString()).toBe("imagem-de-teste");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://proxy.example.com/v1/images/generations");
  });
});
