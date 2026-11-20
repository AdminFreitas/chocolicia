# API de integração do Agente Chocolícia

Este documento descreve a API HTTP usada pelo agente publicado em `AdminFreitas/agente-chocolicia`, branch `fix/cli-pipeline-receitas`. A base da API é a origem do site, por exemplo `https://www.chocolicia.site`.

## Autenticação e headers comuns

As rotas de escrita usam exatamente:

```http
Authorization: Bearer AGENT_TOKEN_FICTICIO
Content-Type: application/json
```

O valor real de `AGENT_TOKEN_FICTICIO` é o segredo `RECIPES_AGENT_TOKEN` configurado no site e no agente. Comparações de token são feitas em tempo constante. O agente também envia estes headers de rastreabilidade:

```http
X-Contract-Version: 1
X-Request-Id: request-id-gerado-pelo-agente
Idempotency-Key: chave-deterministica
```

`X-Contract-Version` é obrigatório para o payload v1 de receita. `X-Request-Id` e `Idempotency-Key` são recomendados para diagnóstico e reenvio seguro; a idempotência de conteúdo é determinada por `slug` e `generationMeta.run_id`.

Limites gerais de JSON:

- Receita: corpo máximo de 1 MiB.
- Artigo/dica: corpo máximo de 1 MiB.
- Upload: imagem binária máxima de 8 MiB; a representação Base64 pode ter até `ceil(8 MiB / 3) * 4` caracteres.

## Códigos HTTP

| Código | Uso |
|---:|---|
| `201` | Conteúdo ou upload criado; publicação concluída em uma operação nova. |
| `200` | Consulta, replay idempotente ou publicação de algo que já estava publicado. Replays recebem `Idempotent-Replay: true`. |
| `400` | JSON inválido, campo obrigatório ausente, formato inválido ou Base64 inválido. |
| `401` | Header Bearer ausente ou token inválido. |
| `404` | Slug não encontrado em publicação/status ou receita pública inexistente. |
| `409` | Slug já existe para outro `generationMeta.run_id`. |
| `413` | Corpo, Base64 ou imagem excede o limite. |
| `415` | Tipo MIME de imagem não permitido ou MIME declarado diferente do conteúdo real. |
| `422` | Receita v1 semanticamente incompatível, por exemplo categoria/subcategoria inválida ou `coverImageUrl` sem HTTPS. |
| `503` | Credencial ausente, banco/storage indisponível ou falha operacional. |

## Upload de imagem — `POST /api/uploads`

O formato é JSON com Base64, não multipart. O servidor ignora o nome enviado pelo cliente e gera o nome final com UUID; o campo `fileName` pode continuar sendo enviado pelo agente por compatibilidade, mas não controla o caminho armazenado.

### Requisição

```json
{
  "fileName": "capa-bolo.png",
  "contentType": "image/png",
  "dataBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "alt": "Bolo de chocolate decorado"
}
```

| Campo | Tipo | Obrigatório | Limite/valores |
|---|---|---:|---|
| `fileName` | string | não | Aceito por compatibilidade; o servidor não o usa para o nome final. |
| `contentType` | string | sim | `image/jpeg`, `image/png`, `image/webp` ou `image/avif`. |
| `dataBase64` | string | sim | Base64 válido; conteúdo decodificado entre 1 byte e 8 MiB. |
| `alt` | string | sim | 1 a 240 caracteres. |

Além do MIME declarado, o servidor usa `sharp` para validar os bytes reais e exige que o formato detectado corresponda ao MIME. São rejeitados conteúdo arbitrário, extensão enganosa e MIME incompatível.

### Sucesso

```json
{
  "key": "agent/550e8400-e29b-41d4-a716-446655440000.png",
  "url": "https://cdn.exemplo.test/agent/550e8400-e29b-41d4-a716-446655440000.png"
}
```

### Exemplo

```bash
curl -X POST "https://www.chocolicia.site/api/uploads" \
  -H "Authorization: Bearer AGENT_TOKEN_FICTICIO" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: upload-exemplo-001" \
  --data '{"fileName":"capa.png","contentType":"image/png","dataBase64":"iVBORw0KGgo=","alt":"Capa de receita"}'
```

