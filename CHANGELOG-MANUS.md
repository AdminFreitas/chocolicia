# CHANGELOG-MANUS — Chocolícia

## Base e âmbito

Pacote preparado a partir do checkout do repositório `chocoliciaartedosdoces-netizen/chocolicia`, no commit-base `7a6caa309ea60abd971f7726ea0125f1982dfe6b`, incluindo as alterações locais descritas abaixo. Não foi feito push para GitHub, deploy, acesso à base de produção, migração ou seed. A Home mantém o hero original e o `TechText`; o GA4 existente e os eventos foram preservados.

## Resumo por página e área

- **Home (`/`)** — mantida a estrutura original do hero; botões centralizados conforme pedido, banner promocional reforçado, secção Catálogo vivo reposicionada após “Nossa história” e galeria ordenada por data com destaque visual para imagens recentes; removido o aviso fictício de avaliações e não foram inventadas citações.
- **Promoção (`/promocao` e `/promocoes`)** — página de Natal com contador até 22/12/2026, imagens finais incluídas, botões WhatsApp e alias plural; `/promocao` permanece canónica e `/promocoes` não duplica o sitemap.
- **Receitas (`/receitas`, `/receitas/:slug`)** — listagem, filtros, detalhe com SEO dinâmico, pré-renderização shell para receita e páginas para dados do servidor; sem receitas locais de produção, pois conteúdo e imagens vêm da base/storage.
- **Navegação e páginas existentes** — menu do cabeçalho na ordem Início / Promoção / Receitas / Orçamento / Catálogo / Sobre / FAQ; rotas antigas com carregamento lazy e skeleton; removida do rodapé a frase “Feito à mão, com carinho”.
- **APIs e integração** — endpoints de receitas, geração diária, sitemap e página SSR; adaptador Python chama o backend sem duplicar geração, com workflow manual sem agendamento próprio.
- **SEO** — `robots.txt`, `llms.txt` e `llms-full.txt` no diretório público; sitemap XML servido dinamicamente por endpoint para conter receitas publicadas.

## Arquivos criados — uma linha por arquivo

- `PERFORMANCE.md` — relatório de Lighthouse e otimizações observadas.
- `PROMOCAO-REFERENCIA.md` — registo da origem e dos valores de referência da campanha, distinguindo dados informados e pendências.
- `RECIPES.md` — guia operacional específico do blog, migração, cron e seed.
- `CHANGELOG-MANUS.md` — este registo da entrega.
- `api/recipe-page.ts` — função Vercel para HTML de detalhe de receita.
- `api/recipes-sitemap.ts` — função Vercel para sitemap dinâmico.
- `client/public/images/promocao/bolo.webp` — fotografia final do bolo da campanha.
- `client/public/images/promocao/caixa-bombons.webp` — fotografia final do chocolate quadrado.
- `client/public/images/promocao/ceia.webp` — fotografia final da ceia.
- `client/public/images/promocao/chocotone.webp` — fotografia final do chocotone.
- `client/public/images/promocao/donuts.webp` — fotografia final dos donuts.
- `client/public/images/promocao/hero-og.jpg` — imagem social Open Graph da promoção.
- `client/public/images/promocao/hero.webp` — imagem principal da promoção.
- `client/public/images/promocao/kit-ceia.webp` — fotografia final do Kit Ceia.
- `client/public/images/promocao/kit.webp` — fotografia final do Kit Presente.
- `client/public/images/promocao/palitos.webp` — fotografia final dos chocolates em palito.
- `client/public/images/promocao/panetone.webp` — fotografia final do panetone.
- `client/public/llms-full.txt` — conteúdo público estendido para crawlers/LLMs.
- `client/public/llms.txt` — conteúdo público resumido para crawlers/LLMs.
- `client/public/manus-routes.json` — manifesto das rotas do website.
- `client/public/robots.txt` — regras públicas para crawlers.
- `client/src/App.client.tsx` — router cliente com carregamento lazy das páginas.
- `client/src/components/HomePromotionBanner.css` — estilos do banner de Natal da Home.
- `client/src/components/HomePromotionBanner.tsx` — banner e chamada para promoção na Home.
- `client/src/components/LegacyRouteFallback.tsx` — skeleton para rotas antigas durante navegação.
- `client/src/components/RecentRecipesSection.tsx` — bloco de receitas recentes na Home.
- `client/src/components/RecipeCard.tsx` — card reutilizável de receita.
- `client/src/components/RecipePageMeta.tsx` — metadados SEO da página de receita.
- `client/src/components/RecipeRouteFallback.tsx` — skeleton de carregamento das rotas de receitas.
- `client/src/components/RecipeSiteChrome.tsx` — shell visual das páginas de receitas.
- `client/src/components/SiteChrome.tsx` — cabeçalho, navegação e rodapé partilhados.
- `client/src/lib/promotionCountdown.ts` — cálculo da contagem regressiva de Natal.
- `client/src/lib/recipes.ts` — helpers e tipos de consumo das receitas.
- `client/src/pages/Promotion.css` — estilos próprios da página promocional.
- `client/src/pages/Promotion.tsx` — conteúdo da página de Natal e preços informados.
- `client/src/pages/RecipeDetail.tsx` — página de detalhe de receita.
- `client/src/pages/Recipes.tsx` — listagem e pesquisa de receitas.
- `drizzle/0001_recipes.sql` — migração das tabelas e índices do blog.
- `drizzle/meta/0001_snapshot.json` — snapshot Drizzle correspondente à migração de receitas.
- `integrations/agente-chocolicia-recipes/.github/workflows/gerar-receita-blog.yml` — workflow manual para acionar o endpoint de geração.
- `integrations/agente-chocolicia-recipes/README.md` — instruções de instalação, operação e limites do adaptador.
- `integrations/agente-chocolicia-recipes/agent-recipes.env.example` — nomes e finalidade das variáveis do adaptador, sem valores.
- `integrations/agente-chocolicia-recipes/scripts/gerar_receita_blog.py` — adaptador Python que chama a API do site.
- `integrations/agente-chocolicia-recipes/tests/test_gerar_receita_blog.py` — testes do adaptador com transporte simulado.
- `scripts/seed-recipes.mts` — seed opcional para ambiente de desenvolvimento/staging.
- `server/recipeAgent.ts` — geração de conteúdo, imagem, variantes e verificação de duplicatas publicadas.
- `server/recipeDb.ts` — consultas e gravação de receitas via Drizzle.
- `server/recipePage.ts` — resposta HTML SEO para detalhe dinâmico.
- `server/recipeSitemap.ts` — geração dinâmica do sitemap com receitas publicadas.
- `server/recipesRoutes.ts` — listagem, detalhe, geração diária e publicação autenticada.
- `shared/recipes.ts` — schemas Zod e tipos partilhados para receitas.

