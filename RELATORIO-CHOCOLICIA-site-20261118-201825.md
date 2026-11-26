# Relatório de auditoria — site

- Diretório analisado: `C:\Users\miche\Projetos\chocolicia`
- Gerado em: 2026-11-18 20:18:25 -0300
- Repositório detectado: **site**

## Resumo

- ✅ OK: 0
- ❌ FALTA: 42
- ⚠️ ATENÇÃO: 3
- ❓ NÃO VERIFICADO: 0

## Detalhamento

### Migrations

- ❌ **Todas as migrations registradas no journal** — Sem entrada no journal: 0001_warm_invisible_woman  
  *Fonte: CODEX-01-SITE-BASE.md, Etapa 0, item 1*
### Esquema Drizzle

- ❌ **Tabela categories** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.1*
- ❌ **Tabela tags** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.2*
- ❌ **Tabela recipe_tags** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.2*
- ❌ **Tabela ingredients** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8*
- ❌ **Tabela recipe_ingredients** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.4*
- ❌ **Tabela articles** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.5*
- ❌ **Tabela content_relations** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.6*
- ❌ **Tabela content_reports** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.7*
- ❌ **Tabela authors** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.7*
- ❌ **Tabela tip_topics** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §6.7/§8.5*
- ❌ **Tabela api_idempotency_keys** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 06-INTEGRACAO.md §10*
- ❌ **Tabela api_rate_limits** — Declaração não encontrada em drizzle/schema.ts.  
  *Fonte: 06-INTEGRACAO.md §12*
- ❌ **Coluna recipes.category_id** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.subcategory_id** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.intro** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.rest_time_min** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.yield_label** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.diet** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.occasions** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.author_id** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.cover_image_source** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
- ❌ **Coluna recipes.cover_image_is_ai** — Não encontrada no bloco da tabela recipes.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §8.3*
### Taxonomia

- ⚠️ **Enum fixo RECIPE_CATEGORIES** — Enum legado ainda existe; conferir fase de transição da taxonomia.  
  *Fonte: 04-ESTRUTURA-CONTEUDO.md §15; 01-ARQUITETURA.md §3.2*
### Contrato da API

- ❌ **Padrão de status em recipeInputSchema** — O padrão encontrado é "published"; esperado "draft".  
  *Fonte: 01-ARQUITETURA.md D-06; 06-INTEGRACAO.md §6.2*
### Autenticação

- ❌ **Tokens separados draft/publish no .env.example** — Não foram encontradas as duas variáveis de token.  
  *Fonte: 06-INTEGRACAO.md §3–4*
### Configuração

- ❌ **AGENT_PUBLISHING_ENABLED no .env.example** — Variável não declarada.  
  *Fonte: 01-ARQUITETURA.md §8.4; 06-INTEGRACAO.md §3*
- ❌ **AGENT_DAILY_CAP_RECIPES no .env.example** — Variável não declarada.  
  *Fonte: 06-INTEGRACAO.md §3 e §12*
- ❌ **AGENT_DAILY_CAP_ARTICLES no .env.example** — Variável não declarada.  
  *Fonte: 06-INTEGRACAO.md §3 e §12*
- ❌ **AGENT_PHASE no .env.example** — Variável não declarada.  
  *Fonte: 06-INTEGRACAO.md §3*
- ❌ **CONTRACT_VERSION no .env.example** — Variável não declarada.  
  *Fonte: 06-INTEGRACAO.md §3*
### Endpoints

- ❌ **Endpoint/referência: taxonomia** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: catálogo de ingredientes** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: cobertura** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: consulta de conteúdo** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: status de receita** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: criação de artigos** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: denúncias/relatórios** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: arquivamento** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: restauração** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
- ❌ **Endpoint/referência: arquivamento em lote** — Referência não localizada; revisar roteamento manualmente.  
  *Fonte: 06-INTEGRACAO.md §5*
### Contrato

- ❌ **Cabeçalho X-Contract-Version** — Referência não encontrada nos arquivos de servidor.  
  *Fonte: 06-INTEGRACAO.md §6.1 e §14*
- ❌ **contracts/recipe.v1.schema.json** — Arquivo ausente.  
  *Fonte: 06-INTEGRACAO.md §14; CODEX-01-SITE-BASE.md Etapa 3*
### SEO

- ⚠️ **Sitemap filtra conteúdo publicado** — Filtro não confirmado por padrão estático; revisar manualmente.  
  *Fonte: 05-SEO.md §10.1*
### Transição para agente

- ⚠️ **Cron generate-daily em vercel.json** — Referência ainda presente; confirmar se já é hora de desativar.  
  *Fonte: 01-ARQUITETURA.md §7.3; CODEX-01-SITE-BASE.md*

## Limitações

- Esta é uma auditoria estática: não executa o sistema.
- `OK` indica apenas que o padrão/arquivo foi localizado.
- `FALTA` indica que o padrão esperado não foi localizado; pode exigir revisão manual.
- `ATENÇÃO` indica situação que merece conferência, não necessariamente erro.
- `NÃO VERIFICADO` indica que a verificação automática não teve dados suficientes.
- A busca por segredos é heurística e não substitui uma ferramenta própria de varredura.
- A presença de migrations no journal não comprova que foram aplicadas ao banco.
