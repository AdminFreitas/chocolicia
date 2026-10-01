import { SITE, WA_ORCAMENTO } from "@/config/site";
import { BreadcrumbSchema, FAQSchema, PageMeta } from "@/seo/JsonLd";
import { getRouteMeta } from "@/seo/routeMeta";
import { trackEvent } from "@/lib/analytics";

const meta = getRouteMeta("/areas-atendidas");

const faqs = [
  {
    question: "A Chocolícia atende apenas Niterói?",
    answer:
      "Não. Atendemos Niterói, São Gonçalo, Maricá, Itaboraí e toda a Região Metropolitana do Rio de Janeiro. Para outras cidades do estado, consulte disponibilidade e condições pelo WhatsApp.",
  },
  {
    question: "A Chocolícia faz entrega ou apenas retirada?",
    answer:
      "A forma de atendimento depende do local e do tipo de pedido. Informe sua cidade e os detalhes da comemoração pelo WhatsApp para conversar sobre o atendimento.",
  },
  {
    question: "Como funciona o atendimento para eventos em Maricá e Itaboraí?",
    answer:
      "Maricá e Itaboraí estão entre as cidades atendidas. Envie pelo WhatsApp a cidade, o tipo de serviço e os detalhes da comemoração.",
  },
  {
    question: "Vocês atendem todo o estado do Rio de Janeiro?",
    answer:
      "Sim. A Chocolícia atende todo o estado do Rio de Janeiro. Entre em contato para conversar sobre o serviço desejado e sua cidade.",
  },
  {
    question: "Como consultar as condições para São Gonçalo?",
    answer:
      "Informe a cidade e os detalhes do pedido pelo WhatsApp para conversar sobre as condições de atendimento.",
  },
  {
    question: "Como solicito um orçamento fora de Niterói?",
    answer:
      "Envie pelo WhatsApp sua cidade e conte se procura doces artesanais, bolo personalizado ou buffet para um evento.",
  },
];

const areas = [
  {
    city: "Niterói",
    text: "Niterói é a base da Chocolícia. É daqui que partem os contatos para conversar sobre doces artesanais, bolos personalizados e buffet para festas. Ao pedir informações, conte o tipo de comemoração e o serviço que procura para que a conversa comece com os detalhes relevantes.",
  },
  {
    city: "São Gonçalo",
    text: "São Gonçalo faz parte das cidades atendidas pela Chocolícia. Quem está organizando uma comemoração na cidade pode entrar em contato para conversar sobre doces artesanais, bolos personalizados ou buffet. Informe a ocasião e a cidade ao solicitar informações pelo WhatsApp.",
  },
  {
    city: "Maricá",
    text: "Maricá também está na área de atendimento da Chocolícia. Para conversar sobre uma comemoração na cidade, informe se procura doces artesanais, um bolo personalizado ou buffet para festas. O contato pode ser feito pelo WhatsApp, telefone ou formulário do site.",
  },
  {
    city: "Itaboraí",
    text: "A Chocolícia atende Itaboraí com os serviços de doces artesanais, bolos personalizados e buffet para festas. Ao entrar em contato, compartilhe a cidade e os detalhes do que está planejando para conversar sobre a opção mais adequada.",
  },
];