## Arquivos alterados — uma linha por arquivo

- `.env.example` — apenas nomes de variáveis e finalidades, sem valores.
- `README.md` — instalação pnpm, comandos, Vercel, variáveis, migrações, estrutura, endpoints, payload JSON e pendências comerciais.
- `client/src/App.tsx` — router SSR com a alias `/promocoes`.
- `client/src/components/CatalogManager.tsx` — ordenação por data, selo e realce de imagens novas; estado vazio também destaca novidades.
- `client/src/index.css` — estilos de navegação, banner, galeria, botão de promoção e responsividade.
- `client/src/main.tsx` — hidratação do router cliente e carregamento da aplicação.
- `client/src/pages/AreasAtendidas.tsx` — remoção do slogan de rodapé solicitado.
- `client/src/pages/BolosPersonalizados.tsx` — remoção do slogan de rodapé solicitado.
- `client/src/pages/BuffetParaFestas.tsx` — remoção do slogan de rodapé solicitado.
- `client/src/pages/DocesParaFestas.tsx` — remoção do slogan de rodapé solicitado.
- `client/src/pages/Home.tsx` — ajustes de CTA, ordem de secções e ausência de depoimentos não verificáveis.
- `client/src/seo/buildArtifacts.ts` — geração dos artefactos SEO e canonical sem duplicar alias.
- `client/src/seo/routeMeta.ts` — metadados de rotas, incluindo canonical da promoção.
- `drizzle/meta/_journal.json` — registo da migração de receitas.
- `drizzle/schema.ts` — schema Drizzle das tabelas e índices de receitas.
- `package.json` — scripts de migração/seed e dependências do blog e build.
- `pnpm-lock.yaml` — lockfile alinhado com `package.json`.
- `scripts/prerender.ts` — pré-renderização de rotas, SEO, shell de receita e alias de promoção.
- `server/createApp.ts` — rotas Express para APIs, página de receita e sitemap dinâmico.
- `server/storage.ts` — configuração de armazenamento compatível com S3.
- `vercel.json` — funções, rewrites, cache e cron diário de receitas.
- `vite.config.ts` — code splitting e configuração de build cliente/SSR.

## Arquivos removidos

- Nenhum arquivo do projeto foi removido.

## Migrações e ordem

1. `drizzle/0000_chocolicia_init.sql` — schema inicial já existente no projeto.
2. `drizzle/0001_recipes.sql` — tabelas, estados e índices das receitas.

Executar `pnpm db:migrate` apenas no ambiente pretendido depois de conferir o estado do banco. A migração e o seed não foram executados neste trabalho.

## Notas de verificação e pendências

- Nenhum segredo literal foi encontrado pela varredura estática; `.env` não existe no checkout e os dois arquivos `.env.example` mantêm valores vazios.
- `client/index.html` contém o GA4 `G-V7SP1DKR6V`; o GTM `GTM-P76PMH52` pedido não está presente na base. O GA4/eventos não foram alterados e nenhum container novo foi injetado.
- O Lighthouse mobile documentado em `PERFORMANCE.md` é 87, abaixo da meta 90; precisa ser medido novamente após deploy.
- A campanha exibe 25% e o prazo 22/12/2026 da referência, mas produtos participantes, condições, início, horário inclusivo e alguns preços ainda requerem confirmação; nenhum desconto sobre preço foi calculado.
- Os três preços de chocolates informados pelo utilizador não incluem unidade/peso; o Kit Presente não tem preço confirmado. Os restantes valores exibidos vêm do ZIP de referência e não foram reconfirmados nesta conversa.
- Não foram adicionadas citações de clientes: não havia depoimentos verificáveis atribuíveis à Chocolícia.
- Receitas, imagens do blog e imagens carregadas na galeria dependem do banco/storage externo; sem credenciais em preview não há conteúdo de produção.

## Arquivos/artefatos excluídos do ZIP

- `plan.md` e `TODO.md` — notas de planeamento/checklist, excluídas por não serem artefactos finais do site.
- `.git`, `node_modules`, `dist`, `build`, `.vercel`, caches, `.env`, logs e arquivos temporários — excluídos conforme solicitado; `.env` não estava presente.
- Não há `tailwind.config.*`: o Tailwind CSS 4 usa o plugin Vite e as diretivas/tokens de `client/src/index.css`.
- Não foi incluído `sitemap.xml` estático; `/sitemap.xml` é um endpoint dinâmico para refletir as receitas publicadas.
