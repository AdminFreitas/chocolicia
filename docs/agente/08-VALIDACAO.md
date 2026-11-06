# 08 - Validação

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia e site `chocolicia` |
| Versão do documento | 0.1 |
| Data | 05/11/2026 |
| Depende de | `01-ARQUITETURA.md` a `07-PUBLICACAO.md` e `PESQUISA-RECEITAS.md` |
| Alimenta | Implementação de `validators/`, `tests/` e do pipeline de integração contínua |

---

## 1. Objetivo e princípios

Como não há revisão humana nem teste prático das receitas, **a validação automática é a barreira de qualidade e de segurança do projeto**. Este documento define o que ela verifica, como decide, como é testada e quando o sistema pode avançar de fase.

Princípios:

1. **Código decide o que for verificável.** Números, unidades, alérgenos, etiquetas de dieta, dificuldade, tempos, rendimento, prazos de conservação, licenças e limites são calculados ou conferidos por código, não por um modelo.
2. **Na dúvida, rejeita.** Rejeitar uma receita boa tem custo baixo (a pauta é refeita). Publicar uma receita ruim tem custo alto.
3. **O modelo não escreve números de segurança.** Temperatura, tempo e prazo de conservação de segurança vêm de fonte técnica ou de base curada (`config/seguranca.json`).
4. **Coerência não é correção.** As verificações pegam inconsistência, valores implausíveis e violações de regra. Elas não provam que a receita fica boa. Por isso o escopo é limitado por risco e o sistema é monitorado depois da publicação (`07-PUBLICACAO.md`).
5. **O validador também é testado.** Testes de mutação e um conjunto de referência (golden set) provam que as verificações rejeitam o que devem (seções 7 e 8).
6. **Dois revisores de natureza diferente.** Código e um modelo de IA de família diferente da do gerador. O modelo de revisão só confere o que o código não alcança, e não pode aprovar o que o código rejeitou.

---

## 2. Camadas e ordem de execução

| # | Camada | Prefixo | Quando |
| --- | --- | --- | --- |
| 1 | Esquema e contrato | `SCH` | Logo após a criação |
| 2 | Taxonomia e escopo | `TAX` | |
| 3 | Consistência numérica | `NUM` | |
| 4 | Coerência culinária | `CUL` | |
| 5 | Ingredientes, alérgenos e dieta | `ALG` | |
| 6 | Segurança alimentar | `SEG` | |
| 7 | Honestidade e alegações | `HON` | |
| 8 | Originalidade e duplicidade | `SIM` | Antes de descartar o texto bruto das fontes |
| 9 | Imagem | `IMG` | Na etapa 6 |
| 10 | SEO | `SEO` | Na etapa 6 |
| 11 | Revisor por IA | `REV` | Depois das camadas anteriores |
| 12 | Contrato e servidor | `API` | No envio |
| 13 | Pós-publicação | `PUB` | Depois da publicação |

---

## 3. Severidade e decisão

| Gravidade | Efeito |
| --- | --- |
| **Bloqueante** | Reprova o conteúdo (`rejected`), com `rejection_code` igual ao ID da verificação |
| **Aviso** | Registra. Mais de 3 avisos no mesmo conteúdo reprovam (valor inicial) |

Fluxo: se houver bloqueante, o agente tenta no máximo 2 reparos (`03-PROMPT-SISTEMA.md`), valida de novo e, persistindo, rejeita. Verificações da camada 8 só rodam enquanto o texto bruto das fontes está em memória (seção 6).

---

## 4. Catálogo de verificações

### 4.1 Esquema (`SCH`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| SCH-01 | A resposta é JSON válido | Bloqueante |
| SCH-02 | O JSON obedece ao modelo Pydantic do tipo | Bloqueante |
| SCH-03 | Limites de tamanho de cada campo (título, descrição, passos, dicas etc.) | Bloqueante |
| SCH-04 | Campos que o sistema preenche (autor, alérgenos, status, metadados) não foram alterados pelo modelo | Bloqueante |
| SCH-05 | Campos de receita sem markdown, HTML nem URL | Bloqueante |
| SCH-06 | Idioma do texto é português do Brasil | Bloqueante |
| SCH-07 | Mínimos de conteúdo: pelo menos 3 ingredientes, 4 passos e passos com texto substantivo | Bloqueante |

