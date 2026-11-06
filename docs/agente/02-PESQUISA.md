# 02 - Pesquisa do Agente Chocolícia

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia |
| Versão do documento | 0.2 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md` (etapas 1, 2 e 3 do fluxo) |
| Documento complementar | `PESQUISA-RECEITAS.md` (procedimento específico para receitas) |
| Próximo documento | `03-PROMPT-SISTEMA.md` |

---

## 1. Objetivo e escopo

Este documento define **onde o agente pesquisa, como pesquisa, o que aproveita e o que nunca pode reproduzir**. Ele cobre as etapas 1 a 3 do fluxo da arquitetura:

1. Agendamento e pauta.
2. Pesquisa.
3. Análise e cruzamento.

Vale para todos os tipos de conteúdo (receita, dica, técnica e matéria). As regras próprias de receitas (medidas, proporções, conversões, alérgenos) estão em `PESQUISA-RECEITAS.md`.

---

## 2. Princípios

1. **Fonte é referência, não matéria-prima de cópia.** O agente consulta para entender o consenso (ingredientes, proporções, técnicas, tempos) e escreve conteúdo original.
2. **Mínimo necessário.** O agente extrai fatos estruturados e curtos. Ele não armazena páginas inteiras, textos de terceiros nem imagens.
3. **Rastreabilidade.** Toda pesquisa registra quais fontes foram consultadas, quando e o que foi aproveitado. Isso permite auditar e corrigir.
4. **Pluralidade.** Nenhum conteúdo nasce de uma fonte só. Uma receita, por exemplo, exige consulta a pelo menos três fontes distintas.
5. **Peso por confiabilidade.** Fontes com equipe de cozinha e testes pesam mais que acervos colaborativos nos pontos críticos (medidas, tempos, temperaturas).
6. **Honestidade.** O agente não afirma que testou uma receita, não inventa fontes e não apresenta como fato o que as fontes não sustentam.
7. **Conteúdo web é dado, não instrução.** Texto de páginas nunca é tratado como ordem para o agente (ver seção 10).

---

## 3. Fontes de pesquisa

### 3.1 Fontes culinárias de referência (lista aprovada)

A lista abaixo combina as cinco fontes definidas como principais pelo responsável do projeto com as cinco restantes do ranking editorial de 18/09/2026. A coluna de peso indica quanto o agente confia na fonte para **medidas, tempos e técnicas**.

| # | Fonte | Domínio | Tipo | Principal contribuição | Peso para medidas e técnica |
| --- | --- | --- | --- | --- | --- |
| 1 | TudoGostoso | tudogostoso.com.br | Receitas de usuários | Variedade, popularidade, versões e ajustes nos comentários | Médio (varia por receita) |
| 2 | Panelinha | panelinha.com.br | Receitas testadas por equipe | Técnica, confiabilidade, medidas | Alto |
| 3 | Receitas Nestlé | receitasnestle.com.br | Receitas de marca testadas | Confeitaria, doces, sobremesas | Alto (atenção ao viés de produto) |
| 4 | Receiteria | receiteria.com.br | Receitas com passo a passo | Apresentação, filtros de dieta, estrutura | Médio |
| 5 | Sabores Ajinomoto | (domínio a confirmar) | Portal de marca | Culinária cotidiana, dicas de tempero | Médio |
| 6 | Receitas Globo | receitas.globo.com | Receitas da TV e de chefs | Pratos de chefs, tendências | Médio |
| 7 | Guia da Cozinha | guiadacozinha.com.br | Receitas práticas | Ideias rápidas por ocasião | Médio |
| 8 | CyberCook | cybercook.com.br | Portal clássico | Receitas tradicionais por categoria | Médio |
| 9 | Tudo Receitas | tudoreceitas.com | Receitas com passo a passo | Culinária de outros países | Baixo a médio |
| 10 | Receitas de Minuto | receitasdeminuto.com | Receitas em vídeo | Comida caseira simples | Baixo a médio |
| 11 | Presunto Vegetariano | presuntovegetariano.com.br | Vegetariano e vegano | Receitas sem carne | Médio (nicho) |

Observações:

- O Sabores Ajinomoto aparece na lista inicial, mas não no ranking editorial de 18/09/2026. Foi mantido por decisão do responsável; o domínio exato precisa ser confirmado antes de entrar na configuração.
- Os pesos são ponto de partida e devem ser recalibrados depois das primeiras semanas, comparando a taxa de rejeição da validação, as denúncias de leitores e os dados de busca.
- As fontes de usuários (TudoGostoso, Tudo Receitas) são úteis para medir o que as pessoas realmente fazem e quais ajustes aparecem, mas nunca como única base de uma proporção.

### 3.2 Fontes técnicas e de segurança alimentar (candidatas, a validar)

Técnicas e matérias precisam de dados que receitas de portais não sustentam bem: temperaturas, tempos de cristalização, conservação, segurança alimentar e história. Candidatas por tipo, **todas a validar** antes de entrarem na lista oficial:

| Tipo | Exemplos de tipo de fonte | Uso |
| --- | --- | --- |
| Fabricantes e escolas de chocolate | Páginas técnicas de fabricantes de chocolate e cobertura | Temperagem, derretimento, ganache, armazenamento |
| Órgãos oficiais de saúde e alimentos | Anvisa, Ministério da Saúde | Segurança alimentar, rotulagem e alérgenos |
| Pesquisa agropecuária e universidades | Embrapa, universidades públicas | Ingredientes, conservação, composição de alimentos |
| Livros e manuais técnicos de confeitaria | Obras de referência | Fundamentos e terminologia |
| Imprensa gastronômica | Reportagens e guias especializados | Matérias e história |

Regra: qualquer valor numérico de segurança (temperatura, tempo de conservação) vem de fonte técnica ou oficial, não apenas de portal de receitas.

### 3.3 Fontes de tendência e sazonalidade

- Calendário editorial brasileiro: Carnaval, Páscoa, Dia das Mães, Festas Juninas, Dia dos Namorados, Dia das Crianças, Natal e Ano-Novo.
- Dados de busca do próprio site (Search Console). Não há API oficial do Google Trends; ferramentas de tendência de terceiros só entram se os termos de uso permitirem.
- Histórico do próprio site: o que mais recebe visitas.

---

## 4. Fluxo de pesquisa

```text
ETAPA 1  Pauta
   Entrada: árvore de categorias, cobertura, calendário, histórico
   Saída:   pauta (tema, categoria, subcategoria, tipo de conteúdo)
      |
      v
