import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

const email = "chocoliciaartedosdoces@gmai.com";

export default function Legal() {
  return (
    <div className="legal-page min-h-screen bg-[#FFF9F0] text-[#5A3428]">
      <header className="legal-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <a href="/" className="footer-brand-lockup" aria-label="Voltar para a Chocolícia">
            <span className="font-display text-2xl text-[#FFF9F0]">Chocolícia</span>
          </a>
          <a href="/" className="legal-back-link"><ArrowLeft className="h-4 w-4" /> Voltar ao site</a>
        </div>
      </header>

      <main>
        <section className="legal-hero px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow !text-[#F3CD73]">Transparência e cuidado</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.04] text-[#FFF9F0] md:text-7xl">Políticas e Termos</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#FFF9F0]/70">Estas informações explicam como a Chocolícia trata dados, pedidos e a utilização deste site.</p>
            <nav className="legal-toc mt-9" aria-label="Navegação da página legal">
              <a href="#privacidade"><ShieldCheck className="h-4 w-4" /> Política de Privacidade</a>
              <a href="#termos"><FileText className="h-4 w-4" /> Termos de Uso</a>
            </nav>
          </div>
        </section>

        <div className="legal-content mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
          <section id="privacidade" className="legal-section scroll-mt-8">
            <div className="legal-section-heading"><ShieldCheck className="h-6 w-6 text-[#D9A83E]" /><div><p className="eyebrow">Seus dados, com respeito</p><h2>Política de Privacidade</h2></div></div>
            <p>Esta Política de Privacidade descreve como a Chocolícia — Arte dos Doces e Buffet utiliza as informações fornecidas por visitantes e clientes ao navegar pelo site, solicitar um orçamento ou entrar em contato.</p>
            <h3>1. Quais dados podemos receber</h3>
            <p>Quando você preenche o formulário de orçamento, podemos receber nome, tipo de evento, estimativa de convidados, data desejada, categoria do pedido e detalhes enviados por você. Também podemos receber dados de contato quando você fala conosco por WhatsApp ou e-mail.</p>
            <p>O site pode utilizar dados técnicos e de navegação, como dispositivo, páginas acessadas e interações com botões, por meio de ferramentas de análise configuradas para acompanhar o desempenho da página.</p>
            <h3>2. Como utilizamos as informações</h3>
            <p>As informações são utilizadas para responder solicitações, preparar orçamentos, organizar o atendimento, melhorar a experiência no site, medir campanhas e manter a segurança da operação. Não vendemos seus dados pessoais.</p>
            <h3>3. Compartilhamento e serviços parceiros</h3>
            <p>Podemos utilizar serviços de hospedagem, armazenamento, analytics e comunicação para operar o site e atender você. Esses fornecedores recebem apenas o necessário para prestar seus serviços e devem seguir medidas adequadas de segurança.</p>
            <h3>4. Armazenamento e segurança</h3>
            <p>Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acesso indevido, perda ou uso incompatível com esta política. Nenhum serviço digital é completamente imune a riscos, por isso recomendamos que você não envie informações sensíveis pelo formulário ou WhatsApp.</p>
            <h3>5. Retenção e seus direitos</h3>
            <p>Guardamos as informações pelo período necessário para responder ao atendimento, cumprir obrigações aplicáveis e proteger nossos direitos. Você pode solicitar confirmação de uso, acesso, correção ou exclusão de dados pelo e-mail <a href={`mailto:${email}`}>{email}</a>, sujeito às obrigações legais e à verificação da solicitação.</p>
            <h3>6. Cookies e atualizações</h3>
            <p>O site pode utilizar cookies ou tecnologias semelhantes para funcionamento, preferências e análise de uso. Esta política pode ser atualizada quando houver mudança nos serviços ou na legislação. A data da última atualização será indicada abaixo.</p>
          </section>

          <section id="termos" className="legal-section legal-section-divider scroll-mt-8">
            <div className="legal-section-heading"><FileText className="h-6 w-6 text-[#D9A83E]" /><div><p className="eyebrow">Uma relação clara</p><h2>Termos de Uso</h2></div></div>
            <p>Ao acessar este site, você concorda com estes Termos de Uso. Caso não concorde com alguma disposição, recomendamos não utilizar os canais digitais da Chocolícia.</p>
            <h3>1. Informações e catálogo</h3>
            <p>As imagens, sabores, cores, formatos e valores apresentados têm caráter ilustrativo e podem variar conforme disponibilidade, personalização, quantidade e data do evento. A confirmação de um pedido depende do atendimento direto e da disponibilidade da agenda.</p>
            <h3>2. Orçamentos e pedidos</h3>
            <p>O formulário envia uma solicitação de atendimento; ele não representa, por si só, a confirmação de compra ou reserva de data. O pedido será considerado confirmado somente após alinhamento das condições, aprovação do orçamento e eventual pagamento ou sinal combinado entre as partes.</p>
            <h3>3. Prazos, entrega e condições</h3>
            <p>Prazos de produção, retirada, entrega, taxas e condições de pagamento são informados caso a caso, de acordo com o pedido e o local do evento. Alterações solicitadas depois da aprovação podem modificar prazo, disponibilidade e valor.</p>
            <h3>4. Conteúdo e propriedade intelectual</h3>
            <p>Textos, identidade visual, fotografias, marcas e demais elementos deste site pertencem à Chocolícia ou são utilizados com autorização. Não é permitido copiar, redistribuir ou utilizar esse conteúdo comercialmente sem autorização prévia.</p>
            <h3>5. Links externos e disponibilidade</h3>
            <p>O site pode apresentar links para WhatsApp, redes sociais e outros serviços de terceiros. A Chocolícia não controla a disponibilidade, políticas ou conteúdo desses serviços. Também não garante que o site funcionará sem interrupções em todos os dispositivos ou redes.</p>
            <h3>6. Alterações e contato</h3>
            <p>Podemos atualizar estes termos para refletir mudanças no negócio, no site ou na legislação. Dúvidas sobre esta página podem ser enviadas para <a href={`mailto:${email}`}>{email}</a>.</p>
            <p className="legal-updated">Última atualização: 29 de setembro de 2026.</p>
          </section>
        </div>
      </main>

      <footer className="legal-footer"><span>© 2026 Chocolícia</span><a href="#privacidade">Privacidade</a><a href="#termos">Termos de Uso</a></footer>
    </div>
  );
}
