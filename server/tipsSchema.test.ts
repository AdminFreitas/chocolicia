import { describe, expect, it } from "vitest";
import { tipInputSchema } from "../shared/tips";

const validTip = {
  title: "Como conservar brigadeiros por mais tempo",
  content: "Guarde os brigadeiros em recipiente fechado, protegidos da umidade e do calor.",
  topicSlug: "conservacao",
  agentIdempotencyKey: "tip-key-2026-11-26-001",
};

describe("tipInputSchema", () => {
  it("applies draft and review defaults and accepts the site contract", () => {
    const parsed = tipInputSchema.safeParse(validTip);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("draft");
      expect(parsed.data.reviewStatus).toBe("pending");
      expect(parsed.data.tags).toEqual([]);
      expect(parsed.data.images).toEqual([]);
    }
  });

  it("requires a resolvable topic slug", () => {
    const parsed = tipInputSchema.safeParse({
      title: validTip.title,
      content: validTip.content,
      agentIdempotencyKey: validTip.agentIdempotencyKey,
    });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one idempotency identifier", () => {
    const parsed = tipInputSchema.safeParse({
      title: validTip.title,
      content: validTip.content,
      topicSlug: validTip.topicSlug,
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes the agent snake_case contract including image fields", () => {
    const parsed = tipInputSchema.safeParse({
      title: validTip.title,
      content: validTip.content,
      topic_slug: validTip.topicSlug,
      agent_idempotency_key: validTip.agentIdempotencyKey,
      agent_topic_slug: "conservacao",
      review_status: "pending",
      generation_meta: { source: "agent" },
      images: [{ image_url: "https://cdn.example.test/tip.webp", alt_text: "Brigadeiros", image_role: "inline", sort_order: 1 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.agentIdempotencyKey).toBe(validTip.agentIdempotencyKey);
      expect(parsed.data.images[0]?.imageUrl).toBe("https://cdn.example.test/tip.webp");
      expect(parsed.data.images[0]?.altText).toBe("Brigadeiros");
    }
  });
});
