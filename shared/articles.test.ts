import { describe, expect, it } from "vitest";
import { articleInputSchema } from "./articles";

const valid = {
  type: "tip" as const, title: "Como temperar chocolate em casa", excerpt: "Uma orientação prática para obter brilho e textura consistentes.", tipTopic: "preparo",
  bodyMd: "x".repeat(200), sources: [], tags: ["temperagem"], relatedTopics: [], cover: { mode: "generate" as const, imagePrompt: "Chocolate" },
  coverImageAlt: "Chocolate temperado em uma bancada", aiModel: "test-model", generationMeta: { run_id: "run-1", topic_slug: "preparo" },
};

describe("articleInputSchema", () => {
  it("aceita dica com content_type válido e usa draft por padrão", () => expect(articleInputSchema.parse(valid).status).toBe("draft"));
  it("rejeita tipo fora do enum do Neon", () => expect(articleInputSchema.safeParse({ ...valid, type: "feature" }).success).toBe(false));
  it("rejeita tópico ausente e tags repetidas", () => {
    const result = articleInputSchema.safeParse({ ...valid, tipTopic: undefined, tags: ["x", "x"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining(["tipTopic", "tags"]));
  });
});
