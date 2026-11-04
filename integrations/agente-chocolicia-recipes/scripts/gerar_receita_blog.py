#!/usr/bin/env python3
"""Dispara uma única geração de receita no backend do site Chocolícia.

O conteúdo, a imagem, a validação, o storage e a persistência pertencem ao
backend do site; este script é somente um cliente/orquestrador autenticado.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

DEFAULT_SITE_URL = "https://www.chocolicia.site"
ENDPOINT_PATH = "/api/recipes/generate-daily"
REQUEST_TIMEOUT_SECONDS = 150
MAX_RESPONSE_BYTES = 1_000_000
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


class ConfigurationError(ValueError):
    """Configuração local inválida ou ausente."""


class GenerationError(RuntimeError):
    """A geração foi recusada, falhou ou não pode ser confirmada."""


@dataclass(frozen=True)
class TriggerConfig:
    site_url: str
    cron_secret: str | None

    @property
    def endpoint_url(self) -> str:
        return f"{self.site_url}{ENDPOINT_PATH}"


@dataclass(frozen=True)
class GenerationResult:
    status: str
    title: str = ""
    slug: str = ""


def _normalise_site_url(value: str, *, allow_insecure_local: bool) -> str:
    candidate = value.strip()
    try:
        parsed = urlsplit(candidate)
        hostname = (parsed.hostname or "").lower()
        _ = parsed.port  # valida portas malformadas
    except ValueError as exc:
        raise ConfigurationError("CHOCOLICIA_SITE_URL não é um URL válido.") from exc

    if parsed.scheme not in {"https", "http"} or not hostname:
        raise ConfigurationError("CHOCOLICIA_SITE_URL precisa de um URL HTTP(S) válido.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ConfigurationError("CHOCOLICIA_SITE_URL não pode conter credenciais, query ou fragmento.")
    if parsed.path not in {"", "/"}:
        raise ConfigurationError("CHOCOLICIA_SITE_URL deve conter apenas a origem do site, sem caminho.")
    if parsed.scheme != "https" and not (allow_insecure_local and hostname in LOCAL_HOSTS):
        raise ConfigurationError("Use HTTPS; HTTP só é permitido em localhost com ALLOW_INSECURE_LOCAL=true.")

    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def load_config(
    environ: Mapping[str, str] | None = None,
    *,
    require_secret: bool = True,
) -> TriggerConfig:
    values = os.environ if environ is None else environ
    allow_insecure = values.get("ALLOW_INSECURE_LOCAL", "").strip().lower() in {"1", "true", "yes"}
    raw_url = values.get("CHOCOLICIA_SITE_URL", "").strip() or DEFAULT_SITE_URL
    site_url = _normalise_site_url(raw_url, allow_insecure_local=allow_insecure)

    raw_secret = values.get("CRON_SECRET", "")
    if "\r" in raw_secret or "\n" in raw_secret:
        raise ConfigurationError("CRON_SECRET contém caracteres de linha inválidos.")
    secret = raw_secret.strip() or None
    if require_secret and not secret:
        raise ConfigurationError("Defina CRON_SECRET no ambiente do agente.")

    return TriggerConfig(site_url=site_url, cron_secret=secret)


def _http_status_message(status_code: int) -> str:
    if status_code == 401:
        return "HTTP 401: não autorizado; confirme que CRON_SECRET coincide com o valor configurado no site."
    if status_code == 503:
        return "HTTP 503: o endpoint de geração do site não está configurado ou está indisponível."
    if status_code in {502, 504}:
        return f"HTTP {status_code}: não é possível confirmar o resultado; verifique o blog antes de tentar novamente."
    if status_code >= 500:
        return f"HTTP {status_code}: falha do servidor; verifique o estado do blog antes de tentar novamente."
    return f"HTTP {status_code}: o site recusou o pedido de geração."


def trigger_generation(
    config: TriggerConfig,
    *,
    opener: Callable[..., object] | None = None,
) -> GenerationResult:
    """Envia exatamente um POST; nunca repete automaticamente uma geração."""
    if not config.cron_secret:
        raise ConfigurationError("Defina CRON_SECRET no ambiente do agente.")

    request = Request(
        config.endpoint_url,
        data=b"{}",
        headers={
            "Authorization": f"Bearer {config.cron_secret}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Chocolicia-Recipe-Agent/1.0",
        },
        method="POST",
    )
    send = opener or urlopen
    try:
        response = send(request, timeout=REQUEST_TIMEOUT_SECONDS)
    except HTTPError as exc:
        status_code = exc.code
        exc.close()
        raise GenerationError(_http_status_message(status_code)) from None
    except (URLError, TimeoutError, OSError):
        raise GenerationError(
            "Falha de rede/timeout; o pedido pode ter sido processado. Verifique o blog antes de tentar novamente."
        ) from None

    try:
        with response as result_response:
            status_code = getattr(result_response, "status", None)
            if status_code is None:
                status_code = result_response.getcode()
            body = result_response.read(MAX_RESPONSE_BYTES + 1)
    except (URLError, TimeoutError, OSError):
        raise GenerationError(
            "A ligação terminou sem confirmação; verifique o blog antes de tentar novamente."
        ) from None

    if len(body) > MAX_RESPONSE_BYTES:
        raise GenerationError("A resposta do site excede o tamanho esperado; verifique o blog antes de repetir.")
    if not 200 <= int(status_code) < 300:
        raise GenerationError(_http_status_message(int(status_code)))

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise GenerationError("O site devolveu uma resposta JSON inválida; verifique o blog antes de repetir.") from None
    if not isinstance(payload, dict):
        raise GenerationError("O site devolveu uma resposta inesperada; verifique o blog antes de repetir.")

    status = payload.get("status")
    if not isinstance(status, str) or status not in {"published", "draft"}:
        raise GenerationError("O site não confirmou uma receita publicada ou em rascunho; verifique o blog antes de repetir.")

    title = payload.get("title")
    slug = payload.get("slug")
    return GenerationResult(
        status=status,
        title=title.strip() if isinstance(title, str) else "",
        slug=slug.strip() if isinstance(slug, str) else "",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Aciona uma geração de receita no backend da Chocolícia."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Valida URL e configuração sem enviar qualquer pedido ao site.",
    )
    args = parser.parse_args(argv)

    try:
        config = load_config(require_secret=not args.dry_run)
    except ConfigurationError as exc:
        print(f"Configuração inválida: {exc}", file=sys.stderr)
        return 2

    if args.dry_run:
        has_secret = bool(os.environ.get("CRON_SECRET", "").strip())
        print(
            "Dry-run OK: endpoint configurado em "
            f"{urlsplit(config.endpoint_url).netloc}; CRON_SECRET configurado: "
            f"{'sim' if has_secret else 'não'}; nenhum pedido foi enviado."
        )
        return 0

    try:
        result = trigger_generation(config)
    except (ConfigurationError, GenerationError) as exc:
        print(f"Geração não confirmada: {exc}", file=sys.stderr)
        return 1

    label = "publicada" if result.status == "published" else "guardada como rascunho"
    details = f": {result.title}" if result.title else ""
    slug = f" ({result.slug})" if result.slug else ""
    print(f"Receita {label}{details}{slug}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
