# PESQUISA-RECEITAS - Procedimento de pesquisa para receitas

| Item | Valor |
| --- | --- |
| Projeto | agente-chocolicia |
| Versão do documento | 0.2 |
| Data | 05/11/2026 |
| Depende de | `02-PESQUISA.md` (fontes, limites e fichas) e `01-ARQUITETURA.md` |
| Alimenta | `03-PROMPT-SISTEMA.md` (Chef IA), `04-ESTRUTURA-CONTEUDO.md` e `08-VALIDACAO.md` |

---

## 1. Objetivo

Definir, passo a passo, como o agente transforma uma pauta de receita em uma **ficha de pesquisa consolidada** confiável, que o Chef IA usará para criar uma receita **original**, com medidas coerentes e informações de segurança corretas.

Este documento trata apenas de receitas. Dicas, técnicas e matérias seguem as regras gerais de `02-PESQUISA.md`.

---

## 2. Entrada: a pauta de receita

```json
{
  "tipo_conteudo": "receita",
  "tema": "Brigadeiro de colher cremoso",
  "categoria": "doces-e-sobremesas",
  "subcategoria": "brigadeiros-e-docinhos",
  "ocasiao": ["festas"],
  "dieta": [],
  "dificuldade_alvo": "Fácil",
  "observacoes": "foco em textura cremosa"
}
```

A categoria e a subcategoria vêm da árvore editorial (`04-ESTRUTURA-CONTEUDO.md`), nunca de texto livre. A pauta é validada contra a lista de categorias antes da pesquisa.

---

## 3. Etapas do procedimento

| # | Etapa | Resultado |
| --- | --- | --- |
| 1 | Definir a "receita-alvo" | Descrição do que será pesquisado (o que é o prato, variações aceitas) |
| 2 | Coletar de 3 a 6 páginas | Fichas de fonte (ver `02-PESQUISA.md`, seção 7.1) |
| 3 | Normalizar medidas | Todas as quantidades em unidades comparáveis |
| 4 | Cruzar proporções | Faixas de consenso e outliers |
| 5 | Cruzar técnica, tempos e temperaturas | Sequência técnica consensual |
| 6 | Levantar alérgenos e restrições | Lista de alérgenos e etiquetas de dieta |
| 7 | Definir rendimento e escala | Rendimento coerente com as quantidades |
| 8 | Definir diferencial e riscos | Sugestão de elemento próprio e alertas |
| 9 | Gate de aprovação | Ficha aprovada ou pauta rejeitada |

---

## 4. Coleta

- Critério mínimo: 3 páginas de domínios diferentes, sendo pelo menos uma de fonte de peso alto (Panelinha ou Receitas Nestlé) para receitas de confeitaria.
- Para receitas de usuários (TudoGostoso, Tudo Receitas), o agente lê também os ajustes recorrentes nos comentários, resumidos como aprendizado ("muitos recomendam reduzir o açúcar"), sem copiar texto nem atribuir a pessoas.
- O agente extrai só os fatos listados em `02-PESQUISA.md`, seção 6.1. Não guarda passos em texto corrido de terceiros.

---

## 5. Normalização de medidas

### 5.1 Regra geral

O agente trabalha internamente em **gramas e mililitros** para comparar. Na receita final, usa a medida mais prática para o leitor brasileiro, sem nunca usar "um pouco de", "a gosto" para ingrediente estrutural (açúcar, farinha, chocolate, ovos, gordura, fermento, líquidos). "A gosto" só vale para tempero e finalização, e sempre com sugestão de ponto de partida.

### 5.2 Tabela de conversão

O agente consulta um arquivo versionado, `config/conversoes.json`, para converter medidas caseiras. Valores iniciais de referência, **a conferir uma vez contra tabelas de conversão publicadas** (não exige teste de receita):

| Medida caseira | Equivalência de referência | Observação |
| --- | --- | --- |
| Xícara de chá | 240 ml | Padrão de receituário brasileiro |
| Colher de sopa | 15 ml | Rasa ou nivelada, conforme a receita |
| Colher de chá | 5 ml | |
| Lata de leite condensado | 395 g | Marcas variam pouco |
| Caixinha de creme de leite | 200 g | |
| Lata de creme de leite | 300 g | |
| Xícara de farinha de trigo | Cerca de 120 g | Varia com o peso e a peneira |
| Xícara de açúcar refinado | Cerca de 180 g | Varia com o tipo de açúcar |

