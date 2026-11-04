# Chocolícia — site completo

Site institucional da Chocolícia: página inicial, promoção sazonal, blog de receitas, páginas de serviços, orçamento, galeria administrável e integração com o agente de receitas. O projeto usa React, Vite, Tailwind CSS 4, Express, tRPC, Drizzle ORM, PostgreSQL/Neon e Vercel Functions.

## Requisitos e execução local

Requer Node.js 20 ou superior e pnpm 10.x. Instale as dependências com `pnpm install --frozen-lockfile`. Crie `.env` a partir do modelo `.env.example` e preencha apenas as credenciais necessárias ao serviço que pretende testar. O modelo contém nomes e finalidades, não credenciais.

```bash
pnpm dev
```

Abra a URL indicada pelo Vite no terminal. Para validar o projeto antes de publicar:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

`pnpm build` cria o frontend, o bundle SSR, as páginas pré-renderizadas, metadados SEO e o bundle Express em `dist/`. `dist/` é gerado e não faz parte do pacote-fonte. `pnpm start` destina-se a testar o bundle local já compilado.

## Comandos disponíveis

- `pnpm dev`: servidor Vite/Express em desenvolvimento.
- `pnpm check`: TypeScript sem emitir arquivos.
- `pnpm test`: testes automatizados Vitest.
- `pnpm build`: assets, SSR, pré-renderização e backend.
- `pnpm start`: servidor Node do build de produção.
- `pnpm db:generate`: gerar uma migração a partir de alterações ao schema Drizzle.
- `pnpm db:migrate`: aplicar migrações pendentes.
- `pnpm db:seed:recipes`: inserir receitas de seed para demonstração; utilizar só depois de rever o conteúdo e preferencialmente em staging.

## Variáveis de ambiente

Configure cada variável em `.env` local ou em **Vercel → Project Settings → Environment Variables**. Os valores não são incluídos neste ZIP.

- `DATABASE_URL`: ligação PostgreSQL, usada por orçamento, catálogo e receitas.
- `NEON_DATABASE_URL`: alias opcional usado pelo Drizzle Kit quando configurado.
- `JWT_SECRET`: segredo de assinatura das sessões administrativas.
- `ADMIN_PASSWORD`: palavra-passe da área de administração do catálogo.
- `ADMIN_OPEN_ID`: identificador da conta administrativa, se necessário.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `S3_BUCKET_NAME`: credenciais e localização do armazenamento Neon S3 para imagens.
- `PORT`: porta do servidor local.
- `RECIPES_AGENT_TOKEN`: autentica a publicação de uma receita completa em `POST /api/recipes`.
- `CRON_SECRET`: autentica a geração diária em `GET` ou `POST /api/recipes/generate-daily` e a chamada do Vercel Cron.
- `AUTO_PUBLISH`: define se a geração diária publica a receita ou a guarda como rascunho.
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `RECIPES_TEXT_MODEL`, `RECIPES_IMAGE_MODEL`: acesso e seleção dos modelos usados para conteúdo e imagens.
- `RECIPES_PUBLIC_BASE_URL`: base HTTPS pública/CDN onde as imagens de receita ficam acessíveis.

O login de administração precisa de `ADMIN_PASSWORD` e `JWT_SECRET`. A galeria dinâmica precisa da base de dados e das credenciais do armazenamento. A geração automática precisa ainda das credenciais de IA e da configuração pública de imagens.

## Banco de dados e migrações

Depois de configurar uma ligação PostgreSQL de staging, execute `pnpm db:migrate`. As migrações incluídas são `drizzle/0000_chocolicia_init.sql` e, em seguida, `drizzle/0001_recipes.sql`; o Drizzle mantém o registo de migrações em `drizzle/meta/`. Se o destino já tiver migrações aplicadas, confirme primeiro o respetivo estado e deixe o Drizzle aplicar apenas as pendentes em ordem numérica. Não execute migrações nem seeds contra produção sem uma janela de mudança, backup e aprovação do responsável.

`pnpm db:seed:recipes` é opcional e não foi executado durante a preparação deste pacote. O script `scripts/db-smoke.mts` pode criar e apagar dados de teste; não o execute numa base de produção.

## Publicação na Vercel

1. Importe o repositório `chocoliciaartedosdoces-netizen/chocolicia` ou carregue este ZIP para um repositório privado seu.
2. Selecione o preset **Other**. `vercel.json` define `pnpm install`, `pnpm build`, `dist/public`, as funções API, os rewrites e o cron diário.
3. Configure em Vercel as variáveis de ambiente necessárias por ambiente, incluindo Production, Preview e Development conforme o uso.
4. Ligue o PostgreSQL/Neon e o bucket S3; aplique as migrações no ambiente escolhido antes de ativar catálogo ou receitas.
5. Confirme a configuração do cron e as URLs de imagens públicas. Só depois da validação aprove o deploy de produção e o domínio.

O cron de receitas está configurado para `0 13 * * *` UTC. As rotas da promoção são `/promocao` e o alias `/promocoes`; a rota canónica SEO continua a ser `/promocao`. O blog usa `/receitas` e `/receitas/:slug`. O sitemap `/sitemap.xml` é servido dinamicamente para incluir receitas publicadas no banco; `robots.txt`, `llms.txt` e `llms-full.txt` são gerados no build.

## Integração do agente de receitas

O código do adaptador Python está em `integrations/agente-chocolicia-recipes/`. O adaptador não contém a lógica de geração: chama o backend do site, que cria o texto, gera a imagem, armazena variantes e grava a receita.

### Geração pelo adaptador ou pelo cron

