# Integração do agente Chocolícia com o blog de receitas

Este diretório é um **overlay pequeno** para o projeto Python recebido (`agente-chocolicia.zip`), não uma cópia do projeto. A auditoria do ZIP identificou um agente de artigos/notícias de tecnologia que publica noutro fluxo; ele não produz receitas nem os campos estruturados do blog (`ingredients`, `steps`, `prepTimeMin`, `servings`, `difficulty`, imagem e categoria).

Em vez de duplicar o pipeline de artigos, banco, upload de imagens ou GitHub, o script faz uma única chamada autenticada `POST /api/recipes/generate-daily`. O backend já existente do site é o proprietário da geração culinária, schema, imagem, storage, deduplicação, persistência e estado de publicação. O script é o acionador/orquestrador do agente; não gera conteúdo localmente.

## Instalar no projeto Python

Copie/mescle estes itens na raiz do repositório do agente:

- `scripts/gerar_receita_blog.py`
- `.github/workflows/gerar-receita-blog.yml`
- `tests/test_gerar_receita_blog.py` (opcional, recomendado)

Não substitua o agente de artigos/notícias, `rodar_agente.py`, bancos, workflows atuais ou ficheiros de ambiente. O workflow novo é manual (`workflow_dispatch`) e **não tem `schedule`**: o Vercel Cron existente continua a única geração diária automática de receitas. Uma execução manual no mesmo dia de uma geração automática cria uma geração extra; use-a apenas quando isso for intencional.

## Configuração segura

No repositório GitHub do agente, crie a variável `CHOCOLICIA_SITE_URL` com `https://www.chocolicia.site`. Crie o secret `CRON_SECRET` com o mesmo valor configurado em `CRON_SECRET` no Vercel do site. O workflow injeta o segredo somente no passo que envia a geração; não o imprime. Não grave o valor no código, `.env.example`, logs ou ZIP.

Para execução local, configure essas variáveis no ambiente (não no repositório) e execute:

```bash
python scripts/gerar_receita_blog.py --dry-run
python scripts/gerar_receita_blog.py
```

O `--dry-run` valida o endereço sem enviar request e não exige segredo. A URL deve ser HTTPS; `http://localhost` só é permitido com `ALLOW_INSECURE_LOCAL=true`. Não há dependências Python adicionais.

## Operação e segurança

No GitHub, use **Actions → Gerar receita do blog Chocolícia → Run workflow**. A entrada começa em `dry_run=true`; a execução real exige desmarcá-la. Não a use como uma segunda agenda diária. A publicação pode ficar em rascunho se `AUTO_PUBLISH=false` no site.

O cliente envia **um POST por execução**, sem retry automático. Em timeout ou resposta 502/504, a geração pode já ter sido concluída: confira `/receitas`/o log do site antes de tentar de novo. A conta Actions recebe apenas `contents: read` e o workflow não necessita das chaves de LLM, redes sociais, GitHub publishing, banco, S3 ou tokens do agente de artigos.

Não aponte este adaptador ao banco `artigos` nem às rotas `/api/conteudos`. Ele usa o endpoint de geração do blog, autenticado por `CRON_SECRET`; `RECIPES_AGENT_TOKEN` é destinado a uma integração diferente que já tenha um payload final completo para `POST /api/recipes`.

## Testes locais sem efeitos externos

Na raiz do projeto Python do agente, execute:

```bash
python -m unittest discover -s tests -p 'test_gerar_receita_blog.py'
```

Os testes substituem o transporte HTTP por mocks e não chamam LLM, banco, GitHub, workflow, storage ou internet.


## Nota de segurança sobre o projeto recebido

A revisão estática encontrou no `api.py` antigo endpoints de escrita/edição/exclusão/publicação sem autenticação visível e CORS amplo. Não exponha essa API FastAPI à internet sem uma revisão própria de autenticação, autorização e CORS. Este overlay não a chama nem a publica; usa apenas o endpoint de receita do site, autenticado por bearer. Também não copie as credenciais globais dos workflows antigos para o novo workflow: ele recebe somente `CRON_SECRET` no passo de geração.

Antes de acionar o workflow real, publique no site a versão que contém `/api/recipes/generate-daily` e configure `CRON_SECRET` no Vercel e no secret do GitHub. Se `AUTO_PUBLISH=false`, a receita será gravada como rascunho e não aparecerá na listagem pública até ser publicada.
