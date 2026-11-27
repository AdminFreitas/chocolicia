import { Facebook, Instagram, Menu, MessageCircle, Music2, X } from "lucide-react";
import { useState } from "react";
import { SITE, WA_ORCAMENTO } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

type HeaderProps = { variant?: "home" | "recipes" };
type FooterProps = { variant?: "home" | "recipes" };

const homeNavigation: Array<[string, string]> = [
  ["Início", "#inicio"], ["Promoção", "/promocao"], ["Receitas", "/receitas"], ["Dicas", "/dicas"],
  ["Orçamento", "#orcamento"], ["Catálogo", "#catalogo"], ["Sobre", "#sobre"], ["FAQ", "#faq"],
];

const pageNavigation: Array<[string, string]> = [
  ["Início", "/"], ["Promoção", "/promocao"], ["Receitas", "/receitas"], ["Dicas", "/dicas"], ["Orçamento", "/#orcamento"],
  ["Catálogo", "/#catalogo"], ["Sobre", "/#sobre"], ["FAQ", "/#faq"],
];

export function SiteHeader({ variant = "home" }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = variant === "home" ? homeNavigation : pageNavigation;
  const placement = variant === "home" ? "header" : "recipe_header";
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#5A3428]/10 bg-[#FFF9F0]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 md:px-6 lg:h-20 lg:px-8">
        <a href={variant === "home" ? "#inicio" : "/"} className="brand-lockup flex items-center gap-3" aria-label="Chocolícia - início">
          <img src="/images/logo.png" alt="Chocolícia — Arte dos doces e buffet" loading="eager" decoding="async" className="h-12 w-32 object-contain object-left" />
          <span className="font-display text-2xl font-semibold">Chocolícia</span>
        </a>
        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex" aria-label="Navegação principal">
          {nav.map(([label, href]) => <a key={href} href={href} className="nav-link">{label}</a>)}
        </nav>
        <a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" onClick={() => trackEvent("whatsapp_click", { placement: `${placement}_desktop` })} className="header-cta button-gold hidden lg:inline-flex">Peça pelo WhatsApp</a>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-full border border-[#5A3428]/15 lg:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && <div className="border-t border-[#5A3428]/10 bg-[#FFF9F0] px-4 pb-6 pt-3 md:px-6 lg:hidden"><nav className="flex flex-col" aria-label="Navegação móvel">
        {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="border-b border-[#5A3428]/10 py-3.5 font-medium">{label}</a>)}
        <a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" onClick={() => trackEvent("whatsapp_click", { placement: `${placement}_mobile` })} className="button-gold mt-4 justify-center">Peça pelo WhatsApp</a>
      </nav></div>}
    </header>
  );
}

export function SiteFooter({ variant = "home" }: FooterProps) {
  if (variant === "recipes") {
    return <footer className="site-footer border-t border-[#FFF9F0]/10 bg-[#3A241D] px-4 py-9 pb-28 text-[#FFF9F0]/70 md:px-6 md:py-10 md:pb-12 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><a href="/" className="font-display text-2xl text-[#FFF9F0]">Chocolícia</a><p className="mt-1 text-xs">Doces artesanais para celebrar com afeto.</p></div>
        <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="/receitas" className="hover:text-[#F3CD73]">Receitas</a><a href="/dicas" className="hover:text-[#F3CD73]">Dicas</a><a href="/promocao" className="hover:text-[#F3CD73]">Promoção</a><a href="/buffet-para-festas" className="hover:text-[#F3CD73]">Buffet</a><a href="/bolos-personalizados" className="hover:text-[#F3CD73]">Bolos</a><a href="/politicas-e-termos" className="hover:text-[#F3CD73]">Privacidade</a>
        </nav><p className="text-xs">© {new Date().getFullYear()} {SITE.fullName}. {SITE.city}, {SITE.state}.</p>
      </div>
    </footer>;
  }
  return <footer className="site-footer border-t border-[#FFF9F0]/10 bg-[#3A241D] px-4 py-10 pb-28 text-[#FFF9F0]/70 md:px-6 md:py-12 md:pb-28 lg:px-8">
    <div className="site-footer-inner mx-auto max-w-7xl">
      <div className="site-footer-brand"><a href="#inicio" className="footer-brand-lockup" aria-label="Chocolícia — início"><img src="/images/logo.png" alt="" loading="lazy" decoding="async" /><span className="font-display text-3xl text-[#FFF9F0]">Chocolícia</span></a><p>Doces artesanais para celebrar com afeto.</p></div>
      <nav className="site-footer-nav" aria-label="Links essenciais"><p className="footer-kicker">Navegação</p><a href="#inicio">Início</a><a href="#buffet">Serviços & Buffet</a><a href="/receitas">Receitas</a><a href="/dicas">Dicas</a><a href="/promocao">Promoção</a><a href="#orcamento">Orçamento</a></nav>
      <div className="site-footer-contact"><p className="footer-kicker">Contato</p><p>Niterói, Rio de Janeiro</p><a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "home_footer" })}>{SITE.whatsappDisplay}</a><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div>
      <div className="site-footer-social"><p className="footer-kicker">Redes sociais</p><div className="mt-4 flex items-center gap-3">
        <a href={SITE.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="social-icon" onClick={() => trackEvent("instagram_click", { placement: "footer_social_icons" })}><Instagram className="h-5 w-5" /></a>
        <a href={SITE.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="social-icon" onClick={() => trackEvent("facebook_click", { placement: "footer_social_icons" })}><Facebook className="h-5 w-5" /></a>
        <a href={SITE.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="social-icon" onClick={() => trackEvent("tiktok_click", { placement: "footer_social_icons" })}><Music2 className="h-5 w-5" /></a>
      </div></div>
    </div>
    <div className="site-footer-bottom mx-auto mt-8 max-w-7xl"><span>© {new Date().getFullYear()} Chocolícia</span><span className="footer-legal-links"><a href="/politicas-e-termos#privacidade">Privacidade</a><a href="/politicas-e-termos#termos">Termos de Uso</a></span></div>
  </footer>;
}

export function FloatingWhatsApp({ label = "Solicitar orçamento pelo WhatsApp", placement = "floating_button" }: { label?: string; placement?: string }) {
  return <a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" aria-label={label} onClick={() => trackEvent("whatsapp_click", { placement })} className="whatsapp-floating fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5A3428] lg:bottom-8 lg:right-8">
    <MessageCircle className="h-7 w-7" aria-hidden="true" />
  </a>;
}
