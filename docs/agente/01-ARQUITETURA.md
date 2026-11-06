# 01 - Arquitetura do Agente Chocolícia

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia |
| Versão do documento | 0.4 |
| Data | 05/11/2026 |
| Base | Auditoria somente leitura do site `chocolicia` e do agente original, mais as decisões registradas em `00-REGISTRO-DE-ALTERACOES.md` |
| Próximos documentos | `02-PESQUISA.md` a `08-VALIDACAO.md` |

---

## 1. Objetivo

Transformar a página de receitas do site Chocolícia em um canal de conteúdo automatizado, alimentado por um agente de IA especializado em culinária e confeitaria, e abrir um segundo canal de conteúdo educativo (dicas, técnicas e matérias).

O agente deve:

1. Planejar a pauta editorial respeitando a árvore de categorias do site e a fase de lançamento em vigor.
2. Pesquisar referências em sites culinários, apenas como referência e inspiração, sem copiar texto, fotos ou instruções.
3. Gerar conteúdo original, estruturado e validado por código.
4. Obter a imagem de capa em bancos de imagens reais e só gerar imagem por IA em último caso.
5. Entregar o conteúdo ao site por API autenticada.
6. Registrar o que foi gerado, enviado, publicado e rejeitado.

Fora do escopo desta documentação: venda de produtos digitais e qualquer funcionalidade comercial. O foco é o agente gerar receitas e conteúdo educativo.

---

## 2. Decisão arquitetural

1. **O agente Python é o cérebro editorial do Chocolícia.** Pauta, pesquisa, prompts, geração e validação vivem nele. O gerador interno do site (`server/recipeAgent.ts`) não substitui o agente.
2. **O site é a plataforma de apresentação e publicação.** Recebe o conteúdo, valida, trata imagens, armazena e exibe.
3. **O Neon do site é a fonte central do conteúdo editorial.** O agente grava somente pela API. O histórico do próprio agente fica em banco separado (D-05).
4. **O agente executa em infraestrutura independente.** Um agendador o inicia, ele executa a tarefa e finaliza. Não fica residente no servidor do site.
5. **Dois repositórios GitHub independentes:** `chocolicia` (site, backend, banco e APIs) e `agente-chocolicia` (agente completo). Migrar para monorepo não traz vantagem agora, e continua possível depois sem mudar os contratos.
6. **Não há revisão humana nem teste prático das receitas.** A barreira de qualidade é a validação automática (`08-VALIDACAO.md`), combinada com lançamento por fases de risco (seção 7.4). A decisão de consumir cada receita é do leitor, apoiada por avisos claros.

---

## 3. Diagnóstico do estado atual

### 3.1 Agente (`agente-chocolicia`)

- É o código do blog de tecnologia **DigitalTech**: prompts, feeds RSS, categorias e imagens são de tecnologia.
- Stack: Python, SQLAlchemy, FastAPI (`api.py`), CLI (`rodar_agente.py --artigo --noticia`).
- Cadeia de LLMs com fallback configurável (`FALLBACK_ORDER`): Groq, Gemini, Ollama, OpenAI, Claude, DeepSeek e outros.
- Imagens: Openverse, Unsplash, Pexels, Pixabay e, como último recurso, Pollinations, com termos de busca de computação.
- Publicação: salva `rascunho` na tabela `artigos` e faz commit de `.md` no repositório do DigitalTech pela API do GitHub.
- Agendamento: `FEATURE_AGENDAMENTO=false` e nenhum workflow em `.github/workflows/`.
- Banco: Neon próprio, com tabelas de tecnologia (`artigos`, `noticias`, `categorias`).

### 3.2 Site (`chocolicia`)

- Possui motor culinário próprio: `server/recipeAgent.ts` (geração diária), `server/recipesRoutes.ts` (API) e Drizzle ORM (tabela `recipes`).
- Gera imagem por IA (`gpt-image-1`), processa com Sharp (6 variantes: 480, 800 e 1280 px em WebP e AVIF) e grava no armazenamento do projeto.
- `POST /api/recipes` exige `Authorization: Bearer <RECIPES_AGENT_TOKEN>`, limite de 1 MB, sanitização anti-XSS e validação Zod.
- **O campo `status` da API tem padrão `published`.** Qualquer chamada sem o campo (erro, teste, contingência) publica direto. Isso será corrigido (D-06).
- `coverImageUrl` é obrigatório e deve ser URL pública já hospedada. Será ampliado para aceitar origem de banco de imagens e geração (D-09).
- Aceita apenas 7 categorias (confeitaria e festas); tags são um array de texto em `recipes`.
- Existe um adaptador em `integrations/agente-chocolicia-recipes/` que aciona `POST /api/recipes/generate-daily`. Passa a ser contingência.

