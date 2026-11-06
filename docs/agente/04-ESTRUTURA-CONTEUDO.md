# 04 - Estrutura de Conteúdo

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia (contrato com o site `chocolicia`) |
| Versão do documento | 0.2 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md` (v0.4), `02-PESQUISA.md`, `PESQUISA-RECEITAS.md`, `03-PROMPT-SISTEMA.md` |
| Alimenta | `05-SEO.md`, `06-INTEGRACAO.md`, `07-PUBLICACAO.md`, `08-VALIDACAO.md` |

---

## 1. Objetivo

Definir **como o conteúdo do Chocolícia é organizado e armazenado**: tipos de conteúdo, árvore de categorias e subcategorias com nível de risco por fase, facetas, tags, catálogo de ingredientes, alérgenos, esquemas de dados, ciclo de vida e migrations.

É a fonte de verdade da taxonomia. O agente e o site leem a mesma estrutura, e o agente a consulta por API.

---

## 2. Princípios de modelagem

1. **Taxonomia em uma fonte só**, no banco do site, lida pelo agente por API.
2. **Dois níveis no máximo:** categoria e subcategoria. O que não cabe vira faceta.
3. **Faceta não é subcategoria.** Ocasião, dieta, dificuldade e coleção são dimensões separadas.
4. **Uma categoria principal por conteúdo**, com subcategoria obrigatória (a categoria é derivada dela) e, no máximo, duas subcategorias secundárias.
5. **Receita e artigo são tipos diferentes**, em tabelas separadas, ligados por relacionamentos com chaves estrangeiras reais.
6. **Ingredientes são dados, não texto.** Catálogo próprio, com quantidade canônica numérica e alérgenos por tabela.
7. **Mudanças aditivas.** Nada que está publicado quebra; colunas novas são opcionais até o backfill terminar.
8. **Idempotência.** Seeds e migrations usam slug como chave natural, sem IDs fixos.
9. **Nomes em inglês no banco e na API do site**, português na interface e no contrato do agente (o adaptador converte).
10. **Risco por subcategoria.** Cada subcategoria tem nível de risco e uma chave de habilitação para o agente.

---

## 3. Mapa do site e dos tipos de conteúdo

### 3.1 Tipos de conteúdo

| Tipo | Valor no banco | Tabela | Onde aparece |
| --- | --- | --- | --- |
| Receita | `recipe` | `recipes` | Receitas, por categoria e subcategoria |
| Técnica | `technique` | `articles` | Aprenda > Técnicas |
| Dica | `tip` | `articles` | Aprenda > Dicas (no cabeçalho, no lugar das notícias) |
| Matéria | `feature` | `articles` | Aprenda > Matérias |

### 3.2 Navegação (adaptada do TudoGostoso)

| Item da referência | No Chocolícia | Observação |
| --- | --- | --- |
| Canais especiais | **Coleções** | Chocolate, datas especiais, festas e buffet, receitas rápidas |
| Notícias | **Dicas** | Não há notícias. As dicas ocupam esse lugar no cabeçalho |
| Bolos e tortas até Alimentação saudável (11 itens) | **Categorias de receitas** | Seção 5 |
| Todas as receitas | **Índice geral** | Lista com busca e filtros por faceta |
| (novo) | **Aprenda** | Técnicas, Dicas e Matérias |

---

## 4. Visão geral do modelo de dados

```text
NEON DO SITE
authors ──< recipes >── recipe_tags >── tags
              |  \──< recipe_ingredients >── ingredients ──< ingredient_allergens >── allergens
              |        (ingredients ──< ingredient_aliases)
              └── category_id, subcategory_id ──> categories (auto-relação)
authors ──< articles >── article_tags >── tags
              └── category_id, subcategory_id ──> categories
content_relations (recipes e articles, com chaves estrangeiras)
content_reports   (denúncias de leitores)

