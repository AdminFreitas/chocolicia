import { SITE, WA_ORCAMENTO, waProduct } from "@/config/site";
import { BreadcrumbSchema, FAQSchema, PageMeta, ServiceSchema } from "@/seo/JsonLd";
import { getRouteMeta } from "@/seo/routeMeta";
import { trackEvent } from "@/lib/analytics";

const meta = getRouteMeta("/doces-para-festas");

const faqs = [
  {
    question: "Quais tipos de doces a Chocolícia oferece?",
    answer:
      "A Chocolícia oferece doces artesanais para festas. Entre em contato para conversar sobre as opções disponíveis para a sua ocasião.",
  },
  {
    question: "Os doces podem ser embalados individualmente?",
    answer:
      "Informe como pretende servir ou apresentar os doces ao pedir informações para conversar sobre o formato do pedido.",
  },
  {
    question: "Qual é a quantidade mínima de doces por pedido?",
    answer:
      "A quantidade é combinada conforme o pedido. Envie os detalhes da comemoração pelo WhatsApp para conversar sobre as opções.",
  },
  {
    question: "A Chocolícia faz doces com sabores diferenciados?",
    answer:
      "As opções de sabores são informadas durante a conversa sobre o pedido. Conte suas preferências ao solicitar informações.",
  },
  {
    question: "Os doces são feitos artesanalmente?",
    answer:
      "A Chocolícia trabalha com doces artesanais. Entre em contato para conversar sobre os produtos e detalhes do pedido.",
  },
  {
    question: "Com quanto tempo de antecedência devo pedir os doces?",
    answer:
      "O prazo depende dos detalhes do pedido. Informe a data desejada ao entrar em contato para conversar sobre a encomenda.",
  },
  {
    question: "A Chocolícia entrega doces em São Gonçalo e Maricá?",
    answer:
      "A base fica em Niterói e a Chocolícia atende São Gonçalo, Maricá, Itaboraí e todo o estado do Rio de Janeiro.",
  },
];

