# Referência — página Promoção

Fonte: ZIP de referência da campanha de Natal fornecido pelo utilizador, com conteúdo em `src/App.tsx` e fotografias em `public/images/natal/`. O arquivo não declara URL pública de origem.

## Conteúdo explícito na referência

- Campanha “Natal Chocolícia”: **25% de desconto**, encomendas até **22/12/2026** ou enquanto durarem os estoques.
- Chocotone: 100 g R$ 16,50; 250 g R$ 35,90; 500 g R$ 78,00.
- Panetone tradicional: 100 g R$ 13,00; 250 g R$ 20,00; 500 g R$ 35,00.
- Bolo de nozes com chocolate: R$ 240,00; 20 a 30 fatias; topo de bolo de brinde.
- Kit Ceia: a partir de R$ 150,00.
- Kit Presente contém palitos de chocolate, donuts de chocolate e mini chocotone.
- A referência fornece fotografias de hero, Chocotone, Panetone, bolo, palitos, donuts, Kit Presente, ceia e Kit Ceia.
- O número WhatsApp no ZIP coincide com `SITE.whatsappNumber` do repositório principal; usar sempre o helper oficial da aplicação.

## Campos incompletos ou divergentes

- No ZIP, “Chocolates em palitos” e “Chocolates em donuts” estavam com `R$ 00,00`. Em 04/11/2026 o usuário informou R$ 25 para Chocolate em palito e R$ 35 para Donuts de chocolate; os cards exibem R$ 25,00 e R$ 35,00.
- A Caixa de bombons do ZIP usava `[PREÇO]` e não tinha imagem. O utilizador forneceu uma fotografia e informou Chocolate quadrado R$ 30. A imagem foi convertida sem recorte para `client/public/images/promocao/caixa-bombons.webp`; o card usa o título “Chocolate quadrado” e exibe R$ 30,00. Não foi inferida unidade ou peso.
- Testemunhos usam `[DEPOIMENTO]`, `[NOME DO CLIENTE]` e `[NÚMERO]`; FAQs usam `[RESPOSTA]`. Não publicar placeholders nem conteúdo inventado.
- O código original conta o prazo até 25/12/2026, mas a promoção vence em 22/12/2026. Usar 22/12/2026 às 23:59:59 no fuso UTC−03:00 para o countdown.
- A referência informa 25% de desconto mas não especifica produtos/condições participantes. O CTA direciona ao WhatsApp para confirmar as condições; não calcular nem anunciar preços descontados não fornecidos.
