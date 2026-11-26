export const TIP_TOPICS = [
  { slug: "montagem-e-apresentacao", name: "Montagem e apresentação", riskLevel: "low", active: true, agentEnabled: true },
  { slug: "ornamentacao", name: "Ornamentação", riskLevel: "low", active: true, agentEnabled: true },
  { slug: "preparo", name: "Preparo", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "equipamentos-uso", name: "Uso de equipamentos", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "equipamentos-compra", name: "Escolha de equipamentos", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "negocios", name: "Negócios na culinária", riskLevel: "medium", active: true, agentEnabled: false },
] as const;

export type TipTopic = (typeof TIP_TOPICS)[number];

export type PublishedArticleSummary = {
  id: string;
  type: "article" | "tip" | "technique" | "news";
  status: "published";
  slug: string;
  title: string;
  excerpt: string | null;
  tipTopic: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  coverImageVariants: Record<string, string>;
  publishedAt: Date | string | null;
  updatedAt: Date | string | null;
};