BANCO DO AGENTE
agent_runs ──< agent_generations      agent_topic_queue      agent_costs
(sem chaves estrangeiras para o banco do site; guarda slug e id como referência)
```

---

## 5. Árvore editorial

Slugs sem acento, minúsculos, com hífen. A ordem é a de exibição.

### 5.1 Ajustes em relação à árvore proposta antes

- Saíram das subcategorias os itens que são facetas: bolos sem glúten e sem lactose (dieta), receitas de Quaresma (ocasião), sopas de inverno (estação) e sobremesas com chocolate (coleção).
- Corrigido o erro do seed anterior: `Bacanhao` é **Bacalhau** (`bacalhau`).
- Incluídas as subcategorias `panetones-e-chocotones` (Doces e sobremesas) e `sucos-detox` (Bebidas).
- "Alimentação saudável" não tem dietas como subcategorias; dietas são facetas.
- "Detox" é rótulo culinário (suco verde, por exemplo). O conteúdo **não** pode alegar desintoxicação nem efeito sobre a saúde (`03-PROMPT-SISTEMA.md`, regra 7).

### 5.2 Árvore (74 subcategorias)

| # | Categoria (`slug`) | Subcategorias (`slug`) |
| --- | --- | --- |
| 1 | Bolos e tortas (`bolos-e-tortas`) | Bolos simples (`bolos-simples`), Bolos recheados e cobertos (`bolos-recheados-e-cobertos`), Bolos de festa (`bolos-de-festa`), Bolos de pote (`bolos-de-pote`), Tortas doces (`tortas-doces`), Tortas salgadas (`tortas-salgadas`), Cheesecakes (`cheesecakes`) |
| 2 | Carnes (`carnes`) | Bovina (`bovina`), Suína (`suina`), Assados e churrasco (`assados-e-churrasco`), Carne moída (`carne-moida`), Carnes de panela (`carnes-de-panela`), Embutidos e linguiças (`embutidos-e-linguicas`) |
| 3 | Aves (`aves`) | Frango assado (`frango-assado`), Frango frito e empanado (`frango-frito-e-empanado`), Frango de panela (`frango-de-panela`), Peito de frango (`peito-de-frango`), Frango desfiado (`frango-desfiado`), Frango cremoso (`frango-cremoso`), Peru e chester (`peru-e-chester`) |
| 4 | Peixes e frutos do mar (`peixes-e-frutos-do-mar`) | Peixes assados (`peixes-assados`), Peixes fritos (`peixes-fritos`), Moquecas (`moquecas`), Camarão (`camarao`), Lula e polvo (`lula-e-polvo`), Mariscos (`mariscos`), Bacalhau (`bacalhau`) |
| 5 | Saladas e molhos (`saladas-e-molhos`) | Saladas verdes (`saladas-verdes`), Saladas de legumes (`saladas-de-legumes`), Saladas com proteína (`saladas-com-proteina`), Saladas de massa e grãos (`saladas-de-massa-e-graos`), Molhos para salada (`molhos-para-salada`), Molhos quentes (`molhos-quentes`), Molhos para carnes (`molhos-para-carnes`), Maioneses e pastas (`maioneses-e-pastas`) |
| 6 | Sopas (`sopas`) | Caldos (`caldos`), Sopas cremosas (`sopas-cremosas`), Sopas de legumes (`sopas-de-legumes`), Sopas com carne (`sopas-com-carne`), Sopas leves (`sopas-leves`) |
| 7 | Massas (`massas`) | Macarrão ao molho (`macarrao-ao-molho`), Lasanhas e gratinados (`lasanhas-e-gratinados`), Massas recheadas (`massas-recheadas`), Massas caseiras (`massas-caseiras`), Molhos para massa (`molhos-para-massa`), Nhoque (`nhoque`), Massas frias (`massas-frias`) |
| 8 | Bebidas (`bebidas`) | Sucos (`sucos`), Sucos detox (`sucos-detox`), Vitaminas e smoothies (`vitaminas-e-smoothies`), Chás (`chas`), Bebidas quentes (`bebidas-quentes`), Bebidas geladas e cremosas (`bebidas-geladas-e-cremosas`), Drinks sem álcool (`drinks-sem-alcool`), Drinks com álcool (`drinks-com-alcool`) |
| 9 | Doces e sobremesas (`doces-e-sobremesas`) | Brigadeiros e docinhos (`brigadeiros-e-docinhos`), Trufas e bombons (`trufas-e-bombons`), Pudins e flans (`pudins-e-flans`), Mousses (`mousses`), Sorvetes e geladinhos (`sorvetes-e-geladinhos`), Doces de colher (`doces-de-colher`), Pavês e sobremesas geladas (`paves-e-sobremesas-geladas`), Doces regionais (`doces-regionais`), Panetones e chocotones (`panetones-e-chocotones`) |
| 10 | Lanches (`lanches`) | Sanduíches (`sanduiches`), Salgados assados (`salgados-assados`), Salgados fritos (`salgados-fritos`), Pães e recheios (`paes-e-recheios`), Pizzas (`pizzas`), Lanches rápidos (`lanches-rapidos`) |
| 11 | Alimentação saudável (`alimentacao-saudavel`) | Receitas leves (`receitas-leves`), Fit e low carb (`fit-e-low-carb`), Poucos ingredientes (`poucos-ingredientes`), Refeições completas (`refeicoes-completas`) |

Regras:

- Subcategoria nova é criada por migration (seed idempotente), nunca pelo agente.
- O agente só escolhe subcategorias ativas (`active = true`) **e** habilitadas para a fase em vigor (`agent_enabled = true`).
- Em "Alimentação saudável" e "Sucos detox", o conteúdo descreve ingredientes e preparo, sem alegações de saúde.

### 5.3 Nível de risco e fase de entrada

Critério: risco de a receita causar dano se houver erro (cozimento insuficiente de carne, ave e peixe, ovo cru, fritura, álcool) ou de gerar alegação de saúde indevida.

| Nível | Fase em que pode ser publicado | Subcategorias |
| --- | --- | --- |
| `low` (4) | Fase 1 em diante | `bolos-simples`, `brigadeiros-e-docinhos`, `trufas-e-bombons`, `doces-de-colher` |
| `medium` (43) | Fase 2 em diante | `bolos-recheados-e-cobertos`, `bolos-de-festa`, `bolos-de-pote`, `tortas-doces`, `tortas-salgadas`, `cheesecakes`, `saladas-verdes`, `saladas-de-legumes`, `saladas-de-massa-e-graos`, `molhos-para-salada`, `molhos-quentes`, `molhos-para-carnes`, `caldos`, `sopas-cremosas`, `sopas-de-legumes`, `sopas-leves`, as 7 de `massas`, `sucos`, `vitaminas-e-smoothies`, `chas`, `bebidas-quentes`, `bebidas-geladas-e-cremosas`, `drinks-sem-alcool`, `pudins-e-flans`, `mousses`, `sorvetes-e-geladinhos`, `paves-e-sobremesas-geladas`, `doces-regionais`, `panetones-e-chocotones`, `sanduiches`, `salgados-assados`, `paes-e-recheios`, `pizzas`, `lanches-rapidos`, `receitas-leves`, `poucos-ingredientes`, `refeicoes-completas` |
| `high` (27) | Fase 3 (adiada) | As 6 de `carnes`, as 7 de `aves`, as 7 de `peixes-e-frutos-do-mar`, `saladas-com-proteina`, `maioneses-e-pastas`, `sopas-com-carne`, `sucos-detox`, `drinks-com-alcool`, `salgados-fritos`, `fit-e-low-carb` |

Observações:

- `mousses` e `cheesecakes` envolvem ovo cru ou laticínio perecível; dependem da base de segurança curada (`config/seguranca.json`) e da regra "sinal de risco sem informação de segurança rejeita a pauta".
- Subcategorias `high` incluem as que exigem cuidados de cozimento (carnes, aves, peixes), as que usam ovo cru (maioneses), fritura e álcool, e as que tendem a gerar alegações de saúde.
- A tabela é ponto de partida e pode ser ajustada por migration, sem alterar o agente.

---

## 6. Facetas e tags

### 6.1 Ocasião

Slugs iniciais: `festas`, `aniversario`, `carnaval`, `quaresma`, `pascoa`, `dia-das-maes`, `festa-junina`, `dia-dos-namorados`, `dia-dos-pais`, `dia-das-criancas`, `natal`, `ano-novo`.

### 6.2 Dieta

| Etiqueta | Situação |
| --- | --- |
| `vegetariana`, `vegana` | Habilitadas. Aplicadas por código, somente se todos os ingredientes resolvidos forem compatíveis |
| `sem-gluten`, `sem-lactose` | **Reservadas e desabilitadas** nas Fases 1 e 2. Para pessoas celíacas ou alérgicas, a etiqueta é alegação de saúde, e a contaminação cruzada não é controlável. A lista de alérgenos continua exibida |

Ingrediente de rótulo variável (chocolate, achocolatado, fermento, aromatizante, molhos industrializados) bloqueia qualquer etiqueta de dieta.

### 6.3 Dificuldade

Valores do site: `Fácil`, `Média`, `Difícil`. **Calculada por código**, não pelo modelo:

| Nível | Critério |
| --- | --- |
| Fácil | Até 8 passos e nenhuma técnica sensível |
| Média | De 9 a 15 passos, ou uma técnica de atenção ao ponto (ganache, creme, massa recheada) |
| Difícil | Mais de 15 passos (o limite de passos do contrato é 20), ou técnica sensível (massa fermentada, merengue estável, caramelo, têmpera de chocolate) |

As técnicas sensíveis são sinalizadas na ficha de pesquisa (`tecnica_flags`) a partir de um vocabulário controlado.

### 6.4 Coleções

`chocolate`, `datas-especiais`, `festas-e-buffet`, `receitas-rapidas`. Um conteúdo pode estar em várias coleções.

### 6.5 Tags livres

- O agente procura tag existente (inclusive por sinônimo) e só cria nova dentro das regras.
- Regras: minúsculas, até 40 caracteres, slug sem acento, sem repetir slug de categoria, subcategoria, ocasião, dieta ou coleção.
- Até 12 tags por conteúdo.

### 6.6 Armazenamento das facetas

| Faceta | Armazenamento |
| --- | --- |
| Ocasião, dieta, coleção | Tabela `tags` com `kind` (`topic`, `occasion`, `diet`, `collection`), ligada por `recipe_tags` e `article_tags` |
| Dificuldade | Coluna `difficulty` na receita |
| Alérgenos | Coluna `allergens`, derivada dos ingredientes (seção 7) |

A coluna `recipes.tags` (array de texto) continua existindo durante a transição e é mantida em sincronia (seção 15).

---

## 7. Ingredientes e alérgenos

### 7.1 Catálogo de ingredientes

Cada ingrediente de uma receita é resolvido contra um catálogo, o que permite consultar, corrigir e recalcular em lote (por exemplo, achar todas as receitas com um ingrediente cuja conversão estava errada).

| Tabela | Colunas principais |
| --- | --- |
| `ingredients` | `id`, `slug` (único), `name`, `kind` (açúcares, laticínios, chocolates e cacau, farinhas e amidos, gorduras, ovos, frutas, castanhas e sementes, aromas, outros), `canonical_unit` (`g`, `ml` ou `un`), `grams_per_unit` (nulo), `conversions` (json: xícara, colher de sopa, colher de chá para g ou ml), `needs_label_check` (booleano), `active` |
| `ingredient_aliases` | `alias` (único), `ingredient_id` |
| `allergens` | `id`, `slug`, `name`, `source` (`official` ou `to_confirm`) |
| `ingredient_allergens` | `ingredient_id`, `allergen_id`, `relation` (`contains` ou `may_contain`) |

`needs_label_check` marca ingredientes industrializados de composição variável (chocolates, coberturas, achocolatado, fermento, aromatizantes, molhos prontos). Esses ingredientes geram o aviso "confira o rótulo" e bloqueiam etiquetas de dieta.

### 7.2 Resolução e vocabulário fechado

| Fase | Regra |
| --- | --- |
| 1 | **Vocabulário fechado.** Todo ingrediente precisa casar com o catálogo por nome exato ou alias. Ingrediente desconhecido rejeita a pauta, e o catálogo cresce por seed |
| 2 em diante | Ingrediente desconhecido é aceito como `unresolved`, com alérgeno "verificar rótulo" e sem nenhuma etiqueta de dieta |

A busca aproximada (fuzzy) só vale com similaridade alta (valor inicial 0,92) e mesma classe (`kind`); o resultado é registrado.

### 7.3 Alérgenos

Lista inicial, **a confirmar na norma vigente de rotulagem da Anvisa** antes de produção:

| Slug | Cobre | `source` |
| --- | --- | --- |
| `gluten` | Trigo, centeio, cevada, aveia e híbridos | official |
| `leite` | Leite de mamíferos e derivados | official |
| `ovos` | Ovos e derivados | official |
| `soja` | Soja e derivados | official |
| `amendoim` | Amendoim e derivados | official |
| `castanhas` | Amêndoa, avelã, castanha-de-caju, castanha-do-brasil, macadâmia, noz, pecã e pistache | official |
| `peixes` | Peixes e derivados | official |
| `crustaceos` | Camarão, caranguejo, lagosta e similares | official |
| `latex-natural` | Látex natural (consta na lista de declaração; irrelevante na maioria das receitas) | to_confirm |
| `moluscos` | Lula, polvo, mariscos (incluído por precaução) | to_confirm |

### 7.4 Cálculo por código

1. Cada item da receita resolve para um ingrediente do catálogo.
2. A união dos alérgenos `contains` de todos os itens forma `allergens`.
3. A união dos `may_contain` (e dos itens com `needs_label_check`) forma `allergen_traces`.
4. Ingrediente `unresolved` acrescenta o aviso "verificar rótulo" e nenhuma etiqueta de dieta.
5. O modelo **não** define alérgenos. Se a saída do modelo divergir, o valor calculado prevalece e a divergência é registrada.
6. Dieta e alérgeno podem coexistir: "vegetariana" com ovos, por exemplo. Nenhuma regra de dieta remove um alérgeno da lista.

### 7.5 Exibição

Toda receita exibe o aviso de alérgenos no **final** da página (texto em `01-ARQUITETURA.md`, seção 8.5). Quando há alérgenos detectados, a lista aparece em destaque junto do aviso. A decisão de consumo e a compra dos produtos são de responsabilidade do leitor.

---

## 8. Esquema de dados

Convenção: nomes em inglês, `snake_case` neste documento. Os nomes finais seguem a convenção do Drizzle do site. Tipos de chave (serial ou uuid) seguem o padrão já usado em `recipes`.

### 8.1 `categories`

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | chave | |
| `slug` | texto | Único em todos os níveis; `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `name` | texto | Nome de exibição |
| `parent_id` | chave, nula | Nula = categoria; preenchida = subcategoria. Subcategoria não pode ser pai |
| `sort_order` | inteiro | Ordem de exibição |
| `active` | booleano | Padrão verdadeiro |
| `risk_level` | texto, nulo | `low`, `medium` ou `high`; obrigatório em subcategorias |
| `agent_enabled` | booleano | Padrão falso; só verdadeiro quando a fase em vigor permite |
| `description` | texto, nulo | Texto de apoio e SEO |
| `seo_title`, `seo_description` | texto, nulos | Ver `05-SEO.md` |