## Artigos e dicas — `POST /api/articles`

### Valores aceitos em `type`

- `technique`: técnica.
- `tip`: dica; exige `tipTopic`.
- `feature`: matéria; exige `subcategorySlug` e fontes no contrato completo do agente.

O endpoint do site persiste o payload completo em `payload`, além dos campos normalizados abaixo. O agente valida previamente o contrato v1.

### Requisição completa do contrato v1

```json
{
  "type": "tip",
  "title": "Como conservar brigadeiros corretamente",
  "slug": "como-conservar-brigadeiros-corretamente",
  "excerpt": "Veja os cuidados para conservar brigadeiros e manter textura e sabor.",
  "subcategorySlug": null,
  "tipTopic": "conservacao",
  "bodyMd": "## Conservação\n\nTexto educativo em Markdown.",
  "structured": {"steps": []},
  "sources": [],
  "tags": ["brigadeiros"],
  "relatedTopics": ["preparo", "conservacao"],
  "cover": {"mode": "generate", "imagePrompt": "Brigadeiros em uma caixa elegante"},
  "coverImageUrl": "https://cdn.exemplo.test/agent/capa.webp",
  "coverImageAlt": "Brigadeiros armazenados em caixa",
  "status": "draft",
  "aiModel": "modelo-texto-ficticio",
  "generationMeta": {
    "run_id": "run-20261120-001",
    "topic_slug": "conservacao",
    "phase": 1,
    "prompt_version": "v1",
    "validators_version": "v1"
  }
}
```

| Campo | Tipo | Obrigatório | Limite/valores |
|---|---|---:|---|
| `type` | string | sim | `technique`, `tip` ou `feature`. |
| `title` | string | sim | 5 a 180 caracteres. |
| `slug` | string | não | 3 a 180; minúsculas, números e hífens. Se omitido, é gerado a partir do título. |
| `excerpt` | string | sim | 20 a 160 caracteres. |
| `subcategorySlug` | string/null | condicional | Até 120; slug válido. Necessário para `technique` e `feature` no contrato do agente. |
| `tipTopic` | string/null | condicional | 1 a 60 caracteres; obrigatório para `tip`. |
| `bodyMd` | string | sim | 1 a 100.000 caracteres. |
| `structured` | object/null | não | Estrutura adicional livre. |
| `sources` | array | não | Fontes `{name,title,url}`; exigidas pelo agente para `technique` e `feature`. |
| `tags` | array de strings | não | Até 12 tags. |
| `relatedTopics` | array de strings | não | Até 6; o contrato do agente exige pelo menos 2 quando informado. |
| `cover` | object | sim no contrato v1 | Metadados transitórios da capa. |
| `coverImageUrl` | string HTTPS | sim | URL pública HTTPS. |
| `coverImageAlt` | string | sim | 8 a 240 caracteres. |
| `status` | string | não | `draft` ou `published`; padrão `draft`. |
| `aiModel` | string | sim no contrato v1 | Até 120 caracteres. |
| `generationMeta` | object | sim no contrato v1 | Deve conter os identificadores de execução usados pelo agente, especialmente `run_id` e `topic_slug`. |

### Sucesso e idempotência

Criação nova retorna `201` com os campos persistidos, `url` e `status`:

```json
{
  "id": "article-id",
  "slug": "como-conservar-brigadeiros-corretamente",
  "status": "draft",
  "coverImageUrl": "https://cdn.exemplo.test/agent/capa.webp",
  "url": "https://www.chocolicia.site/conteudos/como-conservar-brigadeiros-corretamente"
}
```

O mesmo `slug` com o mesmo `generationMeta.run_id` retorna `200` e `Idempotent-Replay: true`. O mesmo slug com outro run retorna `409`.

### Exemplo

```bash
curl -X POST "https://www.chocolicia.site/api/articles" \
  -H "Authorization: Bearer AGENT_TOKEN_FICTICIO" \
  -H "Content-Type: application/json" \
  -H "X-Contract-Version: 1" \
  -H "X-Request-Id: req-artigo-001" \
  -H "Idempotency-Key: artigo-run-001" \
  --data @article.json
```

