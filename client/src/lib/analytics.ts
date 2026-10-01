/**
 * Helper de analytics para eventos de conversão.
 * Usa window.gtag (já definido pelo snippet GA4 no index.html).
 * Fallback para dataLayer caso gtag ainda não esteja definido.
 */

type EventParams = Record<string, string>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: EventParams) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", name, { ...params, page_location: window.location.href });
  } else {
    // Fallback: empurra direto para o dataLayer do GTM/GA4
    window.dataLayer = window.dataLayer ?? [];
    (window.dataLayer as unknown[]).push({ event: name, ...params });
  }
}
