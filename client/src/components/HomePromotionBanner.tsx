import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { usePromotionCountdown } from "@/lib/promotionCountdown";
import "./HomePromotionBanner.css";

const units = [
  ["Dias", "days"],
  ["Horas", "hours"],
  ["Minutos", "minutes"],
] as const;

export default function HomePromotionBanner() {
  const remaining = usePromotionCountdown();

  return (
    <section className="home-promo-banner" aria-labelledby="home-promo-title">
      <div className="home-promo-banner__inner">
        <div className="home-promo-banner__copy">
          <p className="home-promo-banner__eyebrow">
            <Sparkles size={15} aria-hidden="true" /> Promoção de Natal Chocolícia
          </p>
          <div className="home-promo-banner__title-row">
            <h2 id="home-promo-title">
              {remaining.ended ? "Um Natal feito com afeto" : "Uma doce oportunidade para celebrar"}
            </h2>
            {!remaining.ended && <span className="home-promo-banner__discount">25% OFF</span>}
          </div>
          <p className="home-promo-banner__description">
            {remaining.ended
              ? "A promoção terminou. Veja os produtos e fale com a nossa equipe."
              : "Encomendas até 22/12/2026 ou enquanto durarem os estoques."}
          </p>
        </div>

        <div className="home-promo-banner__timer" aria-label="Contagem regressiva da promoção de Natal">
          {remaining.ended ? (
            <p className="home-promo-banner__ended" role="status">Promoção encerrada</p>
          ) : (
            <>
              <div className="home-promo-banner__units">
                {units.map(([label, key]) => (
                  <div className="home-promo-banner__unit" key={key}>
                    <strong>{remaining[key]}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="home-promo-banner__deadline">
                <CalendarDays size={14} aria-hidden="true" /> Até 22 de dezembro
              </p>
            </>
          )}
        </div>

        <a className="home-promo-banner__cta" href="/promocao" aria-label="Ver a promoção de Natal da Chocolícia">
          Ver promoção <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