### 3.3 Banco de dados

Não há evidência de que os dois projetos usem o mesmo banco Neon. O `.env` do agente aponta para um Neon; `DATABASE_URL` do site está vazio localmente (o valor de produção fica na Vercel). A confirmação é pré-requisito das migrations (D-01).

### 3.4 Incompatibilidades de contrato

| Aspecto | Site exige | Agente original entrega |
| --- | --- | --- |
| Formato | JSON estruturado | Markdown contínuo |
| Campos | `title`, `excerpt`, `coverImageUrl`, `ingredients`, `steps`... | `titulo`, `conteudo_md`... |
| Categorias | 7 de confeitaria e festas | 10 de tecnologia |
| Métricas | `prepTimeMin`, `servings`, `difficulty` | `readTime` |
| Destino | `POST /api/recipes` | Commit no GitHub |

Um adaptador de contrato resolve a diferença (seção 8 e `06-INTEGRACAO.md`).

---

## 4. Princípios de engenharia

1. **Responsabilidade única.** Cada projeto faz o que já faz bem.
2. **Uma fonte de verdade para taxonomia, ingredientes e alérgenos.** Ficam no banco do site e são lidos pelo agente por API.
3. **Privilégio mínimo.** O agente tem token só de criação, sem acesso ao banco nem ao armazenamento do site.
4. **Conteúdo original e honesto.** O agente não copia fontes e não afirma que testou uma receita.
5. **Validação automática conservadora.** Na dúvida, rejeita. Nunca publica com ressalva.
6. **Código decide números e rótulos.** Dificuldade, tempos, rendimento, alérgenos, etiquetas de dieta e prazos de conservação são calculados ou buscados por código, não escritos pelo modelo.
7. **Escopo por risco.** Só subcategorias de risco baixo entram na primeira fase pública.
8. **Mudanças aditivas.** Nada que já está publicado quebra.
9. **Idempotência.** Reexecutar uma pauta não duplica conteúdo (seção 8.4).
10. **Transparência com o leitor.** Aviso de criação com apoio de IA, legenda de imagem ilustrativa e aviso de alérgenos (seção 8.5).

---

## 5. Divisão de responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| **Agente Python** | Pauta, pesquisa, análise, geração, validação por código, busca de imagem, histórico, controle de cobertura e de custo |
| **Camada de integração** | Contratos validados, autenticação, tradução entre o formato do agente e o do site, tentativas e tratamento de erros |
| **Backend Chocolícia (Vercel)** | Validação final, sanitização, download e tratamento de imagem (Sharp), geração de imagem em último caso, armazenamento, publicação, despublicação, limites e interruptores |
| **Neon do site** | Receitas, artigos, categorias, tags, ingredientes, alérgenos, relacionamentos e denúncias |
| **Banco do agente** | Histórico de gerações, fila de pautas, custo e métricas |
| **Site Chocolícia** | Exibição de receitas e do conteúdo educativo, avisos ao leitor, canal de aviso de erro |

---

## 6. Visão geral

```text
        Agendador (GitHub Actions ou worker)
                     |
                     v
+--------------------------------------------+
|  AGENTE CHOCOLÍCIA (Python, repo próprio)  |
|  1 Pauta -> 2 Pesquisa -> 3 Análise        |
|  4 Criação -> 5 Validação -> 6 SEO         |
|  Busca de imagem em bancos de imagens      |
+--------------------------------------------+
        |                          |
        | histórico, custo         | JSON validado + token do agente
        v                          v
  BANCO DO AGENTE        +----------------------------+
                         |  CAMADA DE INTEGRAÇÃO      |
                         +----------------------------+
                                   |  HTTPS
                                   v
                         +----------------------------+
                         |  BACKEND CHOCOLÍCIA        |
                         |  validação, imagem,        |
                         |  limites, publicação       |
                         +----------------------------+
                                   |
                                   v
                         +----------------------------+
                         |  NEON DO SITE              |
                         +----------------------------+
                                   |
                                   v
                           SITE CHOCOLÍCIA
              (avisos ao leitor, canal de aviso de erro)
```

