import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CakeSlice, Facebook, House, Instagram, MessageCircle, Music2 } from "lucide-react";
import BorderGlow from "../components/BorderGlow";
import { CatalogGallery, CatalogManager } from "../components/CatalogManager";
import Dock from "../components/Dock";
import FlipCard from "../components/FlipCard";
import { SITE, WA_ORCAMENTO, WA_SAUDACAO, waLink, waProduct } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { BakerySchema, PageMeta, WebSiteSchema } from "@/seo/JsonLd";
import { getRouteMeta } from "@/seo/routeMeta";
import { trpc } from "../lib/trpc";
// @ts-expect-error React Bits ships this visual component as JavaScript.
import TechText from "../components/TechText.jsx";

const logo = "/images/logo.png";
const janine = "/images/janine.jpg";
const cupcakesRosa = "/images/cupcakes-rosas.webp";
const docesColoridos = "/images/doces-coloridos.webp";
const cupcakesMar = "/images/cupcakes-mar.webp";
const mesaPersonalizada = "/images/mesa-personalizada.webp";
const boloBorboletas = "/images/bolo-borboletas.webp";
const boloAniversario = "/images/bolo-aniversario.webp";
const brigadeiros = "/images/brigadeiros.webp";

const homeMeta = getRouteMeta("/");
const whatsapp = WA_ORCAMENTO;
const whatsappGreeting = WA_SAUDACAO;
const productWhatsApp = waProduct;
const instagram = SITE.instagram;
const facebook = SITE.facebook;
const tiktok = SITE.tiktok;
const officialEmail = SITE.email;
const googleBusiness = SITE.googleBusiness;

type UmamiAnalytics = {
  track: (eventName: string, properties?: Record<string, string>) => void;
};

type GoogleTag = (command: "event", eventName: string, parameters?: Record<string, string>) => void;

function trackAnalytics(eventName: string, properties: Record<string, string>) {
  trackEvent(eventName, properties);
}

const photos = {
  hero: boloAniversario,
  heroAlt: brigadeiros,
  about: janine,
  event: mesaPersonalizada,
};

const sweets = [
  [brigadeiros, "Brigadeiros artesanais"],
  [docesColoridos, "Doces finos coloridos"],
  [cupcakesRosa, "Cupcakes com rosas"],
  [cupcakesMar, "Cupcakes personalizados"],
];

const cakes = [
  [boloAniversario, "Bolo artesanal de aniversário"],
  [boloBorboletas, "Bolo jardim de borboletas"],
  [janine, "Bolo floral feito por Janine"],
  [cupcakesRosa, "Bolos e cupcakes sob medida"],
];

const gallery = [
  [mesaPersonalizada, "Mesa personalizada para evento"],
  [boloAniversario, "Bolo artesanal de aniversário"],
  [brigadeiros, "Caixa de brigadeiros artesanais"],
  [docesColoridos, "Doces finos coloridos"],
  [boloBorboletas, "Bolo decorado com borboletas"],
  [cupcakesMar, "Cupcakes personalizados com tema do mar"],
];

type GoogleReview = {
  name: string;
  text: string;
  rating: number;
  date: string;
  response: string;
  sourceUrl: string;
};

const googleReviews: GoogleReview[] = [];

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    star: <path d="m12 2 3 6.5 7 .9-5 4.8 1.3 6.8-6.3-3.3L5.7 21 7 14.2 2 9.4l7-.9L12 2Z" />,
    chat: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.4 9.4 0 0 1-4-.9L3 21l1.7-4.3A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
    facebook: <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1Z" />,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SocialLinks({ className = "", placement = "social_links" }: { className?: string; placement?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="social-icon" onClick={() => trackAnalytics("instagram_click", { placement })}><Icon name="instagram" /></a>
      <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="social-icon" onClick={() => trackAnalytics("facebook_click", { placement })}><Icon name="facebook" /></a>
      <a href={tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="social-icon" onClick={() => trackAnalytics("tiktok_click", { placement })}><Music2 className="h-5 w-5" /></a>
    </div>
  );
}