## Publicar artigo — `POST /api/articles/:slug/publish`

Não recebe campos obrigatórios no corpo. Exige `Authorization: Bearer AGENT_TOKEN_FICTICIO`. Se o slug não existir, retorna `404`. Se já estiver publicado, retorna `200` com `Idempotent-Replay: true`; uma publicação nova retorna `201`.

```bash
curl -X POST "https://www.chocolicia.site/api/articles/como-conservar-brigadeiros-corretamente/publish" \
  -H "Authorization: Bearer AGENT_TOKEN_FICTICIO" \
  -H "Content-Type: application/json"
```

## Status de artigo — `GET /api/articles/:slug/status`

É uma consulta pública e não exige token. Retorna:

```json
{
  "id": "article-id",
  "slug": "como-conservar-brigadeiros-corretamente",
  "status": "published",
  "publishedAt": "2026-11-20T18:00:00.000Z",
  "url": "https://www.chocolicia.site/conteudos/como-conservar-brigadeiros-corretamente"
}
```

```bash
curl "https://www.chocolicia.site/api/articles/como-conservar-brigadeiros-corretamente/status"
```

## Receitas — `POST /api/recipes`

Exige os mesmos headers de autenticação, rastreabilidade e contrato. O payload v1 usa todos os campos abaixo; o site exige `category` compatível com a taxonomia e `coverImageUrl` HTTPS antes de persistir.

```json
{
  "title": "Bolo de chocolate cremoso",
  "slug": "bolo-de-chocolate-cremoso",
  "excerpt": "Aprenda a preparar um bolo de chocolate cremoso e fácil.",
  "category": "Bolos",
  "intro": "Uma receita clássica para a família.",
  "subcategorySlug": "bolos-de-chocolate",
  "secondarySubcategorySlugs": [],
  "prepTimeMin": 20,
  "cookTimeMin": 35,
  "restTimeMin": 0,
  "servings": 10,
  "yieldLabel": "1 bolo",
  "difficulty": "Fácil",
  "ingredients": [{"name":"Massa","items":[{"name":"Farinha","quantity":"2","unit":"xícaras"}]}],
  "steps": [{"instruction":"Misture os ingredientes."},{"instruction":"Asse até firmar."},{"instruction":"Deixe esfriar."},{"instruction":"Sirva."}],
  "tips": [],
  "storageNotes": "Conservar em recipiente fechado.",
  "faq": [],
  "tags": ["bolo-de-chocolate"],
  "occasions": [],
  "collections": [],
  "diet": [],
  "cover": {"mode":"stock","imagePrompt":"Bolo de chocolate cremoso"},
  "coverImageUrl": "https://cdn.exemplo.test/agent/bolo.webp",
  "coverImageAlt": "Bolo de chocolate cremoso fatiado",
  "status": "published",
  "aiModel": "modelo-texto-ficticio",
  "generationMeta": {"run_id":"run-20261120-002","topic_slug":"bolo-de-chocolate-cremoso","phase":1,"prompt_version":"v1","validators_version":"v1"}
}
```

