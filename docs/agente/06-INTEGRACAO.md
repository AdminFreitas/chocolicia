# 06 - Integração entre o Agente e o Site

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia e site `chocolicia` |
| Versão do documento | 0.1 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md`, `03-PROMPT-SISTEMA.md`, `04-ESTRUTURA-CONTEUDO.md`, `05-SEO.md` |
| Alimenta | Implementação do adaptador no agente e das alterações no site; `08-VALIDACAO.md` (contrato) |

---

## 1. Objetivo e escopo

Especificar a comunicação entre o agente (Python) e o backend do site (Vercel): autenticação, endpoints, contratos JSON, imagens, idempotência, erros, limites e as alterações necessárias em cada projeto.

Fora do escopo: banco de dados do agente (`04-ESTRUTURA-CONTEUDO.md`, seção 8.9) e regras de publicação e operação (`07-PUBLICACAO.md`).

---

## 2. Sequência de criação de uma receita

```text
AGENTE                                   SITE (backend)
  |  GET /api/taxonomy, /api/catalog/ingredients, /api/coverage  (início da execução)
  |<------------------------------------------------------------|
  |  ... pauta, pesquisa, criação, validação, busca de imagem ...
  |  POST /api/recipes   (Idempotency-Key, token de escopo draft/publish)
  |------------------------------------------------------------>|
  |                          valida (Zod + catálogo + limites)  |
  |                          grava (draft/processing)           |
  |                          baixa e trata a imagem (ou gera)   |
  |                          publica (se escopo publish e fase) |
  |  201 {id, slug, status, url}                                |
  |<------------------------------------------------------------|
  |  GET /api/recipes/{slug}/status  (se status = processing)   |
  |------------------------------------------------------------>|
  |  teste de fumaça da página publicada                        |