### 8.2 `tags`, `recipe_tags`, `article_tags`

| Tabela | Colunas principais |
| --- | --- |
| `tags` | `id`, `slug` (único), `name`, `kind` (`topic`, `occasion`, `diet`, `collection`), `enabled` (padrão verdadeiro; falso nas etiquetas reservadas) |
| `recipe_tags` | `recipe_id` (FK), `tag_id` (FK), chave composta |
| `article_tags` | `article_id` (FK), `tag_id` (FK), chave composta |

### 8.3 `recipes` (existente; colunas atuais mantidas)

Colunas atuais (da auditoria): `title`, `slug`, `excerpt`, `category`, `cover_image_url`, `cover_image_alt`, `cover_image_variants`, `prep_time_min`, `cook_time_min`, `servings`, `difficulty`, `ingredients`, `steps`, `tags`, `tips`, `storage_notes`, `faq`, `image_prompt`, `status`, `published_at`, `ai_model`, `generation_meta`.

**Colunas novas (aditivas; o site será atualizado para suportá-las):**

| Coluna | Tipo | Motivo |
| --- | --- | --- |
| `category_id`, `subcategory_id` | chaves, nulas | Substituem o texto `category` depois do backfill |
| `intro` | texto, nulo | Introdução curta |
| `rest_time_min` | inteiro, nulo | Descanso, geladeira, fermentação (evita mostrar "20 min" para receita de horas) |
| `yield_label` | texto, nulo | Rendimento legível, por exemplo "30 brigadeiros" |
| `allergens`, `allergen_traces` | listas de texto | Calculados (seção 7.4) |
| `diet`, `occasions` | listas de texto | Espelho das tags `kind = diet` e `kind = occasion`, para filtro rápido |
| `author_id` | chave | Autor (padrão: Equipe Chocolícia) |
| `cover_image_source` | json, nulo | Proveniência da imagem (seção 8.8) |
| `cover_image_is_ai` | booleano | Verdadeiro quando a imagem foi gerada por IA |
| `updated_at` | data e hora | Atualização |