### 4.2 Taxonomia e escopo (`TAX`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| TAX-01 | Subcategoria existe, está ativa e habilitada (`agent_enabled`) | Bloqueante |
| TAX-02 | Nível de risco da subcategoria é permitido pela fase em vigor | Bloqueante |
| TAX-03 | O tema e o texto não caem em pauta bloqueada (`07-PUBLICACAO.md`, seção 7) | Bloqueante |
| TAX-04 | Tags dentro das regras de criação (`04`, seção 6.5) | Bloqueante |
| TAX-05 | Nenhuma tag ou etiqueta reservada e desabilitada (`sem-gluten`, `sem-lactose`) | Bloqueante |

### 4.3 Consistência numérica (`NUM`)

Números e unidades são extraídos dos passos com expressões regulares e comparados com os campos estruturados e com a ficha de pesquisa.

| ID | Verificação | Gravidade |
| --- | --- | --- |
| NUM-01 | Temperatura e tempo citados nos passos estão dentro da faixa de consenso da ficha (margem inicial de 25%) | Bloqueante |
| NUM-02 | Temperaturas e tempos dentro das faixas plausíveis de `config/plausibilidade.json` (por exemplo, forno entre 90 e 260 °C) | Bloqueante |
| NUM-03 | A soma dos tempos citados nos passos é coerente com `prep + cook + rest` | Bloqueante |
| NUM-04 | Peso total dividido pelo rendimento fica dentro da faixa da subcategoria | Bloqueante |
| NUM-05 | Dificuldade informada igual à calculada pelos critérios de `04`, seção 6.3 (a calculada prevalece e a divergência é registrada) | Aviso |
| NUM-06 | Cada quantidade fica dentro da faixa de consenso da ficha (proporção em relação ao ingrediente-base, margem de 25%); ingrediente crítico sem decisão registrada reprova | Bloqueante |
| NUM-07 | Toda unidade pertence ao vocabulário controlado | Bloqueante |
| NUM-08 | Toda quantidade é numérica e interpretável; nenhum "um pouco" ou "a gosto" em ingrediente estrutural | Bloqueante |
| NUM-09 | Quantidade citada em um passo ("adicione 200 g de açúcar") coincide com a da lista de ingredientes | Bloqueante |

### 4.4 Coerência culinária (`CUL`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| CUL-01 | Todo ingrediente da lista aparece em algum passo (por nome ou alias do catálogo) | Bloqueante |
| CUL-02 | Todo ingrediente citado nos passos está na lista | Bloqueante |
| CUL-03 | Ordem plausível dos passos, por regras de precedência (pré-aquecer antes de assar; misturar antes de assar; assar ou resfriar antes de desenformar; servir por último) | Bloqueante |
| CUL-04 | Razões de sanidade por família (`config/razoes.json`, curadas por pessoa): fora da faixa reprova | Bloqueante |
| CUL-05 | Presença mínima de ingredientes críticos por família (um bolo precisa de farinha, açúcar, líquido e agente de crescimento, por exemplo) | Bloqueante |
| CUL-06 | Sem passos duplicados | Bloqueante |
| CUL-07 | Receita com ingrediente `needs_label_check` carrega a orientação de conferir o rótulo | Bloqueante |
| CUL-08 | Passo de forno ou de fogo traz tempo ou sinal de ponto | Bloqueante |

`config/razoes.json` e `config/plausibilidade.json` são mantidos **por uma pessoa**, não pelo agente. Uma família sem razões curadas fica com `agent_enabled = false`.

### 4.5 Ingredientes, alérgenos e dieta (`ALG`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| ALG-01 | Fase 1: todo ingrediente resolve no catálogo (nome exato ou alias, ou busca aproximada com similaridade e classe suficientes) | Bloqueante |
| ALG-02 | Alérgenos e traços são calculados pelo catálogo; divergência do valor do modelo é registrada e o valor calculado prevalece | Aviso |
| ALG-03 | Etiqueta de dieta só se todos os ingredientes forem compatíveis e nenhum tiver `needs_label_check` | Bloqueante |
| ALG-04 | Etiquetas `sem-gluten` e `sem-lactose` nunca são aplicadas | Bloqueante |
| ALG-05 | O texto não contém alegações como "sem glúten", "sem lactose", "zero lactose" ou "para celíacos" | Bloqueante |

