import { describe, expect, it } from "vitest";
import { RECIPE_CATEGORIES, RECIPE_TAXONOMY, recipeInputSchema, recipeListQuerySchema } from "./recipes";

describe("recipe taxonomy", () => {
  it("keeps the known main categories unique", () => {
    expect(new Set(RECIPE_CATEGORIES).size).toBe(RECIPE_CATEGORIES.length);
  });

  it("only exposes subcategories belonging to their category", () => {
    for (const category of RECIPE_CATEGORIES) {
      const subcategories = RECIPE_TAXONOMY[category];
      expect(subcategories.length).toBeGreaterThan(0);
      expect(new Set(subcategories.map((item) => item.slug)).size).toBe(subcategories.length);
    }
  });

  it("accepts subcategory filters in list queries", () => {
    expect(recipeListQuerySchema.parse({
      category: "Bolos",
      subcategorySlug: "bolos-de-chocolate",
    })).toMatchObject({
      category: "Bolos",
      subcategorySlug: "bolos-de-chocolate",
    });
  });

  it("requires standard recipe fields", () => {
    expect(recipeInputSchema.safeParse({ title: "teste" }).success).toBe(false);
  });
});
