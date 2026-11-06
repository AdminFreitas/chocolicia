# 05 - SEO e Dados Estruturados

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia e site `chocolicia` |
| Versão do documento | 0.1 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md`, `03-PROMPT-SISTEMA.md`, `04-ESTRUTURA-CONTEUDO.md` |
| Alimenta | `06-INTEGRACAO.md` (campos e renderização), `08-VALIDACAO.md` (verificações SEO e de publicação) |

---

## 1. Objetivo e princípios

Definir como o conteúdo gerado pelo agente é preparado para ser encontrado, entendido e indexado por buscadores, **sem comprometer a utilidade para o leitor**.

1. **Utilidade antes de otimização.** Cada página deve resolver a necessidade do leitor melhor ou de forma mais clara que uma variação genérica do mesmo tema.
2. **Nada de manipulação.** Sem repetição forçada de palavra-chave, sem páginas feitas só para capturar variações de busca, sem avaliações ou dados inventados.
3. **Honestidade nos dados estruturados.** O marcador descreve apenas o que a página realmente mostra e o que o sistema sabe.
4. **O site renderiza; o agente fornece os insumos.** Marcação, canonical, sitemap e links internos são responsabilidade do site.
5. **Qualidade antes de volume.** A cadência de publicação é baixa e controlada (`07-PUBLICACAO.md`).

---

## 2. Risco de conteúdo gerado em escala

A política de spam do Google define **abuso de conteúdo em escala** (scaled content abuse) como a geração de muitas páginas com o objetivo principal de manipular o ranking, e não de ajudar o leitor. A política vale para qualquer método de produção (IA, pessoas ou combinação), e a orientação do Google sobre IA generativa diz que o uso de IA é aceitável, mas gerar muitas páginas sem agregar valor pode violar a política. Em 15 de maio de 2026 o Google esclareceu que as políticas de spam também valem para respostas generativas na Busca. O texto vigente deve ser conferido na documentação do Google Search Central antes da produção.

Como o agente publica conteúdo automaticamente, as medidas abaixo são parte do projeto:

| Medida | Como se aplica |
| --- | --- |
| Cadência baixa | Fase 1: no máximo 1 receita por dia (`config/cadencia.json`); ampliação só por métricas |
| Uma página por intenção | O planejador rejeita pauta equivalente a conteúdo existente (título, ingredientes e subcategoria semelhantes). Não se criam páginas para cada variação de busca |
| Valor próprio por página | Proporções cruzadas de várias fontes, substituições, sinais de ponto, lista de alérgenos, prazo de conservação vindo de base curada, passos claros e imagem tratada |
| Páginas mínimas | Receita abaixo dos mínimos de conteúdo é rejeitada, não publicada fina (`08-VALIDACAO.md`) |
| Transparência | Aviso de criação com apoio de IA, assinatura "Equipe Chocolícia", página "Como criamos nossas receitas" |
| Monitoramento | Taxa de páginas "rastreadas, mas não indexadas" e ações manuais no Search Console, com regra de pausa (seção 12) |
| Poda | Conteúdo sem impressões após um período longo é candidato a melhoria ou arquivamento, decidido por regra |

---

## 3. Quem faz o quê

| Tema | Agente | Site |
| --- | --- | --- |
| Título (`title`) e `excerpt` | Gera dentro das metas da seção 5 | Monta `<title>`, meta description, Open Graph |
| Slug | Sugere a partir do título | Valida e garante unicidade |
| Texto alternativo da imagem | Gera (a partir da receita) | Renderiza |
| Escolha da imagem | Busca em bancos de imagens, valida critérios | Baixa, processa, gera as variantes e as proporções |
| Tags e palavras-chave | Propõe | Persiste e usa em páginas de tag |
| Temas relacionados | Propõe (`temas_relacionados`) | Cria os relacionamentos e os blocos de links internos |
| Dados estruturados (JSON-LD) | Não gera | Gera a partir dos campos salvos |
| Canonical, sitemap, robots, breadcrumbs, paginação | Não atua | Responsável |
| Páginas de autor, "Sobre" e transparência | Não atua | Responsável |

---

## 4. URLs e canonicalização

A listagem de receitas já existe em `/receitas`. A estrutura atual de URLs das receitas individuais precisa ser confirmada antes de adotar o padrão abaixo (pendência), e qualquer mudança exige redirecionamento 301 dos endereços atuais.

### 4.1 Padrão proposto

| Página | URL |
| --- | --- |
| Receita | `/receitas/{slug}` |
| Categoria | `/receitas/categoria/{categoria}` |
| Subcategoria | `/receitas/categoria/{categoria}/{subcategoria}` |
| Dieta, ocasião, coleção | `/receitas/dieta/{slug}`, `/receitas/ocasiao/{slug}`, `/colecoes/{slug}` |
| Aprenda (índice e áreas) | `/aprenda`, `/aprenda/tecnicas`, `/aprenda/dicas`, `/aprenda/materias` |
| Artigo | `/aprenda/tecnicas/{slug}`, `/aprenda/dicas/{slug}`, `/aprenda/materias/{slug}` |
| Autor e transparência | `/equipe`, `/como-criamos-nossas-receitas` |

### 4.2 Regras

- **Uma URL canônica por conteúdo**, independente das categorias. A receita aparece em várias listagens, mas só existe em `/receitas/{slug}`.
- Todas as páginas declaram `rel="canonical"` para si mesmas (autorreferente).
- Um único host canônico (`www` ou domínio sem `www`), com redirecionamento 301 do outro. A escolha é pendência de configuração do domínio.
- Slug com letras minúsculas, números e hífens, sem acento, e sem mudança após a publicação.
- `lang="pt-BR"` em todas as páginas. `hreflang` não é necessário (um idioma).

---

## 5. Títulos, descrições e cabeçalhos

| Elemento | Meta | Regra |
| --- | --- | --- |
| `<title>` | De 35 a 65 caracteres no total | `{título} | Chocolícia`; se passar do limite, omite a marca |
| Título da receita (campo `title`) | De 40 a 65 caracteres (o contrato aceita de 5 a 180) | Específico, sem clickbait, sem caixa alta contínua, sem exclamação |
| Meta description (`excerpt`) | De 120 a 160 caracteres (o contrato exige no mínimo 20 e no máximo 160) | Diz o que é, para quem serve e um diferencial real. Sem promessa de saúde |
| `<h1>` | Igual ao título da receita | Um por página |
| `<h2>` | Ingredientes, Modo de preparo, Dicas, Conservação (quando houver), Perguntas frequentes (quando houver) | Ordem fixa |

Padrões de título por tipo:

| Tipo | Padrão |
| --- | --- |
| Receita | `{Prato} {qualificador útil}` (ex.: "Brigadeiro de colher cremoso com chocolate meio amargo") |
| Dica | A pergunta ou o problema ("Ganache talhou? Como recuperar") |
| Técnica | `Como {técnica}: passo a passo e erros comuns` |
| Matéria | Título informativo e específico |

---

## 6. Estrutura da página da receita

Ordem dos blocos (o aviso final de alérgenos é decisão registrada, D-14):

1. Título (`h1`) e assinatura "Equipe Chocolícia".
2. **Aviso de criação com apoio de IA** (curto, abaixo do título).
3. Imagem de capa com legenda ("Imagem ilustrativa"; "gerada por inteligência artificial" quando for o caso) e crédito quando a licença exigir.
4. Introdução curta e dados rápidos (preparo, cozimento, descanso, rendimento, dificuldade). Link "Ir para a receita".
5. Ingredientes (por seção).
6. Modo de preparo (passos numerados).
7. Dica extra (apenas se existir), conservação (apenas se vier da base curada) e perguntas frequentes (apenas se existirem na ficha).
8. Conteúdos relacionados (técnica usada, receitas parecidas).
9. **Aviso de alérgenos e rótulos** (final da página), com a lista de alérgenos detectados em destaque quando houver.

---

## 7. Dados estruturados (JSON-LD)

Formato recomendado: JSON-LD, gerado pelo site a partir dos campos salvos. Nada é escrito à mão no conteúdo.

### 7.1 Receita (`Recipe`)

A documentação do Google para receitas trata como obrigatórias as propriedades `name` e `image`, e como recomendadas, entre outras, `author`, `datePublished`, `description`, `keywords`, `prepTime`, `cookTime`, `totalTime`, `recipeCategory`, `recipeIngredient`, `recipeInstructions`, `recipeYield`, `aggregateRating` e `video`. Os requisitos devem ser conferidos na documentação vigente.

| Propriedade | Origem |
| --- | --- |
| `name` | `title` |
| `image` | Lista de imagens (idealmente nas proporções 1:1, 4:3 e 16:9; ver pendências) |
| `author` | `Organization` "Equipe Chocolícia" |
| `datePublished`, `dateModified` | `published_at`, `updated_at` |
| `description` | `excerpt` |
| `keywords` | Tags |
| `recipeCategory` | Nome da categoria |
| `prepTime`, `cookTime`, `totalTime` | Em formato ISO 8601; `totalTime` soma preparo, cozimento e descanso |
| `recipeYield` | `yield_label` (ou `servings`) |
| `recipeIngredient` | Uma linha por ingrediente, como o leitor vê |
| `recipeInstructions` | Lista de `HowToStep` (com `name` e `text`) |
| `suitableForDiet` | Só quando houver etiqueta de dieta aplicada (`vegetariana`, `vegana`) |

**Nunca incluir** sem dado real: `aggregateRating`, `review`, `nutrition` e `video`. O projeto não calcula nutrição, não tem avaliações de leitores nem vídeo na primeira versão.

Exemplo (valores ilustrativos):

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Brigadeiro de colher cremoso com chocolate meio amargo",
  "image": ["https://.../capa-1x1.jpg", "https://.../capa-4x3.jpg", "https://.../capa-16x9.jpg"],
  "author": {"@type": "Organization", "name": "Equipe Chocolícia", "url": "https://.../equipe"},
  "datePublished": "2026-11-06",
  "dateModified": "2026-11-06",
  "description": "Brigadeiro de colher macio e brilhante, com chocolate meio amargo e ponto fácil de acertar.",
  "keywords": "brigadeiro, chocolate, doce de colher",
  "recipeCategory": "Doces e sobremesas",
  "prepTime": "PT10M",
  "cookTime": "PT15M",
  "totalTime": "PT25M",
  "recipeYield": "8 porções",
  "recipeIngredient": ["395 g de leite condensado", "100 g de chocolate meio amargo picado"],
  "recipeInstructions": [
    {"@type": "HowToStep", "name": "Cozinhar", "text": "Leve ao fogo baixo e mexa sem parar..."}
  ]
}
```

