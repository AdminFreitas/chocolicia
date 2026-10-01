import { SITE, WA_ORCAMENTO, waProduct } from "@/config/site";
import { BreadcrumbSchema, FAQSchema, PageMeta, ServiceSchema } from "@/seo/JsonLd";
import { getRouteMeta } from "@/seo/routeMeta";
import { trackEvent } from "@/lib/analytics";

const meta = getRouteMeta("/bolos-personalizados");

const faqs = [
  {
    question: "A Chocolícia faz bolos com temas personalizados?",
    answer:
      "O serviço é voltado a bolos personalizados. Compartilhe sua ideia, a ocasião e as referências ao conversar com a Chocolícia.",
  },
  {
    question: "Quais sabores de bolo estão disponíveis?",
    answer:
      "As opções de sabor são informadas durante a conversa sobre o pedido. Conte suas preferências pelo WhatsApp ao solicitar informações.",
  },
  {
    question: "Com quanto tempo de antecedência devo encomendar um bolo?",
    answer:
      "O prazo depende dos detalhes do pedido. Informe a data desejada ao entrar em contato para conversar sobre a encomenda.",
  },
  {
    question: "A Chocolícia faz bolos para casamentos e noivados?",
    answer:
      "Converse com a Chocolícia sobre a ocasião, suas referências e o bolo que está imaginando.",
  },
  {
    question: "Como funciona a entrega do bolo?",
    answer:
      "Informe sua cidade e converse com a Chocolícia sobre as condições para receber o pedido.",
  },
  {
    question: "Posso ver referências antes de encomendar?",
    answer:
      "Você pode compartilhar referências e detalhes pelo WhatsApp. O Instagram da Chocolícia também está disponível para conhecer imagens do trabalho.",
  },
  {
    question: "A Chocolícia entrega bolos em São Gonçalo e Maricá?",
    answer:
      "A base fica em Niterói e a Chocolícia atende São Gonçalo, Maricá, Itaboraí e todo o estado do Rio de Janeiro.",
  },
];

export default function BolosPersonalizados() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#5A3428]">
      <PageMeta meta={meta} />
      <ServiceSchema
        name="Bolos Personalizados"
        description="Bolos artesanais e personalizados para aniversários, casamentos e celebrações especiais em Niterói e Região Metropolitana do Rio de Janeiro."
        url={meta.canonical}
      />
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.chocolicia.site/" },
          { name: "Bolos Personalizados", url: meta.canonical },
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
            <p className="eyebrow mb-3">Criações exclusivas</p>
            <h1 className="font-display text-5xl leading-[1.04] text-[#5A3428] md:text-7xl">
              Bolos Personalizados em Niterói
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#8A5A44] md:mt-5">
              Na Chocolícia, cada bolo é uma obra feita à mão. Criados especialmente para a
              sua celebração, nossos bolos artesanais combinam técnica de confeitaria,
              ingredientes selecionados e uma apresentação que encanta antes mesmo da
              primeira fatia. Atendemos Niterói, São Gonçalo, Maricá, Itaboraí e toda a
              Região Metropolitana do Rio de Janeiro.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
              <a
                href={waProduct("um bolo personalizado")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "bolos_hero" })}
                className="button-gold button-primary"
              >
                Encomendar bolo pelo WhatsApp
              </a>
              <a href="#faq" className="button-outline">
                Perguntas frequentes
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title mb-8 md:mb-10 lg:mb-12">Tipos de bolo que fazemos</h2>
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
              {[
                {
                  title: "Bolos de Aniversário",
                  text: "Criações temáticas e personalizadas para aniversários de todas as idades. Escolha o sabor, o recheio, a cobertura e o tema.",
                },
                {
                  title: "Bolos para Casamento",
                  text: "Bolos de andares elegantes, com decorações florais, elementos dourados ou qualquer estética que combine com o estilo da celebração.",
                },
                {
                  title: "Bolos para Festas Infantis",
                  text: "Bolos temáticos e coloridos para as crianças, com personagens, animais e elementos divertidos que encantam os pequenos.",
                },
                {
                  title: "Bolos para 15 Anos",
                  text: "Bolos sofisticados para festas de debutante, com acabamentos delicados em pasta americana, flores de açúcar ou ganache.",
                },
                {
                  title: "Bolos para Chá de Bebê",
                  text: "Bolos delicados para chás de bebê e revelações, com paletas em tons suaves e decorações temáticas para o momento especial.",
                },
                {
                  title: "Bolos Gourmet e Naked Cake",
                  text: "Para quem prefere um visual mais simples e elegante, oferecemos naked cakes e semi-naked cakes com frutas frescas ou flores naturais.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#D9A83E]/30 bg-[#FFF9F0] p-5 md:p-6">
                  <h3 className="font-display text-2xl text-[#5A3428]">{item.title}</h3>
                  <p className="mt-2 text-[#8A5A44] leading-7">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-[#3A241D] p-5 text-[#FFF9F0] md:p-6">
              <h2 className="font-display text-3xl mb-2">Como encomendar seu bolo</h2>
              <p className="text-[#FFF9F0]/80 leading-7 mb-4">
                O processo é simples e pensado para facilitar a sua experiência. Você nos
                conta o que imagina e nós cuidamos do resto — da criação à entrega.
              </p>
              <ol className="space-y-2 text-[#FFF9F0]/80 leading-7 list-decimal list-inside">
                <li><strong>Fale conosco:</strong> Envie a data do evento, o número de porções e qualquer referência de tema ou estilo.</li>
                <li><strong>Receba o orçamento:</strong> Enviamos uma proposta com sabor, recheio, cobertura e valor.</li>
                <li><strong>Confirme o pedido:</strong> Após aprovação e pagamento combinado, a data é reservada.</li>
                <li><strong>Produção artesanal:</strong> Seu bolo é produzido com ingredientes frescos e selecionados.</li>
                <li><strong>Entrega ou retirada:</strong> Na data combinada, entregamos no local ou disponibilizamos para retirada.</li>
              </ol>
              <a
                href={waProduct("um bolo personalizado")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("whatsapp_click", { placement: "bolos_cta_dark" })}
                className="button-gold mt-6 inline-flex"
              >
                Encomendar agora
              </a>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#F3E5D0]/65 px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20 scroll-mt-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="section-title mb-8 md:mb-10 lg:mb-12">Perguntas frequentes sobre bolos</h2>
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
                onClick={() => trackEvent("whatsapp_click", { placement: "bolos_faq_cta" })}
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
            <a href={`tel:+${SITE.whatsappNumber}`} onClick={() => trackEvent("phone_click", { placement: "bolos_footer" })} className="text-sm hover:text-[#FFF9F0] transition">
              {SITE.whatsappDisplay}
            </a>
            <a href={`mailto:${SITE.email}`} className="block text-sm hover:text-[#FFF9F0] transition">{SITE.email}</a>
          </div>
          <nav className="flex gap-4 text-sm flex-wrap">
            <a href="/" className="hover:text-[#FFF9F0] transition">Início</a>
            <a href="/buffet-para-festas" className="hover:text-[#FFF9F0] transition">Buffet</a>
            <a href="/doces-para-festas" className="hover:text-[#FFF9F0] transition">Doces</a>
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
