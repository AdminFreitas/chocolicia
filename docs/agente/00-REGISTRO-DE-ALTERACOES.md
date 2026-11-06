# 00 - Registro de Alterações (revisão de 05/11/2026)

Este arquivo registra o que mudou em cada documento, para conferência, e substitui qualquer registro anterior. O conjunto atual é: `00` a `08` e `PESQUISA-RECEITAS.md`.

---

## 1. Decisões do responsável pelo projeto

| Decisão | Onde foi aplicada |
| --- | --- |
| Assinatura "Equipe Chocolícia" (substitui a assinatura individual de chefs) | 01 (D-13, 8.5), 03 (3.1, 3.3, base, 6.2), 04 (8.7, 11), 05 (6, 7.1), PESQUISA-RECEITAS (10) |
| Aviso de alérgenos no **final** da receita; a compra dos produtos e a decisão de consumo são do leitor | 01 (8.5, D-14), 04 (7.5), 05 (6), 08 (PUB-04), PESQUISA-RECEITAS (8.1) |
| Imagem: bancos de imagens reais primeiro; geração por IA somente em último caso | 01 (8.2, D-09), 03 (6.1, 6.2), 04 (8.8, 9.4), 06 (7), 08 (IMG), 07 (5) |
| Sites de receitas são só referência e inspiração | 02 (2, 6) |
| Vendas fora da documentação nesta fase | 01 (1, D-17), 02 (6.3), 04 (campo `cta` removido) |
| Sem revisão humana nem teste prático das receitas | Todos os documentos. A Fase 0 também é 100% automática |
| Campos novos na receita (introdução, descanso, rendimento legível, alérgenos, dieta, ocasião); o site será atualizado | 01 (D-15), 04 (8.3), 06 (6, 16.1) |
| Dicas ocupam o lugar das notícias; não há notícias | 01 (D-16), 04 (3) |
| Demais sugestões da análise da documentação, por delegação | Seção 2 deste registro |

## 2. Sugestões aplicadas por delegação

| Tema | Mudança | Onde |
| --- | --- | --- |
| Padrão da API | `status` passa a `draft`; escopos de token `draft` e `publish`; token só cria; rotação, alerta de volume e interruptor de emergência | 01 (3.2, 8.4, D-06), 04 (12), 06 (4, 5) |
| Idempotência | Chave derivada da pauta (`topic_slug`), `UNIQUE` no histórico, `Idempotency-Key`, `GET` de confirmação após `409` ou timeout | 01 (8.4, D-18), 02 (4.1), 04 (8.9), 06 (10) |
| Segurança ausente rejeita | Sinais de risco por código, base curada `config/seguranca.json`, prazo de conservação só da base; sinal sem entrada rejeita a pauta | 02 (8), 03 (6.1, 12), 08 (SEG), PESQUISA-RECEITAS (7, 12) |
| Validador testado | 49 mutações (100% exigido nas determinísticas), golden set e critérios de promoção | 08 (7, 8, 10), 03 (14) |
| Razões de sanidade | Curadas por pessoa, não pelo agente | PESQUISA-RECEITAS (6.3), 08 (CUL-04) |
| Números e rótulos por código | Regex nos passos, ingrediente x passos, dificuldade, tempos e rendimento por código; modelo não decide números | 03 (6.1, 6.2, 12), 04 (6.3, 9.2), 08 (NUM, CUL) |
| Revisor por IA | Itens numéricos saíram do revisor; modelo de família diferente; nunca aprova o que o código rejeitou | 03 (12.3), 08 (5) |
| Escopo por fases de risco | `risk_level` e `agent_enabled` por subcategoria; Fases 0 a 3; Fase 3 adiada | 01 (7.4), 04 (5.3, 8.1), 07 (3) |
| Etiquetas `sem glúten` e `sem lactose` | Reservadas e não aplicadas nas Fases 1 e 2 | 04 (6.2), 08 (ALG-04, ALG-05), PESQUISA-RECEITAS (8.2) |
| Similaridade | Comparação com o texto bruto em memória (as fichas só têm fatos), limites iniciais | 02 (6.4), 08 (6) |
| Injeção de prompt | Defesa na extração, extrator sem ferramentas e sem segredos, vocabulário controlado | 02 (10) |
| Banco de dados | Catálogo de ingredientes e `recipe_ingredients` numéricos; alérgenos por tabela; índice único com `NULLS NOT DISTINCT` (ou alternativa); CHECKs; histórico do agente em banco próprio (D-05) | 04 (7, 8) |
| Operação | Canal de aviso do leitor, disjuntor por receita e global, alarme de ausência de sinal (36 h), interruptor, reversão em lote, errata, fila de pautas, pautas bloqueadas | 07 |
| Custo, modelos aprovados, métricas | Tetos diário e mensal, lista de modelos aprovados (aborta fora dela), métricas semanais | 01 (15), 07 (10), 08 (11) |
| Tendência | Calendário sazonal e Search Console (não há API oficial do Google Trends) | 02 (3.3, 4.1), 05 (12) |
| Portão de termos de uso | Verificar antes de desenvolver a coleta | 02 (12) |
| Imagem e avisos ao leitor | Aviso de IA no topo; legenda "Imagem ilustrativa" (e "gerada por IA" quando for o caso) | 01 (8.5), 05 (6, 8) |
| "Segredo do Chocolícia" | Renomeado para "Dica extra", só com base na ficha | 03 (6), 04 (9.3), PESQUISA-RECEITAS (10) |
| Inconsistências corrigidas | Diagrama e textos de "revisão"; "uma" x "2" tentativas; exemplo de introdução com superlativo; FAQ, armazenamento e diferencial sem base na ficha; "Difícil" inalcançável (passos 4 a 20, dificuldade por código); `rest_time_min` | 01, 02, 03, 04 |
| Documentação publicável | Sem caminho local nem frases dirigidas a pessoas | Todos |