O contrato do agente não tem campo de armazenamento escrito pelo modelo: o prazo de conservação, quando existe, vem da base curada `config/seguranca.json` e entra em `storage_notes` por código.

### 8.4 `recipe_ingredients`

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | chave | |
| `recipe_id` | FK, `ON DELETE CASCADE` | |
| `section_position`, `position` | inteiros | Ordem da seção e do item |
| `section_name` | texto | "Massa", "Recheio" etc. |
| `ingredient_id` | FK, nula | Nula quando `unresolved` (Fases 2+) |
| `display_name`, `display_quantity`, `display_unit`, `note` | texto | Como o leitor vê (decimais com vírgula, frações com barra) |
| `quantity_canonical` | numérico, nulo | Quantidade em `g`, `ml` ou `un` |
| `canonical_unit` | texto, nulo | `g`, `ml` ou `un` |

O JSON `recipes.ingredients` continua existindo para o site atual; `recipe_ingredients` é a forma consultável e é escrita pelo site na criação.

### 8.5 `articles`

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | chave | |
| `type` | texto | `technique`, `tip` ou `feature` |
| `slug` | texto | Único por tipo |
| `title`, `excerpt` | texto | 5 a 180; 20 a 160 caracteres |
| `category_id`, `subcategory_id` | chaves | Área culinária do assunto |
| `body_md` | texto | Corpo em markdown |
| `structured` | json, nulo | Campos específicos do tipo (seção 10) |
| `cover_image_*`, `image_prompt` | como em `recipes` | Inclui `cover_image_source` e `cover_image_is_ai` |
| `sources` | json | Obrigatório em `feature` e `technique` |
| `reading_time_min` | inteiro | Calculado |
| `author_id` | chave | Padrão: Equipe Chocolícia |
| `status`, `published_at`, `updated_at` | | `draft`, `processing`, `published`, `archived` |
| `ai_model`, `generation_meta` | texto, json | |

