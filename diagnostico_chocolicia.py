#!/usr/bin/env python3
r"""
diagnostico_chocolicia.py

Diagnostico unico dos dois repositorios do projeto Chocolicia:
  - site:   repositorio `chocolicia` (TypeScript / Vercel / Drizzle)
  - agente: repositorio `agente-chocolicia` (Python)

Em vez de gerar um relatorio por repositorio e voce cruzar manualmente,
este script recebe os DOIS caminhos de uma vez e produz um unico relatorio
organizado no funil que o projeto realmente precisa:

    1) Geracao       (agente consegue gerar uma receita?)
    2) Persistencia  (agente e site tem onde guardar o que geram?)
    3) Integracao    (agente e site falam o mesmo contrato/token?)
    4) Publicacao    (o site publica e expoe o que recebe?)

Uso:
    python diagnostico_chocolicia.py <caminho_do_site> <caminho_do_agente>

    # tambem funciona no modo antigo (um repositorio so, auto-detectado):
    python diagnostico_chocolicia.py <caminho_do_repo>
    python diagnostico_chocolicia.py            # usa o diretorio atual

Nao executa nada do codigo auditado, nao acessa rede nem banco de dados.
So le arquivos de texto (e, best-effort, roda `git remote -v` via
subprocess, ignorando qualquer falha). Nunca imprime valores de segredo
encontrados — so o caminho e a linha onde o padrao bateu.

Toda checagem individual esta protegida por try/except: uma checagem que
falhar vira "NAO VERIFICADO" com o motivo, e o script nunca quebra por
causa de uma unica checagem com problema.
"""

from __future__ import annotations

import datetime as _dt
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

OK, FALTA, ATENCAO, NV = "OK", "FALTA", "ATENÇÃO", "NÃO VERIFICADO"
ICONE = {OK: "✅", FALTA: "❌", ATENCAO: "⚠️", NV: "❓"}


# --------------------------------------------------------------------------
# Infraestrutura basica (leitura segura, nunca lança para fora)
# --------------------------------------------------------------------------

def ler(raiz: Path | None, rel: str) -> str | None:
    if raiz is None:
        return None
    caminho = raiz / rel
    if not caminho.is_file():
        return None
    try:
        return caminho.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def existe(raiz: Path | None, rel: str) -> bool:
    return raiz is not None and (raiz / rel).exists()


def existe_qualquer(raiz: Path | None, *rels: str) -> str | None:
    """Devolve o primeiro caminho relativo que existir, ou None."""
    for rel in rels:
        if existe(raiz, rel):
            return rel
    return None


def bate(texto: str | None, padrao: str) -> tuple[bool, str | None]:
    """Casa um padrao de regex (case-insensitive) de forma blindada.

    Nunca embute flags no padrao; a flag vem sempre pelo parametro,
    nunca inline, para evitar o erro "global flags not at the start".
    Devolve (resultado, motivo_de_falha_ou_None).
    """
    if texto is None:
        return False, None
    try:
        return bool(re.search(padrao, texto, re.IGNORECASE)), None
    except re.error as erro:
        return False, f"padrão de busca inválido ({erro})"


def listar(raiz: Path | None, padrao_glob: str) -> list[Path]:
    if raiz is None:
        return []
    try:
        return sorted(raiz.glob(padrao_glob))
    except OSError:
        return []


def git(raiz: Path | None, *args: str) -> str | None:
    if raiz is None:
        return None
    try:
        resultado = subprocess.run(
            ["git", *args], cwd=raiz, capture_output=True, text=True,
            timeout=10, check=False,
        )
        return resultado.stdout.strip() if resultado.returncode == 0 else None
    except (OSError, subprocess.SubprocessError):
        return None


SEGREDO_RE = re.compile(
    r"""(api_key|token|secret|password|senha)\s*[:=]\s*['"][^'"\s]{8,}['"]""",
    re.IGNORECASE,
)


def procurar_segredos(raiz: Path | None, padrao_arquivos: str, limite: int = 4000) -> list[str]:
    if raiz is None:
        return []
    achados: list[str] = []
    n = 0
    for caminho in raiz.rglob(padrao_arquivos):
        partes = caminho.parts
        if any(p in partes for p in ("node_modules", ".git", "venv", "__pycache__")):
            continue
        n += 1
        if n > limite:
            break
        try:
            texto = caminho.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for numero, linha in enumerate(texto.splitlines(), start=1):
            if SEGREDO_RE.search(linha):
                achados.append(f"{caminho.relative_to(raiz)}:{numero}")
    return achados