export default function DocesParaFestas() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#5A3428]">
      <PageMeta meta={meta} />
      <ServiceSchema
        name="Doces para Festas – Brigadeiros e Docinhos Artesanais"
        description="Brigadeiros artesanais, trufas, docinhos e doces finos para festas e eventos em Niterói, São Gonçalo, Maricá e Itaboraí."
        url={meta.canonical}
      />
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.chocolicia.site/" },
          { name: "Doces para Festas", url: meta.canonical },
        ]}
      />
      <FAQSchema items={faqs} />

      <header className="bg-[#3A241D] px-4 py-4 md:px-6 md:py-5 lg:px-8">
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
        <section className="px-4 py-10 md:px-6 md:py-16 lg:px-8 lg:py-20 bg-[#F3E5D0]/50">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow mb-3">Pequenos prazeres</p>
            <h1 className="font-display text-5xl leading-[1.04] text-[#5A3428] md:text-7xl">
              Doces para Festas em Niterói
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#8A5A44] md:mt-5">
              Brigadeiros artesanais, trufas, docinhos finos e muito mais — produzidos com
              carinho e ingredientes selecionados pela Chocolícia. Perfeitos para aniversários,
              casamentos, chás de bebê e qualquer celebração especial em Niterói, São Gonçalo,
              Maricá, Itaboraí e toda a Região Metropolitana do Rio de Janeiro.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
              <a
                href={waProduct("doces artesanais")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "doces_hero" })}
                className="button-gold button-primary"
              >
                Pedir doces pelo WhatsApp
              </a>
              <a href="#faq" className="button-outline">
                Perguntas frequentes
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title mb-8 md:mb-10 lg:mb-12">Nossos doces artesanais</h2>
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
              {[
                {
                  title: "Brigadeiros Artesanais",
                  text: "O clássico brasileiro elevado ao máximo. Brigadeiros gourmet com cobertura de granulado belga, castanhas, frutas ou confeitos especiais. Produzidos com chocolate de qualidade e leite condensado premium.",
                },
                {
                  title: "Trufas",
                  text: "Trufas com recheios cremosos e coberturas de chocolate. Opções com diferentes sabores, desde os tradicionais até combinações especiais com frutas e licores.",
                },
                {
                  title: "Docinhos Finos",
                  text: "Beijinhos, cajuzinhos, bicho-de-pé, olho-de-sogra e outros docinhos tradicionais, produzidos artesanalmente com ingredientes de qualidade.",
                },
                {
                  title: "Doces Gourmet",
                  text: "Criações especiais com ingredientes selecionados, para quem busca opções sofisticadas e diferenciadas para a mesa de doces do evento.",
                },
                {
                  title: "Doces Temáticos",
                  text: "Doces com decorações personalizadas para festas com tema específico. Cores, formatos e embalagens combinando com a identidade visual da celebração.",
                },
                {
                  title: "Caixas e Lembranças",
                  text: "Caixas de brigadeiros e doces para presentear ou distribuir como lembrança de casamento, chá de bebê, aniversário e outros eventos especiais.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#D9A83E]/30 bg-[#FFF9F0] p-5 md:p-6">
                  <h3 className="font-display text-2xl text-[#5A3428]">{item.title}</h3>
                  <p className="mt-2 text-[#8A5A44] leading-7">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-[#3A241D] p-5 text-[#FFF9F0] md:p-6">
              <h2 className="font-display text-3xl mb-2">Por que escolher os doces da Chocolícia?</h2>
              <p className="text-[#FFF9F0]/80 leading-7 mb-4">
                Cada docinho é produzido com atenção a cada detalhe, do sabor à apresentação.
                A Chocolícia acredita que os doces fazem parte da memória afetiva de uma festa
                — por isso, cada receita é pensada para ser inesquecível.
              </p>
              <ul className="space-y-2 text-[#FFF9F0]/80 leading-7">
                <li>✦ Produção 100% artesanal, feita à mão</li>
                <li>✦ Ingredientes frescos e selecionados</li>
                <li>✦ Sabores clássicos e opções gourmet</li>
                <li>✦ Embalagens personalizadas disponíveis</li>
                <li>✦ Entrega em Niterói e Região Metropolitana do RJ</li>
              </ul>
              <a
                href={waProduct("doces artesanais")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "doces_cta_dark" })}
                className="button-gold mt-6 inline-flex"
              >
                Solicitar orçamento
              </a>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#F3E5D0]/65 px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20 scroll-mt-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title mb-8 md:mb-10 lg:mb-12">Perguntas frequentes sobre doces</h2>
            <div className="space-y-3">
              {faqs.map(({ question, answer }, i) => (
                <details key={question} className="faq-item" open={i === 0}>
                  <summary>{question}<span aria-hidden="true">⌄</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-8 text-center">
              <a
                href={WA_ORCAMENTO}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "doces_faq_cta" })}
                className="button-gold button-primary"
              >
                Falar com a Chocolícia pelo WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer border-t border-[#FFF9F0]/10 bg-[#3A241D] px-4 py-10 pb-24 text-[#FFF9F0]/70 md:px-6 md:py-12 md:pb-12 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:gap-6 md:items-center md:justify-between">
          <div>
            <p className="text-[#FFF9F0] font-semibold">{SITE.fullName}</p>
            <p className="text-sm mt-2">{SITE.city}, {SITE.state} – Brasil</p>
            <a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "doces_footer" })} className="text-sm hover:text-[#FFF9F0] transition">
              {SITE.whatsappDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="block text-sm hover:text-[#FFF9F0] transition">{SITE.email}</a>
          </div>
          <nav className="flex gap-4 text-sm flex-wrap">
            <a href="/" className="hover:text-[#FFF9F0] transition">Início</a>
            <a href="/buffet-para-festas" className="hover:text-[#FFF9F0] transition">Buffet</a>
            <a href="/bolos-personalizados" className="hover:text-[#FFF9F0] transition">Bolos</a>
            <a href="/areas-atendidas" className="hover:text-[#FFF9F0] transition">Áreas Atendidas</a>
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