Regras:

- Ingredientes secos que variam muito com o volume (farinha, cacau, açúcar, chocolate em pó) devem ser dados **também em gramas** na receita final.
- Quando as fontes usam medidas diferentes para o mesmo ingrediente, o agente converte, compara e registra a medida usada na decisão.
- O arquivo de conversão é conferido uma única vez, contra tabelas de conversão publicadas. Como não haverá teste de receitas, um valor errado se repetiria em todas elas, então esta é a conferência mais valiosa.

### 5.3 Ovos, unidades e tamanhos

- Ovos: indicar tamanho de referência (por exemplo, ovo grande, cerca de 50 g sem casca) e, quando o peso importar, a quantidade em gramas.
- Frutas e legumes: unidade e tamanho médio, com peso aproximado.

---

## 6. Cruzamento de proporções

### 6.1 Método

1. Converter os ingredientes de cada ficha para gramas ou mililitros.
2. Escolher um **ingrediente-base** da receita (por exemplo, farinha em bolos, chocolate em ganaches, leite condensado em brigadeiros).
3. Calcular a proporção de cada ingrediente em relação ao ingrediente-base, em cada fonte.
4. Para cada ingrediente, calcular a faixa de consenso (mediana das proporções) e marcar como **outlier** o que fugir muito dela (valor inicial: mais de 25% de diferença em relação à mediana).
5. Aplicar o peso das fontes: fontes de peso alto desempatam divergências em ingredientes críticos.
6. Registrar a decisão e o motivo na ficha.

### 6.2 Ingredientes críticos

São os ingredientes cujo erro estraga a receita: farinha, açúcar, líquidos, gordura, ovos, fermento, chocolate e creme (em ganaches e coberturas). Neles, divergência entre fontes **não** pode ser resolvida por média simples: exige decisão por peso de fonte; se não houver decisão segura, a pauta é rejeitada.

### 6.3 Razões de sanidade (ponto de partida para validação)

Além do cruzamento, o validador compara a receita final com razões conhecidas por tipo de preparo. Os valores abaixo são **pontos de partida** conservadores, sem teste prático (ver `08-VALIDACAO.md`):

| Preparo | Razão de referência |
| --- | --- |
| Ganache para cobertura macia | Chocolate e creme de leite em partes iguais, em peso |
| Ganache firme (trufa) | Cerca de 2 partes de chocolate para 1 de creme de leite, em peso |

Para as demais famílias, as razões são **curadas por uma pessoa**, uma única vez, a partir de fontes de peso alto, e registradas em `config/razoes.json`. O agente **não** cria nem altera razões, pois isso seria validar o consenso contra ele mesmo. Família sem razões curadas fica com `agent_enabled = false`. Sem teste prático, essas razões funcionam como filtro automático conservador: receita fora da faixa é rejeitada, não ajustada.

---

## 7. Técnica, tempos e temperaturas

- O agente monta a **sequência técnica consensual**: etapas na ordem em que a maioria das fontes concorda, em tópicos curtos próprios.
- Tempo e temperatura de forno: usar a faixa de consenso; informar que fornos variam e dar um sinal de ponto (cor, textura, teste do palito).
- Temperaturas de segurança e conservação (ovos, laticínios, recheios com perecíveis): vêm de fonte técnica ou oficial, nunca só de portal de receitas (ver `02-PESQUISA.md`, seção 3.2).
- Ponto de calda, ponto de brigadeiro e similares: o agente descreve o sinal visual ou de textura, não só o tempo.
- Receitas que usam ovo cru ou malcozido (mousses, coberturas, cremes) exigem o alerta de segurança da base curada `config/seguranca.json`. Os sinais de risco (ovo cru, laticínio ou creme perecível, fritura, calda quente, álcool, fermentação longa) são calculados por código; **sinal de risco sem entrada na base rejeita a pauta**, e o prazo de conservação só é informado quando vem da base.