# --------------------------------------------------------------------------
# Modelo do relatorio
# --------------------------------------------------------------------------

@dataclass
class Item:
    status: str
    nome: str
    detalhe: str
    fonte: str


@dataclass
class Etapa:
    titulo: str
    itens: list[Item] = field(default_factory=list)

    def add(self, status: str, nome: str, detalhe: str, fonte: str) -> None:
        self.itens.append(Item(status, nome, detalhe, fonte))

    def pior_status(self) -> str:
        if any(i.status == FALTA for i in self.itens):
            return FALTA
        if any(i.status == ATENCAO for i in self.itens):
            return ATENCAO
        if any(i.status == NV for i in self.itens):
            return NV
        return OK


def checagem_segura(etapa: Etapa, status_ok: bool, nome: str, detalhe_ok: str,
                     detalhe_falta: str, fonte: str, motivo_erro: str | None = None,
                     status_quando_falta: str = FALTA) -> None:
    if motivo_erro:
        etapa.add(NV, nome, f"Checagem automática falhou: {motivo_erro}", fonte)
    elif status_ok:
        etapa.add(OK, nome, detalhe_ok, fonte)
    else:
        etapa.add(status_quando_falta, nome, detalhe_falta, fonte)


# --------------------------------------------------------------------------
# Deteccao de tipo (modo compatibilidade, um repo so)
# --------------------------------------------------------------------------

def detectar_tipo(raiz: Path) -> str:
    pkg = ler(raiz, "package.json")
    if pkg:
        try:
            if json.loads(pkg).get("name") == "chocolicia":
                return "site"
        except json.JSONDecodeError:
            pass
    if existe(raiz, "vercel.json") and existe(raiz, "drizzle"):
        return "site"
    if existe(raiz, "rodar_agente.py") or existe(raiz, "agents") or existe(raiz, "pipeline"):
        return "agente"
    return "desconhecido"


# --------------------------------------------------------------------------
# Etapa 1 — Geração (agente consegue gerar algo?)
# --------------------------------------------------------------------------

def etapa_geracao(agente: Path | None) -> Etapa:
    e = Etapa("1) Geração — o agente consegue gerar uma receita?")
    fonte_plano = "PLANO-REFATORACAO-AGENTE.md §5 (Passos 2, 5 e 6); 01-ARQUITETURA.md §11"

    if agente is None:
        e.add(NV, "Repositório do agente não informado",
              "Rode o script passando o caminho do agente-chocolicia como segundo argumento",
              fonte_plano)
        return e

    llm_service = ler(agente, "services/llm_service.py")
    ok, erro = bate(llm_service, r"def\s+gerar_texto|chat/completions|openai|anthropic|groq")
    checagem_segura(
        e, ok, "services/llm_service.py chama algum provedor de LLM",
        "Encontrada referência a um provedor de LLM ou a uma função gerar_texto",
        "Não encontrado — sem isso, nada pode ser gerado (Passo 2 do plano)",
        "PLANO-REFATORACAO-AGENTE.md Passo 2, item 5", erro,
    )

    editor = existe_qualquer(agente, "agents/editor.py")
    e.add(OK if editor else FALTA, "agents/editor.py (Chef IA / criação de receita)",
          "Presente" if editor else "Ausente — é quem monta o prompt e valida a saída JSON do modelo",
          "01-ARQUITETURA.md §11 e §12; PLANO-REFATORACAO-AGENTE.md Passo 6")

    prompts_existentes = [p.name for p in listar(agente, "prompts/*.md")]
    e.add(OK if prompts_existentes else FALTA, "Arquivos de prompt versionados em prompts/",
          f"Encontrados: {', '.join(prompts_existentes)}" if prompts_existentes else
          "Nenhum prompts/*.md encontrado — sem eles o editor não tem o que enviar ao modelo",
          "03-PROMPT-SISTEMA.md §2 e §5")

    pipeline = existe_qualquer(agente, "pipeline/gerar_receitas.py", "pipeline/gerar_artigos.py")
    e.add(OK if pipeline else FALTA, "Pipeline executável (gerar_receitas.py)",
          f"Encontrado: {pipeline}" if pipeline else
          "pipeline/gerar_receitas.py ausente — é o ponto de entrada do fluxo completo (etapas 1 a 8)",
          "01-ARQUITETURA.md §7.2 e §11; PLANO-REFATORACAO-AGENTE.md Passo 9")

    modelos_aprovados = existe(agente, "config/modelos_aprovados.json")
    e.add(OK if modelos_aprovados else FALTA, "config/modelos_aprovados.json",
          "Presente" if modelos_aprovados else
          "Ausente — 01-ARQUITETURA.md §15 exige abortar a execução se não houver lista aprovada",
          "01-ARQUITETURA.md §12 e §15")

    return e