### 7.2 Artigos (`Article`)

Dica, técnica e matéria usam `Article` com `headline`, `image`, `author` (Organização), `datePublished`, `dateModified` e `publisher`. Matérias incluem as fontes citadas no texto visível.

### 7.3 Navegação e listagens

- `BreadcrumbList` em todas as páginas internas: Início, Receitas, Categoria, Subcategoria, Receita.
- `WebSite` e `Organization` na página inicial.
- `ItemList` nas páginas de listagem, quando a página de resumo existir. Para o carrossel de receitas do Google, a página precisa listar todas as receitas da coleção (a listagem `/receitas` atende).

### 7.4 O que não se implementa

- **`HowTo`**: o Google deixou de exibir resultados enriquecidos de HowTo em 2023. Técnicas usam `Article`.
- **`FAQPage`**: os resultados enriquecidos de FAQ deixaram de aparecer na Busca (maio de 2026). A marcação não causa problema, mas não traz efeito visível; a primeira versão não a gera. Perguntas frequentes continuam visíveis no texto da página quando existirem.

### 7.5 Validação

Todo JSON-LD é validado em teste automático (JSON válido, propriedades obrigatórias presentes, sem campos proibidos) e conferido após a publicação (`08-VALIDACAO.md`, verificações de pós-publicação). A ferramenta de teste de resultados enriquecidos do Google serve para conferência manual eventual.