### 4.6 Segurança alimentar (`SEG`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| SEG-01 | Sinalizadores de risco calculados por código a partir de ingredientes e passos: ovo cru ou malcozido, laticínio ou creme perecível, fritura, calda quente, álcool, fermentação longa | Informativo (alimenta SEG-02 a SEG-04) |
| SEG-02 | Sinalizador de risco sem entrada correspondente na base curada (`config/seguranca.json`) para a família: **rejeita a pauta** | Bloqueante |
| SEG-03 | Prazo de conservação, quando exigido pelo risco, vem da base; sem base, rejeita | Bloqueante |
| SEG-04 | Ovo cru ou malcozido: o alerta de segurança da base aparece no conteúdo | Bloqueante |
| SEG-05 | Temperaturas e prazos de segurança citados no texto vêm da base ou de fonte técnica | Bloqueante |
| SEG-06 | O texto não cai em termos de pauta bloqueada (conserva em óleo, sous-vide, tartare, leite cru etc.) | Bloqueante |
| SEG-07 | Álcool só em subcategoria de bebidas alcoólicas | Bloqueante |

### 4.7 Honestidade e alegações (`HON`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| HON-01 | Frases proibidas (`config/frases_proibidas.json`): "testamos", "testada", "aprovada pela família", "garantido", "infalível", "sempre dá certo", "a melhor receita" e equivalentes | Bloqueante |
| HON-02 | Primeira pessoa indevida ("fiz", "fizemos", "testei", "na minha casa", "minha avó") | Bloqueante |
| HON-03 | Alegações de saúde: "emagrece", "desintoxica", "limpa o organismo", "queima gordura", "cura", "previne", "imunidade", "anti-inflamatório", "acelera o metabolismo". O rótulo "detox" é aceito como nome de preparo, mas nunca como promessa | Bloqueante |
| HON-04 | Marcas comerciais (`config/marcas.json`), exceto formato de embalagem usado como medida | Bloqueante |
| HON-05 | Receitas: nenhuma data, origem histórica ou número factual além dos da receita. Matérias: todo ano, número ou nome precisa aparecer na ficha com fonte | Bloqueante |
| HON-06 | Superlativos e clichês vazios na introdução | Aviso |

### 4.8 Originalidade e duplicidade (`SIM`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| SIM-01 | Sequência de 10 ou mais palavras consecutivas idêntica a qualquer fonte lida | Bloqueante |
| SIM-02 | 15% ou mais dos grupos de 4 palavras do texto dos passos aparecem em uma mesma fonte (excluídas expressões comuns de receita da lista `config/expressoes_comuns.json`) | Bloqueante |
| SIM-03 | Título igual ou muito parecido com o de uma fonte (similaridade de conjunto de palavras a partir de 0,9) | Bloqueante |
| SIM-04 | Duplicidade interna: título com similaridade a partir de 0,85 e interseção de ingredientes (Jaccard) a partir de 0,8 com conteúdo da mesma subcategoria | Bloqueante |

### 4.9 Imagem (`IMG`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| IMG-01 | Licença permitida: domínio público (CC0, PDM), licenças próprias dos provedores aprovados (após conferir os termos) e CC BY com atribuição. São recusadas licenças NC, ND, SA, "todos os direitos reservados" e desconhecidas | Bloqueante |
| IMG-02 | Largura mínima de 1280 px | Bloqueante |
| IMG-03 | Domínio de origem na lista permitida | Bloqueante |
| IMG-04 | Verificação por modelo de visão: mostra o tipo de prato esperado, sem pessoas reconhecíveis, sem texto, logotipo ou marca d'água, enquadramento adequado | Bloqueante |
| IMG-05 | Imagem (URL e hash) ainda não usada em outro conteúdo | Bloqueante |
| IMG-06 | Proveniência completa (provedor, autor, licença, páginas de origem, atribuição) | Bloqueante |
| IMG-07 | Imagem de IA somente depois de esgotar os bancos de imagens e dentro do teto diário | Bloqueante |
| IMG-08 | Texto alternativo preenchido (8 a 240 caracteres no contrato; 20 a 140 pela regra de SEO) | Bloqueante |

### 4.10 SEO (`SEO`)

As verificações SEO-01 a SEO-08 estão em `05-SEO.md`, seção 14.

### 4.11 Contrato e servidor (`API`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| API-01 | Payload válido contra o schema do site do ambiente de destino (teste de contrato) | Bloqueante |
| API-02 | Escopo do token compatível com o `status` pedido | Bloqueante |
| API-03 | `Idempotency-Key` presente e estável | Bloqueante |
| API-04 | Resposta do site coerente (`201`, estado esperado, sem erro de recálculo) | Bloqueante |

### 4.12 Pós-publicação (`PUB`)

