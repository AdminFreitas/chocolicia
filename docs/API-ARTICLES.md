# API de artigos

## Endpoint

`POST /api/articles`

O endpoint é montado na aplicação Express existente. Envie `Content-Type: application/json` e `Authorization: Bearer <RECIPES_AGENT_TOKEN>`. O token configurado no servidor é comparado em tempo constante e nunca é incluído em logs ou respostas. Não use `CRON_SECRET` para esta integração.

O corpo tem limite de 1 MB. `title`, `slug`, `content` e `articleType` são obrigatórios. O slug deve estar normalizado e seguir `^[a-z0-9]+(?:-[a-z0-9]+)*$`. `articleType` aceita `dica`, `tecnica` ou `materia`. Para criação, `status` aceita `draft` ou `published`; se omitido, o valor padrão é `draft`. Artigos arquivados não são criados por este endpoint.

Campos opcionais: `excerpt`, `categoryId` e `topicId` (UUIDs existentes), `coverImageUrl`, `coverImageAlt`, `seoTitle`, `seoDescription`, `author`, `aiModel`, `generationMeta` (objeto JSON), `tags` (lista de strings únicas) e `images` (lista de URLs HTTP/HTTPS, texto alternativo, legenda e posição). Em alternativa aos IDs, `categorySlug` e `topicSlug` resolvem a categoria/tópico pelo slug (não se pode enviar id e slug do mesmo tipo; slug inexistente devolve 422 `category_not_found`/`topic_not_found`). Os IDs de categoria e tópico são validados contra `categories` e `tip_topics`. Uma categoria de terceiro nível é rejeitada.

`images` é gravado diretamente em `article_images` (`image_url`, `alt_text`, `caption`, `position`). A ramificação Neon consultada não contém uma tabela `images`; portanto, o endpoint não cria uma relação para uma tabela inexistente. A imagem de capa fica nos campos `cover_image_url` e `cover_image_alt` do artigo.

O artigo, as tags e as imagens associadas são gravados em uma única transação. O slug não é alterado automaticamente e um artigo existente não é sobrescrito. Para `published`, o servidor define `published_at` no momento da gravação; para `draft`, deixa-o `null`.

## Exemplos de pedido

Os exemplos usam o mesmo endpoint e payload-base; altere `articleType` para o tipo indicado. Substitua os UUIDs por IDs existentes no Neon e o URL por uma imagem válida. Estes exemplos são documentação e não foram enviados ao banco.

### Dica (`dica`)

```json
{
  "title": "Como conservar ganache",
  "slug": "como-conservar-ganache",
  "excerpt": "Orientações para manter a textura da ganache.",
  "content": "## Conservação\\n\\nUse um recipiente limpo e bem fechado.",
  "articleType": "dica",
  "status": "draft",
  "topicId": "00000000-0000-4000-8000-000000000001",
  "tags": ["ganache", "conservação"],
  "images": [
    {
      "imageUrl": "https://example.com/ganache.jpg",
      "altText": "Ganache em uma tigela",
      "caption": "Textura cremosa",
      "position": 0
    }
  ],
  "generationMeta": { "source": "agent" }
}
```

### Técnica (`tecnica`)

```json
{
  "title": "Técnica de temperagem",
  "slug": "tecnica-de-temperagem",
  "content": "## Temperagem\\n\\nDescreva aqui os passos da técnica.",
  "articleType": "tecnica",
  "status": "published",
  "categoryId": "00000000-0000-4000-8000-000000000002",
  "coverImageUrl": "https://example.com/temperagem.jpg",
  "coverImageAlt": "Chocolate temperado em uma bancada",
  "seoTitle": "Técnica de temperagem de chocolate",
  "seoDescription": "Guia sobre temperagem de chocolate.",
  "aiModel": "modelo-usado",
  "tags": ["chocolate", "temperagem"]
}
```

### Matéria (`materia`)

```json
{
  "title": "Ingredientes de confeitaria",
  "slug": "ingredientes-de-confeitaria",
  "excerpt": "Um guia editorial sobre ingredientes.",
  "content": "## Ingredientes\\n\\nConteúdo editorial em Markdown.",
  "articleType": "materia",
  "status": "draft",
  "author": "Equipe Chocolícia",
  "generationMeta": { "pipeline": "editorial", "version": 1 }
}
```

## Resposta de sucesso (201)

```json
{
  "id": "2f5f6290-0937-4ad3-b9f2-2ddc9f58e983",
  "title": "Como conservar ganache",
  "slug": "como-conservar-ganache",
  "articleType": "dica",
  "status": "draft",
  "publishedAt": null,
  "tags": ["ganache", "conservação"],
  "images": []
}
```

## Erros

| HTTP | Situação | Corpo resumido |
| ---: | --- | --- |
| 400 | JSON/campos inválidos, slug inválido ou URL de imagem não HTTP(S) | `{"error":"Artigo inválido.","details":{...}}` |
| 401 | Cabeçalho/token Bearer ausente | `{"error":"É necessário enviar um token Bearer."}` |
| 403 | Token fornecido inválido | `{"error":"Token inválido."}` |
| 409 | Slug já existente | `{"error":"Já existe um artigo com este slug.","code":"duplicate_slug"}` |
| 413 | Corpo acima de 1 MB | `{"error":"O conteúdo excede o limite permitido."}` |
| 422 | Categoria/tópico inexistente ou hierarquia de categoria acima de dois níveis | resposta com `code` específico |
| 500 | Erro interno de persistência | `{"error":"Não foi possível criar o artigo."}` |
| 503 | `RECIPES_AGENT_TOKEN` não configurado no servidor | `{"error":"A autenticação do endpoint não está configurada."}` |
