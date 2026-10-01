/**
 * Mapa de rotas com metadados SEO completos.
 * Usado tanto pelo script de pré-renderização (build)
 * quanto pelo cliente (atualizar document.title na navegação).
 */

import { SITE } from "@/config/site";

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  robots?: string;
  /** false exclui do sitemap (ex.: legal, 404, showcase) */
  inSitemap?: boolean;
}

/** Rotas pré-renderizadas no build (ordem estável) */
export const PRERENDER_PATHS = [
  "/",
  "/buffet-para-festas",
  "/bolos-personalizados",
  "/doces-para-festas",
  "/areas-atendidas",
  "/politicas-e-termos",
  "/404",
] as const;

const base = SITE.url;

export const routeMeta: Record<string, RouteMeta> = {
  "/": {
    path: "/",
     title: "Doces, Bolos e Buffet para Festas em Niterói e Região | Chocolícia",
    description:
      "Chocolícia oferece doces artesanais, bolos personalizados e buffet para festas e eventos em Niterói, São Gonçalo, Maricá e Itaboraí. Peça seu orçamento pelo WhatsApp.",
    canonical: `${base}/`,
     ogTitle: "Doces, Bolos e Buffet para Festas em Niterói e Região | Chocolícia",
    ogDescription:
      "Doces artesanais, bolos personalizados e buffet para eventos inesquecíveis no Rio de Janeiro. Peça orçamento pelo WhatsApp.",
  },
  "/buffet-para-festas": {
    path: "/buffet-para-festas",
     title: "Buffet para Festas e Eventos em Niterói e RJ | Chocolícia",
    description:
      "Buffet artesanal da Chocolícia para aniversários, festas infantis, 15 anos e eventos corporativos em Niterói, São Gonçalo, Maricá e toda a Região Metropolitana do Rio de Janeiro.",
    canonical: `${base}/buffet-para-festas`,
     ogTitle: "Buffet para Festas e Eventos em Niterói e RJ | Chocolícia",
    ogDescription:
      "Buffet personalizado de doces artesanais para aniversários, festas e eventos corporativos em Niterói e RJ. Solicite orçamento.",
  },
  "/bolos-personalizados": {
    path: "/bolos-personalizados",
     title: "Bolos Personalizados para Festas em Niterói | Chocolícia",
    description:
      "Bolos artesanais e personalizados da Chocolícia para aniversários, casamentos, chá de bebê e comemorações especiais em Niterói, São Gonçalo, Maricá e Itaboraí.",
    canonical: `${base}/bolos-personalizados`,
     ogTitle: "Bolos Personalizados para Festas em Niterói | Chocolícia",
    ogDescription:
      "Bolos artesanais e personalizados para celebrações especiais. Feitos à mão com ingredientes selecionados em Niterói, RJ.",
  },
  "/doces-para-festas": {
    path: "/doces-para-festas",
    title: "Doces para Festas – Brigadeiros e Trufas em Niterói | Chocolícia",
    description:
      "Brigadeiros artesanais, trufas, docinhos e doces finos da Chocolícia para festas em Niterói, São Gonçalo, Maricá e Itaboraí. Peça por WhatsApp.",
    canonical: `${base}/doces-para-festas`,
     ogTitle: "Doces para Festas em Niterói e Região | Chocolícia",
    ogDescription:
      "Brigadeiros artesanais, trufas e docinhos finos para festas e eventos. Produção artesanal em Niterói, RJ.",
  },
  "/areas-atendidas": {
    path: "/areas-atendidas",
    title: "Áreas Atendidas – Niterói, São Gonçalo, Maricá e Itaboraí | Chocolícia",
    description:
      "A Chocolícia atende Niterói, São Gonçalo, Maricá, Itaboraí e todo o estado do Rio de Janeiro com doces artesanais, bolos personalizados e buffet para festas.",
    canonical: `${base}/areas-atendidas`,
     ogTitle: "Áreas Atendidas – Niterói, São Gonçalo, Maricá e Itaboraí | Chocolícia",
    ogDescription:
      "Atendemos Niterói, São Gonçalo, Maricá, Itaboraí e todo o estado do Rio de Janeiro com doces artesanais e buffet para festas.",
  },
  "/politicas-e-termos": {
    path: "/politicas-e-termos",
    title: "Políticas e Termos de Uso | Chocolícia",
    description:
      "Política de privacidade e termos de uso da Chocolícia – Arte dos Doces e Buffet.",
    canonical: `${base}/politicas-e-termos`,
    ogTitle: "Políticas e Termos | Chocolícia",
    ogDescription: "Política de privacidade e termos de uso da Chocolícia.",
    robots: "noindex,follow",
    inSitemap: false,
  },
  "/404": {
    path: "/404",
    title: "Página não encontrada | Chocolícia",
    description: "A página que você buscou não foi encontrada no site da Chocolícia.",
    canonical: `${base}/404`,
    ogTitle: "Página não encontrada | Chocolícia",
    ogDescription: "A página que você buscou não foi encontrada no site da Chocolícia.",
    robots: "noindex,nofollow",
    inSitemap: false,
  },
};

/** Retorna os metadados da rota ou os da home como fallback */
export function getRouteMeta(path: string): RouteMeta {
  return routeMeta[path] ?? routeMeta["/"];
}
