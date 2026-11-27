# API de ingestão de receitas e dicas

Estas rotas pertencem ao backend do site. A integração com o agente Python e a publicação automática são validadas separadamente.

## Receitas

### Endpoint

`POST /api/recipes`

Autenticação: `Authorization: Bearer <RECIPES_AGENT_TOKEN>`

O payload usa o schema `recipeInputSchema` em `shared/recipes.ts`: `title`, `excerpt`, `category`, `coverImageUrl`, `coverImageAlt`, `ingredients`, `steps`, `prepTimeMin`, `servings`, `difficulty` e os campos opcionais de imagem, tags, dicas, FAQ, SEO e metadados. Os nomes são camelCase; os aliases snake_case dos campos de agente são normalizados.

Para idempotência, `agentIdempotencyKey` é obrigatório e deve ser estável por solicitação. `agentTopicSlug` é metadado opcional de pauta/publicação; não substitui a chave e não possui unicidade global.

O backend calcula `agentRequestHash` a partir do payload normalizado, grava os três campos nas colunas físicas e utiliza somente `agent_idempotency_key` como índice único de idempotência. A migration `0004_recipes_agent_idempotency.sql` cria as colunas e índices físicos de `recipes`; não foi executada no Neon. Repetição com mesmo conteúdo retorna HTTP 200 e header `Idempotent-Replay: true`; criação nova retorna HTTP 201. A chave ausente retorna HTTP 400; reutilização com payload diferente ou hash armazenado ausente/inverificável retorna HTTP 409.

O status segue o schema de receitas (`draft` ou `published`). A publicação via endpoint exige o token do agente. O endpoint diário existente `POST/GET /api/recipes/generate-daily` permanece separado e usa `CRON_SECRET`.

## Dicas

### Endpoint

`POST /api/tips`

Autenticação: `Authorization: Bearer <TIPS_AGENT_TOKEN>`

Payload mínimo:

```json
{
  "title": "Título da dica",
  "content": "Conteúdo completo da dica com pelo menos 30 caracteres.",
  "topicSlug": "slug-de-topico-existente",
  "agentIdempotencyKey": "chave-estavel-da-solicitacao"
}
```

Campos opcionais incluem `slug`, `excerpt`, `tipType`, `authorId`, `coverImageUrl`, `coverImageAlt`, `metaTitle`, `metaDescription`, `canonicalUrl`, `tags`, `images`, `status`, `reviewStatus`, `publishedAt` e `generationMeta`. CamelCase e aliases snake_case estão normalizados.

`topicSlug` é obrigatório e representa exclusivamente a categoria de referência; é resolvido em `tip_topics` e deve estar ativo. `agentTopicSlug` não substitui `topicSlug` nem é chave de idempotência. `agentIdempotencyKey` é obrigatório e único por solicitação; sua ausência torna o payload inválido (HTTP 400). Se `topicSlug` não corresponder a um tópico ativo, a API retorna HTTP 422 com código `topic_not_found`. Nenhum tópico é criado automaticamente.

Tags são slugs de registros existentes em `tags`. Imagens podem referenciar `imageId` existente em `images` ou fornecer `imageUrl`; relações são persistidas em `tip_tags` e `tip_images`. Referências inexistentes retornam HTTP 422.

A API usa `agent_idempotency_key`, `agent_topic_slug` e `agent_request_hash` físicos. Apenas `agent_idempotency_key` possui índice único; `agent_topic_slug` é metadado sem unicidade global. O hash é calculado no servidor a partir do payload normalizado. Repetição idêntica retorna HTTP 200 com `idempotent: true`; criação nova retorna HTTP 201. Conflito de conteúdo retorna HTTP 409.

O status padrão é `draft` e a revisão padrão `pending`. O envio autenticado pode solicitar `published`; `publishedAt` é definido pelo backend se não for fornecido. A leitura pública exige `status = published`, `reviewStatus = approved` e `publishedAt` preenchido. `pending` e `rejected` não são expostos. Os valores de `tipType` continuam sujeitos ao CHECK de domínio existente no PostgreSQL.

### Leitura pública

- `GET /api/tips?limit=20` lista dicas publicadas e aprovadas (limite de 1 a 50).
- `GET /api/tips/:slug` retorna uma dica publicada e aprovada.

## Erros de domínio

- HTTP 400: payload inválido.
- HTTP 401: bearer token inválido.
- HTTP 422: tópico, autor, tag, imagem ou estado inválido.
- HTTP 409: slug ou chave única conflitante.
- HTTP 503: API sem token ou banco indisponível.

Nenhuma rota `/api/articles` é criada.
