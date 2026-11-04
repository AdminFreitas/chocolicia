import { useEffect, useMemo } from "react";
import { SITE } from "@/config/site";
import { PageMeta } from "@/seo/JsonLd";
import type { RouteMeta } from "@/seo/routeMeta";

type Props = { title: string; description: string; path: string; image?: string };

export default function RecipePageMeta({ title, description, path, image }: Props) {
  const meta = useMemo<RouteMeta>(() => ({
    path,
    title,
    description,
    canonical: `${SITE.url}${path}`,
    ogTitle: title,
    ogDescription: description,
  }), [description, path, title]);

  useEffect(() => {
    const set = (selector: string, attr: "property" | "name", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    set("meta[property='og:image']", "property", "og:image", image || SITE.ogImage);
    set("meta[name='twitter:image']", "name", "twitter:image", image || SITE.ogImage);
    return () => {
      set("meta[property='og:image']", "property", "og:image", SITE.ogImage);
      set("meta[name='twitter:image']", "name", "twitter:image", SITE.ogImage);
    };
  }, [image]);

  return <PageMeta meta={meta} />;
}