### 8.6 `content_relations`

Relacionamentos com **integridade referencial** (D-07):

```sql
CREATE TABLE content_relations (
  id               serial PRIMARY KEY,
  from_recipe_id   integer REFERENCES recipes(id)  ON DELETE CASCADE,
  from_article_id  integer REFERENCES articles(id) ON DELETE CASCADE,
  to_recipe_id     integer REFERENCES recipes(id)  ON DELETE CASCADE,
  to_article_id    integer REFERENCES articles(id) ON DELETE CASCADE,
  relation_type    text NOT NULL
    CHECK (relation_type IN ('uses_technique','see_also','part_of_feature','variation_of')),
  CHECK (num_nonnulls(from_recipe_id, from_article_id) = 1),
  CHECK (num_nonnulls(to_recipe_id, to_article_id) = 1),
  -- Em PostgreSQL 15 ou superior:
  UNIQUE NULLS NOT DISTINCT (from_recipe_id, from_article_id, to_recipe_id, to_article_id, relation_type)
);
-- Alternativa em versões anteriores (NULL é distinto em índices únicos):
-- CREATE UNIQUE INDEX content_relations_uq ON content_relations (
--   COALESCE(from_recipe_id, 0), COALESCE(from_article_id, 0),
--   COALESCE(to_recipe_id, 0),   COALESCE(to_article_id, 0), relation_type);
```

