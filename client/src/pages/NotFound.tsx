import { WA_ORCAMENTO } from "@/config/site";
import { PageMeta } from "@/seo/JsonLd";
import { getRouteMeta } from "@/seo/routeMeta";

const meta = getRouteMeta("/404");

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#5A3428] flex flex-col">
      <PageMeta meta={meta} />

      <header className="bg-[#3A241D] px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="font-display text-2xl text-[#FFF9F0]" aria-label="Chocolícia – início">
            Chocolícia
          </a>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="text-7xl font-display font-bold text-[#D9A83E]">404</p>
        <h1 className="mt-4 font-display text-4xl text-[#5A3428]">
          Página não encontrada
        </h1>
        <p className="mt-4 max-w-md text-lg leading-8 text-[#8A5A44]">
          A página que você buscou não existe ou foi movida. Explore os nossos serviços ou
          fale com a gente pelo WhatsApp.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="/" className="button-gold button-primary">Voltar à página inicial</a>
          <a href={WA_ORCAMENTO} target="_blank" rel="noreferrer" className="button-outline">
            Falar no WhatsApp
          </a>
        </div>

        <nav className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-[#8A5A44]">
          <a href="/buffet-para-festas" className="hover:text-[#5A3428] underline underline-offset-4">Buffet para Festas</a>
          <a href="/bolos-personalizados" className="hover:text-[#5A3428] underline underline-offset-4">Bolos Personalizados</a>
          <a href="/doces-para-festas" className="hover:text-[#5A3428] underline underline-offset-4">Doces para Festas</a>
          <a href="/areas-atendidas" className="hover:text-[#5A3428] underline underline-offset-4">Áreas Atendidas</a>
        </nav>
      </main>

      <footer className="bg-[#3A241D] px-5 py-6 text-center text-xs text-[#FFF9F0]/60">
        © 2026 Chocolícia – Arte dos Doces e Buffet. Niterói, Rio de Janeiro.
      </footer>
    </div>
  );
}