| Campo | Tipo | Obrigatório | Limite/valores |
|---|---|---:|---|
| `title` | string | sim | 5–180. |
| `slug` | string | não | 3–180, slug; gerado do título se omitido. |
| `excerpt` | string | sim | 20–160. |
| `category` | string | sim no v1 do site | `Bolos`, `Brigadeiros e docinhos`, `Tortas`, `Sobremesas`, `Chocolates`, `Festas e buffet` ou `Datas especiais`. |
| `intro` | string | não | Até 2.000 no contrato do agente. |
| `subcategorySlug` | string | sim no contrato v1 | Até 120 e pertencente à categoria. |
| `secondarySubcategorySlugs` | array | não | Até 2. |
| `prepTimeMin`/`cookTimeMin`/`restTimeMin` | integer | sim/condicional | Respectivamente 1–1440, 0–1440 e 0–10080. |
| `servings` | integer | sim | 1–500. |
| `yieldLabel` | string | não | Até 80. |
| `difficulty` | string | sim | `Fácil`, `Média` ou `Difícil`. |
| `ingredients` | array | sim | 1–20 seções; cada seção 1–80 itens. |
| `steps` | array | sim | 4–20 no contrato v1; o schema do site aceita 2–30. |
| `tips` | array | não | Até 5 no contrato v1; itens até 1.000. |
| `storageNotes` | string | não | Até 3.000. |
| `faq` | array | não | Até 12; pergunta até 240 e resposta até 1.200. |
| `tags`, `occasions`, `collections`, `diet` | arrays | não | Tags até 12; slugs sem repetição; dietas devem estar habilitadas. |
| `cover` | object | sim no contrato v1 | Metadados da imagem. |
| `coverImageUrl` | string HTTPS | sim no site | URL pública HTTPS; até 2.048 no schema interno. |
| `coverImageAlt` | string | sim | 8–240. |
| `status` | string | não | `draft` ou `published`; publicação automática exige fase e token de publicação. |
| `aiModel` | string | sim no contrato v1 | Até 120. |
| `generationMeta` | object | sim no contrato v1 | Inclui `run_id`, `topic_slug`, `phase`, `prompt_version` e `validators_version`. |

Criação nova retorna `201` com o registro, `status` e URL pública `/receitas/:slug`. Mesmo slug e mesmo `generationMeta.run_id` retornam `200` com `Idempotent-Replay: true`; mesmo slug com outro run retorna `409`.

```bash
curl -X POST "https://www.chocolicia.site/api/recipes" \
  -H "Authorization: Bearer AGENT_TOKEN_FICTICIO" \
  -H "Content-Type: application/json" \
  -H "X-Contract-Version: 1" \
  -H "X-Request-Id: req-receita-001" \
  -H "Idempotency-Key: receita-run-001" \
  --data @recipe.json
```

## Publicar receita — `POST /api/recipes/:slug/publish`

Exige o Bearer do agente. Sem corpo obrigatório. Retorna `404` quando o slug não existe, `201` quando muda para `published` e `200` com `Idempotent-Replay: true` quando já estava publicada.

```bash
curl -X POST "https://www.chocolicia.site/api/recipes/bolo-de-chocolate-cremoso/publish" \
  -H "Authorization: Bearer AGENT_TOKEN_FICTICIO" \
  -H "Content-Type: application/json"
```

## Status de receita — `GET /api/recipes/:slug/status`

Consulta pública, sem token:

```bash
curl "https://www.chocolicia.site/api/recipes/bolo-de-chocolate-cremoso/status"
```

Resposta:

```json
{
  "id": "recipe-id",
  "slug": "bolo-de-chocolate-cremoso",
  "status": "published",
  "publishedAt": "2026-11-20T18:00:00.000Z",
  "url": "https://www.chocolicia.site/receitas/bolo-de-chocolate-cremoso"
}
```

## Cron diário — `GET` e `POST /api/recipes/generate-daily`

As duas formas continuam disponíveis. Usam `CRON_SECRET`, não `RECIPES_AGENT_TOKEN`:

```http
Authorization: Bearer CRON_SECRET_FICTICIO
```

Sem segredo configurado retorna `503`; token ausente/incorreto retorna `401`; sucesso retorna `201`; falha da geração retorna `500`.

```bash
curl "https://www.chocolicia.site/api/recipes/generate-daily" \
  -H "Authorization: Bearer CRON_SECRET_FICTICIO"
```

## Rotas públicas de receitas

- `GET /api/recipes`: listagem pública; erro de query retorna `400`.
- `GET /api/recipes/featured`: receitas em destaque; falha de backend retorna `503`.
- `GET /api/recipes/:slug`: somente receita publicada; slug inválido ou inexistente retorna `404`.

Essas rotas não exigem token e mantêm cache público. A migration `drizzle/0003_agent_articles.sql` não faz parte deste documento nem deve ser alterada para aplicar o contrato acima.