A versão do PostgreSQL do Neon deve ser conferida antes de escolher a variante.

### 8.7 `authors` e `content_reports`

| Tabela | Colunas principais |
| --- | --- |
| `authors` | `id`, `slug`, `name`, `role`, `bio`, `active`. Seed: `equipe-chocolicia` ("Equipe Chocolícia") |
| `content_reports` | `id`, `recipe_id` (FK, nula), `article_id` (FK, nula), `reason` (`seguranca`, `alergia`, `medida`, `erro`, `outro`), `message`, `contact` (nulo), `status` (`new`, `reviewed`, `actioned`, `dismissed`), `created_at`, `handled_at`. `CHECK (num_nonnulls(recipe_id, article_id) = 1)` |

### 8.8 Proveniência da imagem (`cover_image_source`)

```json
{
  "kind": "stock",
  "provider": "pexels",
  "source_page_url": "https://...",
  "source_image_url": "https://...",
  "author": "Nome do autor",
  "license": "licença do provedor",
  "attribution_text": "Foto: Autor / Provedor",
  "retrieved_at": "2026-11-06T08:04:00-03:00"
}
```

Para imagem de IA: `{"kind": "ai", "model": "gpt-image-1", "prompt_hash": "..."}`. A legenda exibida segue `01-ARQUITETURA.md`, seção 8.5.

### 8.9 Banco do agente

| Tabela | Colunas principais |
| --- | --- |
| `agent_runs` | `run_id` (uuid, chave), `started_at`, `finished_at`, `phase`, `result`, `git_sha`, `prompt_version` |
| `agent_generations` | `id`, `run_id` (FK), `content_type`, `topic`, `topic_slug`, `subcategory_slug`, `status`, `rejection_code`, `rejection_detail`, `site_content_id`, `site_content_slug`, `model`, `prompt_version`, `attempts`, `duration_ms`, `cost_usd`, `sources` (json), `created_at`, `updated_at` |
| `agent_topic_queue` | `id`, `content_type`, `topic`, `topic_slug` (único), `subcategory_slug`, `priority`, `origin` (`calendar`, `coverage`, `search_console`, `manual`), `earliest_date`, `status` (`queued`, `taken`, `done`, `rejected`) |
| `agent_costs` | `day`, `component` (`llm`, `search`, `image`), `amount_usd`, `units` |

```sql
-- Em agent_generations
UNIQUE (content_type, topic_slug)
CHECK (status IN ('planned','generated','rejected','sent','published','unpublished','error'))
CHECK (content_type IN ('recipe','technique','tip','feature'))
```

Sem chaves estrangeiras para o banco do site. A cobertura por subcategoria vem de um endpoint de leitura do site (`06-INTEGRACAO.md`).

---

## 9. Padrão de dados da receita

### 9.1 Ingredientes

| Regra | Detalhe |
| --- | --- |
| Seções | Uma por parte da receita, na ordem de uso |
| `quantity` | Texto com número; decimais com vírgula ("1,5"), frações com barra ("1/2") |
| `unit` | Vocabulário controlado (abaixo) |
| `note` | Estado ou preparo ("peneirada", "em temperatura ambiente") |
| Quantidade canônica | Calculada por código a partir do catálogo e de `conversions` |
| Ingrediente estrutural | Sempre com quantidade e unidade |

Unidades aceitas: `g`, `kg`, `ml`, `l`, `xícara`, `colher de sopa`, `colher de chá`, `unidade`, `pitada`, `dente`, `fatia`, `lata`, `caixinha`, `maço`, `ramo`. Unidade fora da lista rejeita a receita.

### 9.2 Tempos e rendimento

| Campo | Significado |
| --- | --- |
| `prep_time_min` | Trabalho ativo (1 a 1440) |
| `cook_time_min` | Forno ou fogo (0 a 1440) |
| `rest_time_min` | Descanso, geladeira, fermentação |
| `servings` | Inteiro de 1 a 500 |
| `yield_label` | "12 porções", "30 brigadeiros", "1 bolo de 20 cm" |