# --------------------------------------------------------------------------
# Etapa 2 — Persistência (onde cada lado guarda o que importa)
# --------------------------------------------------------------------------

def etapa_persistencia(site: Path | None, agente: Path | None) -> Etapa:
    e = Etapa("2) Persistência — agente e site têm onde guardar o conteúdo?")

    if agente is not None:
        schema_agente = listar(agente, "**/schema_agente*.sql") + listar(agente, "**/schema_agente*.py")
        hist_repo = existe_qualquer(agente, "repositories/historico_repository.py")
        tem_banco_agente = bool(schema_agente) or bool(hist_repo)
        e.add(OK if tem_banco_agente else FALTA, "Banco próprio do agente (agent_runs/agent_generations)",
              f"Encontrado: {schema_agente or hist_repo}" if tem_banco_agente else
              "Não encontrado — sem isso o agente não tem fila de pautas nem histórico de gerações",
              "04-ESTRUTURA-CONTEUDO.md §8.9; PLANO-REFATORACAO-AGENTE.md Passo 3")
    else:
        e.add(NV, "Banco do agente", "Repositório do agente não informado", "—")

    if site is not None:
        schema_site = ler(site, "drizzle/schema.ts")
        ok, erro = bate(schema_site, r"export const recipes\s*=")
        checagem_segura(e, ok, "Tabela `recipes` no site (drizzle/schema.ts)",
                         "Definida", "Não encontrada — isso seria inesperado no site atual",
                         "drizzle/schema.ts")

        insert_fn = ler(site, "server/recipeDb.ts")
        ok2, erro2 = bate(insert_fn, r"export\s+async\s+function\s+insertRecipe")
        checagem_segura(e, ok2, "server/recipeDb.ts expõe insertRecipe()",
                         "Presente", "Não encontrada",
                         "server/recipeDb.ts", erro2)

        tabelas_novas = ["categories", "ingredients", "recipe_ingredients", "articles"]
        faltando = [t for t in tabelas_novas
                    if not bate(schema_site, rf"export const {t}\s*=")[0]]
        if faltando:
            e.add(FALTA, "Tabelas novas da taxonomia (categories/ingredients/articles)",
                  f"Ausentes em drizzle/schema.ts: {', '.join(faltando)} — Bloco 1 de "
                  "CODEX-01-SITE-BASE.md ainda não foi aplicado ao site",
                  "04-ESTRUTURA-CONTEUDO.md §8; CODEX-01-SITE-BASE.md Etapa 1")
        else:
            e.add(OK, "Tabelas novas da taxonomia", "Todas encontradas", "04-ESTRUTURA-CONTEUDO.md §8")
    else:
        e.add(NV, "Persistência no site", "Repositório do site não informado", "—")

    return e


# --------------------------------------------------------------------------
# Etapa 3 — Integração (é aqui que normalmente está o problema real)
# --------------------------------------------------------------------------