---

## 8. Imagens e SEO

| Tema | Regra |
| --- | --- |
| Texto alternativo | De 20 a 140 caracteres, descreve o conteúdo da imagem, sem "imagem de" e sem repetir a palavra-chave |
| Variantes | WebP e AVIF em 480, 800 e 1280 px (pipeline existente), com `srcset` e `sizes` |
| Proporções | Para dados estruturados, gerar também recortes 1:1, 4:3 e 16:9 a partir da imagem tratada |
| Carregamento | A imagem de capa (maior elemento visível) não usa `loading="lazy"`, e as demais sim; todas com largura e altura declaradas para evitar deslocamento de layout |
| Open Graph | `og:image` com a variante de 1280 px, com dimensões |
| Crédito e legenda | Exibidos conforme a licença da imagem e a regra de "Imagem ilustrativa" (`01-ARQUITETURA.md`, seção 8.5) |
| Nome de arquivo | Derivado do slug, sem acentos |

---

## 9. Links internos e navegação

- Toda receita mostra, quando existirem, a **técnica usada** e de 3 a 6 receitas parecidas (mesma subcategoria ou tags em comum).
- Toda técnica lista receitas que a usam; toda matéria reúne conteúdos do tema.
- Os relacionamentos nascem de `temas_relacionados` (proposta do agente) e são criados pelo site (`04-ESTRUTURA-CONTEUDO.md`, seção 8.6).
- Texto de âncora descritivo (nome da receita ou da técnica), sem "clique aqui".
- Páginas de categoria e subcategoria têm texto introdutório (`categories.description`), título e descrição próprios (`seo_title`, `seo_description`).
- Todas as páginas de receita ficam a no máximo 3 cliques da página inicial.

---

## 10. Indexação e rastreamento

### 10.1 Sitemaps e robots