ETAPA 2  Pesquisa
   Gera consultas -> busca nas fontes aprovadas -> filtra -> extrai fatos
   Saída:   fichas de fonte (uma por página consultada)
      |
      v
ETAPA 3  Análise e cruzamento
   Compara fichas -> acha consenso e divergências -> aplica pesos
   Saída:   ficha de pesquisa consolidada (entrada da etapa 4)
```

### 4.1 Etapa 1: escolha da pauta

A pauta combina quatro critérios. Os pesos iniciais abaixo são sugestão e devem ser calibrados.

| Critério | O que mede | Peso inicial |
| --- | --- | --- |
| Cobertura | Subcategorias com menos conteúdo publicado ou em rascunho recebem prioridade | 40% |
| Sazonalidade | Proximidade de datas do calendário editorial (a pauta de uma data começa algumas semanas antes) | 25% |
| Tendência | Consultas com impressões crescentes no Search Console do site e calendário sazonal | 20% |
| Eixo Chocolícia | Aderência ao eixo chocolate e confeitaria, sem excluir as demais categorias | 15% |

Regras da pauta:

- Nunca repetir tema já existente (consulta ao histórico por slug e por similaridade de título).
- Respeitar a proporção entre tipos de conteúdo (receitas como base, dicas e técnicas de apoio, matérias em ritmo menor).
- Todo tema recebe um `topic_slug` estável (derivado do tema normalizado, não do título gerado) e é reservado no histórico do agente (`UNIQUE (content_type, topic_slug)`) antes da pesquisa. Isso impede repetição e execuções simultâneas sobre a mesma pauta.

### 4.2 Etapa 2: coleta

1. **Geração de consultas.** O agente monta de 3 a 5 consultas em português do Brasil a partir da pauta. Modelos:
   - `{prato} receita`
   - `{prato} como fazer passo a passo`
   - `{prato} ponto, textura, dicas`
   - `{prato} substituições`
   - Para técnicas: `como {técnica} {produto} temperatura`
2. **Busca restrita às fontes aprovadas.** Uso de API de busca com filtro de domínios (o agente atual já tem Tavily; ver seção 9). Busca livre só para tendências e para matérias, com marcação clara na ficha.
3. **Seleção das páginas.** Entre os resultados, o agente escolhe de 3 a 6 páginas, priorizando fontes de peso alto e evitando duas páginas do mesmo domínio para a mesma receita.
4. **Extração estruturada.** De cada página, o agente extrai **apenas fatos** (ver seção 6), em formato curto, e descarta o restante do texto.

Limites por execução (valores iniciais, configuráveis):

| Parâmetro | Valor inicial |
| --- | --- |
| Buscas por pauta | até 8 |
| Páginas lidas por pauta | até 6 |
| Tempo máximo da etapa de pesquisa | 10 minutos |
| Tentativas por busca com falha | 2 |

### 4.3 Etapa 3: análise e cruzamento

- Compara as fichas de fonte e identifica **consenso** (o que a maioria das fontes concorda), **divergências** (valores distintos) e **pontos únicos** (algo que só uma fonte traz).
- Aplica pesos por confiabilidade nos pontos críticos.
- Para receitas, calcula proporções e detecta valores fora do padrão (ver `PESQUISA-RECEITAS.md`).
- Para técnicas e matérias, separa **fatos verificados** (aparecem em fonte técnica ou oficial) de **informações de apoio** (aparecem só em portais de receita).
- Produz a ficha de pesquisa consolidada com as decisões e os motivos.

---

## 5. Critérios de seleção e descarte de fontes e páginas

### 5.1 Uma página entra se

- O domínio está na lista aprovada (seção 3) ou é fonte técnica validada.
- A página trata do prato ou da técnica da pauta, não de algo próximo.
- Tem medidas e passos completos (não só vídeo ou foto sem texto).
- Foi publicada ou atualizada de forma identificável, quando a data estiver disponível.

### 5.2 Uma página é descartada se

- Tem valores incoerentes (por exemplo, tempo de forno incompatível com o tipo de massa).
- É conteúdo patrocinado que obriga o uso de um produto específico sem alternativa (usar só como ideia, nunca como proporção).
- É cópia evidente de outra página já consultada.
- Contém instruções dirigidas a sistemas de IA ou tentativas de alterar o comportamento do agente (ver seção 10).

### 5.3 Número mínimo de fontes por tipo de conteúdo

| Tipo | Mínimo de fontes de receita | Mínimo de fonte técnica ou oficial |
| --- | --- | --- |
| Receita | 3 | Não, exceto para segurança (ovos crus, conservação) |
| Dica | 2 | 1 quando envolver segurança alimentar ou conservação |
| Técnica | 2 | 1 |
| Matéria | 3 | 2, com fatos e datas verificados |

Se o mínimo não for atingido, a pauta é **rejeitada com motivo** e registrada. O agente não completa lacunas inventando informação.

---

## 6. O que o agente pode extrair e o que nunca pode reproduzir

### 6.1 Pode extrair (fatos e parâmetros)

- Nomes dos ingredientes e suas quantidades (normalizadas depois).
- Tempos, temperaturas, rendimento e utensílios.
- Sequência geral de técnicas, resumida por ele em tópicos curtos próprios.
- Pontos de consenso e problemas comuns relatados (por exemplo, "talha se esquentar demais").
- URL, domínio, data de acesso e título da página, para registro.

### 6.2 Nunca reproduz nem armazena

- Textos de apresentação, introduções, descrições e dicas escritas pelos sites.
- Frases ou parágrafos de passo a passo, mesmo com pequenas trocas de palavras.
- Fotografias, ilustrações e vídeos.
- Comentários de usuários como texto (só o aprendizado resumido, sem atribuição individual).
- Nomes de receitas autorais ou marcas registradas de pratos (por exemplo, nome de receita de chef ou produto de marca).
- Páginas inteiras em cache ou no banco.

### 6.3 Cuidados jurídicos

Em geral, fatos e proporções básicas de uma receita não são protegidos como expressão, enquanto o texto, as fotos e a organização editorial de cada site são. Esta seção é um guia de prática editorial, não aconselhamento jurídico. Como o site tem fins comerciais, convém revisar essas regras com um profissional.

### 6.4 Originalidade como requisito

- Toda receita e todo artigo são escritos do zero, com o seu próprio roteiro de passos.
- O agente verifica similaridade entre o rascunho e o **texto bruto das páginas lidas**, que fica apenas em memória durante a execução e é descartado depois da verificação (as fichas de fonte só guardam fatos). Rejeita o que ficar acima dos limites de `08-VALIDACAO.md` (seção 6).
- Cada conteúdo traz um elemento próprio (por exemplo, a dica do Chocolícia, variação, uso de ocasião), que a pesquisa deve sugerir na ficha.

---

## 7. Ficha de pesquisa (contrato entre as etapas 2, 3 e 4)

### 7.1 Ficha de fonte (uma por página)

```json
{
  "fonte": "panelinha",
  "dominio": "panelinha.com.br",
  "url": "https://...",
  "acessado_em": "2026-11-06T08:03:00-03:00",
  "titulo_pagina": "...",
  "tipo_fonte": "equipe_cozinha",
  "peso": "alto",
  "fatos": {
    "ingredientes": [
      {"nome": "chocolate meio amargo", "quantidade": "200", "unidade": "g"}
    ],
    "tempos": {"preparo_min": 20, "cozimento_min": 0},
    "temperaturas": [],
    "rendimento": "12 porções",
    "tecnicas": ["derreter em banho-maria", "misturar fora do fogo"],
    "problemas_comuns": ["a ganache talha se esquentar demais"]
  }
}
```

Os campos de `fatos` são resumos do agente. Não há texto copiado.

### 7.2 Ficha de pesquisa consolidada (saída da etapa 3)

```json
{
  "pauta": {
    "tema": "...",
    "tipo_conteudo": "receita",
    "categoria": "doces-e-sobremesas",
    "subcategoria": "trufas-e-bombons"
  },
  "fontes_consultadas": 4,
  "consenso": {"...": "..."},
  "divergencias": [
    {"ponto": "proporção chocolate e creme", "valores": ["1:1", "2:1"], "decisao": "2:1", "motivo": "textura firme para trufa"}
  ],
  "pontos_unicos": ["..."],
  "riscos_e_alertas": ["contém leite e soja"],
  "sugestao_de_diferencial": "... (somente com base nos pontos únicos ou no consenso)",
  "perguntas_comuns": [],
  "armazenamento_base": "entrada correspondente em config/seguranca.json",
  "referencias_registro": [
    {"dominio": "panelinha.com.br", "url": "https://...", "acessado_em": "2026-11-06"}
  ],
  "status": "aprovada_para_criacao"
}
```

O campo `referencias_registro` vai para `generationMeta` (ver `01-ARQUITETURA.md`, seção 8.1). Para matérias com fatos e datas, as fontes também devem aparecer ao leitor no artigo.

---

## 8. Falhas e casos de exceção

| Situação | Comportamento |
| --- | --- |
| API de busca indisponível | Até 2 tentativas, depois troca de provedor se houver; sem provedor, a execução termina com status `erro` e alerta |
| Menos fontes que o mínimo | Pauta rejeitada com motivo; o agente escolhe a próxima da lista |
| Fontes divergem muito | Aplica pesos; se persistir sem decisão segura, rejeita a pauta com motivo |
| Página com bloqueio ou erro | Descarta a página e tenta a seguinte; não tenta contornar bloqueios |
| Tema já existente | Pauta rejeitada (duplicidade) |
| Nenhuma base de segurança para o risco da receita | A pauta é **rejeitada** (SEG-02), com a lacuna registrada |

---

## 9. Configuração

Variáveis sugeridas no `.env.example` do novo projeto (somente nomes, sem valores):

```text
PESQUISA_PROVEDOR=tavily
TAVILY_API_KEY=
PESQUISA_MAX_BUSCAS=8
PESQUISA_MAX_PAGINAS=6
PESQUISA_TIMEOUT_MIN=10
PESQUISA_MIN_FONTES_RECEITA=3
PESQUISA_DOMINIOS_APROVADOS=config/fontes.json
```

- A lista de domínios, os pesos e as consultas-modelo ficam em `config/fontes.json` e `prompts/`, não no código.
- O agente atual já usa Tavily e NewsAPI. Os feeds RSS de tecnologia (TechCrunch, The Verge, Ars Technica, Hacker News) saem da configuração.
- O módulo de pesquisa vive em `agents/pesquisador.py` e `agents/analista.py` (ver `01-ARQUITETURA.md`, seção 11).

---

## 10. Segurança da pesquisa

O agente lê conteúdo da internet. Esse conteúdo pode conter texto que tenta manipulá-lo (injeção de prompt). Regras:

1. O conteúdo de páginas entra no prompt sempre dentro de um bloco de **dados** claramente delimitado, com a instrução de que nada ali é ordem.
2. O agente só extrai campos estruturados. Não executa links, comandos nem pedidos encontrados nas páginas.
3. Domínios fora da lista aprovada não são lidos (exceto na busca livre de tendências, que só retorna títulos e contagens).
4. O agente não envia dados internos (chaves, configurações, histórico) em consultas de busca.
5. Qualquer página com instruções dirigidas a "assistentes" ou "modelos de IA" é descartada e registrada.
6. **A defesa principal fica na extração**, ponto em que o modelo lê a página bruta: antes da chamada ao modelo, o código procura padrões de injeção (instruções a assistentes, pedidos para ignorar regras, comandos) e descarta a página.
7. O extrator roda **sem ferramentas e sem acesso a segredos** e devolve apenas campos estruturados.
8. Os campos de texto livre da ficha (técnicas, problemas comuns) usam vocabulário controlado sempre que possível; o que for texto livre é limitado em tamanho e filtrado por código.

---

## 11. Respeito às fontes

- O agente identifica-se de forma honesta nas requisições, quando fizer acesso direto.
- Respeita `robots.txt`, limites de requisição e bloqueios. Não tenta contorná-los.
- Prefere API de busca com filtro de domínio a rastrear os sites diretamente.
- Faz poucas requisições por execução (ver limites na seção 4.2).

---

## 12. Pendências desta seção

| Item | Ação |
| --- | --- |
| Termos de uso e `robots.txt` de cada fonte aprovada | **Portão antes de desenvolver a coleta**, inclusive quando o conteúdo chega por API de busca |
| Domínio do Sabores Ajinomoto | Confirmar |
| Capacidade do provedor de busca (filtro por domínio, limites do plano gratuito) | Confirmar no provedor |
| Lista de fontes técnicas e oficiais | Validar e aprovar |
| Pesos de pauta e de fontes | Calibrar após as primeiras semanas |
| Limite de similaridade | Definir em `08-VALIDACAO.md` |

---

## 13. Relação com os outros documentos

| Documento | Relação |
| --- | --- |
| `01-ARQUITETURA.md` | Define as etapas e o contrato geral |
| `PESQUISA-RECEITAS.md` | Regras específicas para receitas (conversões, proporções, alérgenos) |
| `03-PROMPT-SISTEMA.md` | Usa a ficha de pesquisa como entrada do Chef IA |
| `04-ESTRUTURA-CONTEUDO.md` | Define categorias e subcategorias usadas na pauta |
| `08-VALIDACAO.md` | Define limite de similaridade e critérios de aprovação |
