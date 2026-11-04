# Blog de receitas — configuração e operação

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` ou `NEON_DATABASE_URL` | Sim | PostgreSQL já usado pelo site e Drizzle. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` | Sim para imagens geradas | Credenciais e endpoint S3 compatível já usados no projeto. |
| `AWS_REGION`, `S3_BUCKET_NAME` | conforme storage | Região/bucket; o nome do bucket predefinido é `assets`. |
| `RECIPES_PUBLIC_BASE_URL` | Sim para imagens geradas | Base pública/CDN que expõe os objetos escritos no bucket, sem barra final. O bucket tem de ser publicamente legível ou servir via CDN. |
| `RECIPES_AGENT_TOKEN` | Sim para `POST /api/recipes` | Token bearer secreto para o agente externo publicar receitas. Nunca colocar no frontend. |
| `CRON_SECRET` | Sim para cron | Segredo bearer validado no endpoint diário. A configuração Vercel Cron deve enviar `Authorization: Bearer <CRON_SECRET>`. |
| `OPENAI_API_KEY` | Sim para geração automática | Chave para geração de texto e imagem. Não é incluída no bundle do browser. |
| `OPENAI_BASE_URL` | Opcional | API compatível OpenAI; predefinição `https://api.openai.com/v1`. |
| `RECIPES_TEXT_MODEL`, `RECIPES_IMAGE_MODEL` | Opcional | Predefinições `gpt-4.1-mini` e `gpt-image-1`. |
| `AUTO_PUBLISH` | Opcional | `true` publica ao guardar; `false` grava como `draft`. |

Copie os nomes relevantes para as variáveis de ambiente do projeto Vercel (Production e Preview separadamente, quando aplicável). Nunca exponha tokens/chaves no código cliente nem nos logs.

## Migração e seed

Com o repositório e dependências instalados, aplique a migração já incluída:

```bash
pnpm install
pnpm db:migrate
```

Para layout com seis exemplos e fotografias placeholder remotas:

```bash
pnpm db:seed:recipes
```

O seed é idempotente pelo slug. Use uma base de desenvolvimento/staging; a base configurada é partilhada pelo desenvolvimento e produção e uma migração/seed nela altera dados reais. Os exemplos usam imagens remotas de placeholder e não são receitas editoriais aprovadas.

## Ativar ou desativar o cron

O `vercel.json` agenda `GET /api/recipes/generate-daily` diariamente às 13:00 UTC, correspondentes às 10:00 em Brasília. Configure `CRON_SECRET` nas variáveis Vercel; o endpoint valida o bearer secret antes de gerar. Com `AUTO_PUBLISH=false`, novas gerações ficam em draft. Para pausar, remova/desative a entrada `crons` no `vercel.json` e faça novo deploy; para reativar, restaure-a e publique novamente. O cron não executa automaticamente até o deployment com esta configuração.

A função de geração usa timeout Vercel de até 120 segundos; confirme o limite do plano antes de deploy. As APIs de leitura usam `s-maxage=60, stale-while-revalidate=300`; o sitemap em `/sitemap.xml` é montado dinamicamente com as receitas publicadas.

## Deploy

1. Configure variáveis no ambiente Vercel, incluindo acesso ao banco e à CDN pública do storage.
2. Aplique `pnpm db:migrate` à base pretendida antes de publicar a versão que consome a tabela `recipes`.
3. Execute `pnpm check`, `pnpm test` e `pnpm build`.
4. Publique pelo fluxo normal do repositório na Vercel. Confirme que Cron Jobs está disponível no plano, que o scheduled invocation inclui o bearer secret e que o endpoint responde depois do deploy.
5. Para pausar a geração, desative/remova o cron no `vercel.json` e publique. Definir `AUTO_PUBLISH=false` mantém a geração ligada, mas desativa a publicação automática.

A API manual aceita `POST /api/recipes` com cabeçalho `Authorization: Bearer $RECIPES_AGENT_TOKEN`; valida o JSON com Zod, sanitiza conteúdo textual e rejeita slugs repetidos. O endpoint `/api/recipes/generate-daily` é para o cron, autenticado separadamente por `CRON_SECRET`.