---

## 7. Fluxo diário, etapas e fases de lançamento

### 7.1 Exemplo de execução diária (08h, horário de Brasília)

| Horário | Evento |
| --- | --- |
| 08h00 | O agendador dispara o processo Python |
| 08h00-08h10 | Pauta, pesquisa, análise, criação e busca de imagem |
| 08h10-08h15 | Validação por código, SEO e envio à API |
| 08h15 | O backend valida, baixa e trata a imagem, grava e, a partir da Fase 1, publica |
| 08h20 | Teste de fumaça da página publicada (`08-VALIDACAO.md`) |

O cron do GitHub Actions usa UTC. Como o Brasil está em UTC-3 sem horário de verão, 08h em Brasília corresponde a `0 11 * * *`.

### 7.2 Etapas

| # | Etapa | Entrada | Saída | Origem do código |
| --- | --- | --- | --- | --- |
| 1 | Agendamento e pauta | Árvore de categorias, cobertura, calendário, fila, fase em vigor | Tema, subcategoria, tipo de conteúdo, `topic_slug` | Refatorar `pesquisador.py` |
| 2 | Pesquisa | Tema da pauta | Fichas de fonte (só fatos) | Refatorar `pesquisador.py` |
| 3 | Análise e cruzamento | Fichas | Ficha de pesquisa consolidada | Novo (`agents/analista.py`) |
| 4 | Criação original | Ficha + regras do Chef IA | Receita ou artigo estruturado | Refatorar `editor.py` |
| 5 | Validação | Conteúdo + ficha | Aprovado ou rejeitado, com motivo | Refatorar `revisor.py` + validadores |
| 6 | SEO e visual | Conteúdo validado | Título, excerpt, tags, alt, imagem escolhida | Refatorar `seo.py` e `imagem_service.py` |
| 7 | Integração | Conteúdo final | Chamada à API do site | Novo (`integration/`) |
| 8 | Publicação e monitoramento | Resposta da API | Registro, métricas, teste de fumaça | Refatorar `publisher.py` |

### 7.3 Papel do gerador interno do site

O motor `runDailyRecipeGeneration` e o endpoint `generate-daily` não são removidos, mas deixam de ser o caminho principal. O cron interno de receitas do site é desativado quando o agente entra em produção, para evitar receitas duplicadas. Os módulos de imagem e persistência dele são reaproveitados (D-09). Antes de trocar o padrão de `status` da API para `draft`, confirmar que `generate-daily` e o adaptador atual enviam `status` explícito.

### 7.4 Fases de lançamento por risco

Cada subcategoria tem `risk_level` (`low`, `medium`, `high`) e `agent_enabled`. A fase em vigor define quais níveis o agente pode publicar (tabela completa em `04-ESTRUTURA-CONTEUDO.md`, seção 5.3).

| Fase | Comportamento | Níveis | Limite diário inicial |
| --- | --- | --- | --- |
| 0 - Sombra | O agente gera e valida tudo, grava como `draft` e não publica. Mede taxa de rejeição, custo e falhas. Todo o pipeline, inclusive imagem e teste de renderização, é exercitado sem exposição pública | `low` | 3 execuções |
| 1 - Publicação automática, risco baixo | Publica o que passa na validação | `low` | 1 receita |
| 2 - Risco médio | Amplia as subcategorias | `low` e `medium` | 2 receitas |
| 3 - Risco alto | Adiada. Só entra com métricas estáveis e bases de segurança curadas | `high` (por subcategoria) | A definir |

A promoção entre fases depende de métricas automáticas (`08-VALIDACAO.md`, seção 10), registradas no histórico. Rebaixar de fase é imediato quando o disjuntor global dispara (`07-PUBLICACAO.md`).

---

## 8. Camada de integração

Contratos do agente em português, do site em inglês. O adaptador converte, e o contrato do site é a referência. Detalhes em `06-INTEGRACAO.md`.

