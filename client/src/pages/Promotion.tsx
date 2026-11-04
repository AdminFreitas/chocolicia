import { CalendarDays, Gift, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { usePromotionCountdown } from "@/lib/promotionCountdown";
import RecipePageMeta from "@/components/RecipePageMeta";
import RecipeSiteChrome from "@/components/RecipeSiteChrome";
import { waLink } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { getRouteMeta } from "@/seo/routeMeta";
import "./Promotion.css";

const meta = getRouteMeta("/promocao");
const campaignMessage = "Olá, Chocolícia! Quero saber sobre a promoção de Natal de 2026 e os produtos participantes.";

type PromotionProduct = {
  name: string;
  description: string;
  image: string;
  alt: string;
  imageWidth: number;
  imageHeight: number;
  message: string;
  prices?: Array<[string, string]>;
  price?: string;
  detail?: string;
  consultOnly?: boolean;
};

const products: PromotionProduct[] = [
  {
    name: "Chocotone",
    description: "Massa macia com gotas generosas de chocolate.",
    image: "/images/promocao/chocotone.webp",
    alt: "Chocotone artesanal cortado ao meio com gotas de chocolate",
    imageWidth: 928,
    imageHeight: 1152,
    message: "Olá, Chocolícia! Quero encomendar o Chocotone de Natal.",
    prices: [["100 g", "R$ 16,50"], ["250 g", "R$ 35,90"], ["500 g", "R$ 78,00"]],
  },
  {
    name: "Panetone tradicional",
    description: "Panetone artesanal, macio e perfumado para a sua ceia.",
    image: "/images/promocao/panetone.webp",
    alt: "Panetone tradicional artesanal de Natal",
    imageWidth: 928,
    imageHeight: 1152,
    message: "Olá, Chocolícia! Quero encomendar o Panetone tradicional de Natal.",
    prices: [["100 g", "R$ 13,00"], ["250 g", "R$ 20,00"], ["500 g", "R$ 35,00"]],
  },
  {
    name: "Bolo de nozes com chocolate",
    description: "Duas camadas com recheios para compartilhar na celebração.",
    image: "/images/promocao/bolo.webp",
    alt: "Bolo artesanal de chocolate em camadas com morangos",
    imageWidth: 928,
    imageHeight: 1152,
    message: "Olá, Chocolícia! Quero encomendar o Bolo de nozes com chocolate.",
    price: "R$ 240,00",
    detail: "20 a 30 fatias · topo de bolo de brinde",
  },
  {
    name: "Chocolate em palito",
    description: "Palitos de chocolate decorados com castanhas e frutas.",
    image: "/images/promocao/palitos.webp",
    alt: "Palitos de chocolate decorados com castanhas e frutas",
    imageWidth: 1024,
    imageHeight: 1024,
    message: "Olá, Chocolícia! Quero pedir o Chocolate em palito. Vi o valor de R$ 25,00.",
    price: "R$ 25,00",
  },
  {
    name: "Donuts de chocolate",
    description: "Donuts de chocolate com frutas e detalhes dourados.",
    image: "/images/promocao/donuts.webp",
    alt: "Donuts de chocolate com morangos, frutas vermelhas e detalhes dourados",
    imageWidth: 1024,
    imageHeight: 1024,
    message: "Olá, Chocolícia! Quero pedir Donuts de chocolate. Vi o valor de R$ 35,00.",
    price: "R$ 35,00",
  },
  {
    name: "Chocolate quadrado",
    description: "Bombons artesanais sortidos em uma caixa presenteável para adoçar o Natal.",
    image: "/images/promocao/caixa-bombons.webp",
    alt: "Caixa de bombons sortidos ao lado de uma embalagem transparente com laço dourado.",
    imageWidth: 928,
    imageHeight: 1152,
    message: "Olá, Chocolícia! Quero pedir Chocolate quadrado. Vi o valor de R$ 30,00.",
    price: "R$ 30,00",
  },
];

function WhatsAppLink({
  message,
  placement,
  children,
  className = "promo-button",
}: {
  message: string;
  placement: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={waLink(message)}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("whatsapp_click", { placement })}
    >
      {children}
    </a>
  );
}