Tempos e rendimento são **conferidos por código** contra os passos e as quantidades (`08-VALIDACAO.md`).

### 9.3 Passos, dicas e perguntas frequentes

- Passos: de 4 a 20, uma ação principal por passo.
- Dicas: até 5; a primeira é a "Dica extra", apenas quando a ficha de pesquisa traz base para ela.
- Perguntas frequentes: opcionais, somente a partir de `perguntas_comuns` da ficha.

### 9.4 Imagem

O agente envia a **origem** de uma imagem de banco de imagens (ou, em último caso, o `image_prompt`). O site baixa, processa, armazena e preenche URL, variantes e proveniência (D-09).

---

## 10. Padrão de dados dos artigos

| Tipo | Estrutura de `body_md` | `structured` | Tamanho inicial |
| --- | --- | --- | --- |
| Dica (`tip`) | Resposta direta, motivo, passos, como evitar | `{"direct_answer": "..."}` | 150 a 400 palavras |
| Técnica (`technique`) | Introdução, o que é preciso, passo a passo, erros comuns, variações | `{"materials": [...], "steps": [...], "common_errors": [...], "variations": [...]}` | 600 a 1200 palavras |
| Matéria (`feature`) | Lide, seções com subtítulos, fontes, "para colocar em prática" | `{"lede": "...", "sections": [...]}` | 900 a 1800 palavras |

Regras: toda matéria traz `sources` e uma seção "Fontes consultadas" visível; técnicas só trazem valores numéricos de segurança vindos de fonte técnica ou oficial (`02-PESQUISA.md`, seção 3.2).

---

## 11. Autoria e avisos ao leitor

- **Assinatura:** "Equipe Chocolícia" em todos os conteúdos (D-13). Um único autor, `equipe-chocolicia`, definido pelo sistema (nunca pelo modelo).
- **Avisos:** os textos e as posições estão em `01-ARQUITETURA.md`, seção 8.5 (aviso de IA no topo, aviso de alérgenos no final, legenda de imagem ilustrativa). Os textos ficam em um ponto único de configuração do site, editáveis sem alterar o conteúdo das receitas.
- **Bebidas alcoólicas:** receitas de `drinks-com-alcool` (Fase 3) exigem aviso adicional de venda e consumo proibidos para menores de 18 anos (`07-PUBLICACAO.md`).

---

## 12. Estados e ciclo de vida

| Estado | Significado |
| --- | --- |
| `draft` | Salvo e não público. É o padrão da API e o estado da Fase 0 |
| `processing` | Interno: o site está baixando ou gerando a imagem. Nunca público |
| `published` | Público. O agente grava nele a partir da Fase 1, com escopo `publish` |
| `archived` | Retirado do ar, mantido no banco (despublicação) |

Transições: o agente cria em `draft` ou, com escopo `publish`, em `processing` e depois `published`. Despublicar (`published` para `archived`) é ação de administrador ou do disjuntor automático (`07-PUBLICACAO.md`). Falha de imagem mantém o conteúdo em `draft` com motivo registrado.

Regras:

- O slug **não muda** depois de publicado; se mudar, o site mantém redirecionamento.
- Toda alteração atualiza `updated_at`.
- O agente não edita conteúdo já publicado na primeira versão.

---

## 13. Slugs e URLs

- Slug da receita: gerado a partir do título; regex da API `^[a-z0-9]+(?:-[a-z0-9]+)*$`; de 3 a 180 caracteres.
- O `topic_slug` (da pauta) é diferente do slug da receita e é a chave de idempotência (D-18).
- Colisão de slug: a API responde `409`; o agente confirma por `GET` antes de decidir.
- **URL canônica única por conteúdo**, independente das categorias. Padrão em `05-SEO.md`.

---

## 14. Regras de integridade

| Regra | Onde é garantida |
| --- | --- |
| `subcategory_id` aponta para subcategoria ativa; `category_id` é a categoria dela | API e restrição no banco |
| Subcategoria precisa estar habilitada para a fase em vigor (`agent_enabled`) | API, para o token do agente |
| `risk_level` obrigatório em subcategorias | CHECK |
| Tags existem ou são criadas dentro das regras da seção 6.5; tags com `enabled = false` são recusadas | API |
| `allergens` e `diet` só aceitam valores dos catálogos | API |
| Ingrediente resolvido no catálogo (Fase 1) | API e agente |
| Relacionamento tem exatamente uma origem e um destino | CHECK no banco |
| Slug único; chave de idempotência única | Índices únicos |
| Remoção de categoria com conteúdo é bloqueada (desativar em vez de apagar) | Chave estrangeira sem cascata |
| Seed e migrations idempotentes por slug | Scripts (seção 15) |

---

## 15. Plano de migrations e compatibilidade