function Carousel({
  items,
  onOpen,
}: {
  items: string[][];
  onOpen: (item: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (direction: number) => ref.current?.scrollBy({ left: direction * 380, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:gap-6">
        {items.map((item, index) => (
          <button key={item[0]} onClick={() => onOpen(item)} className="group relative min-w-[82%] snap-start overflow-hidden rounded-[1.5rem] text-left sm:min-w-[46%] lg:min-w-[31.5%]">
            <img src={item[0]} alt={item[1]} loading="lazy" className="h-80 w-full object-cover transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3A241D]/85 to-transparent px-5 pb-5 pt-16 font-medium text-white">{item[1]}</span>
          </button>
        ))}
      </div>
      <div className="mt-7 hidden justify-end gap-2 md:flex">
        <button onClick={() => move(-1)} aria-label="Anterior" className="carousel-button rotate-180"><Icon name="arrow" /></button>
        <button onClick={() => move(1)} aria-label="Próximo" className="carousel-button"><Icon name="arrow" /></button>
      </div>
    </div>
  );
}


function FAQSection() {
  const faqs = [
    ["Quais serviços a Chocolícia oferece?", "A Chocolícia trabalha com doces artesanais, bolos personalizados e buffet para festas e eventos."],
    ["Onde fica a base da Chocolícia?", "A base da Chocolícia fica em Niterói, no estado do Rio de Janeiro."],
    ["Quais regiões são atendidas?", "Além de Niterói, a Chocolícia atende São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro. Consulte sua cidade."],
    ["Como peço um orçamento?", "Entre em contato pelo WhatsApp, telefone ou formulário desta página e conte o que está planejando."],
    ["Como conhecer o trabalho da Chocolícia?", "Veja as imagens desta página e acesse o Instagram da Chocolícia para conhecer outros trabalhos."],
    ["Como saber quais opções estão disponíveis?", "Envie sua ideia e os detalhes da comemoração pelos canais de contato para conversar sobre as opções."],
  ];
  return (
    <section id="faq" data-reveal className="reveal scroll-mt-20 bg-[#F3E5D0]/65 px-5 py-24 md:py-36 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="eyebrow mb-4">Antes de encomendar</p>
          <h2 className="section-title">Perguntas frequentes</h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#8A5A44]">Tudo para você se organizar com tranquilidade e aproveitar a sua celebração do jeitinho que imaginou.</p>
          <div className="faq-photo mt-8 overflow-hidden rounded-t-[5rem] rounded-b-2xl">
            <img src={mesaPersonalizada} alt="Mesa de doces da Chocolícia preparada para um evento" loading="lazy" className="h-64 w-full object-cover" />
          </div>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => <details className="faq-item" key={question} open={index === 0}><summary>{question}<span aria-hidden="true">⌄</span></summary><p>{answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  const [activeReview, setActiveReview] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<"all" | "five">("all");
  const filteredReviews = reviewFilter === "five" ? googleReviews.filter((item) => item.rating === 5) : googleReviews;
  const safeActiveReview = Math.min(activeReview, Math.max(filteredReviews.length - 1, 0));
  const review = filteredReviews[safeActiveReview];
  return (
    <section data-reveal className="reveal bg-[#F3E5D0]/65 px-5 py-24 md:py-36 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow mb-3">Experiências Chocolícia</p>
          <h2 className="section-title mx-auto">Carinho que se transforma em confiança</h2>
          <p className="mt-5 leading-7 text-[#8A5A44]">Avaliações de quem escolheu a Chocolícia para fazer parte de momentos especiais.</p>
        </div>
        <div className="review-filter" aria-label="Filtrar avaliações">
          <span>Mostrar:</span>
          <button type="button" className={reviewFilter === "all" ? "is-active" : ""} onClick={() => { setReviewFilter("all"); setActiveReview(0); }}>Todas</button>
          <button type="button" className={reviewFilter === "five" ? "is-active" : ""} onClick={() => { setReviewFilter("five"); setActiveReview(0); }}><Icon name="star" className="h-3.5 w-3.5" /> 5 estrelas</button>
        </div>
        {review && <div className="review-carousel">
          <article className="review-card" aria-live="polite">
            <span className="review-quote" aria-hidden="true">“</span>
            <div className="relative z-[1] flex items-start justify-between gap-4">
              <div className="flex gap-1 text-[#D9A83E]" aria-label={`${review.rating} de 5 estrelas`}>
                {Array.from({ length: review.rating }, (_, index) => <Icon key={index} name="star" className="h-4 w-4" />)}
              </div>
              <a href={review.sourceUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("google_review_original_click", { placement: "review_card", review_name: review.name })} className="review-source-link">
                <Icon name="arrow" className="h-3.5 w-3.5" /> Ler no Google
              </a>
            </div>
            <blockquote className="relative z-[1] mt-5 font-display text-xl italic leading-8 text-[#5A3428]">{review.text}</blockquote>
            <div className="relative z-[1] mt-7 grid gap-3 border-t border-[#D9A83E]/20 pt-5 text-sm text-[#8A5A44] sm:grid-cols-[auto_1fr] sm:items-start sm:gap-x-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em]">{review.name}</p>
                <p className="mt-1 text-xs text-[#8A5A44]/75">{review.date}</p>
              </div>
              <p className="review-response"><strong>Resposta da Chocolícia:</strong> {review.response.replace("Resposta de exemplo: ", "")}</p>
            </div>
          </article>
          <div className="review-controls">
            <button type="button" className="carousel-button rotate-180" onClick={() => setActiveReview((safeActiveReview - 1 + filteredReviews.length) % filteredReviews.length)} aria-label="Depoimento anterior"><Icon name="arrow" /></button>
            <span>{safeActiveReview + 1} / {filteredReviews.length}</span>
            <button type="button" className="carousel-button" onClick={() => setActiveReview((safeActiveReview + 1) % filteredReviews.length)} aria-label="Próximo depoimento"><Icon name="arrow" /></button>
          </div>
          <p className="sample-review-note">Depoimentos demonstrativos — substitua este conteúdo pelas avaliações reais do Google Meu Negócio.</p>
        </div>}
        {!review && <p className="review-empty">Nenhuma avaliação encontrada para este filtro.</p>}
        <a href={googleBusiness} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("google_reviews_more_click", { placement: "reviews_section" })} className="review-more-link">
          Ver mais avaliações <Icon name="arrow" className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function QuoteSection() {
  const [form, setForm] = useState({ name: "", event: "", guests: "", date: "", category: "", details: "" });
  const [sent, setSent] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const createOrder = trpc.orders.create.useMutation();
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(false);
    const message = [
      "Olá, Chocolícia! Gostaria de solicitar um orçamento.",
      "",
      `Nome: ${form.name}`,
      `Tipo de evento: ${form.event}`,
      `Convidados: ${form.guests}`,
      `Data desejada: ${form.date || "A definir"}`,
      `Interesse: ${form.category}`,
      `Detalhes: ${form.details || "Ainda não informado"}`,
    ].join("\n");
    try {
      await createOrder.mutateAsync({ name: form.name, eventType: form.event, guests: form.guests, desiredDate: form.date || undefined, category: form.category, details: form.details || undefined });
    } catch {
      setSaveError(true);
    }
    trackEvent("form_submit", { placement: "quote_form" });
    window.open(waLink(message), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <section id="orcamento" data-reveal className="reveal scroll-mt-20 bg-[#FFF9F0] px-5 py-24 md:py-36 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:gap-20">
        <div>
          <p className="eyebrow mb-4">Seu momento, do seu jeito</p>
          <h2 className="section-title">Monte seu pedido com a gente</h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#8A5A44]">Preencha os detalhes e receba no WhatsApp uma mensagem pronta para agilizar seu orçamento personalizado.</p>
          <div className="quote-points mt-9"><span>Resposta próxima e personalizada</span><span>Cardápio pensado para sua ocasião</span><span>Entrega e prazos explicados com clareza</span></div>
        </div>
        {sent ? (
          <div className="quote-success" role="status" aria-live="polite">
            <div className="quote-success-icon"><Icon name="chat" className="h-7 w-7" /></div>
            <p className="eyebrow">Mensagem preparada</p>
            <h3 className="font-display text-4xl leading-tight text-[#5A3428]">Obrigada por escolher a Chocolícia!</h3>
            <p className="mt-4 text-base leading-7 text-[#8A5A44]">Seu resumo já foi enviado para o WhatsApp. Em breve, vamos conversar para transformar sua ideia em uma celebração deliciosa.</p>
            {saveError && <p className="mt-3 text-xs font-semibold leading-5 text-[#8A5A44]">O WhatsApp foi aberto, mas o pedido não pôde ser salvo no Neon. Tente enviar novamente se precisar.</p>}
            <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "quote_success" })} className="button-gold button-primary mt-7 w-full">Abrir conversa no WhatsApp</a>
            <button type="button" onClick={() => setSent(false)} className="button-outline mt-3 w-full">Enviar outro orçamento</button>
          </div>
        ) : (
        <form onSubmit={submit} className="quote-form">
          <div className="grid gap-5 md:grid-cols-2">
            <label>Seu nome<input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Como podemos chamar você?" /></label>
            <label>Tipo de evento<select required value={form.event} onChange={(e) => update("event", e.target.value)}><option value="">Selecione uma opção</option><option>Aniversário</option><option>Casamento</option><option>Chá de bebê</option><option>Corporativo</option><option>Outro evento</option></select></label>
            <label>Convidados<select required value={form.guests} onChange={(e) => update("guests", e.target.value)}><option value="">Estimativa de convidados</option><option>Até 20 pessoas</option><option>21 a 50 pessoas</option><option>51 a 100 pessoas</option><option>Mais de 100 pessoas</option></select></label>
            <label>Data desejada<input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
            <label className="md:col-span-2">O que você deseja?<select required value={form.category} onChange={(e) => update("category", e.target.value)}><option value="">Escolha o tipo de pedido</option><option>Bolo personalizado</option><option>Doces e brigadeiros</option><option>Kit festa</option><option>Buffet completo</option><option>Ainda estou em dúvida</option></select></label>
            <label className="md:col-span-2">Conte um pouco mais<textarea value={form.details} onChange={(e) => update("details", e.target.value)} placeholder="Sabores, tema, cores ou qualquer detalhe importante..." rows={4} /></label>
          </div>
          <button type="submit" disabled={createOrder.isPending} className="button-gold button-primary mt-7 w-full">{createOrder.isPending ? "Salvando pedido…" : "Enviar resumo pelo WhatsApp"}</button>
          {saveError && <p className="mt-3 text-center text-xs leading-5 text-[#8A5A44]" role="status">O WhatsApp foi aberto, mas não conseguimos salvar o pedido no momento.</p>}
              <p className="mt-4 text-center text-xs leading-5 text-[#8A5A44]">Você será direcionado para o WhatsApp com os dados preenchidos.</p>
        </form>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string[] | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && lightbox && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);
  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const nav = [
    ["Início", "#inicio"],
    ["Sobre", "#sobre"],
    ["Doces & Bolos", "#doces"],
    ["Galeria", "#galeria"],
    ["Catálogo", "#catalogo"],
    ["FAQ", "#faq"],
    ["Orçamento", "#orcamento"],
    ["Contato", "#contato"],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9F0] text-[#5A3428]">
      <PageMeta meta={homeMeta} />
      <BakerySchema />
      <WebSiteSchema />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#5A3428]/10 bg-[#FFF9F0]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
          <a href="#inicio" className="brand-lockup flex items-center gap-3" aria-label="Chocolícia - início">
            <img src={logo} alt="Chocolícia — Arte dos doces e buffet" className="h-12 w-32 object-contain object-left" />
            <span className="font-display text-2xl font-semibold">Chocolícia</span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map(([label, href]) => <a key={href} href={href} className="nav-link">{label}</a>)}
          </nav>
          <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "header_desktop" })} className="header-cta button-gold hidden lg:inline-flex">Peça pelo WhatsApp</a>
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-full border border-[#5A3428]/15 lg:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#5A3428]/10 bg-[#FFF9F0] px-5 pb-6 pt-3 lg:hidden">
            <nav className="flex flex-col">
              {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="border-b border-[#5A3428]/10 py-3.5 font-medium">{label}</a>)}
              <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "header_mobile" })} className="button-gold mt-5 justify-center">Peça pelo WhatsApp</a>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section id="inicio" className="relative px-5 pb-24 pt-32 md:pb-36 lg:px-8 lg:pt-40">
          <div className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-[#D9A83E]/10 blur-3xl" />
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl lg:mb-14">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <p className="eyebrow">Doces artesanais & buffet</p>
                <span className="premium-badge">Feito à mão, com carinho</span>
              </div>
              <h1 className="font-display text-3xl leading-tight text-[#5A3428] md:text-4xl">Doces, bolos e buffet para festas em Niterói e região</h1>
              <div className="tech-title" aria-hidden="true">
                <TechText
                  text="Chocolícia"
                  fontWeight={500}
                  fontSize={150}
                  reveal="letter"
                  dashLength={4}
                  dashGap={2}
                  specks={15}
                  fontFamily="'Playfair Display', serif"
                  color="#5A3428"
                  accentColor="#D9A83E"
                  letterSpacing={-0.05}
                  reach={200}
                  softness={0.7}
                  strokeWidth={1.5}
                  speed={1}
                  lineStyle="dashed"
                  selection
                  labels
                  draggable
                  sweep
                />
              </div>
              <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <p className="max-w-xl text-xl leading-relaxed text-[#8A5A44] md:text-2xl">Momentos especiais merecem sabores inesquecíveis.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="#doces" className="button-outline">Conheça nossos doces</a>
                  <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "hero" })} className="button-gold button-primary">Solicitar orçamento</a>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium tracking-wide text-[#8A5A44]">
                <span className="inline-flex items-center gap-2"><i className="h-1 w-1 rounded-full bg-[#D9A83E]" /> Produção artesanal</span>
                <span className="inline-flex items-center gap-2"><i className="h-1 w-1 rounded-full bg-[#D9A83E]" /> Atendimento personalizado</span>
                <span className="inline-flex items-center gap-2"><i className="h-1 w-1 rounded-full bg-[#D9A83E]" /> Feito sob encomenda</span>
              </div>
            </div>
                    <div className="grid gap-4 md:grid-cols-[3fr_2fr] md:gap-6">
              <div className="image-card h-[25rem] md:h-[38rem]">
                <img src={photos.hero} alt="Bolo de aniversário artesanal da Chocolícia" className="h-full w-full object-cover" />
                <span className="photo-label">Feito para celebrar</span>
              </div>
              <div className="image-card h-72 md:h-[38rem]">
                <img src={photos.heroAlt} alt="Caixa de brigadeiros artesanais da Chocolícia" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="sobre" data-reveal className="reveal scroll-mt-20 bg-[#F3E5D0]/65 px-5 py-24 md:py-36 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative">
              <BorderGlow
                edgeSensitivity={26}
                glowColor="217 168 62"
                backgroundColor="#F3E5D0"
                borderRadius="7rem 7rem 2rem 2rem"
                glowRadius={30}
                glowIntensity={0.48}
                coneSpread={20}
                animated={false}
                colors={["#D9A83E", "#F3CD73", "#8A5A44"]}
                className="about-photo-glow"
              >
                <div className="overflow-hidden rounded-t-[7rem] rounded-b-[2rem]">
                  <img src={photos.about} alt="Confeiteira finalizando um bolo artesanal" loading="lazy" className="h-[30rem] w-full object-cover md:h-[38rem]" />
                </div>
              </BorderGlow>
              <div className="absolute -bottom-5 right-5 rounded-2xl bg-[#FFF9F0] px-6 py-4 shadow-xl md:right-[-1rem]">
                <span className="font-display text-3xl">Amor</span>
                <p className="text-xs uppercase tracking-[.2em] text-[#8A5A44]">em cada detalhe</p>
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4">Nossa história</p>
              <h2 className="section-title">Por trás de cada doce, uma história de amor</h2>
              <div className="mt-7 space-y-4 text-lg leading-8 text-[#8A5A44]">
                <p>Chocolícia nasceu do talento e da dedicação de Janine, que transformou seu carinho pela confeitaria em uma verdadeira arte. Cada receita é pensada nos mínimos detalhes, unindo técnica apurada e muito afeto para criar doces que encantam antes mesmo da primeira mordida.</p>
                <p>Com mãos experientes e um olhar atento a cada textura, cor e sabor, Janine dedica-se a produzir doces e bolos artesanais de altíssima qualidade, sempre com ingredientes selecionados e um cuidado que só quem ama o que faz consegue oferecer.</p>
                <p>O resultado está no sabor inesquecível de cada brigadeiro, na maciez de cada bolo e na beleza de cada detalhe. Mais do que doces, a Chocolícia entrega momentos especiais, feitos com a paixão de quem transforma a confeitaria em uma verdadeira celebração de sabor e carinho.</p>
              </div>
              <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "about" })} className="mt-8 inline-flex items-center gap-2 font-semibold text-[#5A3428] underline decoration-[#D9A83E] decoration-2 underline-offset-8">Conte-nos sobre o seu momento <Icon name="arrow" /></a>
            </div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="doces" data-reveal className="reveal scroll-mt-20 px-5 py-24 md:py-36 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="section-heading">
              <div><p className="eyebrow mb-3">Pequenos prazeres</p><h2 className="section-title">Nossos Doces</h2></div>
              <p className="max-w-md text-[#8A5A44]">Receitas delicadas, finalizações impecáveis e sabores que ficam na memória.</p>
            </div>
            <Carousel items={sweets} onOpen={setLightbox} />
            <div className="mt-9 text-center"><a href={productWhatsApp("doces artesanais")} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "sweets_catalog" })} className="text-cta">Consultar sabores e quantidades <Icon name="arrow" /></a></div>
          </div>
        </section>

        <section data-reveal className="reveal bg-[#F3E5D0]/65 px-5 py-24 md:py-36 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="section-heading">
              <div><p className="eyebrow mb-3">O centro da festa</p><h2 className="section-title">Nossos Bolos</h2></div>
              <p className="max-w-md text-[#8A5A44]">Criações exclusivas, pensadas para encantar primeiro os olhos e depois o paladar.</p>
            </div>
            <Carousel items={cakes} onOpen={setLightbox} />
            <div className="mt-9 text-center"><a href={productWhatsApp("um bolo personalizado")} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "cakes_catalog" })} className="text-cta">Encomendar um bolo personalizado <Icon name="arrow" /></a></div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="produtos" data-reveal className="reveal px-5 py-24 md:py-36 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="section-heading">
              <div><p className="eyebrow mb-3">Para celebrar em casa</p><h2 className="section-title">Peça o seu</h2></div>
              <p className="max-w-md text-[#8A5A44]">Escolha sua ocasião. Nós cuidamos dos sabores, da beleza e de cada pequeno detalhe.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                [mesaPersonalizada, "Kit Festa", "Uma celebração completa e prática, com tudo combinando.", "um Kit Festa"],
                [boloBorboletas, "Bolos personalizados", "Criado especialmente para contar a história da sua comemoração.", "um bolo personalizado"],
                [brigadeiros, "Caixas de doces", "Brigadeiros artesanais para presentear ou tornar o dia mais doce.", "uma caixa de doces e brigadeiros"],
              ].map(([image, title, text, message]) => (
                <FlipCard
                  key={title}
                  width="100%"
                  height={500}
                  radius={18}
                  background="#FFF9F0"
                  color="#5A3428"
                  tilt
                  glare
                  front={<div className="flip-product-front"><div className="overflow-hidden"><img src={image} alt={title} loading="lazy" className="h-full w-full object-cover" /></div><div className="p-7"><p className="eyebrow mb-3">Feito sob encomenda</p><h3 className="font-display text-3xl">{title}</h3><p className="mt-3 text-sm leading-7 text-[#8A5A44]">Toque para descobrir</p></div></div>}
                  back={<div className="flip-product-back"><span className="premium-badge">Detalhes do pedido</span><h3 className="font-display mt-6 text-4xl">{title}</h3><p className="mt-4 text-base leading-7 text-[#8A5A44]">{text}</p><a href={productWhatsApp(message)} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: `product_${title.toLowerCase().replaceAll(" ", "_")}` })} className="button-gold mt-8 w-full">Quero este</a><small className="mt-5 block text-center text-xs uppercase tracking-[.16em] text-[#8A5A44]">WhatsApp com mensagem pronta</small></div>}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="buffet" data-reveal className="reveal scroll-mt-20 px-5 py-24 md:py-36 lg:px-8">
          <div className="relative mx-auto min-h-[42rem] max-w-7xl overflow-hidden rounded-[2rem] md:min-h-[38rem]">
            <img src={photos.event} alt="Buffet de doces preparado para uma celebração" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3A241D]/95 via-[#3A241D]/55 to-transparent md:bg-gradient-to-r" />
            <div className="relative z-10 flex min-h-[42rem] max-w-2xl flex-col justify-end p-7 text-[#FFF9F0] md:min-h-[38rem] md:justify-center md:p-16">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[.24em] text-[#F3CD73]">Buffet & Eventos</p>
              <h2 className="font-display text-5xl leading-[1.05] md:text-7xl">Seu momento merece um toque especial</h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#FFF9F0]/80">Do conceito à montagem, cuidamos de cada detalhe para criar uma experiência doce, acolhedora e inesquecível.</p>
              <ul className="mt-7 grid gap-3 text-sm text-[#FFF9F0]/90 sm:grid-cols-3">
                {["Cardápio personalizado", "Atendimento próximo", "Finalização cuidadosa"].map((item) => <li key={item} className="event-benefit">{item}</li>)}
              </ul>
              <a href="#orcamento" className="button-gold mt-8 w-fit">Solicitar orçamento para meu evento</a>
            </div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="galeria" data-reveal className="reveal scroll-mt-20 px-5 py-24 md:py-36 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="section-heading">
              <div><p className="eyebrow mb-3">Nosso portfólio</p><h2 className="section-title">Um pouco do que fazemos</h2></div>
              <a href={instagram} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("instagram_click", { placement: "gallery_desktop" })} className="button-outline hidden md:inline-flex">Ver mais no Instagram</a>
            </div>
            <div className="grid auto-rows-[13rem] grid-cols-2 gap-3 md:auto-rows-[16rem] md:grid-cols-4 md:gap-5">
              {gallery.map(([src, alt], i) => (
                <button key={`${src}-${i}`} onClick={() => setLightbox([src, alt])} className={`group overflow-hidden rounded-2xl ${i === 0 || i === 5 ? "row-span-2" : ""} ${i === 3 ? "col-span-2" : ""}`}>
                  <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={instagram} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("instagram_click", { placement: "gallery_mobile" })} className="button-outline md:hidden">Ver mais no Instagram</a>
              <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "gallery_inquiry" })} className="text-cta">Quero algo assim <Icon name="arrow" /></a>
            </div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="catalogo" data-reveal className="reveal bg-[#F3E5D0]/65 px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="section-heading">
              <div><p className="eyebrow mb-3">Catálogo vivo</p><h2 className="section-title">Novidades que chegam primeiro aqui</h2></div>
              <p className="max-w-md text-[#8A5A44]">Imagens enviadas pela Chocolícia ficam disponíveis em uma galeria segura e atualizada.</p>
            </div>
            <CatalogGallery />
            <div className="mt-8"><CatalogManager /></div>
          </div>
        </section>

        <div className="section-ornament" aria-hidden="true"><span /></div>
        <section id="servicos" className="bg-[#F3E5D0]/65 px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow mb-3">Chocolícia em Niterói e no RJ</p>
            <h2 className="section-title">Doces, bolos e buffet para sua comemoração</h2>
            <p className="mt-5 max-w-3xl leading-7 text-[#8A5A44]">Nossa base fica em Niterói e atendemos também São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro. Para conversar sobre uma encomenda ou evento, fale conosco pelo WhatsApp, telefone ou formulário.</p>
            <nav aria-label="Serviços e áreas atendidas" className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              <a href="/buffet-para-festas" className="text-cta">Buffet para festas</a>
              <a href="/bolos-personalizados" className="text-cta">Bolos personalizados</a>
              <a href="/doces-para-festas" className="text-cta">Doces para festas</a>
              <a href="/areas-atendidas" className="text-cta">Áreas atendidas</a>
            </nav>
          </div>
        </section>

        <FAQSection />

        <QuoteSection />

        <section id="contato" data-reveal className="reveal scroll-mt-20 bg-[#3A241D] px-5 py-24 text-center text-[#FFF9F0] md:py-36 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.26em] text-[#D9A83E]">Fale com a gente</p>
            <h2 className="font-display text-5xl leading-tight md:text-8xl">Vamos adoçar o seu momento?</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#FFF9F0]/70">Conte sua ideia para nós. Será um prazer criar algo único para a sua celebração.</p>
            <a href="#orcamento" className="button-gold button-final mt-9 text-sm">Solicitar orçamento</a>
            <div className="mt-6"><a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackAnalytics("whatsapp_click", { placement: "contact_catalog" })} className="text-sm text-[#FFF9F0]/70 underline decoration-[#D9A83E]/70 underline-offset-4 transition hover:text-[#FFF9F0]">Prefere ver nosso catálogo completo? Chame no WhatsApp</a></div>
            <div className="mt-7 flex flex-col items-center gap-3 text-sm text-[#FFF9F0]/70 sm:flex-row sm:justify-center sm:gap-6">
              <a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "home_contact" })} className="transition hover:text-[#FFF9F0]">{SITE.whatsappDisplay}</a>
              <a href={`mailto:${officialEmail}`} className="transition hover:text-[#FFF9F0]">{officialEmail}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer border-t border-[#FFF9F0]/10 bg-[#3A241D] px-5 py-12 text-[#FFF9F0]/70 lg:px-8 lg:py-14">
        <div className="site-footer-inner mx-auto max-w-7xl">
          <div className="site-footer-brand">
            <a href="#inicio" className="footer-brand-lockup" aria-label="Chocolícia — início"><img src={logo} alt="" /><span className="font-display text-3xl text-[#FFF9F0]">Chocolícia</span></a>
            <p>Doces artesanais para celebrar com afeto.</p>
          </div>
          <nav className="site-footer-nav" aria-label="Links essenciais">
            <p className="footer-kicker">Navegação</p>
            <a href="#inicio">Início</a>
            <a href="#buffet">Serviços & Buffet</a>
            <a href="#orcamento">Orçamento</a>
          </nav>
          <div className="site-footer-contact">
            <p className="footer-kicker">Contato</p>
            <p>Niterói, Rio de Janeiro</p>
            <a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "home_footer" })}>{SITE.whatsappDisplay}</a>
            <a href={`mailto:${officialEmail}`}>{officialEmail}</a>
          </div>
          <div className="site-footer-social">
            <p className="footer-kicker">Redes sociais</p>
            <SocialLinks className="mt-4" placement="footer_social_icons" />
            <a href={whatsappGreeting} target="_blank" rel="noreferrer" aria-label="Abrir o WhatsApp com uma mensagem de saudação" onClick={() => trackAnalytics("whatsapp_click", { placement: "footer_cta" })} className="footer-compact-cta">Falar no WhatsApp <Icon name="arrow" className="h-3.5 w-3.5" /></a>
          </div>
        </div>
        <div className="site-footer-bottom mx-auto mt-10 max-w-7xl"><span>© 2026 Chocolícia</span><span>Feito à mão, com carinho.</span><span className="footer-legal-links"><a href="/politicas-e-termos#privacidade">Privacidade</a><a href="/politicas-e-termos#termos">Termos de Uso</a></span></div>
      </footer>

      <Dock items={[
        { icon: <House size={18} />, label: "Início", onClick: () => document.getElementById("inicio")?.scrollIntoView({ behavior: "smooth" }) },
        { icon: <Instagram size={18} />, label: "Instagram", onClick: () => { trackAnalytics("instagram_click", { placement: "dock" }); window.open(instagram, "_blank", "noopener,noreferrer"); } },
        { icon: <CakeSlice size={18} />, label: "Produtos", onClick: () => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" }) },
        { icon: <Facebook size={18} />, label: "Facebook", onClick: () => { trackAnalytics("facebook_click", { placement: "dock" }); window.open(facebook, "_blank", "noopener,noreferrer"); } },
        { icon: <Music2 size={18} />, label: "TikTok", onClick: () => { trackAnalytics("tiktok_click", { placement: "dock" }); window.open(tiktok, "_blank", "noopener,noreferrer"); } },
        { icon: <MessageCircle size={18} />, label: "Contato", onClick: () => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" }) },
      ]} panelHeight={68} baseItemSize={48} magnification={64} />
      <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="Solicitar orçamento pelo WhatsApp" onClick={() => trackEvent("whatsapp_click", { placement: "floating_button" })} className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl lg:bottom-8 lg:right-8">
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
      {lightbox && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#3A241D]/95 p-4" role="dialog" aria-modal="true" aria-label={lightbox[1]} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white" aria-label="Fechar imagem"><Icon name="close" /></button>
          <figure onClick={(e) => e.stopPropagation()} className="max-w-5xl">
            <img src={lightbox[0]} alt={lightbox[1]} className="max-h-[82vh] w-full rounded-2xl object-contain shadow-2xl" />
            <figcaption className="pt-4 text-center font-display text-2xl text-[#FFF9F0]">{lightbox[1]}</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
