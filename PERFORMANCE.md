# Diagnóstico de desempenho e UX — Chocolícia

**Data das medições:** 4 de novembro de 2026 (UTC). **Perfil:** Lighthouse 13.6.0, Chromium headless, mobile, relatórios de laboratório. A tabela conserva a última medição Lighthouse disponível; a extração limpa do ZIP foi novamente instalada e compilada, mas não medida por Lighthouse. O domínio publicado ainda não contém as mudanças locais do blog: o HTML público medido tinha 48.316 bytes e não continha “Receitas recentes” nem o título da página de receitas. O build local foi servido por Vite Preview, sem banco de dados ou handlers Vercel; conteúdo real de receitas, consultas e backend não foram medidos.

## Escopo observado

Site institucional/landing de doces artesanais e buffet, com conversão principalmente para WhatsApp. Stack: Vite, React, Wouter, Tailwind 4, shadcn, Express/tRPC, Drizzle/Postgres; SSG para páginas estáticas e Vercel para hosting/API. Provedor PostgreSQL, pooler e headers das funções continuam por confirmar.

## Medições Lighthouse mobile

| Indicador | Produção anterior (baseline, código antigo) | Build local antes da otimização | Build local da última medição Lighthouse |
|---|---:|---:|---:|
| Performance | 56 | 87 | 87 |
| SEO | 100 | 100 | 100 |
| Acessibilidade | 93 | 93 | 93 |
| Boas práticas | 96 | 92 | 92 |
| LCP | 7,2 s | 3,9 s | 3,9 s |
| TBT | 220 ms | 110 ms | 70 ms |
| CLS | 0,001 | 0,001 | 0,001 |
| TTFB | 482 ms | 3 ms | 3 ms |
| Transferência total | 1.848 KiB | 1.652 KiB | 1.653 KiB |
| Requisições | 35 | 33 | 35 |
| Imagens transferidas | 1.318 KB | 1.094 KB | 1.094 KB |
| JavaScript transferido | 364 KB | 376 KB | 356 KB |

A última nota local registada foi 87, com LCP de 3,9 s; esta nota não foi repetida na extração final do ZIP. Execuções de laboratório podem variar aproximadamente um ponto. A produção antiga e o preview local não são versões equivalentes; o TTFB local não representa a Vercel. Lighthouse não mede INP de usuários reais; TBT é apenas um indicador de bloqueio da thread, não substituto de INP. A API pública PageSpeed Insights respondeu HTTP 429 na auditoria anterior.

## Alterações realizadas e resultado medido

- **Code splitting por rota:** páginas `/receitas`, `/receitas/:slug`, Buffet, Bolos, Doces, Áreas Atendidas, Políticas/Termos e 404 carregam módulos próprios sob demanda no navegador. A Home permanece síncrona para preservar seu carregamento inicial. A árvore de SSG/SSR também continua síncrona, mantendo conteúdo, metas, H1 e páginas pré-renderizadas. O bundle principal no build limpo do ZIP é **493,15 kB minificados (152,37 kB gzip)**, ante **571,66 kB (169,80 kB gzip)** na referência anterior: redução de 78,51 kB brutos/17,43 kB gzip; o bundle inicial permanece abaixo de 500 kB. Os indicadores de transferência e TBT na tabela são da última medição Lighthouse registada, não foram recalculados para esta extração.
- **Chunks das páginas:** Buffet 10,29 kB, Bolos 10,38 kB, Doces 10,17 kB, Áreas 9,72 kB, Políticas 8,50 kB, 404 2,21 kB; Receitas 11,49 kB e detalhe 30,76 kB (tamanhos minificados, antes de gzip).
- **Skeleton das páginas antigas:** a navegação mostra blocos de espera em tons quentes, com o header escuro, estrutura, espaçamentos e botão WhatsApp equivalentes ao shell existente. Aceito pelo utilizador para a navegação durante o carregamento; a Home não usa o skeleton. O Vite Preview confirmou que todas as páginas continuam com HTML/SEO pré-renderizados e a hidratação termina sem manter o fallback. Verificações de smoke confirmaram títulos/H1 das seis rotas.
- **Prioridade da imagem LCP:** o insight identificou `/images/bolo-aniversario.webp` como elemento LCP e apontou ausência de prioridade alta. Acrescentei `preload` com `fetchpriority=high` somente ao HTML pré-renderizado da Home, sem alterar JSX, imagem ou layout do hero. Lighthouse reconheceu a dica, mas o LCP agregado permaneceu em 3,9 s, sem ganho mensurável nesta execução. Os subtotais do insight de rede/renderização não reconciliam com o LCP agregado; não atribuo todo o atraso à transferência da imagem.
- **Cache Vercel:** foi configurado `Cache-Control: public, max-age=31536000, immutable` somente para `/assets/*` com nomes hashados; o HTML mantém revalidação. A produção anterior enviava `max-age=0, must-revalidate` mesmo para JS/CSS hashados. O efeito do novo cabeçalho não foi medido na produção, pois não fiz deploy.
- **Revisão visual:** capturas locais em 390×844 e 1440×900 foram revistas. O conteúdo do hero e `TechText` não foi alterado. As capturas são verificações pós-alteração, não uma comparação pixel a pixel; não havia screenshot baseline local salvo antes.

## Achados ainda abertos

- O objetivo de Performance **≥90 continua por confirmar e a última leitura registada ficou abaixo da meta**: Lighthouse mobile mediu 87, com LCP 3,9 s. A extração final do ZIP não foi submetida a nova medição Lighthouse; SEO local mediu 100 na auditoria anterior.
- O insight de LCP reconhece a prioridade alta do preload, mas não mostrou redução agregada nesta rodada. Não substituí nem recomprimi imagens. O relatório local transferiu 1.094 KB de imagens; imagens abaixo da dobra encontradas no código usam `loading="lazy"`, e CLS ficou em 0,001.
- O gtag já usa `async` e ainda representa cerca de 80 KiB entre os recursos não usados na carga inicial. Atrasá-lo mais pode perder pageviews/conversões em saídas rápidas; não alterei sua temporização.
- Vercel confirmou Brotli, HSTS e `x-vercel-cache: HIT` na versão pública anterior. CSP, `X-Content-Type-Options` e `Referrer-Policy` não foram confirmados; `Access-Control-Allow-Origin: *` apareceu em respostas estáticas. Não alterei headers de segurança sem inventariar domínios/integrações.
- Não fiz deploy, não acessei a base de dados e não executei migration ou seed por falta de credenciais; as medições não incluem dados reais nem o novo cache de assets em produção.

## Próximos passos

Para medir o resultado real, publicar a versão e repetir Lighthouse nas mesmas condições no domínio Vercel; conferir o novo cabeçalho dos assets; aplicar migration/seed em staging e medir as consultas; recolher INP real quando houver tráfego. O LCP ainda é o principal obstáculo à meta. Outras mudanças — por exemplo, adiar analytics ou alterar carregamento/efeitos de componentes abaixo da dobra da Home — podem afetar atribuição ou experiência e ficam sujeitas a autorização separada.

**Fonte pública:** `https://www.chocolicia.site/` e assets dessa versão. **Ferramenta:** Lighthouse CLI 13.6.0, Chromium `/usr/bin/chromium`, perfil mobile; relatórios JSON detalhados ficaram temporariamente no ambiente e não foram incluídos no repositório.