**Pré-requisitos:** D-01 fechada e D-02 aprovada. Nenhuma migration roda antes disso. Toda migration é aditiva e reversível e executa primeiro em um branch de teste do Neon.

| Fase | O que muda | Risco |
| --- | --- | --- |
| 0 | Backup do banco do site. Conferir o `DATABASE_URL` de produção e a versão do PostgreSQL | Nenhum |
| 1 | Criar `categories` e fazer o seed idempotente (seção 5), com `risk_level` e `agent_enabled = false` | Baixo |
| 2 | Adicionar colunas novas em `recipes` (seção 8.3), ampliar a lista de categorias aceita pela API (as 11 novas **mais** as 7 antigas, durante a transição) e mudar o padrão de `status` para `draft`, depois de confirmar que os chamadores atuais enviam `status` explícito | Médio |
| 3 | Criar `tags`, `recipe_tags`, `authors` (seed da Equipe Chocolícia) e fazer o backfill das tags a partir de `recipes.tags` | Médio |
| 4 | Criar `ingredients`, `ingredient_aliases`, `allergens`, `ingredient_allergens` e seedar o catálogo inicial de confeitaria. Criar `recipe_ingredients` | Médio |
| 5 | Backfill de `category_id` e `subcategory_id` nas receitas existentes (tabela abaixo) | Médio |
| 6 | Criar `articles`, `article_tags`, `content_relations` e `content_reports` | Baixo |
| 7 | Criar o banco do agente (`agent_*`) | Baixo |
| 8 | Habilitar `agent_enabled` das subcategorias `low` ao entrar na Fase 0; passar o site a exibir por `category_id`; só então retirar as 7 categorias antigas do enum | Médio |

Seed idempotente (exemplo):

```sql
INSERT INTO categories (slug, name, parent_id, sort_order, risk_level, agent_enabled)
VALUES ('bolos-e-tortas', 'Bolos e tortas', NULL, 1, NULL, false)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (slug, name, parent_id, sort_order, risk_level, agent_enabled)
SELECT 'bolos-simples', 'Bolos simples', id, 1, 'low', false
FROM categories WHERE slug = 'bolos-e-tortas'
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
      sort_order = EXCLUDED.sort_order, risk_level = EXCLUDED.risk_level;
```

### Correspondência das 7 categorias atuais do site

| Categoria atual | Nova categoria e subcategoria | Observação |
| --- | --- | --- |
| Bolos | `bolos-e-tortas` / `bolos-simples` | Reclassificar por receita quando for recheado ou de festa |
| Brigadeiros e docinhos | `doces-e-sobremesas` / `brigadeiros-e-docinhos` | Direta |
| Tortas | `bolos-e-tortas` / `tortas-doces` | Direta |
| Sobremesas | `doces-e-sobremesas` / subcategoria a definir por receita | |
| Chocolates | `doces-e-sobremesas` / `trufas-e-bombons` e coleção `chocolate` | |
| Festas e buffet | Sem categoria direta: coleção `festas-e-buffet` e ocasião `festas` | A categoria principal sai do tipo de prato |
| Datas especiais | Sem categoria direta: coleção `datas-especiais` e a ocasião correspondente | A categoria principal sai do tipo de prato |

O backfill é um script que classifica por título e tags e gera uma lista de exceções para decisão pontual, uma única vez, sobre as receitas já publicadas. A quantidade de receitas existentes ainda precisa ser levantada.

---

## 16. Pendências

| Item | Observação |
| --- | --- |
| D-01 | Confirmar o banco definitivo antes de qualquer migration |
| Lista de alérgenos | Confirmar na norma vigente da Anvisa (látex natural e moluscos marcados `to_confirm`) |
| Versão do PostgreSQL no Neon | Define a variante do índice único (seção 8.6) |
| Catálogo inicial de ingredientes | Montar a lista de confeitaria da Fase 1, com conversões e alérgenos |
| Quantidade de receitas atuais | Levantar para dimensionar o backfill |
| Textos dos avisos | Revisar redação final (conteúdo em `01-ARQUITETURA.md`, seção 8.5) |
| Rate limit e limite diário de publicação | Detalhar em `06-INTEGRACAO.md` |

---

## 17. Relação com os outros documentos

| Documento | Relação |
| --- | --- |
| `01-ARQUITETURA.md` | Decisões, fases e avisos |
| `03-PROMPT-SISTEMA.md` | Esquemas de saída do modelo, que o adaptador converte para estas tabelas |
| `05-SEO.md` | `seo_title`, `seo_description`, URLs canônicas e dados estruturados |
| `06-INTEGRACAO.md` | Endpoints, campos novos da API e relacionamentos |
| `07-PUBLICACAO.md` | Estados, despublicação, denúncias e disjuntores |
| `08-VALIDACAO.md` | Integridade, alérgenos, catálogo e critérios de aprovação |