`POST /api/recipes/generate-daily` aceita `Authorization: Bearer <CRON_SECRET>` e não precisa de corpo JSON. `GET` é também aceite para o cron Vercel. O adaptador lê a URL base e o segredo do ambiente local; não coloque o token em argumentos, código ou logs. Um sucesso devolve `201` e os dados da receita; falta de configuração pode devolver `503`, token inválido `401`, e falha de geração `500`.

O backend gera a imagem, guarda WebP e AVIF em `recipes/` no storage externo e grava os URLs em `coverImageUrl` e `coverImageVariants`. Não são necessários nem devem ser adicionados arquivos de imagem de receitas ao repositório. O gerador compara o título e o slug normalizado com receitas publicadas existentes antes de inserir; o índice único de slug no banco também impede duplicatas concorrentes. Uma repetição de slug no endpoint de publicação direta responde `409`.

### Publicação de uma receita já pronta

Para publicar texto e imagem preparados pelo agente externo, use `POST /api/recipes` com `Authorization: Bearer <RECIPES_AGENT_TOKEN>` e `Content-Type: application/json`. Este endpoint não recebe arquivos binários: primeiro carregue a imagem para um storage/CDN público seguro e envie os URLs em `coverImageUrl` e, opcionalmente, em `coverImageVariants`.

```json
{
  "title": "Brigadeiro de chocolate meio amargo",
  "excerpt": "Brigadeiro macio, com sabor intenso de chocolate e preparo simples para partilhar.",
  "category": "Brigadeiros e docinhos",
  "tags": ["brigadeiro", "chocolate"],
  "coverImageUrl": "https://cdn.example.com/recipes/brigadeiro-meio-amargo.webp",
  "coverImageAlt": "Brigadeiros de chocolate meio amargo em forminhas claras",
  "coverImageVariants": {
    "w480": "https://cdn.example.com/recipes/brigadeiro-meio-amargo-480.webp",
    "w800": "https://cdn.example.com/recipes/brigadeiro-meio-amargo-800.webp"
  },
  "ingredients": [
    {
      "name": "Massa",
      "items": [
        { "quantity": "1", "unit": "lata", "name": "leite condensado" },
        { "quantity": "100", "unit": "g", "name": "chocolate meio amargo picado" }
      ]
    }
  ],
  "steps": [
    { "instruction": "Coloque os ingredientes numa panela e misture em fogo baixo." },
    { "instruction": "Mexa até a massa desgrudar do fundo; deixe arrefecer antes de enrolar." }
  ],
  "prepTimeMin": 15,
  "cookTimeMin": 20,
  "servings": 20,
  "difficulty": "Média",
  "status": "published"
}
```

`slug` é opcional: quando omitido, o servidor normaliza o título para minúsculas e hífens. Forneça `slug` explicitamente apenas se precisar de controlar o URL. O servidor valida e higieniza o JSON, exige URL HTTP/HTTPS para a imagem e responde `201` quando grava. Um slug já existente resulta em `409`; JSON inválido em `400`; token inválido em `401`. O corpo tem limite de 1 MB.

## Estrutura do projeto

- `client/src/`: aplicação React, páginas, componentes, estilos, roteamento e SEO.
- `client/public/`: imagens finais, favicon, manifesto e arquivos públicos do Vite.
- `server/`: Express, tRPC, autenticação, storage, receitas e sitemap dinâmico.
- `api/`: funções serverless da Vercel para a API e páginas/sitemap dinâmicos.
- `drizzle/`: schema, migrações SQL e estado do Drizzle.
- `scripts/`: pré-renderização, geração de OG, migrações auxiliares e seeds.
- `shared/`: schemas e tipos partilhados entre cliente e servidor.
- `integrations/`: adaptador Python para acionar a geração pelo backend.
- `vercel.json`: build, rotas, funções, cabeçalhos e cron da Vercel.

Tailwind CSS 4 é integrado pelo plugin Vite e pelas diretivas/tokens em `client/src/index.css`; o projeto não utiliza um `tailwind.config.*` separado.

As imagens do blog e as imagens enviadas ao Catálogo vivo ficam em storage/CDN externo; apenas as imagens estáticas finais já existentes no site são mantidas em `client/public/`.

## Google Analytics e tags

O snippet GA4 `G-V7SP1DKR6V` está em `client/index.html`; foi preservado sem alterações, assim como os eventos existentes. O identificador GTM `GTM-P76PMH52` indicado no pedido não aparece nos arquivos desta base. Não foi adicionado um container novo para evitar alterar a instrumentação ou duplicar eventos sem confirmar a configuração pretendida.

## Conteúdo que requer confirmação comercial

A página de Natal exibe 25% de desconto, prazo de 22/12/2026 e “enquanto durarem os estoques”, como consta na referência entregue. Falta confirmação comercial final da campanha, da data/hora de início e se o prazo é inclusivo até 23:59:59 em UTC−03:00 (é esse o fim usado pelo countdown). A referência não identifica os produtos participantes nem as condições do desconto; nenhum preço com desconto foi calculado.

Os valores de Chocotone, Panetone, Bolo de nozes e Kit Ceia (a partir de R$ 150,00) foram transcritos da referência, não reconfirmados nesta conversa. Os preços informados diretamente pelo utilizador — Chocolate em palito R$ 25, Donuts de chocolate R$ 35 e Chocolate quadrado R$ 30 — estão exibidos, mas falta confirmar unidade/peso. O Kit Presente não tem preço confirmado. Não foram encontrados depoimentos atribuíveis com segurança à Chocolícia; nenhum testemunho ou citação foi publicado.