## 3. Ajustes feitos além da análise

| Tema | Mudança |
| --- | --- |
| Subcategoria `sucos-detox` | Mantida por decisão do responsável, nível `high`; "detox" só como nome de preparo, nunca como promessa |
| Dicas no cabeçalho | As dicas ocupam o lugar das notícias na navegação |
| Imagens | Remoção do Pollinations; filtro de licença (recusa NC, ND e SA); download de imagem somente pelo site, com domínios permitidos (proteção contra SSRF); verificação por modelo de visão |
| Alérgenos | Catálogo inclui `latex-natural` e `moluscos` marcados como `to_confirm` |
| Banco do agente | Histórico, fila e custo em banco próprio; sem chave estrangeira para o site |
| Dados estruturados | Sem `aggregateRating`, `review`, `nutrition` e `video` sem dado real; sem `HowTo` e sem `FAQPage` (sem resultado enriquecido) |

## 4. O que não foi aplicado

| Item da análise | Motivo |
| --- | --- |
| Fase 0 com inspeção manual de 30 a 50 receitas | A decisão é não ter revisão humana. A Fase 0 mede métricas, mutação, golden set e fumaça de forma automática |
| Janela de veto de 24 horas antes de publicar | Idem |
| Manter apenas as 7 categorias atuais | A árvore de 11 categorias foi mantida; o risco é controlado por `agent_enabled` e fase |

## 5. Documentos desta revisão

| Arquivo | Situação |
| --- | --- |
| `00-REGISTRO-DE-ALTERACOES.md` | Novo |
| `01-ARQUITETURA.md` | Reescrito (versão 0.4) |
| `02-PESQUISA.md` | Atualizado (versão 0.2) |
| `03-PROMPT-SISTEMA.md` | Atualizado (versão 0.2; módulo de receita 1.1.0, revisor 1.1.0) |
| `04-ESTRUTURA-CONTEUDO.md` | Reescrito (versão 0.2; 74 subcategorias) |
| `05-SEO.md` | Novo |
| `06-INTEGRACAO.md` | Novo |
| `07-PUBLICACAO.md` | Novo |
| `08-VALIDACAO.md` | Novo |
| `PESQUISA-RECEITAS.md` | Atualizado (versão 0.2) |

## 6. Ainda não verificado (conferir antes de produção)

| Item | Motivo |
| --- | --- |
| Lista de alérgenos da Anvisa (inclusive látex natural e moluscos) | Escrita de memória; conferir na norma vigente |
| Versão do PostgreSQL no Neon | `UNIQUE NULLS NOT DISTINCT` exige 15 ou superior; há alternativa em `04`, seção 8.6 |
| Termos das APIs de Openverse, Unsplash, Pexels e Pixabay | Atribuição, uso por link direto, redistribuição e armazenamento não foram conferidos |
| Termos de uso e `robots.txt` das fontes de receitas | Portão antes de desenvolver a coleta |
| Política do Google para conteúdo gerado em escala e requisitos de dados estruturados de receita | Consultados em fontes públicas em 05/11/2026; reconferir na documentação do Google Search Central |
| Rate limit existente no site | Não consta como existente |
| Chamadores atuais do `status` padrão | Confirmar que `generate-daily` e o adaptador enviam `status` explícito antes da troca |
| Limite de tempo de execução na Vercel | Define se a imagem é tratada em segundo plano |
| Estrutura atual de URLs, host canônico, sitemap, JSON-LD e Search Console do site | Levantar antes de fechar `05-SEO.md` |
| Aspectos jurídicos de assinatura, avisos e uso comercial do conteúdo | A documentação não é aconselhamento jurídico |

## 7. Valores iniciais a calibrar

Limite diário (1 receita na Fase 1, 2 na Fase 2), disjuntores (1 aviso de segurança ou alergia arquiva a receita; 3 avisos de qualquer tipo em 24 h arquivam; 2 avisos de segurança ou 3 de qualquer tipo no site em 24 h pausam; 3 arquivamentos em 7 dias rebaixam a fase), alarme de 36 horas, limites de similaridade (10 palavras seguidas; 15% dos grupos de 4 palavras; 0,9 e 0,85), margem de 25% nas faixas de consenso, metas de promoção entre fases (`08-VALIDACAO.md`, seção 10) e faixas de `config/plausibilidade.json`.