| ID | Verificação | Gravidade |
| --- | --- | --- |
| PUB-01 | Página responde 200 | Crítica |
| PUB-02 | Título, `h1` e canonical corretos | Bloqueante |
| PUB-03 | JSON-LD válido, com propriedades obrigatórias e sem campos proibidos (`aggregateRating`, `review`, `nutrition`, `video` sem dado real) | Crítica |
| PUB-04 | Aviso de IA no topo e aviso de alérgenos no final presentes | Crítica |
| PUB-05 | Legenda da imagem presente ("Imagem ilustrativa"; "gerada por inteligência artificial" quando for o caso) | Bloqueante |
| PUB-06 | URL consta no sitemap em prazo definido | Aviso |
| PUB-07 | Variantes da imagem existem e a URL da capa responde 200 | Bloqueante |
| PUB-08 | Alérgenos exibidos coincidem com os salvos | Crítica |

**Crítica** falhando arquiva o conteúdo automaticamente e gera alerta (`07-PUBLICACAO.md`, seção 5).

---

## 5. Revisor por IA (etapa 5, escopo reduzido)

- O revisor roda **depois** das camadas de código e usa um modelo de família **diferente** da do gerador (`config/modelos_aprovados.json`), porque modelos parecidos tendem a errar do mesmo jeito.
- Escopo: afirmações sem apoio na ficha; passos semanticamente impossíveis; alerta de segurança omitido; texto confuso ou contraditório. **Não** confere números nem coerência entre lista e passos (isso é código: NUM, CUL).
- Saída: JSON com problemas e gravidade. Gravidade alta reprova. O revisor nunca aprova o que o código rejeitou.
- O prompt do revisor está em `03-PROMPT-SISTEMA.md`, seção 12.3.

---

## 6. Método de similaridade

A ficha de pesquisa guarda apenas fatos, então não há texto de fonte para comparar depois. A verificação de similaridade funciona assim:

1. Na etapa 2, o texto bruto das páginas lidas fica **somente em memória**, junto com a execução.
2. Na etapa 5, o rascunho é comparado com esses textos (SIM-01 a SIM-03), por sequência de palavras e por grupos de 4 palavras, sobre texto normalizado (minúsculas, sem pontuação, sem acentos).
3. Depois da verificação, o texto bruto é descartado. Nada é gravado em banco, arquivo ou log.
4. A duplicidade interna (SIM-04) usa o catálogo de conteúdo do site (`GET /api/content/lookup`).
5. Os limites iniciais (10 palavras seguidas; 15% dos grupos de 4 palavras; 0,9 e 0,85) são valores de partida e são calibrados com o golden set e com falsos positivos observados.

Antes de qualquer coleta, os termos de uso e o `robots.txt` de cada fonte são conferidos (`02-PESQUISA.md`, seção 12).

---

## 7. Testes de mutação

O objetivo é provar que as verificações rejeitam receitas ruins. Parte-se de receitas **válidas de referência** (fixtures aprovadas pelo conjunto de verificações, das subcategorias de risco baixo), introduz-se **um defeito de cada vez** e confere-se se o validador rejeita pela verificação esperada.

### 7.1 Regras

- Cada mutação deve ser rejeitada pela verificação esperada: **100%** nas mutações determinísticas.
- A mutação M45 depende de modelo de visão (não determinístico): roda 3 vezes por imagem e exige rejeição em pelo menos 90% das execuções.
- As fixtures válidas devem ser aprovadas (zero falso positivo no conjunto de referência).
- A suíte roda em toda alteração de `validators/`, `prompts/` e `config/` e antes de cada promoção de fase.
- Um defeito descoberto em produção vira mutação nova no mesmo dia.

### 7.2 Lista de mutações (49)

