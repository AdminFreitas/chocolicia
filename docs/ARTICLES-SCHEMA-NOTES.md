# Notas do schema editorial

## Fonte verificada

A estrutura foi lida sem escrita no projeto Neon `twilight-fire-47857051`, base `neondb`, branch `br-broad-resonance-b69vxtk2`. As colunas, tipos, defaults, restrições e índices foram consultados por metadados read-only. A listagem de tabelas da base também foi consultada.

## Divergências entre PR #7 e Neon

| Área                 | PR #7 / branch `feat/agent-articles`                          | Neon observado na branch indicada                                                                                                                           |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `articles.id`        | UUID com `defaultRandom()`                                    | UUID com default `gen_random_uuid()`; o relato do anexo que o descreve como inteiro autoincremental não corresponde a esta branch.                          |
| Colunas do artigo    | `type`, `body_md`, `tip_topic`, `subcategory_slug`, `payload` | `article_type`, `content`, `topic_id` UUID e `category_id` UUID; não existem `body_md`, `tip_topic`, `subcategory_slug` ou `payload`.                       |
| `article_type`       | Campo `type` varchar sem o CHECK real                         | `article_type` varchar com CHECK `dica`, `tecnica`, `materia`.                                                                                              |
| `status` do artigo   | Enum Drizzle `article_status` com `draft` e `published`       | `varchar` com CHECK `draft`, `published`, `archived`; não é enum PostgreSQL.                                                                                |
| Taxonomia            | Sem as tabelas relacionais usadas pelo Neon                   | `categories` e `tip_topics`, ambas com UUID, slug UNIQUE, timestamps e índices; `articles` referencia-as por UUID.                                          |
| Tags                 | Sem relação editorial própria                                 | `article_tags` com UUID, `article_id` FK CASCADE e UNIQUE (`article_id`, `tag`).                                                                            |
| Imagens associadas   | O PR #7 só declara URL/alt de capa em `articles`              | `article_images` guarda diretamente `image_url`, `alt_text`, `caption` e `position`, com FK CASCADE para `articles`.                                        |
| Tabela `images`      | Não modelada                                                  | Não existe em nenhum schema da base consultada. Não foi criada nem é modelada pelo Drizzle; a API grava imagens associadas diretamente em `article_images`. |
| Índices e restrições | Índices reduzidos e diferentes                                | Foram definidos no Drizzle os nomes e as relações observadas: índices de categoria/tópico/status/data, chaves únicas e FKs com as ações reais.              |

## Tabelas modeladas

O Drizzle reproduz as cinco tabelas encontradas: `categories`, `tip_topics`, `articles`, `article_images` e `article_tags`. As tabelas existentes `users`, `s3_files`, `orders` e `recipes` foram mantidas no ficheiro. `images` é a única tabela mencionada na tarefa que não existe na branch Neon confirmada, portanto não há schema real dessa tabela que possa ser reproduzido com segurança.

## Restrições / mecanismo

- `articles.article_type` e `articles.status` são `varchar` sujeitos aos CHECKs `articles_type_check` e `articles_status_check`, não enums.
- `categories.parent_id` referencia `categories.id` com `ON DELETE RESTRICT`; `categories_not_own_parent` impede uma categoria de ser o seu próprio pai.
- `articles.category_id` e `articles.topic_id` usam `ON DELETE SET NULL`.
- `article_images.article_id` e `article_tags.article_id` usam `ON DELETE CASCADE`.
- `categories.slug`, `tip_topics.slug`, `articles.slug` e o par (`article_id`, `tag`) são únicos.

Não foram executados `drizzle-kit generate`, `drizzle-kit migrate`, `drizzle-kit push`, nem qualquer escrita no Neon.
