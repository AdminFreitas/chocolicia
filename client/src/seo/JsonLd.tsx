/**
 * Componentes JSON-LD para dados estruturados (schema.org).
 * Renderizados tanto no SSG (entry-server) quanto no cliente.
 * Campos opcionais (rua, preço, horários) são omitidos se vazios.
 */

import { SITE } from "@/config/site";
import type { RouteMeta } from "@/seo/routeMeta";

// ────────────────────────────────────────────────────
// 1. LocalBusiness / Bakery (usado na home e implicitamente)
// ────────────────────────────────────────────────────

function buildBakerySchema() {
  // Endereço base — rua/CEP opcionais
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressLocality: SITE.city,
    addressRegion: SITE.state,
    addressCountry: SITE.country,
  };
  if (SITE.streetAddress) address["streetAddress"] = SITE.streetAddress;
  if (SITE.postalCode) address["postalCode"] = SITE.postalCode;

  // Área de atendimento
  const areaServed = [
    {
      "@type": "AdministrativeArea",
      name: "Estado do Rio de Janeiro",
      containedInPlace: { "@type": "Country", name: "Brasil" },
    },
    ...["Niterói", "São Gonçalo", "Maricá", "Itaboraí"].map((city) => ({
      "@type": "City",
      name: city,
    })),
  ];

  // Redes sociais (sameAs)
    const sameAs = [SITE.instagram].filter(Boolean);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
     "@type": "Bakery",
    name: SITE.fullName,
    url: SITE.url,
    email: SITE.email,
    telephone: `+${SITE.whatsappNumber}`,
    image: SITE.ogImage,
    logo: `${SITE.url}/images/logo.png`,
    address,
    areaServed,
    sameAs,
  };

  // Campos opcionais
  if (SITE.priceRange) schema["priceRange"] = SITE.priceRange;
  if (SITE.openingHours.length > 0) {
    schema["openingHoursSpecification"] = SITE.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (SITE.phoneLandline) schema["telephone"] = SITE.phoneLandline;

  return schema;
}

export function BakerySchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBakerySchema()) }}
    />
  );
}

// ────────────────────────────────────────────────────
// 2. WebSite (somente na home)
// ────────────────────────────────────────────────────

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.fullName,
    url: SITE.url,
    inLanguage: "pt-BR",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ────────────────────────────────────────────────────
// 3. Service (por página de serviço)
// ────────────────────────────────────────────────────

interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
}

export function ServiceSchema({ name, description, url }: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    provider: {
      "@type": "LocalBusiness",
      name: SITE.fullName,
      url: SITE.url,
      telephone: `+${SITE.whatsappNumber}`,
    },
    areaServed: [
      {
        "@type": "AdministrativeArea",
        name: "Estado do Rio de Janeiro",
        containedInPlace: { "@type": "Country", name: "Brasil" },
      },
      ...["Niterói", "São Gonçalo", "Maricá", "Itaboraí"].map((city) => ({
        "@type": "City",
        name: city,
      })),
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ────────────────────────────────────────────────────
// 4. FAQPage
// ────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ────────────────────────────────────────────────────
// 5. BreadcrumbList
// ────────────────────────────────────────────────────

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ────────────────────────────────────────────────────
// 6. Componente unificado para injeção de metadados
//    (atualiza document.title no cliente)
// ────────────────────────────────────────────────────

import { useEffect } from "react";

export function PageMeta({ meta }: { meta: RouteMeta }) {
  useEffect(() => {
    document.title = meta.title;
    // Canonical
    let link = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = meta.canonical;
    // Description
    let desc = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (desc) desc.content = meta.description;
    // OG
    const setMeta = (property: string, content: string, attr = "property") => {
      const el = document.querySelector<HTMLMetaElement>(`meta[${attr}='${property}']`);
      if (el) el.content = content;
    };
    setMeta("og:title", meta.ogTitle);
    setMeta("og:description", meta.ogDescription);
    setMeta("og:url", meta.canonical);
    setMeta("twitter:title", meta.ogTitle);
    setMeta("twitter:description", meta.ogDescription);
  }, [meta]);
  return null;
}
