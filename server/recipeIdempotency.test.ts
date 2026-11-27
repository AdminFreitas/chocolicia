import { describe, expect, it } from "vitest";
import { hasMatchingRecipeRequestHash, hasRecipeIdempotencyKey } from "./recipeIdempotency";

describe("recipe request idempotency contract", () => {
  it("requires a stable request key", () => {
    expect(hasRecipeIdempotencyKey(undefined)).toBe(false);
    expect(hasRecipeIdempotencyKey("short")).toBe(false);
    expect(hasRecipeIdempotencyKey("request-key-001")).toBe(true);
  });

  it("accepts replay only when a stored hash exactly matches", () => {
    expect(hasMatchingRecipeRequestHash("abc123", "abc123")).toBe(true);
    expect(hasMatchingRecipeRequestHash("different", "abc123")).toBe(false);
    expect(hasMatchingRecipeRequestHash(null, "abc123")).toBe(false);
    expect(hasMatchingRecipeRequestHash(undefined, "abc123")).toBe(false);
    expect(hasMatchingRecipeRequestHash("", "abc123")).toBe(false);
  });
});