### 8.1 Receita: campos principais

| Campo do agente | Campo da API | Observação |
| --- | --- | --- |
| `titulo` | `title` | 5 a 180 caracteres (meta de 40 a 65 para SEO) |
| `descricao_curta` | `excerpt` | 20 a 160 caracteres |
| `introducao` | `intro` | Campo novo no site |
| `subcategoria` | `subcategorySlug` | A categoria é derivada da subcategoria |
| `tempo_preparo_min`, `tempo_cozimento_min`, `tempo_descanso_min` | `prepTimeMin`, `cookTimeMin`, `restTimeMin` | `restTimeMin` é novo |
| `rendimento_porcoes`, `rendimento_texto` | `servings`, `yieldLabel` | `yieldLabel` é novo |
| `dificuldade` | `difficulty` | Calculada por código |
| `ingredientes` | `ingredients` | Itens resolvidos no catálogo de ingredientes |
| `modo_preparo` | `steps` | 4 a 20 passos |
| `alergenos`, `tracos`, `dieta`, `ocasioes` | `allergens`, `allergenTraces`, `diet`, `occasions` | Calculados por código, campos novos |
| `status` | `status` | `draft` ou `published`, conforme a fase e o escopo do token |

A tabela completa está em `06-INTEGRACAO.md`.

### 8.2 Imagens (D-09)

Regra: **primeiro bancos de imagens reais; geração por IA somente em último caso.**