| ID | Mutação | Rejeitada por |
| --- | --- | --- |
| M01 | Multiplicar o açúcar por 10 | NUM-06, CUL-04 |
| M02 | Dividir o açúcar por 10 | NUM-06 |
| M03 | Multiplicar a farinha por 5 | NUM-06, CUL-04 |
| M04 | Remover a farinha de um bolo | CUL-05 |
| M05 | Remover o fermento de um bolo | CUL-05 |
| M06 | Remover todo o líquido de uma massa | CUL-05 |
| M07 | Dobrar o chocolate de uma ganache | CUL-04 |
| M08 | Dividir o creme de uma ganache por 4 | CUL-04 |
| M09 | Trocar g por kg | NUM-06 |
| M10 | Trocar colher de chá por colher de sopa no fermento | NUM-06 |
| M11 | Usar unidade fora do vocabulário | NUM-07 |
| M12 | Trocar a quantidade de um ingrediente estrutural por "um pouco" | NUM-08 |
| M13 | Forno de 180 °C para 18 °C | NUM-02 |
| M14 | Forno de 180 °C para 1800 °C | NUM-02 |
| M15 | Forno de 180 °C para 380 °C | NUM-01, NUM-02 |
| M16 | Tempo de forno de 40 para 4 minutos | NUM-01 |
| M17 | Tempo de forno de 40 para 400 minutos | NUM-02 |
| M18 | Soma dos tempos dos passos dez vezes maior que os campos de tempo | NUM-03 |
| M19 | Remover tempo e sinal de ponto de um passo de cozimento | CUL-08 |
| M20 | Apagar o passo de mistura | CUL-01, CUL-03 |
| M21 | Colocar "asse" antes de "misture" | CUL-03 |
| M22 | Duplicar um passo | CUL-06 |
| M23 | Deixar na lista um ingrediente que nenhum passo usa | CUL-01 |
| M24 | Citar nos passos um ingrediente que não está na lista | CUL-02 |
| M25 | Passo cita quantidade diferente da lista | NUM-09 |
| M26 | Receita com ovo cru sem alerta | SEG-02, SEG-04 |
| M27 | Remover o armazenamento de receita com creme | SEG-03 |
| M28 | Inserir "conserva em óleo" no texto | SEG-06 |
| M29 | Inserir álcool em receita sem álcool | SEG-07 |
| M30 | Remover `leite` do campo de alérgenos de receita com leite condensado | ALG-02 |
| M31 | Aplicar etiqueta `vegana` em receita com leite | ALG-03 |
| M32 | Inserir "sem glúten" no texto | ALG-05 |
| M33 | Usar ingrediente fora do catálogo na Fase 1 | ALG-01 |
| M34 | Inserir "testamos esta receita" | HON-01 |
| M35 | Inserir "a receita da minha avó" | HON-01, HON-02 |
| M36 | Inserir "emagrece" | HON-03 |
| M37 | Inserir "garantido, sempre dá certo" | HON-01 |
| M38 | Inserir uma marca comercial | HON-04 |
| M39 | Copiar 3 frases de uma fonte | SIM-01, SIM-02 |
| M40 | Usar o mesmo título de uma fonte | SIM-03 |
| M41 | Duplicar receita existente com título levemente diferente | SIM-04 |
| M42 | Imagem com licença NC | IMG-01 |
| M43 | Imagem com largura abaixo de 1280 px | IMG-02 |
| M44 | Imagem de domínio fora da lista | IMG-03 |
| M45 | Imagem com pessoa ou texto visível (fixture) | IMG-04 |
| M46 | Subcategoria inexistente | TAX-01 |
| M47 | Subcategoria de risco `high` na Fase 1 | TAX-02 |
| M48 | Tag reservada e desabilitada | TAX-05 |
| M49 | Título com menos de 5 caracteres | SCH-03 |

---

## 8. Conjunto de referência (golden set)

- De 15 a 20 pautas da Fase 1 (brigadeiros, trufas, ganache, doces de colher, bolos simples), cada uma com **ficha de pesquisa congelada** e resultado esperado (aprovada ou rejeitada).
- Pautas **negativas**: temas bloqueados (conserva, sous-vide, ovo cru sem base), ingrediente fora do catálogo, fonte com texto de injeção de prompt.
- Cada mudança de prompt, modelo ou validador regera o conjunto e compara com o esperado.
- Medidas: taxa de aprovação das pautas válidas, rejeição das negativas, tentativas por conteúdo, custo e duração.
- Alterações no conjunto de referência são registradas em `tests/CHANGELOG.md`.

---

## 9. Infraestrutura de testes

| Teste | Frequência |
| --- | --- |
| Unitários dos validadores (`pytest`) | Todo commit |
| Contrato contra o schema do site | Todo commit e antes de cada execução agendada |
| Mutação (49) | Alteração em `validators/`, `prompts/`, `config/`; antes de promoção de fase |
| Golden set | Alteração de prompt, modelo ou validador; antes de promoção de fase |
| Injeção de prompt (fichas e páginas com instruções escondidas) | Alteração de prompt de extração ou criação |
| Limites do contrato (valores nos extremos) | Todo commit |
| Fumaça em preview (fluxo completo, inclusive imagem) | Antes de cada promoção de fase e após mudança no site |