function ProductCard({ product, index }: { product: PromotionProduct; index: number }) {
  return (
    <article className="promo-product-card">
      <div className="promo-product-image">
        <img
          src={product.image}
          alt={product.alt}
          width={product.imageWidth}
          height={product.imageHeight}
          loading="lazy"
        />
        <span className="promo-product-tag">Especial de Natal</span>
      </div>
      <div className="promo-product-body">
        <h3>{product.name}</h3>
        <p className="promo-product-description">{product.description}</p>
        {product.detail && <p className="promo-product-detail">{product.detail}</p>}
        {product.prices ? (
          <ul className="promo-price-list" aria-label={`Preços de ${product.name}`}>
            {product.prices.map(([size, price]) => (
              <li key={size}><span>{size}</span><strong>{price}</strong></li>
            ))}
          </ul>
        ) : product.price ? (
          <p className="promo-product-price">{product.price}</p>
        ) : (
          <p className="promo-consult-price">Consulte preço e disponibilidade</p>
        )}
        <WhatsAppLink
          message={product.message}
          placement={`promotion_product_${index + 1}`}
          className="promo-button promo-button--product"
        >
          {product.consultOnly ? "Consultar pelo WhatsApp" : "Pedir pelo WhatsApp"}
        </WhatsAppLink>
      </div>
    </article>
  );
}

