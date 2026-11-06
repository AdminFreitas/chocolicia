# 07 - Publicação e Operação

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia e site `chocolicia` |
| Versão do documento | 0.1 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md`, `04-ESTRUTURA-CONTEUDO.md`, `06-INTEGRACAO.md` |
| Alimenta | `08-VALIDACAO.md` (critérios de promoção entre fases e verificações de pós-publicação) |

---

## 1. Objetivo

Definir como o conteúdo vai ao ar e como o sistema é operado **sem revisão humana**: cadência, fila de pautas, estados, escopo por fase, disjuntores, alarmes, canal de denúncias, reversão em lote, errata, custo e rotina de operação.

Como não há revisão humana nem teste prático das receitas, a segurança do projeto vem de quatro mecanismos descritos aqui e em `08-VALIDACAO.md`: escopo por risco, validação automática conservadora, detecção rápida de problemas e reversão rápida.

---

## 2. Modelo de publicação

| Aspecto | Regra |
| --- | --- |
| Quem publica | O próprio agente, com token de escopo `publish`, a partir da Fase 1 |
| Condição | Passar em todas as verificações bloqueantes (`08-VALIDACAO.md`) e estar dentro do escopo da fase |
| Fase 0 | Nada é publicado; tudo é gravado como `draft` |
| Despublicação | Administrador, disjuntor por receita ou disjuntor global (seções 8 e 9) |
| Edição de conteúdo publicado | Não existe na primeira versão. Correção = arquivar e, se for o caso, nova receita |
| Assinatura e avisos | "Equipe Chocolícia"; aviso de IA no topo, aviso de alérgenos no final, legenda de imagem (`01-ARQUITETURA.md`, seção 8.5) |

---

## 3. Fases de lançamento

| Fase | Nível de risco | Publicação | Limite diário inicial | Entrada |
| --- | --- | --- | --- | --- |
| 0 - Sombra | `low` | Nenhuma (`draft`) | 3 execuções | Implantação concluída |
| 1 | `low` | Automática | 1 receita | Critérios da Fase 0 (`08-VALIDACAO.md`, seção 10) |
| 2 | `low` e `medium` | Automática | 2 receitas | Critérios da Fase 1 |
| 3 | `high`, por subcategoria | Automática | A definir | Critérios da Fase 2 mais bases de segurança curadas para cada família |

- A fase em vigor é configuração do projeto (`AGENT_PHASE`), alterada por decisão registrada, nunca pelo agente.
- O `agent_enabled` de cada subcategoria acompanha a fase (`04-ESTRUTURA-CONTEUDO.md`, seção 5.3).
- O disjuntor global **rebaixa** a fase automaticamente (seção 9).
- Artigos (dicas, técnicas e matérias) seguem a cadência de `config/cadencia.json`: valores iniciais de 2 dicas por semana, 1 técnica por semana e 1 matéria por quinzena, a partir da Fase 1, e sempre com validação mais rigorosa nas matérias (fontes obrigatórias).

---

## 4. Fila de pautas e execução diária

### 4.1 Fila

A tabela `agent_topic_queue` (banco do agente) recebe pautas de quatro origens: calendário sazonal, lacunas de cobertura, Search Console e entrada manual. O planejador escolhe a próxima pauta que:

1. pertence a uma subcategoria `agent_enabled` e ativa;
2. não tem `topic_slug` já registrado em `agent_generations`;
3. não duplica conteúdo existente (consulta em `GET /api/content/lookup`);
4. não está na lista de **pautas bloqueadas** (seção 7);
5. respeita o limite diário e o teto de custo.

### 4.2 Execução

| Passo | Descrição |
| --- | --- |
| 1 | O agendador inicia o processo (`concurrency` impede execução simultânea) |
| 2 | O agente reserva a pauta (`INSERT ... ON CONFLICT DO NOTHING` em `agent_generations`); se não conseguir reservar, termina |
| 3 | Confere interruptor, fase, teto de custo e modelos aprovados; aborta se algo falhar |
| 4 | Pesquisa, criação, validação, SEO e busca de imagem |
| 5 | Envio à API com `Idempotency-Key` (`06-INTEGRACAO.md`, seção 10) |
| 6 | Teste de fumaça da página publicada |
| 7 | Registro do resultado, custo e métricas; resumo da execução |

### 4.3 Estados da pauta (`agent_generations.status`)

```text
planned -> generated -> sent -> published -> unpublished
   |           |          |
   |           |          +-> error
   |           +-> rejected (motivo registrado)
   +-> rejected / error
