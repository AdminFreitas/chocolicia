import express from "express";
import { TIP_TOPICS } from "../shared/articles";
import { getAgentArticleBySlug, getAgentArticleByTitle, getAgentArticleByTopicSlug } from "./articlesDb";
import { agentError, agentTokensConfigured, resolveAgentScope } from "./agentAuth";
import { getAgentRecipeBySlug, getAgentRecipeByTopicSlug, getPublishedRecipeTitlesSince } from "./recipeDb";

const RECIPE_AGENT_TAXONOMY = {
  categories: [{
    slug: "doces-e-sobremesas",
    name: "Doces e sobremesas",
    subcategories: [
      { slug: "bolos-simples", name: "Bolos simples", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "brigadeiros-e-docinhos", name: "Brigadeiros e docinhos", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "trufas-e-bombons", name: "Trufas e bombons", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "doces-de-colher", name: "Doces de colher", riskLevel: "low", agentEnabled: true, active: true },
    ],
  }],
  tipTopics: TIP_TOPICS.map((item) => ({
    slug: item.slug,
    name: item.name,
    active: true,
  })),
};

function isAuthorized(req: express.Request, res: express.Response): boolean {
  if (!agentTokensConfigured()) {
    agentError(res, 503, "agent_auth_not_configured", "A autenticação do agente não está configurada.");
    return false;
  }
  if (!resolveAgentScope(req)) {
    agentError(res, 401, "unauthorized", "Não autorizado.");
    return false;
  }
  res.setHeader("Cache-Control", "no-store");
  return true;
}

export function createAgentReadRouter() {
  const router = express.Router();

  router.get("/taxonomy", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(RECIPE_AGENT_TAXONOMY);
  });

  router.get("/catalog/ingredients", (req, res) => {
    if (!isAuthorized(req, res)) return;
    res.json({ items: [] });
  });

  router.get("/coverage", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    try {
      const recent = await getPublishedRecipeTitlesSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      res.json({
        bySubcategory: {},
        recentPublishedRecipes: recent.length,
        ingredientCatalogReady: false,
      });
    } catch (error) {
      console.error("[AgentRead] coverage failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "Não foi possível consultar a cobertura.");
    }
  });

  router.get("/content/lookup", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    const topicSlug = typeof req.query.topic_slug === "string" ? req.query.topic_slug : "";
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    const title = typeof req.query.title === "string" ? req.query.title : "";
    if (![topicSlug, slug, title].some(Boolean)) {
      agentError(res, 400, "validation_failed", "Informe topic_slug, slug ou title.");
      return;
    }
    try {
      const found = [];
      if (topicSlug) {
        const [recipe, article] = await Promise.all([
          getAgentRecipeByTopicSlug(topicSlug),
          getAgentArticleByTopicSlug(topicSlug),
        ]);
        if (recipe) found.push({
          content_type: "recipe", id: recipe.id, slug: recipe.slug, title: recipe.title,
          status: recipe.status, generation_meta: recipe.generationMeta,
        });
        if (article) found.push({
          content_type: "article", id: article.id, slug: article.slug, title: article.title,
          status: article.status, generation_meta: article.generationMeta,
        });
      } else if (slug) {
        const [recipe, article] = await Promise.all([
          getAgentRecipeBySlug(slug),
          getAgentArticleBySlug(slug),
        ]);
        if (recipe) found.push({
          content_type: "recipe", id: recipe.id, slug: recipe.slug, title: recipe.title,
          status: recipe.status, generation_meta: recipe.generationMeta,
        });
        if (article) found.push({
          content_type: "article", id: article.id, slug: article.slug, title: article.title,
          status: article.status, generation_meta: article.generationMeta,
        });
      } else if (title) {
        const article = await getAgentArticleByTitle(title);
        if (article) found.push({
          content_type: "article", id: article.id, slug: article.slug, title: article.title,
          status: article.status, generation_meta: article.generationMeta,
        });
      }
      res.json({ exists: found.length > 0, items: found });
    } catch (error) {
      console.error("[AgentRead] content lookup failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "Não foi possível consultar o conteúdo.");
    }
  });

  router.get("/recipes/:slug/status", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      agentError(res, 404, "not_found", "Receita não encontrada.");
      return;
    }
    try {
      const recipe = await getAgentRecipeBySlug(slug);
      if (!recipe) {
        agentError(res, 404, "not_found", "Receita não encontrada.");
        return;
      }
      res.json({ id: recipe.id, slug: recipe.slug, status: recipe.status, generationMeta: recipe.generationMeta });
    } catch (error) {
      console.error("[AgentRead] recipe status failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "Não foi possível consultar o estado da receita.");
    }
  });

  return router;
}