- `sitemap.xml` como índice, com sitemaps separados por tipo (receitas, artigos, categorias). `lastmod` vem de `updated_at`.
- Entram apenas conteúdos `published`. Não entram `draft`, `processing` nem `archived`.
- `robots.txt` bloqueia `/api/` e parâmetros de busca interna, e aponta para o sitemap.
- Conteúdo `archived` responde **410** (ou 404) e sai do sitemap. Se houver substituto claro, 301 para ele.

### 10.2 Páginas de faceta e de listagem

| Página | Indexação |
| --- | --- |
| Categoria e subcategoria | `index` |
| Dieta, ocasião e coleção | `index` quando tiver pelo menos 6 receitas publicadas; abaixo disso `noindex, follow` (valor inicial) |
| Combinação de filtros, ordenação e busca interna | `noindex, follow`, com canonical para a página-base |
| Paginação | Cada página é autorreferente, com links rastreáveis; sem depender de `rel="prev/next"` |

---

## 11. Desempenho

Limites iniciais para páginas de receita (valores "bons" dos Core Web Vitals): LCP até 2,5 s, INP até 200 ms e CLS até 0,1, medidos em campo quando houver dados. A imagem de capa é o elemento mais crítico, por isso as variantes, as dimensões declaradas e o `srcset` são obrigatórios.

---

## 12. Monitoramento

O Search Console do próprio site é a fonte de dados de busca (não há API oficial do Google Trends).

| Indicador | Uso |
| --- | --- |
| Impressões, cliques, CTR e posição por tipo e subcategoria | Priorização de pauta (`origem = search_console` na fila) e calibração de cadência |
| Páginas indexadas, e "rastreadas, mas não indexadas" | Sinal de qualidade. Se esse grupo passar de 40% das páginas publicadas nos últimos 60 dias (valor inicial), a cadência volta ao nível anterior e o disjuntor global é avaliado |
| Ações manuais e relatórios de spam | Qualquer ocorrência pausa a publicação até a análise |
| Relatório de resultados enriquecidos (receitas) | Erros de marcação geram alerta |
| Páginas sem impressões após 90 dias | Candidatas à melhoria ou ao arquivamento por regra |
| Consultas com muitas impressões e poucos cliques | Origem de pautas e de ajustes de título e descrição |

---

## 13. Insumo do módulo de SEO (etapa 6)

O prompt do módulo (`prompts/seo.md`, versão 1.0.0) recebe o conteúdo já validado e **não altera fatos, números nem alérgenos**.

```text
versao: 1.0.0

Você ajusta o texto de apresentação de um conteúdo culinário já validado.
Não mude ingredientes, quantidades, tempos, passos nem avisos. Não invente
informações e não faça promessas de saúde.

TAREFAS
1. "titulo": mantenha ou refine para 40 a 65 caracteres, específico e sem
   clickbait.
2. "descricao_curta": de 120 a 160 caracteres, diga o que é, o resultado e
   um diferencial real do conteúdo.
3. "palavra_chave_principal" e até 4 "palavras_secundarias": termos naturais
   de busca em português do Brasil.
4. "texto_alt_imagem": de 20 a 140 caracteres, descreva a imagem escolhida.
5. "tags": de 4 a 10, preferindo as já existentes (lista fornecida).
6. "temas_relacionados": de 2 a 6 assuntos para links internos.

Responda somente com JSON válido, sem texto antes ou depois.
```

---

## 14. Verificações de SEO (referência para `08-VALIDACAO.md`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| SEO-01 | Título entre 35 e 65 caracteres | Aviso |
| SEO-02 | Descrição entre 120 e 160 caracteres | Aviso |
| SEO-03 | Slug válido e único | Bloqueante |
| SEO-04 | Texto alternativo entre 20 e 140 caracteres | Aviso |
| SEO-05 | De 4 a 10 tags, sem tag reservada desabilitada | Bloqueante (tag reservada) |
| SEO-06 | Palavra-chave principal presente no título | Aviso |
| SEO-07 | Título e ingredientes não duplicam conteúdo existente | Bloqueante |
| SEO-08 | Pelo menos 2 temas relacionados propostos | Aviso |

---

## 15. Pendências

| Item | Observação |
| --- | --- |
| URLs atuais do site | Confirmar a estrutura antes de adotar a seção 4 e planejar os redirecionamentos |
| Host canônico | Definir `www` ou domínio sem `www` |
| Recortes de imagem 1:1, 4:3 e 16:9 | Implementação no pipeline de imagens do site |
| Páginas de equipe e "Como criamos nossas receitas" | Criar e redigir |
| `sitemap.xml` e `robots.txt` atuais | Verificar se existem e o que contêm |
| Marcação estruturada atual | Verificar se o site já gera JSON-LD |
| Acesso ao Search Console | Confirmar a propriedade verificada |
| Política do Google sobre conteúdo gerado em escala e requisitos de `Recipe` | Reconferir na documentação vigente antes da produção |