1. O agente gera termos de busca a partir da receita e consulta, em ordem, os bancos de imagens aprovados (Openverse com filtro de licença, Unsplash, Pexels e Pixabay).
2. Cada candidata passa por critérios automáticos (licença permitida, resolução mínima, relevância verificada por modelo de visão, sem pessoas, marcas, texto ou marca d'água).
3. O agente **não** baixa nem armazena a imagem. Envia ao site a **origem** (provedor, URL da imagem, autor, licença, página de origem).
4. O site baixa a imagem apenas de domínios permitidos (proteção contra SSRF), processa com Sharp (6 variantes), armazena e grava a proveniência.
5. Se nenhuma candidata passar, o agente envia o `imagePrompt` e o site gera a imagem com o código existente (`gpt-image-1`). A geração tem teto diário e é marcada como imagem de IA.
6. Toda imagem recebe a legenda "Imagem ilustrativa" e, quando gerada por IA, "Imagem gerada por inteligência artificial".

Termos de uso de cada provedor devem ser conferidos antes de ativá-lo (pendência no registro de decisões).

### 8.3 Conteúdo educativo (dica, técnica, matéria)

Endpoint próprio (`POST /api/articles`), tabela `articles` separada de `recipes` (`04-ESTRUTURA-CONTEUDO.md`). As **dicas** ocupam, na navegação, o lugar que a referência (TudoGostoso) dá às notícias; não há notícias.

### 8.4 Autenticação, permissões, idempotência e erros

- Header `Authorization: Bearer <token>`. Dois escopos: `draft` (cria rascunho) e `publish` (cria já publicado). O token do agente **só cria**; não edita, não apaga e não despublica.
- O padrão do `status` na API passa a ser `draft`. Publicar exige o escopo `publish` e `status: "published"` explícito. Na Fase 0 o token do agente tem só `draft`.
- Despublicar é ação de administrador, com credencial separada.
- Limites no servidor: máximo diário de publicações por token (conforme a fase), rate limit, alerta de volume anormal, rotação periódica do token e **interruptor de emergência** (`AGENT_PUBLISHING_ENABLED`).
- **Idempotência:** cada pauta tem `topic_slug` estável (derivado do tema normalizado, não do título gerado). O histórico do agente tem `UNIQUE (content_type, topic_slug)`, e o envio leva `Idempotency-Key`. Se o `POST` der timeout e o reenvio devolver `409`, o agente consulta o slug com `GET` para confirmar a publicação, em vez de marcar erro.
- `HTTP 400`: validação; o agente registra o motivo e não reenvia o mesmo JSON. `HTTP 429`: respeita `Retry-After`. `HTTP 5xx` e timeouts: até 3 tentativas com espera crescente.

### 8.5 Avisos ao leitor (D-14)

| Aviso | Posição | Texto base |
| --- | --- | --- |
| Criação com apoio de IA | Topo, abaixo do título | "Receita criada com apoio de inteligência artificial e não testada na cozinha. Confira medidas e ingredientes." |
| Alérgenos e rótulos | **Final da receita**, em toda receita | "Atenção: esta receita pode conter ou ter contato com alérgenos. A compra dos produtos é de responsabilidade de quem prepara. Confira os rótulos e verifique se algum ingrediente pode causar alergia ou intolerância em você ou em quem vai consumir." |
| Imagem | Legenda da capa | "Imagem ilustrativa" (e "gerada por inteligência artificial" quando for o caso) |

Quando o sistema detecta alérgenos nos ingredientes, a receita mostra também a lista em destaque, junto do aviso final. A assinatura é "Equipe Chocolícia" (D-13). Textos editáveis em um único ponto de configuração; formato e posição são os definidos aqui.

### 8.6 Fonte canônica dos contratos

O contrato fica no repositório `chocolicia` (schema derivado do Zod, versionado). O agente mantém uma cópia e roda um teste de contrato a cada alteração (D-11).

---

## 9. Dados e banco

- **Conteúdo editorial, taxonomia, catálogo de ingredientes e alérgenos** ficam no Neon do site e são gravados somente pela API.
- O agente não recebe a string de conexão do banco do site.
- **Histórico, fila de pautas, custo e métricas** ficam no **banco do agente** (o Neon que o agente já usa), com tabelas novas (`04-ESTRUTURA-CONTEUDO.md`, seção 8.9). Cobertura por subcategoria vem de um endpoint de leitura do site.
- Seeds idempotentes por slug; chaves estrangeiras reais; nenhuma migration antes de fechar D-01 e D-02.
- Correção do seed anterior: `Bacanhao` é `Bacalhau`.

---

## 10. Hospedagem e agendamento do agente

Recomendação provisória para a primeira fase:

| Opção | Avaliação |
| --- | --- |
| GitHub Actions agendado (repositório privado) | Mais simples para começar: agenda, secrets e logs já existem. O agendamento usa UTC e pode atrasar alguns minutos. O Ollama local não existe lá, então a cadeia de LLMs usa provedores em nuvem |
| Worker Python dedicado ou serviço de containers | Melhor se a duração ou o volume crescerem |
| VPS | Mais controle, exige administração |
| Vercel Functions | Boa para APIs e tarefas curtas; não é a melhor escolha para o agente completo |

O agente é empacotado para que a troca do agendador não altere o código. Um grupo de concorrência (`concurrency`) impede duas execuções simultâneas.

---

## 11. Estrutura de pastas alvo

```text
agente-chocolicia/
├── docs/                      # documentação (00 a 08)
├── config/
│   ├── fontes.json            # fontes aprovadas, pesos e consultas-modelo
│   ├── seguranca.json         # base curada de segurança e conservação por família
│   ├── razoes.json            # razões de sanidade curadas por pessoa
│   ├── plausibilidade.json    # faixas de tempo, temperatura e quantidade
│   ├── frases_proibidas.json  # honestidade e alegações de saúde
│   ├── marcas.json            # marcas a evitar
│   ├── modelos_aprovados.json # modelos permitidos por tipo de tarefa
│   ├── cadencia.json          # limites por fase
│   └── settings.py
├── agents/
│   ├── planejador.py          # etapa 1
│   ├── pesquisador.py         # etapa 2
│   ├── analista.py            # etapa 3
│   ├── editor.py              # etapa 4
│   ├── revisor.py             # etapa 5 (IA, escopo reduzido)
│   └── seo.py                 # etapa 6
├── validators/                # verificações por código (08-VALIDACAO.md)
├── integration/
│   ├── contratos.py           # modelos Pydantic dos payloads
│   ├── adaptador_receita.py   # agente -> API do site
│   └── cliente_site.py        # HTTP, token, idempotência, tentativas
├── pipeline/
│   ├── gerar_receitas.py
│   └── gerar_conteudo_educativo.py
├── prompts/                   # prompts versionados, fora do código
├── services/
│   ├── llm_service.py         # reaproveitado, com lista de modelos aprovados
│   └── imagem_service.py      # bancos de imagens, licença, visão (sem Pollinations)
├── tests/                     # contrato, golden set, mutação
├── .github/workflows/
├── .env.example
└── rodar_agente.py
```

---

## 12. O que reaproveitar, refatorar, criar e remover

| Componente | Decisão | Motivo |
| --- | --- | --- |
| `services/llm_service.py` | Reaproveitar | Fallback de LLMs validado; passa a abortar se o modelo não estiver na lista aprovada |
| `rodar_agente.py` | Refatorar | Novos comandos (`--receita`, `--dica`, `--tecnica`, `--materia`, `--dry-run`) |
| `agents/editor.py` | Refatorar | Persona do Chef IA e saída estruturada em JSON |
| `agents/pesquisador.py` | Refatorar | Fontes culinárias e pauta por subcategoria |
| `agents/revisor.py`, `seo.py` | Refatorar | Regras culinárias e SEO de receitas; revisor sem os itens numéricos |
| `services/imagem_service.py` | Refatorar | Manter Openverse, Unsplash, Pexels e Pixabay; filtro de licença; verificação por visão; remover Pollinations; termos de busca culinários |
| `agents/publisher.py`, `github_service.py` | Substituir | O commit para o repositório do DigitalTech não pode existir neste projeto |
| `api.py` (dashboard DigitalTech) | Remover ou isolar | Não pertence ao Chocolícia |
| `pipeline/gerar_noticias.py`, `noticia_repository.py` | Remover | Fora do escopo |
| Tabelas `artigos`, `noticias` do banco atual | Não migrar | Estrutura de tecnologia |

---

## 13. Registro de decisões

| ID | Decisão | Status |
| --- | --- | --- |
| D-01 | Neon do site como central; agente grava somente por API | Aprovada em princípio. Pré-requisito: confirmar o `DATABASE_URL` de produção |
| D-02 | Ampliar categorias de 7 para 11, com subcategorias; `risk_level` e `agent_enabled` por subcategoria | Aprovada |
| D-03 | Agente gera o JSON e envia por `POST /api/recipes`; `generate-daily` vira contingência | Aprovada |
| D-04 | Tags normalizadas em tabela, com `kind` | Aprovada |
| D-05 | Histórico, fila e custo do agente em banco próprio do agente | Aprovada |
| D-06 | Padrão da API é `draft`; escopos `draft` e `publish`; token só cria; publicação automática a partir da Fase 1, sem revisão humana | Aprovada |
| D-07 | Relacionamentos com chaves estrangeiras reais | Aprovada |
| D-08 | Seeds e migrations idempotentes por slug | Aprovada |
| D-09 | Imagem: bancos de imagens reais primeiro, geração por IA em último caso; o site baixa e processa | Aprovada |
| D-10 | Hospedagem do agente: GitHub Actions privado na primeira fase | Recomendação provisória |
| D-11 | Contrato canônico no repositório do site, com teste de contrato no agente | Aprovada |
| D-12 | Sem revisão humana nem teste prático; validação automática e fases por risco | Aprovada |
| D-13 | Assinatura "Equipe Chocolícia" | Aprovada |
| D-14 | Aviso de alérgenos no final da receita; aviso de IA no topo; legenda de imagem ilustrativa | Aprovada |
| D-15 | Campos novos na receita (introdução, descanso, rendimento legível, alérgenos, dieta, ocasião); o site será atualizado | Aprovada |
| D-16 | Dicas ocupam o lugar das notícias; não há notícias | Aprovada |
| D-17 | Vendas fora da documentação nesta fase | Aprovada |
| D-18 | Idempotência por `topic_slug` | Aprovada |
| D-19 | Catálogo de ingredientes; vocabulário fechado na Fase 1 | Aprovada |

Pendências de verificação antes de produção (não são decisões): termos de uso dos bancos de imagens; termos e `robots.txt` das fontes de receitas; lista vigente de alérgenos da Anvisa; versão do PostgreSQL no Neon; existência de rate limit no site; chamadores atuais do `status`.

---

## 14. Segurança e boas práticas antes de subir ao GitHub

1. Criar um `.gitignore` que exclua `.env`, `*.db`, `__pycache__/` e logs. O `.env` atual contém credenciais de vários provedores, banco e GitHub.
2. Versionar apenas o `.env.example`, sem valores reais e reduzido às variáveis que o Chocolícia usa.
3. Como o `.env` já existiu em disco com chaves ativas, trocar as chaves dos provedores que não serão usados e confirmar que nenhuma chave real entra no histórico do repositório novo.
4. Remover referências ao repositório do DigitalTech e ao token do GitHub usado para commit de artigos.
5. Criar o repositório como **privado**. A documentação não contém caminhos locais nem dados pessoais, para poder ser publicada depois sem edição.
6. Guardar token do agente e chaves de LLM em GitHub Secrets; tokens separados por ambiente; rotação periódica.

---

## 15. Observabilidade, custo e operação

- Log estruturado por execução: data, tema, subcategoria, etapa, modelo, versão do prompt, tentativas, duração, custo e resultado.
- **Teto de custo** diário e mensal por componente (LLM, busca, geração de imagem), com parada automática ao atingir o teto. Valores iniciais em `config/cadencia.json`.
- **Lista de modelos aprovados** por tipo de tarefa. O fallback para modelo fora da lista **aborta** a execução, em vez de degradar a qualidade.
- Alarme de ausência de sinal (nada publicado em 36 horas na Fase 1 em diante), disjuntores, reversão em lote e canal de aviso do leitor estão em `07-PUBLICACAO.md`.
- Métricas semanais (taxa de rejeição, custo por receita publicada, denúncias por 100 receitas, tempo até despublicar) em `08-VALIDACAO.md`.

---

## 16. Riscos conhecidos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Conteúdo publicado sem revisão humana | Informação incorreta no ar | Validação por código, fases por risco, vocabulário fechado, avisos, canal de aviso de erro, disjuntores, despublicação rápida |
| Validador que não pega erro | Receita ruim publicada | Testes de mutação e golden set (`08-VALIDACAO.md`) |
| Modelo inventa número ou prazo | Receita insegura | Números e prazos vêm de código e de base curada |
| Padrão `published` da API | Publicação acidental | D-06: padrão `draft` e escopos de token |
| Cópia de texto de fontes | Jurídico e SEO | Fontes só como referência; extração de fatos; similaridade contra o texto lido em memória |
| Conteúdo gerado em escala sem valor para o leitor | Penalização em buscas | Cadência baixa, originalidade, utilidade, avisos, métricas (`05-SEO.md`) |
| Imagem com licença inadequada | Jurídico | Filtro de licença, registro de proveniência, termos conferidos por provedor |
| Imagem que não corresponde ao prato | Leitor induzido a erro | Verificação por visão, legenda "Imagem ilustrativa" |
| Download de imagem por URL externa | SSRF | Lista de domínios permitidos, limites de tamanho e tipo |
| Execuções duplicadas | Conteúdo repetido | Idempotência por `topic_slug`, concorrência única, cron interno do site desativado |
| Chaves vazadas ao publicar o repositório | Segurança | Seção 14 |
| Falha ou troca de modelo de IA | Qualidade irregular | Lista de modelos aprovados; aborta fora dela |
| Custo descontrolado | Gasto inesperado | Tetos diário e mensal com parada automática |

---

## 17. Sequência da documentação

| Documento | Conteúdo |
| --- | --- |
| `00-REGISTRO-DE-ALTERACOES.md` | O que mudou em cada documento e pendências de verificação |
| `01-ARQUITETURA.md` | Este documento |
| `02-PESQUISA.md` | Fontes, buscas, critérios de seleção, limites de uso das referências |
| `03-PROMPT-SISTEMA.md` | Persona e instruções do Chef IA, por tipo de conteúdo |
| `04-ESTRUTURA-CONTEUDO.md` | Categorias, subcategorias, facetas, ingredientes, esquemas de dados e migrations |
| `05-SEO.md` | Regras de SEO e dados estruturados |
| `06-INTEGRACAO.md` | Contratos, endpoints, autenticação e alterações no site |
| `07-PUBLICACAO.md` | Fluxo de publicação, operação, disjuntores e reversão |
| `08-VALIDACAO.md` | Verificações, testes de mutação e critérios por fase |
| `PESQUISA-RECEITAS.md` | Procedimento específico de pesquisa para receitas |