export default function Promotion() {
  const remaining = usePromotionCountdown();
  const campaignActive = !remaining.ended;
  const campaignCopy = campaignActive
    ? "Promoção de Natal Chocolícia. Encomendas até 22/12/2026 ou enquanto durarem os estoques."
    : "A campanha de Natal terminou. Fale com a Chocolícia para conhecer as opções atuais.";

  return (
    <RecipeSiteChrome>
      <div className="promotion-page">
        <RecipePageMeta
          title={meta.title}
          description={meta.description}
          path={meta.path}
          image={meta.ogImage}
        />

        <aside className="promo-announcement" aria-label="Aviso da campanha de Natal">
          <p>{campaignCopy}</p>
          <a href={campaignActive ? "#promo-oferta" : "#promo-produtos"} className="promo-announcement-link">
            {campaignActive ? "Aproveitar" : "Ver produtos"}
          </a>
        </aside>

        <main>
          <section className="promo-hero" id="inicio">
            <img
              className="promo-hero-image"
              src="/images/promocao/hero.webp"
              alt="Chocotone artesanal de chocolate em uma mesa natalina"
              width={1376}
              height={768}
              fetchPriority="high"
            />
            <div className="promo-hero-shade" aria-hidden="true" />
            <div className="promo-hero-content">
              <p className="eyebrow promo-eyebrow"><Sparkles size={16} aria-hidden="true" /> Natal Chocolícia</p>
              <h1>Um Natal mais doce na sua mesa</h1>
              <p className="promo-hero-subtitle">
                Panetones, chocotones, bolos e chocolates artesanais, feitos à mão com carinho para a sua ceia.
              </p>
              <div className="promo-hero-actions">
                <WhatsAppLink message={campaignMessage} placement="promotion_hero">
                  <MessageCircle size={18} aria-hidden="true" />
                  {campaignActive ? "Quero fazer meu pedido" : "Falar com a Chocolícia"}
                </WhatsAppLink>
                <a className="promo-text-link" href="#promo-produtos">Ver produtos</a>
              </div>
              <p className="promo-trust-line">Resposta rápida pelo WhatsApp <span aria-hidden="true">·</span> Atendemos Niterói e região</p>
              <div className={`promo-countdown${remaining.ended ? " promo-countdown--ended" : ""}`} aria-label="Prazo da promoção">
                {remaining.ended ? (
                  <p role="status">Promoção encerrada</p>
                ) : (
                  <>
                    {[["Dias", remaining.days], ["Horas", remaining.hours], ["Minutos", remaining.minutes]].map(([label, value]) => (
                      <div key={label}><strong>{value}</strong><span>{label}</span></div>
                    ))}
                    <span className="promo-countdown-deadline"><CalendarDays size={15} aria-hidden="true" /> Até 22 de dezembro</span>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="promo-offer" id="promo-oferta" aria-labelledby="promo-offer-title">
            <div className="promo-offer-inner">
              <div className={`promo-discount-badge${!campaignActive ? " promo-discount-badge--ended" : ""}`}>
                <span>{campaignActive ? "25%" : "Natal"}</span>
                <small>{campaignActive ? "OFF" : "Chocolícia"}</small>
              </div>
              <div className="promo-offer-copy">
                <p className="eyebrow promo-eyebrow">Uma ocasião especial</p>
                <h2 id="promo-offer-title">{campaignActive ? "Promoção de Natal" : "Um Natal feito com afeto"}</h2>
                <p>
                  {campaignActive
                    ? "Aproveite 25% de desconto na promoção de Natal da Chocolícia. Consulte pelo WhatsApp os produtos participantes e as condições."
                    : "A campanha de Natal 2026 foi encerrada. Fale com a equipe para conhecer os produtos e as próximas novidades."}
                </p>
                <p className="promo-offer-deadline">
                  <CalendarDays size={16} aria-hidden="true" />
                  {campaignActive ? "Válida até 22/12/2026 ou enquanto durarem os estoques." : "Consulte a equipe sobre as opções atuais."}
                </p>
                <WhatsAppLink message={campaignMessage} placement="promotion_offer">
                  {campaignActive ? "Consultar condições pelo WhatsApp" : "Falar com a Chocolícia"}
                </WhatsAppLink>
              </div>
            </div>
          </section>

          <section className="promo-benefits" aria-label="Informações da Chocolícia">
            <div className="promo-benefits-inner">
              <div><Gift size={22} aria-hidden="true" /><span>Feito à mão com carinho</span></div>
              <div><MessageCircle size={22} aria-hidden="true" /><span>Pedidos pelo WhatsApp</span></div>
              <div><MapPin size={22} aria-hidden="true" /><span>Niterói e região</span></div>
            </div>
          </section>

          <section className="promo-products-section" id="promo-produtos" aria-labelledby="promo-products-title">
            <div className="promo-section-heading">
              <p className="eyebrow">Pequenos prazeres de Natal</p>
              <h2 id="promo-products-title">Nossos queridinhos de Natal</h2>
              <p>Escolha seus favoritos e fale com a nossa equipe para confirmar disponibilidade e condições da campanha.</p>
            </div>
            <div className="promo-product-grid">
              {products.map((product, index) => <ProductCard product={product} index={index} key={product.name} />)}
            </div>
            <p className="promo-price-note">Confirme pelo WhatsApp quais produtos participam dos 25% OFF. Os preços exibidos seguem os valores informados pela Chocolícia; disponibilidade sujeita a estoque.</p>
          </section>

          <section className="promo-gift-section" id="promo-presente">
            <div className="promo-gift-inner">
              <div className="promo-gift-image-wrap">
                <img
                  src="/images/promocao/kit.webp"
                  alt="Caixa presente de Natal com chocolates artesanais"
                  width={1024}
                  height={1024}
                  loading="lazy"
                />
                <span className="promo-gift-seal">Feito<br />com afeto</span>
              </div>
              <div className="promo-gift-copy">
                <p className="eyebrow promo-eyebrow">Para presentear</p>
                <h2>Kit Presente Natal Chocolícia</h2>
                <p>Uma seleção artesanal em uma embalagem especial para celebrar e dividir momentos doces.</p>
                <ul>
                  <li>Palitos de chocolate</li>
                  <li>Donuts de chocolate</li>
                  <li>Mini chocotone</li>
                </ul>
                <WhatsAppLink
                  message="Olá, Chocolícia! Quero saber a disponibilidade e o valor do Kit Presente de Natal."
                  placement="promotion_gift_kit"
                >
                  Consultar o kit pelo WhatsApp
                </WhatsAppLink>
              </div>
            </div>
          </section>

          <section className="promo-feast-section" id="promo-ceia">
            <div className="promo-feast-frame">
              <img
                src="/images/promocao/ceia.webp"
                alt="Mesa de ceia natalina com panetones e pratos festivos"
                width={1376}
                height={768}
                loading="lazy"
              />
              <div className="promo-feast-overlay" aria-hidden="true" />
              <div className="promo-feast-copy">
                <p className="eyebrow promo-eyebrow">Encomendas de fim de ano</p>
                <h2>Leve o nosso sabor para a sua ceia</h2>
                <p>Encomende panetones, chocotones e doces para compartilhar à mesa.</p>
                <WhatsAppLink
                  message="Olá, Chocolícia! Quero saber sobre panetones, chocotones e doces para a minha ceia de Natal."
                  placement="promotion_feast"
                >
                  Encomendar para a ceia
                </WhatsAppLink>
              </div>
            </div>
            <div className="promo-feast-kit">
              <img
                src="/images/promocao/kit-ceia.webp"
                alt="Kit Ceia de Natal preparado para uma celebração em família"
                width={928}
                height={1152}
                loading="lazy"
              />
              <div className="promo-feast-kit-copy">
                <p className="eyebrow">Para celebrar</p>
                <h3>Kit Ceia de Natal</h3>
                <p>Um kit para a sua ceia, feito com carinho e preparado para presentear ou servir.</p>
                <strong className="promo-feast-kit-price">A partir de R$ 150,00</strong>
                <WhatsAppLink
                  message="Olá, Chocolícia! Quero consultar a disponibilidade do Kit Ceia de Natal."
                  placement="promotion_feast_kit"
                >
                  Consultar o Kit Ceia
                </WhatsAppLink>
              </div>
            </div>
          </section>

          <section className="promo-service-area">
            <MapPin size={24} aria-hidden="true" />
            <p>Nossa base fica em <strong>Niterói</strong> e atendemos também São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro. Consulte a equipe sobre entrega e disponibilidade.</p>
          </section>

          <section className="promo-faq-section" id="promo-duvidas" aria-labelledby="promo-faq-title">
            <div className="promo-faq-intro">
              <p className="eyebrow">Tudo bem explicado</p>
              <h2 id="promo-faq-title">Perguntas frequentes</h2>
              <p>Se ainda tiver alguma dúvida, fale com a gente. Será um prazer ajudar.</p>
            </div>
            <div className="promo-faq-list">
              <details>
                <summary>Até quando posso encomendar?<span aria-hidden="true">+</span></summary>
                <p>A campanha é válida até 22/12/2026 ou enquanto durarem os estoques. Consulte a equipe para confirmar a disponibilidade.</p>
              </details>
              <details>
                <summary>Quais produtos participam dos 25% de desconto?<span aria-hidden="true">+</span></summary>
                <p>Fale com a equipe pelo WhatsApp para confirmar os produtos participantes, as condições e o valor final do pedido.</p>
              </details>
              <details>
                <summary>Como consulto entrega ou retirada?<span aria-hidden="true">+</span></summary>
                <p>A Chocolícia atende Niterói, São Gonçalo, Maricá, Itaboraí e outras cidades do estado do Rio de Janeiro. Consulte as opções para a sua região.</p>
              </details>
              <details>
                <summary>Como faço o meu pedido?<span aria-hidden="true">+</span></summary>
                <p>Escolha o produto e envie uma mensagem pelo botão do WhatsApp. A equipe confirma os detalhes, disponibilidade e condições antes de fechar o pedido.</p>
              </details>
            </div>
          </section>

          <section className="promo-final-cta">
            <p className="eyebrow promo-eyebrow">Um Natal feito com afeto</p>
            <h2>{campaignActive ? "Garanta um Natal mais doce" : "Vamos planejar a sua próxima celebração"}</h2>
            <p>Conte para a Chocolícia o que você gostaria de levar para a sua mesa.</p>
            <WhatsAppLink message={campaignMessage} placement="promotion_final_cta">
              <MessageCircle size={18} aria-hidden="true" />
              {campaignActive ? "Chamar no WhatsApp" : "Falar com a Chocolícia"}
            </WhatsAppLink>
          </section>
        </main>
      </div>
    </RecipeSiteChrome>
  );
}