```

---

## 3. Ambientes e configuração

| Variável (agente) | Uso |
| --- | --- |
| `SITE_BASE_URL` | URL base do site (produção ou preview) |
| `SITE_TOKEN_DRAFT` | Token com escopo `draft` (Fase 0) |
| `SITE_TOKEN_PUBLISH` | Token com escopo `publish` (Fase 1 em diante) |
| `CONTRACT_VERSION` | Versão do contrato enviada em `X-Contract-Version` |
| `AGENT_PHASE` | Fase em vigor (0 a 3) |

| Variável (site) | Uso |
| --- | --- |
| `RECIPES_AGENT_TOKEN_DRAFT`, `RECIPES_AGENT_TOKEN_PUBLISH` | Tokens do agente por escopo (comparação em tempo constante) |
| `ADMIN_*` | Credencial administrativa, separada dos tokens do agente |
| `AGENT_PUBLISHING_ENABLED` | Interruptor de emergência (falso bloqueia criação de qualquer conteúdo publicado) |
| `AGENT_DAILY_CAP_*` | Limite diário de publicações por tipo |

Ambientes: **produção** e **preview** (deploy de preview da Vercel com um branch do Neon). O agente aceita `--target preview` e `--dry-run`.

---

## 4. Autenticação e escopos

- Header `Authorization: Bearer <token>` (esquema já existente, com `timingSafeEqual`).
- **Dois escopos**: `draft` cria conteúdo como rascunho; `publish` pode criar já publicado. Na Fase 0 o agente só tem o token `draft`.
- O token do agente **só cria**. Não edita, não apaga, não despublica e não lê dados privados.
- Despublicação, restauração e ações em lote usam credencial administrativa separada.
- Rotação periódica dos tokens (valor inicial: a cada 90 dias) e rotação imediata em caso de suspeita de vazamento.
- Alerta de volume anormal: mais requisições que o limite diário da fase, ou requisições fora do horário agendado, geram aviso e podem acionar o interruptor.
- Todo pedido leva e devolve `X-Request-Id` (gerado pelo agente; o site registra).
- Somente HTTPS.

---

## 5. Endpoints

| Método e caminho | Situação | Escopo | Função |
| --- | --- | --- | --- |
| `POST /api/recipes` | **Alterado** | `draft` ou `publish` | Cria receita (contrato da seção 6) |
| `POST /api/recipes/generate-daily` | Existente (contingência) | Admin | Gerador interno do site; cron interno desativado com o agente em produção |
| `POST /api/articles` | **Novo** | `draft` ou `publish` | Cria dica, técnica ou matéria (seção 8) |
| `GET /api/taxonomy` | **Novo** | `draft` ou `publish` | Categorias, subcategorias (com `risk_level` e `agent_enabled`), facetas, tags existentes, alérgenos |
| `GET /api/catalog/ingredients` | **Novo** | `draft` ou `publish` | Catálogo de ingredientes com aliases, unidade canônica, conversões, alérgenos e `needs_label_check` |
| `GET /api/coverage` | **Novo** | `draft` ou `publish` | Contagem de conteúdo publicado por subcategoria e tipo |
| `GET /api/content/lookup` | **Novo** | `draft` ou `publish` | Consulta por `topic_slug`, slug ou título aproximado, para duplicidade e confirmação de idempotência |
| `GET /api/recipes/{slug}/status` | **Novo** | `draft` ou `publish` | Estado (`draft`, `processing`, `published`, `archived`) e motivo de falha de imagem |
| `POST /api/reports` | **Novo** | Público, com limite | Denúncia de leitor (`07-PUBLICACAO.md`) |
| `POST /api/admin/{recipes\|articles}/{slug}/archive` | **Novo** | Admin | Despublica |
| `POST /api/admin/{recipes\|articles}/{slug}/restore` | **Novo** | Admin | Restaura |
| `POST /api/admin/content/bulk-archive` | **Novo** | Admin | Reversão em lote por `run_id`, `prompt_version`, `ai_model` ou intervalo de datas |

---

## 6. Contrato de `POST /api/recipes` (versão 1)

### 6.1 Cabeçalhos

| Cabeçalho | Obrigatório | Valor |
| --- | :---: | --- |
| `Authorization` | Sim | `Bearer <token>` |
| `Content-Type` | Sim | `application/json` |
| `Idempotency-Key` | Sim | Hash estável de `content_type`, `topic_slug` e `run_id` (seção 10) |
| `X-Contract-Version` | Sim | `1` |
| `X-Request-Id` | Sim | Identificador da requisição |

### 6.2 Campos

| Campo | Tipo | Obrigatório | Regras |
| --- | --- | :---: | --- |
| `title` | texto | Sim | 5 a 180 caracteres |
| `slug` | texto | Não | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3 a 180; gerado do título se ausente |
| `excerpt` | texto | Sim | 20 a 160 caracteres |
| `intro` | texto | Não | Introdução curta |
| `subcategorySlug` | texto | Sim | Subcategoria ativa e habilitada (`agent_enabled`) para a fase; a categoria é derivada. Durante a transição o campo legado `category` continua aceito |
| `secondarySubcategorySlugs` | lista | Não | Até 2 |
| `prepTimeMin` | inteiro | Sim | 1 a 1440 |
| `cookTimeMin` | inteiro | Não | 0 a 1440 |
| `restTimeMin` | inteiro | Não | 0 a 10080 |
| `servings` | inteiro | Sim | 1 a 500 |
| `yieldLabel` | texto | Não | Até 80 caracteres |
| `difficulty` | texto | Sim | `Fácil`, `Média` ou `Difícil` (calculada pelo agente; o site confere pelos critérios) |
| `ingredients` | lista de seções | Sim | 1 a 20 seções; cada seção com `name` e `items` (1 a 80) |
| `ingredients[].items[]` | objeto | Sim | `name`, `quantity`, `unit`, `note` (como em `04`, seção 9.1) e `ingredientSlug` (obrigatório na Fase 1; nulo para `unresolved` nas fases seguintes) |
| `steps` | lista | Sim | 4 a 20 passos (o site aceita de 2 a 30); `instruction` 1 a 1200, `title` até 120 |
| `tips` | lista de texto | Não | Até 5; cada uma 1 a 1000 |
| `storageNotes` | texto | Não | Até 3000. Preenchido por código a partir da base curada |
| `faq` | lista | Não | Até 12; `question` 1 a 240, `answer` 1 a 1200 |
| `tags` | lista de slugs | Não | Até 12, cada uma 1 a 40; existentes ou criadas dentro das regras |
| `occasions`, `collections` | listas de slug | Não | Dos catálogos |
| `diet` | lista de slug | Não | Somente etiquetas habilitadas (`vegetariana`, `vegana`) |
| `allergens`, `allergenTraces` | listas de slug | Sim (podem ser vazias) | Calculados pelo agente a partir do catálogo e **recalculados pelo site** (seção 6.4) |
| `cover` | objeto | Sim | Origem da imagem (seção 7) |
| `coverImageAlt` | texto | Sim | 8 a 240 caracteres |
| `status` | texto | Não | `draft` (padrão) ou `published` (exige escopo `publish`) |
| `aiModel` | texto | Sim | Até 120 |
| `generationMeta` | objeto | Sim | `run_id`, `topic_slug`, `prompt_version`, `phase`, `sources` (domínio, URL e data), `validators_version` |

O `status` padrão da API passa a ser `draft`. O campo `status: "published"` sem escopo `publish` devolve `403`.

### 6.3 Exemplo (valores ilustrativos)

```json
{
  "title": "Brigadeiro de colher cremoso com chocolate meio amargo",
  "excerpt": "Brigadeiro de colher macio e brilhante, com chocolate meio amargo e ponto fácil de acertar.",
  "intro": "O brigadeiro de colher combina leite condensado e chocolate em uma textura cremosa.",
  "subcategorySlug": "brigadeiros-e-docinhos",
  "prepTimeMin": 10,
  "cookTimeMin": 15,
  "restTimeMin": 0,
  "servings": 8,
  "yieldLabel": "8 porções",
  "difficulty": "Fácil",
  "ingredients": [
    {"name": "Brigadeiro", "items": [
      {"name": "leite condensado", "quantity": "395", "unit": "g", "note": "1 lata", "ingredientSlug": "leite-condensado"},
      {"name": "chocolate meio amargo picado", "quantity": "100", "unit": "g", "ingredientSlug": "chocolate-meio-amargo"}
    ]}
  ],
  "steps": [
    {"title": "Cozinhar", "instruction": "Leve ao fogo baixo e mexa sem parar até soltar do fundo da panela."},
    {"title": "Descansar", "instruction": "Transfira para um recipiente e deixe amornar antes de servir."},
    {"title": "Servir", "instruction": "Sirva em copinhos ou taças."},
    {"title": "Finalizar", "instruction": "Decore a gosto com chocolate granulado."}
  ],
  "tags": ["chocolate", "brigadeiro"],
  "diet": [],
  "allergens": ["leite", "soja"],
  "allergenTraces": ["gluten"],
  "cover": {"mode": "stock", "provider": "pexels", "sourceImageUrl": "https://...", "sourcePageUrl": "https://...", "author": "Autor", "license": "licença", "attributionText": "Foto: Autor / Pexels"},
  "coverImageAlt": "Tigela com brigadeiro de colher cremoso e brilhante",
  "status": "published",
  "aiModel": "modelo-aprovado",
  "generationMeta": {"run_id": "uuid", "topic_slug": "brigadeiro-de-colher-cremoso", "prompt_version": "1.0.0", "phase": 1, "sources": [], "validators_version": "1.0.0"}
}
```

### 6.4 Validação no servidor

O site **não confia** nos campos derivados enviados pelo agente:

1. Valida o corpo com Zod (limites acima) e sanitiza (`sanitizeDeep`).
2. Resolve cada `ingredientSlug` no catálogo e **recalcula** `allergens`, `allergenTraces` e as etiquetas de dieta. Divergência devolve `422` com código `allergen_mismatch` ou `diet_mismatch`.
3. Confere subcategoria (existe, ativa, `agent_enabled`, nível de risco permitido pela fase em vigor).
4. Confere dificuldade, soma de tempos e passos pelos critérios de `04`.
5. Confere limites diários e interruptor.
6. Aplica o escopo do token e define o estado inicial.

### 6.5 Resposta

`201 Created`:

```json
{"id": 123, "slug": "brigadeiro-de-colher-cremoso-com-chocolate-meio-amargo", "status": "processing", "url": "https://.../receitas/..."}
```

`status` é `published` ou `draft` quando a imagem já está pronta, ou `processing` enquanto o site baixa ou gera a imagem.

---

## 7. Imagens

### 7.1 Modo `stock` (padrão)

```json
"cover": {
  "mode": "stock",
  "provider": "pexels",
  "sourceImageUrl": "https://...",
  "sourcePageUrl": "https://...",
  "author": "Nome do autor",
  "license": "licença do provedor",
  "attributionText": "Foto: Autor / Provedor"
}
```

O site:

1. Aceita `sourceImageUrl` somente de **domínios permitidos** (lista no servidor, com os hosts de imagens de cada provedor aprovado). Outros domínios devolvem `422` (`image_host_not_allowed`).
2. Baixa a imagem com proteção contra SSRF: HTTPS, sem redirecionamento para fora da lista, sem IPs privados ou locais, limite de tamanho (valor inicial: 10 MB), tempo limite e verificação do tipo real do arquivo (JPEG, PNG ou WebP).
3. Exige largura mínima (valor inicial: 1280 px).
4. Processa com Sharp (6 variantes, mais os recortes 1:1, 4:3 e 16:9), armazena e preenche `cover_image_url`, variantes e `cover_image_source`.

### 7.2 Modo `generate` (último caso)

```json
"cover": {"mode": "generate", "imagePrompt": "descrição do prato pronto, sem pessoas, marcas ou texto"}
```

O site usa o gerador existente (`gpt-image-1`), marca `cover_image_is_ai = true` e respeita um teto diário de gerações. O agente só usa este modo depois de esgotar os bancos de imagens (`01-ARQUITETURA.md`, seção 8.2).

### 7.3 Estado `processing`

Enquanto a imagem não estiver pronta, o conteúdo fica em `processing` (não público). Se a imagem falhar, o conteúdo volta a `draft` com motivo em `GET /api/recipes/{slug}/status`, e o agente decide entre nova tentativa, outra candidata ou geração. A função de tratamento deve respeitar o tempo máximo de execução do plano da Vercel (confirmar), usando processamento em segundo plano se necessário.

### 7.4 Atribuição

A legenda e o crédito exibidos pelo site seguem a licença e os termos do provedor (`01-ARQUITETURA.md`, seção 8.5). Os termos de cada provedor devem ser conferidos antes da ativação.

---

## 8. Contrato de `POST /api/articles`

Cabeçalhos iguais aos da seção 6.1.

| Campo | Tipo | Obrigatório | Regras |
| --- | --- | :---: | --- |
| `type` | texto | Sim | `technique`, `tip` ou `feature` |
| `title`, `excerpt` | texto | Sim | 5 a 180; 20 a 160 |
| `slug` | texto | Não | Mesmo padrão das receitas |
| `subcategorySlug` | texto | Sim | Área culinária do assunto |
| `bodyMd` | texto | Sim | Markdown, limites por tipo (`04`, seção 10) |
| `structured` | objeto | Não | Campos do tipo |
| `sources` | lista | Obrigatório em `feature` e `technique` | Nome, título e URL |
| `tags` | lista de slugs | Não | Até 12 |
| `relatedTopics` | lista de texto | Não | De 2 a 6 temas, resolvidos pelo site em `content_relations` |
| `cover`, `coverImageAlt` | | Sim | Mesmas regras da seção 7 |
| `status`, `aiModel`, `generationMeta` | | | Como na receita |

O site cria os relacionamentos procurando conteúdo por tags, subcategoria e título. Temas sem correspondência são ignorados e registrados.

---

## 9. Endpoints de leitura

| Endpoint | Conteúdo da resposta |
| --- | --- |
| `GET /api/taxonomy` | Categorias e subcategorias (`slug`, `name`, `risk_level`, `agent_enabled`, `active`), ocasiões, dietas habilitadas, coleções, tags existentes e catálogo de alérgenos |
| `GET /api/catalog/ingredients` | `slug`, `name`, aliases, `canonical_unit`, `grams_per_unit`, `conversions`, alérgenos (`contains` e `may_contain`), `needs_label_check` |
| `GET /api/coverage` | Por subcategoria e tipo: publicados, rascunhos e data do último publicado |
| `GET /api/content/lookup?topic_slug=&slug=&title=` | Itens correspondentes (slug, título, subcategoria, `generation_meta.run_id`) |
| `GET /api/recipes/{slug}/status` | `status`, `image_state` e motivo |

As respostas de leitura são pequenas e podem ser armazenadas em cache durante a execução. O agente as consulta no início de cada execução.

---

## 10. Idempotência e reenvio

1. Cada pauta tem `topic_slug` estável (derivado do tema normalizado, não do título gerado). O banco do agente tem `UNIQUE (content_type, topic_slug)`, e a execução só segue se conseguir reservar a pauta.
2. A `Idempotency-Key` é enviada em todo `POST`. O site guarda a chave por 24 horas e devolve a mesma resposta ao reenvio.
3. Em caso de timeout, o agente reenvia com a mesma chave. Se receber `409`, consulta `GET /api/content/lookup?topic_slug=...` e compara `generation_meta.run_id`:
   - mesmo `run_id`: a publicação aconteceu; registra sucesso;
   - `run_id` diferente: já existe conteúdo da pauta; registra "duplicada" e não envia de novo.
4. O mesmo conteúdo nunca é reenviado com novo título.

---

## 11. Erros e tentativas

Formato de erro:

```json
{"error": {"code": "validation_failed", "message": "texto curto", "details": [{"field": "excerpt", "issue": "max_160"}]}}
```

| Código HTTP | `code` (exemplos) | Ação do agente |
| --- | --- | --- |
| 400 | `validation_failed` | Registra e **não** reenvia o mesmo JSON |
| 401 | `unauthorized` | Interrompe a execução e alerta |
| 403 | `scope_insufficient`, `publishing_disabled`, `phase_not_allowed` | Interrompe a publicação; registra |
| 409 | `slug_conflict`, `topic_exists` | Fluxo de confirmação (seção 10) |
| 413 | `payload_too_large` | Reduz o conteúdo e reenvia uma vez |
| 422 | `allergen_mismatch`, `diet_mismatch`, `image_host_not_allowed`, `subcategory_not_enabled` | Registra o motivo; corrige a origem do dado ou rejeita a pauta |
| 429 | `rate_limited`, `daily_cap_reached` | Respeita `Retry-After`; `daily_cap_reached` encerra a execução |
| 5xx e timeout | `server_error` | Até 3 tentativas com espera crescente, depois registra `error` |

---

## 12. Limites

| Limite | Valor inicial |
| --- | --- |
| Tamanho do corpo | 1 MB (já existente) |
| Publicações por dia (token do agente) | Fase 1: 1 receita. Fase 2: 2 receitas. Artigos conforme `config/cadencia.json` |
| Gerações de imagem por IA por dia | Valor a definir; ao atingir o teto, o conteúdo fica em `draft` |
| Requisições por minuto (token do agente) | Valor a definir |
| Download de imagem | 10 MB, largura mínima 1280 px, tempo limite curto |
| Tempo da requisição de criação | Valor a confirmar de acordo com o plano da Vercel |

O limite de requisições por minuto e o limite diário **não constam como existentes** no site e precisam ser implementados.

---

## 13. Denúncias, despublicação e reversão

- `POST /api/reports` recebe denúncias (`reason`: `seguranca`, `alergia`, `medida`, `erro`, `outro`). É público, com limite por IP e proteção contra abuso.
- O site conta denúncias por conteúdo. As regras do disjuntor por receita (valores iniciais em `07-PUBLICACAO.md`) são executadas **no site**: ao atingir o limite, o conteúdo é arquivado automaticamente, sem esperar o agente.
- `POST /api/admin/.../archive` e `restore` atuam sobre um conteúdo.
- `POST /api/admin/content/bulk-archive` arquiva em lote por `generation_meta.run_id`, `prompt_version`, `ai_model` ou intervalo de datas. É a ferramenta de reversão quando se descobre um problema sistêmico.

---

## 14. Versionamento do contrato

- O contrato canônico é um schema versionado (derivado do Zod) no repositório `chocolicia`, em `contracts/`.
- O agente mantém uma cópia e roda um **teste de contrato** a cada alteração e antes de cada execução agendada (validação do payload de exemplo contra o schema do ambiente).
- `X-Contract-Version` informa a versão. Mudança que quebra compatibilidade incrementa a versão, e o site aceita a versão atual e a anterior por 30 dias.
- Campos novos opcionais não mudam a versão.

---

## 15. Segurança

- Sanitização profunda no servidor (já existente) e limite de tamanho.
- Comparação de token em tempo constante (já existente).
- Domínios de imagem permitidos e proteção contra SSRF (seção 7).
- Segredos só em variáveis de ambiente do agendador e da Vercel; nunca no repositório.
- Registro de toda requisição (`X-Request-Id`, token usado, escopo, resultado), sem gravar o token.
- Interruptor de emergência, limites diários e alerta de volume anormal (seção 4).
- Respostas de leitura não expõem dados de leitores nem credenciais.

---

## 16. Alterações necessárias

### 16.1 Site (`chocolicia`)

1. Migrations do `04-ESTRUTURA-CONTEUDO.md` (seção 15).
2. Ampliar o esquema Zod e a API de receitas com os campos novos e o contrato da seção 6; manter o campo legado `category` na transição.
3. Mudar o padrão de `status` para `draft`, depois de confirmar que `generate-daily` e o adaptador atual enviam `status` explícito.
4. Dois escopos de token e credencial administrativa separada.
5. Endpoints novos das seções 5, 9 e 13; limite diário, rate limit e interruptor `AGENT_PUBLISHING_ENABLED`.
6. Download de imagem por origem (`stock`) com proteção contra SSRF e geração em último caso; estado `processing`.
7. Recalcular alérgenos e dieta a partir do catálogo; validar dificuldade e tempos.
8. Exibir os avisos (IA no topo, alérgenos no final), legendas de imagem, lista de alérgenos e a assinatura "Equipe Chocolícia".
9. Denúncias de leitores e disjuntor por receita.
10. JSON-LD, sitemap e demais itens de `05-SEO.md`.
11. Exportar o schema do contrato em `contracts/`.
12. Desativar o cron interno de receitas quando o agente entrar em produção.

### 16.2 Agente (`agente-chocolicia`)

1. `integration/contratos.py` (modelos Pydantic), `adaptador_receita.py` e `cliente_site.py` (token, idempotência, tentativas).
2. Leitura de taxonomia, catálogo e cobertura no início da execução.
3. Cálculo de alérgenos, dieta, dificuldade, tempos e rendimento por código.
4. Serviço de imagem com bancos de imagens e verificação (`08-VALIDACAO.md`).
5. Banco do agente (histórico, fila, custo), reserva de pauta por `topic_slug`.
6. Teste de contrato, `--dry-run` e `--target preview`.
7. Remover o publicador do DigitalTech.

---

## 17. Testes e ambientes

| Teste | Descrição |
| --- | --- |
| Contrato | Valida o payload de exemplo contra o schema do site, a cada alteração e antes de cada execução |
| `--dry-run` | Gera, valida e imprime o payload sem enviar |
| Preview | Envio para o deploy de preview com branch do Neon; mede o fluxo completo, inclusive imagem |
| Fumaça pós-publicação | Página responde 200, tem título, JSON-LD válido, aparece no sitemap (`08-VALIDACAO.md`) |
| Falhas simuladas | Timeout, `409`, `429`, `422` por alérgeno, imagem inválida, domínio de imagem não permitido |

---

## 18. Pendências

| Item | Observação |
| --- | --- |
| Limite de tempo de execução na Vercel | Confirmar para o plano usado e definir se a imagem roda em segundo plano |
| Rate limit atual do site | Confirmar o que existe |
| Chamadores atuais do `status` padrão | Confirmar antes da troca |
| Domínios permitidos de imagem | Definir após conferir os termos de cada provedor |
| Retenção da chave de idempotência | Valor inicial de 24 horas, a confirmar |
| Valores iniciais de limite (por minuto, IA por dia) | Definir na implementação |