---

## 8. Alérgenos e restrições alimentares

### 8.1 Alérgenos

O agente identifica na lista final de ingredientes os alérgenos principais de declaração obrigatória na legislação brasileira de rotulagem (consultar a norma vigente da Anvisa na validação, pois a lista pode ser atualizada). Os mais frequentes em confeitaria: leite, ovos, glúten (trigo), soja, amendoim e castanhas.

- A lista de alérgenos é **calculada por código** a partir do catálogo de ingredientes (`04-ESTRUTURA-CONTEUDO.md`, seção 7), não opinada pelo modelo.
- Receitas com ingredientes que podem ter traços (chocolate com soja e leite) devem trazer aviso.
- Toda receita traz, no **final**, o aviso padrão ao leitor (texto em `01-ARQUITETURA.md`, seção 8.5): conferir os rótulos dos produtos que comprar e considerar alergias e intolerâncias antes de consumir. A compra dos produtos e a decisão de consumo são do leitor, e a lista de alérgenos é o que torna essa decisão possível.

### 8.2 Etiquetas de dieta

- `vegetariana` e `vegana`: só são aplicadas se **todos** os ingredientes do catálogo forem compatíveis e nenhum exigir conferência de rótulo. `sem glúten` e `sem lactose` **não são aplicadas** nas Fases 1 e 2 (alegação de saúde que o projeto não consegue sustentar).
- Atenção a ingredientes industrializados (chocolate, fermento, aromatizantes) que mudam conforme a marca. A receita deve dizer que o leitor confira o rótulo.
- Na dúvida, o agente **não** aplica a etiqueta.

---

## 9. Rendimento e escala

- O rendimento (`servings` na API do site, inteiro de 1 a 500) é coerente com as quantidades: o agente estima o peso total da massa ou do doce e divide pelo tamanho de porção usual.
- Receitas de festa e buffet: registrar o rendimento base e indicar se a receita escala bem. Preparos sensíveis (massas fermentadas, mousses, merengues) têm aviso de limite de escala.
- O agente nunca multiplica quantidades sem avisar sobre ajuste de tempo e de forma.

---

## 10. Originalidade

1. O Chef IA recebe a **ficha consolidada**, não os textos das fontes.
2. A receita é escrita com nome, introdução, passos e dicas próprios.
3. Quando a ficha trouxer base para isso, a receita inclui uma **Dica extra** (variação de sabor, truque de textura, ocasião, forma de servir), fundamentada nos pontos únicos ou no consenso das fontes. Sem base, não há Dica extra.
4. A similaridade com as fichas de fonte é verificada antes do envio (limite em `08-VALIDACAO.md`).
5. O agente **não afirma** que a receita foi testada na cozinha, não cita "testamos" nem "aprovada por família". A formulação aceita é a de receita desenvolvida a partir de referências, com orientações de ponto. Como o conteúdo é assinado como Equipe Chocolícia, o texto também não deve afirmar que alguém da equipe preparou ou aprovou a receita.
6. Nomes de receitas autorais, de chefs ou de marcas não são reutilizados.

---

## 11. Saída: ficha consolidada de receita

Estende a ficha de `02-PESQUISA.md`, seção 7.2, com os campos específicos de receitas:

```json
{
  "pauta": {"tema": "...", "categoria": "...", "subcategoria": "..."},
  "fontes_consultadas": 4,
  "ingrediente_base": "leite condensado",
  "ingredientes_consenso": [
    {"nome": "leite condensado", "quantidade_g": 395, "proporcao": 1.0, "critico": true},
    {"nome": "chocolate em pó", "quantidade_g": 40, "proporcao": 0.10, "critico": true},
    {"nome": "manteiga", "quantidade_g": 15, "proporcao": 0.04, "critico": false}
  ],
  "divergencias": [
    {"ponto": "quantidade de chocolate em pó", "valores_proporcao": [0.08, 0.10, 0.18], "decisao": 0.10, "motivo": "faixa de consenso entre fontes de peso alto"}
  ],
  "tecnica_consenso": ["cozinhar mexendo sem parar", "ponto: a mistura solta do fundo da panela"],
  "tempos": {"preparo_min": 10, "cozimento_min": 15},
  "temperaturas": [],
  "rendimento_estimado": {"porcoes": 12, "base": "porção de cerca de 40 g"},
  "alergenos": ["leite", "soja"],
  "etiquetas_dieta": ["vegetariana"],
  "alertas_seguranca": [],
  "diferencial_sugerido": "... (somente com base nos pontos únicos ou no consenso)",
  "perguntas_comuns": [],
  "armazenamento_base": "entrada correspondente em config/seguranca.json",
  "tecnica_flags": [],
  "sinais_de_risco": [],
  "referencias_registro": [
    {"dominio": "panelinha.com.br", "url": "https://...", "acessado_em": "2026-11-06"}
  ],
  "status": "aprovada_para_criacao"
}
```

Os valores acima são **ilustrativos** e servem apenas para mostrar o formato. Não representam dados reais de nenhuma fonte.

---

## 12. Gate de aprovação (antes da criação)

A ficha segue para o Chef IA somente se:

- [ ] Há ao menos 3 fontes de domínios diferentes e ao menos uma de peso alto (confeitaria).
- [ ] Todas as quantidades foram normalizadas e conferidas contra `config/conversoes.json`.
- [ ] Nenhum ingrediente crítico tem divergência sem decisão registrada.
- [ ] Nenhuma razão de sanidade foi violada.
- [ ] Alérgenos e etiquetas de dieta foram calculados pelos ingredientes.
- [ ] Todos os ingredientes resolvem no catálogo (Fase 1).
- [ ] Os sinais de risco calculados por código têm entrada na base curada `config/seguranca.json` (sem entrada, a pauta é rejeitada).
- [ ] Rendimento coerente com as quantidades.
- [ ] A ficha traz diferencial e as referências para o registro.

Se algum item falhar, o agente tenta uma segunda rodada de pesquisa (uma vez). Se falhar de novo, a pauta é **rejeitada com motivo** e registrada no histórico, e o agente passa à próxima pauta. Como não haverá revisão humana nem teste prático (decisão de 05/11/2026), este gate e a validação de `08-VALIDACAO.md` são as únicas barreiras antes da publicação. Na dúvida, a pauta é rejeitada, nunca enviada com ressalvas.

---

## 13. Casos específicos da Chocolícia

| Caso | Tratamento |
| --- | --- |
| Receitas com chocolate | O eixo "chocolate" entra como etiqueta e coleção. Tipo de chocolate (ao leite, meio amargo, branco, cobertura fracionada) deve ser explícito, pois muda o resultado |
| Receitas de datas especiais (Páscoa, Natal e outras) | A pauta começa algumas semanas antes da data. Verificar rendimento e conservação para presentear |
| Receitas de festa e buffet | Informar rendimento e escalabilidade (seção 9) |
| Receitas de panetone, chocotone e massas fermentadas | Exigem fonte de peso alto e tempos de fermentação com sinais de ponto. Se as fontes divergirem muito, rejeitar a pauta |
| Receitas vegetarianas e veganas | Seguir a seção 8 com rigor. `sem glúten` e `sem lactose` não são aplicadas nas Fases 1 e 2 |

---

## 14. Pendências

| Item | Ação |
| --- | --- |
| Conferir `config/conversoes.json` | Uma vez, contra tabelas de conversão publicadas (sem teste de receita) |
| Definir razões de sanidade por família de receita | Curadoria por pessoa, uma única vez; sem curadoria, a família fica desabilitada |
| Confirmar a lista vigente de alérgenos de rotulagem | Consultar a norma da Anvisa |
| Limites de similaridade e critérios de aprovação | Definidos em `08-VALIDACAO.md`; calibrar com o conjunto de referência |
| Base de segurança `config/seguranca.json` | Curadoria por pessoa, a partir de fontes oficiais, para as famílias da Fase 1 |
| Monitoramento pós-publicação | Canal para o leitor avisar erros e rotina de despublicação; planejar em `07-PUBLICACAO.md` e `08-VALIDACAO.md` |