def etapa_integracao(site: Path | None, agente: Path | None) -> Etapa:
    e = Etapa("3) Integração — agente e site falam o mesmo contrato?")

    cliente_site = ler(agente, "integration/cliente_site.py") if agente else None
    adaptador = existe_qualquer(agente, "integration/adaptador_receita.py") if agente else None
    e.add(OK if cliente_site else FALTA, "integration/cliente_site.py (lado do agente)",
          "Presente" if cliente_site else
          "Ausente — sem ele o agente não tem como chamar a API do site",
          "01-ARQUITETURA.md §11; PLANO-REFATORACAO-AGENTE.md Passo 4")
    e.add(OK if adaptador else FALTA, "integration/adaptador_receita.py (lado do agente)",
          "Presente" if adaptador else "Ausente — converte a saída do Chef IA para o payload da API",
          "01-ARQUITETURA.md §11; PLANO-REFATORACAO-AGENTE.md Passo 4")

    # Nomes de variável de ambiente que o agente, segundo a documentação, deveria usar
    env_agente = ler(agente, ".env.example") if agente else None
    nomes_esperados_agente = ["SITE_BASE_URL", "SITE_TOKEN_DRAFT", "SITE_TOKEN_PUBLISH"]
    faltando_agente = [n for n in nomes_esperados_agente if not bate(env_agente, re.escape(n))[0]]
    if agente is not None:
        if faltando_agente:
            e.add(ATENCAO if env_agente else FALTA,
                  "Variáveis de ambiente do agente para falar com o site",
                  (f"Não encontradas no .env.example do agente: {', '.join(faltando_agente)}"
                   if env_agente else "Arquivo .env.example do agente não encontrado"),
                  "06-INTEGRACAO.md §3")
        else:
            e.add(OK, "Variáveis de ambiente do agente para falar com o site", "Todas presentes",
                  "06-INTEGRACAO.md §3")

    # O ponto mais provável de quebra: nome e escopo do token no SITE
    env_site = ler(site, ".env.example") if site else None
    recipes_routes = ler(site, "server/recipesRoutes.ts") if site else None
    tem_token_legado = bate(recipes_routes, r"RECIPES_AGENT_TOKEN\b(?!_)")[0]
    tem_escopos_site = bate(env_site, r"RECIPES_AGENT_TOKEN_DRAFT")[0] and \
        bate(env_site, r"RECIPES_AGENT_TOKEN_PUBLISH")[0]
    if site is not None:
        if tem_token_legado and not tem_escopos_site:
            e.add(FALTA, "Token do agente no site ainda é único (sem escopo draft/publish)",
                  "server/recipesRoutes.ts valida contra process.env.RECIPES_AGENT_TOKEN — um token só, "
                  "sem os escopos draft/publish que 06-INTEGRACAO.md §4 e CODEX-01-SITE-BASE.md Etapa 2 "
                  "exigem. Se o agente enviar o payload novo (contrato v1) para este endpoint, a "
                  "validação Zod atual (que ainda espera `category` do enum antigo e `coverImageUrl` "
                  "obrigatório) muito provavelmente vai rejeitar com 400.",
                  "06-INTEGRACAO.md §4 e §6; server/recipesRoutes.ts")
        elif tem_escopos_site:
            e.add(OK, "Token do agente no site tem escopos draft/publish", "Confirmado",
                  "06-INTEGRACAO.md §4")
        else:
            e.add(NV, "Esquema de token do site", "Não foi possível determinar", "—")

    contrato_version = bate(recipes_routes, r"X-Contract-Version")[0] if site else False
    if site is not None:
        e.add(OK if contrato_version else FALTA, "Site lê o cabeçalho X-Contract-Version",
              "Encontrado" if contrato_version else
              "Não encontrado — sem isso o site não consegue distinguir o payload legado do contrato v1 "
              "(06-INTEGRACAO.md §6.1), então qualquer envio no formato novo cai na validação antiga",
              "06-INTEGRACAO.md §6.1 e §14")

    schema_recipe = ler(site, "shared/recipes.ts") if site else None
    espera_categoria_enum = bate(schema_recipe, r"category:\s*recipeCategorySchema")[0]
    espera_subcategoria = bate(schema_recipe, r"subcategorySlug")[0]
    if site is not None:
        if espera_categoria_enum and not espera_subcategoria:
            e.add(FALTA, "Schema do site ainda exige `category` (enum fixo), não `subcategorySlug`",
                  "shared/recipes.ts: recipeInputSchema pede `category` do RECIPE_CATEGORIES antigo. "
                  "Se o agente (seguindo 03-PROMPT-SISTEMA.md §6.2) enviar `subcategoria`/`subcategorySlug` "
                  "em vez de `category`, a validação Zod do site falha e o POST /api/recipes devolve 400 "
                  "antes mesmo de chegar à etapa de gravação.",
                  "shared/recipes.ts; 06-INTEGRACAO.md §6.2")
        elif espera_subcategoria:
            e.add(OK, "Schema do site já aceita subcategorySlug", "Confirmado", "06-INTEGRACAO.md §6.2")

    return e


# --------------------------------------------------------------------------
# Etapa 4 — Publicação
# --------------------------------------------------------------------------

def etapa_publicacao(site: Path | None) -> Etapa:
    e = Etapa("4) Publicação — o site expõe o que recebe?")
    if site is None:
        e.add(NV, "Repositório do site não informado", "—", "—")
        return e

    rotas = ler(site, "server/recipesRoutes.ts")
    ok, erro = bate(rotas, r'router\.(get|post)\(\s*"/"')
    checagem_segura(e, ok, "POST /api/recipes existe", "Encontrado", "Não encontrado", "server/recipesRoutes.ts", erro)

    sitemap = ler(site, "server/recipeSitemap.ts")
    so_publicados = bate(sitemap, r'status,\s*"published"')[0] or bate(sitemap, r'eq\([^)]*status[^)]*"published"\)')[0]
    e.add(OK if so_publicados else ATENCAO, "Sitemap inclui só conteúdo `published`",
          "Confirmado" if so_publicados else "Não confirmado por busca estática — revisar manualmente",
          "05-SEO.md §10.1")

    cron = ler(site, "vercel.json")
    tem_cron = bate(cron, "generate-daily")[0]
    e.add(ATENCAO if tem_cron else OK, "Cron interno `generate-daily` ainda ativo",
          ("Ainda ativo — é esperado até o agente entrar em produção (01-ARQUITETURA.md §7.3); "
           "mas se o agente também estiver tentando publicar, as duas fontes podem gerar receitas "
           "duplicadas ou brigar pelo limite diário") if tem_cron else "Desativado",
          "01-ARQUITETURA.md §7.3")

    return e