A integração contínua bloqueia a mesclagem se qualquer teste falhar. A lista de modelos aprovados é verificada no início de toda execução.

---

## 10. Critérios de promoção entre fases

Valores iniciais, a calibrar com dados reais. Cada promoção é uma decisão registrada, com as métricas anexadas.

### 10.1 Fase 0 para Fase 1

| Critério | Meta inicial |
| --- | --- |
| Duração e volume | Pelo menos 14 dias corridos e 20 execuções válidas |
| Mutação | 100% das determinísticas e pelo menos 90% de M45 |
| Golden set | Todas as pautas com o resultado esperado |
| Aprovação pela validação | Pelo menos 70% das gerações das pautas válidas |
| Rejeição por ingrediente fora do catálogo | No máximo 20% (acima disso, ampliar o catálogo antes) |
| Contrato e fumaça em preview | Zero erro crítico nas 20 execuções |
| Imagem de banco de imagens | Pelo menos 80% das capas (IA em no máximo 20%) |
| Duplicidade e modelo fora da lista | Zero ocorrência |
| Custo | Dentro do teto por receita e por mês |
| Bases curadas | `razoes`, `plausibilidade`, `seguranca` e catálogo preenchidos para as subcategorias `low` |

### 10.2 Fase 1 para Fase 2

| Critério | Meta inicial |
| --- | --- |
| Duração e volume | Pelo menos 30 dias e 25 receitas publicadas |
| Denúncias | No máximo 2 por 100 receitas publicadas; zero arquivamento por disjuntor de segurança ou alergia |
| Taxa de rejeição | Estável (variação de até 10 pontos percentuais entre semanas) |
| Indexação | Sem ação manual; pelo menos 60% das páginas com mais de 30 dias indexadas |
| Fumaça e pós-publicação | Zero falha crítica não tratada |
| Custo | Dentro do teto |
| Bases curadas | Preenchidas para as subcategorias `medium` a liberar |

### 10.3 Fase 2 para Fase 3

Os mesmos critérios da Fase 1 para a Fase 2, mais base de segurança curada **por família** de risco alto, mutações específicas da família criadas e aprovadas, e decisão registrada por subcategoria.

### 10.4 Rebaixamento

Condições de pausa e rebaixamento estão em `07-PUBLICACAO.md`, seção 9.

---

## 11. Métricas

Relatório semanal (`07-PUBLICACAO.md`, seção 14):

| Métrica | Observação |
| --- | --- |
| Taxa de aprovação pela validação | Geral e por subcategoria |
| Rejeições por código | Os 5 códigos mais frequentes mostram onde ajustar prompt ou catálogo |
| Tentativas médias por conteúdo | |
| Custo por receita publicada | Por componente |
| Proporção de capas de banco de imagens e de IA | |
| Denúncias por 100 receitas publicadas | |
| Tempo mediano até arquivar após denúncia | |
| Falhas de fumaça | Por verificação PUB |
| Páginas indexadas e "rastreadas, mas não indexadas" | `05-SEO.md` |
| Duplicidades detectadas | |

---

## 12. Calibração e manutenção

- Limites (margens, similaridade, disjuntores) mudam somente por alteração versionada, com o resultado da suíte de mutação e do golden set anexado.
- Falso positivo recorrente (receita boa rejeitada pelo mesmo código) indica ajuste de configuração ou de prompt, não afrouxamento do validador.
- Falso negativo (defeito que passou) vira mutação nova e correção antes da próxima execução.
- Os arquivos curados por pessoa (`razoes`, `plausibilidade`, `seguranca`, catálogo de ingredientes, listas de frases e marcas) têm versão, e a versão usada entra em `generation_meta.validators_version`.

---

## 13. Pendências

| Item | Observação |
| --- | --- |
| Curadoria de `razoes`, `plausibilidade` e `seguranca` | Por pessoa, para as subcategorias `low`, antes da Fase 0 |
| Catálogo inicial de ingredientes de confeitaria | Montar com conversões e alérgenos |
| Fixtures válidas e mutáveis | Criar a partir das primeiras receitas aprovadas na Fase 0 (ou de receitas escritas à mão para teste) |
| Lista de expressões comuns de receita | Definir para reduzir falso positivo em SIM-02 |
| Modelos aprovados por tarefa | Definir, e escolher modelo de revisão de família diferente |
| Termos dos bancos de imagens | Conferir antes de ativar cada provedor (IMG-01) |
| Valores de teto de custo e limites | Definir (`07-PUBLICACAO.md`) |