```

| Estado | Significado |
| --- | --- |
| `planned` | Pauta reservada |
| `generated` | Conteúdo criado e aprovado pela validação |
| `rejected` | Reprovado pela validação ou pelos limites, com `rejection_code` |
| `sent` | Enviado à API |
| `published` | Público e confirmado pelo teste de fumaça |
| `unpublished` | Arquivado (por administrador ou disjuntor) |
| `error` | Falha técnica |

Pauta `rejected` não volta à fila sozinha. Um motivo corrigível por configuração (por exemplo, ingrediente fora do catálogo) pode ser reaberto manualmente após a correção.

---

## 5. Falhas e tentativas

| Situação | Comportamento |
| --- | --- |
| Falha da API de busca ou de LLM | Até 2 tentativas; troca de provedor somente por modelo aprovado; sem modelo aprovado disponível, a execução termina com `error` |
| Validação reprova | Até 2 tentativas de reparo (`03-PROMPT-SISTEMA.md`); se persistir, `rejected` |
| Imagem não encontrada nos bancos | Geração por IA, se houver teto diário disponível; senão o conteúdo fica em `draft` com motivo |
| Imagem falha no site | Conteúdo em `draft`; uma nova tentativa com outra candidata; depois `error` |
| Timeout no envio | Reenvio com a mesma chave e confirmação por `GET` (nunca duplica) |
| Teste de fumaça reprova | Se a página não carrega (5xx) ou o JSON-LD é inválido, o conteúdo é arquivado automaticamente e a falha é alertada |
| Teto de custo atingido | A execução termina; nada é publicado até o próximo ciclo |

---

## 6. Estados do conteúdo e da imagem

Os estados `draft`, `processing`, `published` e `archived` estão em `04-ESTRUTURA-CONTEUDO.md`, seção 12. Resumo operacional:

- O agente cria em `draft` (Fase 0) ou publica (Fase 1 em diante).
- `processing` é interno e nunca público.
- Só `published` aparece no site e no sitemap.

---

## 7. Pautas bloqueadas na primeira versão

Independentemente da fase, o agente **não** gera estes temas, pelo risco de erro com consequência séria:

| Tema | Motivo |
| --- | --- |
| Conservas caseiras, enlatados, alimentos em óleo (alho ou palmito em conserva, por exemplo) e fermentação para conservação | Risco de botulismo e erro de acidez |
| Receitas para bebês e crianças pequenas (papinhas, introdução alimentar) | Risco nutricional e alérgico |
| Receitas para condições de saúde (diabetes, hipertensão, dietas terapêuticas) e promessas de emagrecimento ou "detox" com alegação | Alegação de saúde |
| Cozimento em baixa temperatura (sous-vide), defumação caseira e curas | Risco microbiológico |
| Peixe cru e carne crua (sushi, tartare, carpaccio) | Risco microbiológico |
| Queijos e laticínios de leite cru, produção de embutidos | Risco microbiológico |
| Bebidas fermentadas alcoólicas caseiras | Risco e regulação |
| Receitas com ovo cru **sem** base de segurança curada para a família | Regra "risco sem informação de segurança rejeita" |

A lista fica em `config/pautas_bloqueadas.json` e é aplicada na pauta e na validação do conteúdo (por palavras-chave e por sinalizadores de risco).

Bebidas alcoólicas (`drinks-com-alcool`, Fase 3) exigem aviso adicional de venda e consumo proibidos para menores de 18 anos, e entram somente com base de segurança curada.

---

## 8. Canal de aviso do leitor e disjuntor por receita

### 8.1 Canal

Todas as páginas de receita e de artigo trazem o link "Reportar um erro" para o formulário que chama `POST /api/reports` (`06-INTEGRACAO.md`, seção 13). Motivos: `seguranca`, `alergia`, `medida`, `erro`, `outro`. Contato do leitor é opcional.

### 8.2 Disjuntor por receita (executado no site)

| Condição | Ação |
| --- | --- |
| 1 denúncia de `seguranca` ou `alergia` com mensagem não vazia | Arquivamento automático **imediato**, e alerta |
| 3 denúncias de qualquer motivo em 24 horas | Arquivamento automático e alerta |
| Denúncias sem condição acima | Contam para métricas e para o disjuntor global |

Valores iniciais, configuráveis. A lógica é deliberadamente conservadora: uma receita arquivada por engano pode ser restaurada; uma receita insegura no ar tem custo maior. O disjuntor por receita também precisa de proteção contra abuso (limite por IP e por conteúdo), para que denúncias falsas não esvaziem o site.

### 8.3 Tratamento

| Etapa | Meta inicial |
| --- | --- |
| Alerta ao responsável pelo projeto (e-mail ou mensagem) | Imediato |
| Análise do aviso e decisão (restaurar, manter arquivado ou nova receita) | Em até 48 horas; avisos de segurança e alergia, assim que possível |
| Registro da decisão em `content_reports` (`status`, `handled_at`) | Em toda denúncia |

Se um aviso revelar defeito sistêmico (mesma causa em várias receitas), aplica-se a reversão em lote (seção 11).

---

## 9. Disjuntor global, alarmes e interruptor

### 9.1 Disjuntor global (rebaixa a fase ou pausa)

| Condição | Ação |
| --- | --- |
| 2 avisos de segurança ou alergia, ou 3 avisos de qualquer tipo, em 24 horas (considerando todo o site) | Pausa a publicação automática (`AGENT_PUBLISHING_ENABLED = false`) |
| 3 receitas arquivadas por disjuntor em 7 dias | Rebaixa a fase em um nível e pausa |
| Taxa de rejeição pela validação acima do limite de `08-VALIDACAO.md` (seção 10) em 7 dias | Pausa e alerta |
| Ação manual no Search Console ou crescimento anormal de páginas não indexadas (`05-SEO.md`, seção 12) | Pausa e alerta |
| Custo diário ou mensal acima do teto | Pausa até o próximo ciclo |

A retomada exige decisão registrada do responsável (alterar o interruptor e, se houver rebaixamento, a fase).

### 9.2 Alarme de ausência de sinal

Um agendamento que deixa de rodar não gera falha. Por isso, um verificador independente (por exemplo, um segundo job agendado) confere se algo foi publicado nas últimas **36 horas** na Fase 1 em diante (24 horas por execução diária mais margem) e alerta se não houve. Na Fase 0, confere se houve execução.

### 9.3 Interruptor de emergência

`AGENT_PUBLISHING_ENABLED` no site bloqueia a criação de conteúdo publicado por qualquer token do agente. Além dele, desativar o workflow do agente interrompe as execuções. Os dois passos estão no roteiro de operação (seção 13).

---

## 10. Custos

| Componente | Controle |
| --- | --- |
| LLM (criação, reparo, revisão, SEO, visão para imagem) | Teto diário e mensal; cada reparo e cada fallback contam |
| Busca (Tavily) | Teto de buscas por execução (`02-PESQUISA.md`) e teto mensal |
| Imagem por IA | Último caso; teto diário de gerações |
| Infra (agendador, banco do agente, banco e armazenamento do site) | Acompanhamento mensal |

O custo de cada execução é registrado em `agent_costs` e em `agent_generations.cost_usd`. Os valores dos tetos ficam em `config/cadencia.json` e precisam ser definidos antes da Fase 0, a partir de uma estimativa por receita (LLM com reparos e fallback, buscas, visão e imagem). Ao atingir o teto, a execução termina e o disjuntor global é acionado.

---

## 11. Reversão em lote

Quando um problema sistêmico é descoberto (um erro de conversão, um prompt com falha, um modelo que errou):

1. Acionar o interruptor de emergência (pausa novas publicações).
2. Identificar o escopo pelos campos já registrados em `generation_meta`: `prompt_version`, `ai_model`, `validators_version`, intervalo de datas ou `run_id`.
3. Executar `POST /api/admin/content/bulk-archive` com o filtro escolhido (o endpoint devolve a lista antes de confirmar).
4. Corrigir a causa (catálogo, conversão, prompt, validador), cobrir o caso com um teste novo (`08-VALIDACAO.md`) e reabrir as pautas afetadas.
5. Retomar com decisão registrada.

---

## 12. Errata e política de correção

- Receita arquivada por erro volta ao ar somente após a decisão registrada, e o conteúdo não é editado em silêncio.
- Quando houver correção relevante de uma receita publicada (por exemplo, uma medida), o ideal é arquivá-la e publicar uma nova com outra `topic_slug` e, se necessário, redirecionamento. A versão 1 não tem edição automática.
- A página "Como criamos nossas receitas" explica o processo, o uso de IA, o aviso de alérgenos e como reportar erros.

---

## 13. Roteiro de operação (runbook)

| Situação | Passos |
| --- | --- |
| Execução manual | Disparar o workflow manualmente (`workflow_dispatch`), com `--dry-run` para teste ou `--target preview` |
| Pausar | Definir `AGENT_PUBLISHING_ENABLED = false` no site; desativar o workflow no repositório |
| Retomar | Corrigir a causa, registrar a decisão, reativar o interruptor e o workflow |
| Aviso de segurança ou alergia | Arquivar a receita (automático), conferir `content_reports`, decidir, buscar causa comum |
| Falhas repetidas | Ver `agent_generations` por `rejection_code`, custo e modelo; conferir modelo aprovado |
| Trocar token | Gerar novo token por escopo, atualizar secrets do agendador e da Vercel, revogar o anterior |
| Mudança de fase | Alterar `AGENT_PHASE` e `agent_enabled` por migration ou seed, com registro da decisão e das métricas |
| Mudança de prompt ou modelo | Executar o golden set e os testes de mutação; só publicar com resultado verde (`08-VALIDACAO.md`) |

---

## 14. Alertas e relatórios

| Item | Conteúdo |
| --- | --- |
| Resumo da execução | Pauta, estado, link, custo, tentativas, motivo de rejeição |
| Resumo semanal | Publicadas, rejeitadas por código, denúncias, arquivadas, custo, taxa de rejeição, páginas indexadas |
| Alertas imediatos | Disjuntores, ausência de sinal, tetos de custo, falha de teste de fumaça, erro de contrato |

Canal de entrega: e-mail ou notificação do agendador (a definir).

---

## 15. Papéis

| Papel | Responsabilidade |
| --- | --- |
| Responsável pelo projeto | Receber alertas, decidir sobre denúncias, retomar após pausa, definir a fase e os tetos |
| Agente | Executar a pauta, validar, publicar dentro dos limites, registrar |
| Site | Aplicar limites, disjuntor por receita, interruptor, avisos e despublicação |

---

## 16. Pendências

| Item | Observação |
| --- | --- |
| Tetos de custo e valores de `config/cadencia.json` | Definir antes da Fase 0, a partir da estimativa por receita |
| Canal de alerta (e-mail ou mensagem) | Escolher e configurar |
| Verificador de ausência de sinal | Definir onde roda (segundo workflow ou serviço de monitoramento) |
| Valores iniciais dos disjuntores | Calibrar com os dados da Fase 0 |
| Texto e formulário de denúncia | Criar no site |
| Página "Como criamos nossas receitas" | Redigir |
| Lista de pautas bloqueadas | Revisar periodicamente |