# --------------------------------------------------------------------------
# Modo compatibilidade: auditoria de um único repositório (sem funil)
# --------------------------------------------------------------------------

def checar_repo_unico(raiz: Path) -> str:
    tipo = detectar_tipo(raiz)
    if tipo == "site":
        etapas = [etapa_persistencia(raiz, None), etapa_integracao(raiz, None), etapa_publicacao(raiz)]
    elif tipo == "agente":
        etapas = [etapa_geracao(raiz), etapa_persistencia(None, raiz), etapa_integracao(None, raiz)]
    else:
        return ("Não foi possível identificar se este é o repositório do site (`chocolicia`) ou do "
                "agente (`agente-chocolicia`). Rode com os dois caminhos: \n"
                "  python diagnostico_chocolicia.py <site> <agente>")
    return renderizar([f"Repositório único detectado: **{tipo}** ({raiz})"], etapas)


# --------------------------------------------------------------------------
# Renderização
# --------------------------------------------------------------------------

def renderizar(cabecalho_extra: list[str], etapas: list[Etapa]) -> str:
    agora = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linhas = ["# Diagnóstico Chocolícia — funil Geração → Persistência → Integração → Publicação", ""]
    linhas.append(f"Gerado em: {agora}")
    linhas.extend(cabecalho_extra)
    linhas.append("")
    linhas.append("## Resumo do funil")
    linhas.append("")
    for et in etapas:
        linhas.append(f"- {ICONE[et.pior_status()]} **{et.titulo}**")
    linhas.append("")
    linhas.append("## Detalhe")
    for et in etapas:
        linhas.append("")
        linhas.append(f"### {et.titulo}")
        linhas.append("")
        for item in et.itens:
            linhas.append(f"- {ICONE[item.status]} **{item.nome}** — {item.detalhe}  ")
            linhas.append(f"  _Fonte: {item.fonte}_")
    linhas.append("")
    linhas.append(
        "> Auditoria estática: só lê arquivos. `FALTA` indica padrão/arquivo esperado e não "
        "encontrado; `ATENÇÃO` indica algo que merece revisão manual, não necessariamente um erro; "
        "`NÃO VERIFICADO` indica que a checagem automática não pôde concluir (e nesse caso o script "
        "não quebra: só marca o item e segue)."
    )
    return "\n".join(linhas)


def main(argv: list[str]) -> int:
    args = argv[1:]
    data = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")

    if len(args) >= 2:
        site = Path(args[0]).resolve()
        agente = Path(args[1]).resolve()
        for rotulo, caminho in (("site", site), ("agente", agente)):
            if not caminho.exists():
                print(f"Caminho do {rotulo} não encontrado: {caminho}", file=sys.stderr)
                return 2
        cabecalho = [f"- Site: `{site}`", f"- Agente: `{agente}`"]
        etapas = [
            etapa_geracao(agente),
            etapa_persistencia(site, agente),
            etapa_integracao(site, agente),
            etapa_publicacao(site),
        ]
        md = renderizar(cabecalho, etapas)
        nome_saida = f"DIAGNOSTICO-CHOCOLICIA-FUNIL-{data}.md"
    else:
        raiz = Path(args[0]).resolve() if args else Path.cwd()
        if not raiz.exists():
            print(f"Caminho não encontrado: {raiz}", file=sys.stderr)
            return 2
        md = checar_repo_unico(raiz)
        nome_saida = f"DIAGNOSTICO-CHOCOLICIA-{detectar_tipo(raiz)}-{data}.md"

    print(md)
    try:
        (Path.cwd() / nome_saida).write_text(md, encoding="utf-8")
        print(f"\n(arquivo salvo em {Path.cwd() / nome_saida})", file=sys.stderr)
    except OSError as erro:
        print(f"\n(não foi possível salvar o arquivo: {erro})", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