export default function AreasAtendidas() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#5A3428]">
      <PageMeta meta={meta} />
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.chocolicia.site/" },
          { name: "Áreas Atendidas", url: meta.canonical },
        ]}
      />
      <FAQSchema items={faqs} />

      <header className="bg-[#3A241D] px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="font-display text-2xl text-[#FFF9F0]" aria-label="Chocolícia – início">
            Chocolícia
          </a>
          <a href="/" className="text-sm text-[#FFF9F0]/70 hover:text-[#FFF9F0] transition">
            ← Voltar ao site
          </a>
        </div>
      </header>

      <main>
        <section className="px-5 py-20 lg:px-8 lg:py-28 bg-[#F3E5D0]/50">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow mb-4">Onde estamos</p>
            <h1 className="font-display text-5xl leading-[1.04] text-[#5A3428] md:text-7xl">
              Áreas Atendidas pela Chocolícia no Rio de Janeiro
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#8A5A44]">
              A Chocolícia tem base em Niterói e atende toda a Região Metropolitana do Rio de
              Janeiro, com destaque para Niterói, São Gonçalo, Maricá e Itaboraí. Levamos
              doces artesanais, bolos personalizados e buffet para festas e eventos em toda
              a nossa área de atuação.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={WA_ORCAMENTO}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "areas_hero" })}
                className="button-gold button-primary"
              >
                Verificar atendimento na minha região
              </a>
            </div>
          </div>
        </section>

        {/* Seções por cidade */}
        <section className="px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-12">
            <h2 className="section-title">Principais regiões de atendimento</h2>
            {areas.map((area) => (
              <div key={area.city} className="rounded-2xl border border-[#D9A83E]/30 bg-[#FFF9F0] p-8">
                <h3 className="font-display text-3xl text-[#5A3428] mb-4">{area.city}</h3>
                <p className="text-[#8A5A44] leading-8">{area.text}</p>
                <a
                  href={WA_ORCAMENTO}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("whatsapp_click", { placement: `areas_${area.city.toLowerCase()}` })}
                  className="mt-6 inline-flex text-cta"
                >
                  Solicitar orçamento para {area.city} →
                </a>
              </div>
            ))}

            <div className="rounded-2xl bg-[#3A241D] px-8 py-10 text-[#FFF9F0]">
              <h2 className="font-display text-3xl mb-4">Todo o Estado do Rio de Janeiro</h2>
              <p className="text-[#FFF9F0]/80 leading-7 mb-4">
                Além das cidades acima, a Chocolícia pode atender outras regiões do estado
                do Rio de Janeiro, dependendo da disponibilidade de agenda e das condições
                logísticas para cada evento. Se a sua cidade não está listada acima, entre
                em contato — verificamos a viabilidade com prazer.
              </p>
              <p className="text-[#FFF9F0]/80 leading-7">
                Para eventos em outras cidades do estado, recomendamos entrar em contato com
                os detalhes da cidade e do serviço desejado para conversar sobre o atendimento.
              </p>
              <a
                href={WA_ORCAMENTO}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "areas_estado_rj" })}
                className="button-gold mt-8 inline-flex"
              >
                Verificar atendimento na minha cidade
              </a>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#F3E5D0]/65 px-5 py-20 lg:px-8 scroll-mt-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title mb-8">Perguntas frequentes sobre atendimento</h2>
            <div className="space-y-2">
              {faqs.map(({ question, answer }, i) => (
                <details key={question} className="faq-item" open={i === 0}>
                  <summary>{question}<span aria-hidden="true">⌄</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 text-center">
              <a
                href={WA_ORCAMENTO}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "areas_faq_cta" })}
                className="button-gold button-primary"
              >
                Falar com a Chocolícia pelo WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer border-t border-[#FFF9F0]/10 bg-[#3A241D] px-5 py-10 text-[#FFF9F0]/70 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[#FFF9F0] font-semibold">{SITE.fullName}</p>
            <p className="text-sm mt-1">{SITE.city}, {SITE.state} – Brasil</p>
            <a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "areas_footer" })} className="text-sm hover:text-[#FFF9F0] transition">
              {SITE.whatsappDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="block text-sm hover:text-[#FFF9F0] transition">{SITE.email}</a>
          </div>
          <nav className="flex gap-4 text-sm flex-wrap">
            <a href="/" className="hover:text-[#FFF9F0] transition">Início</a>
            <a href="/buffet-para-festas" className="hover:text-[#FFF9F0] transition">Buffet</a>
            <a href="/bolos-personalizados" className="hover:text-[#FFF9F0] transition">Bolos</a>
            <a href="/doces-para-festas" className="hover:text-[#FFF9F0] transition">Doces</a>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs">© 2026 Chocolícia. Feito à mão, com carinho.</p>
      </footer>

      <a
        href={WA_ORCAMENTO}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("whatsapp_click", { placement: "floating_button" })}
        aria-label="Falar com a Chocolícia pelo WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 transition-transform"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
