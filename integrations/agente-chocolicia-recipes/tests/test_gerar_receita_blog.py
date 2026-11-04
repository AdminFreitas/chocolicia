from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from unittest.mock import Mock, patch

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import gerar_receita_blog as client  # noqa: E402


class FakeResponse:
    def __init__(self, payload: bytes, status: int = 201) -> None:
        self.payload = payload
        self.status = status

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def getcode(self) -> int:
        return self.status

    def read(self, _limit: int = -1) -> bytes:
        return self.payload


class RecipeBlogClientTests(unittest.TestCase):
    def test_config_defaults_to_public_site_and_requires_secret(self) -> None:
        config = client.load_config({"CRON_SECRET": "fixture-secret"})
        self.assertEqual(config.site_url, "https://www.chocolicia.site")
        self.assertEqual(config.endpoint_url, "https://www.chocolicia.site/api/recipes/generate-daily")

    def test_dry_run_allows_missing_secret_and_never_calls_network(self) -> None:
        with patch.dict("os.environ", {"CHOCOLICIA_SITE_URL": "https://www.chocolicia.site"}, clear=True):
            with patch.object(client, "urlopen", side_effect=AssertionError("network call forbidden")):
                self.assertEqual(client.main(["--dry-run"]), 0)

    def test_insecure_nonlocal_url_is_rejected(self) -> None:
        with self.assertRaises(client.ConfigurationError):
            client.load_config({"CHOCOLICIA_SITE_URL": "http://example.com", "CRON_SECRET": "fixture-secret"})

    def test_local_http_requires_explicit_opt_in(self) -> None:
        config = client.load_config({
            "CHOCOLICIA_SITE_URL": "http://localhost:3000",
            "ALLOW_INSECURE_LOCAL": "true",
            "CRON_SECRET": "fixture-secret",
        })
        self.assertEqual(config.site_url, "http://localhost:3000")

    def test_success_sends_one_authenticated_post(self) -> None:
        config = client.load_config({
            "CHOCOLICIA_SITE_URL": "https://www.chocolicia.site",
            "CRON_SECRET": "fixture-secret",
        })
        response = FakeResponse(json.dumps({
            "status": "published",
            "title": "Brigadeiro de colher",
            "slug": "brigadeiro-de-colher",
        }).encode())
        opener = Mock(return_value=response)

        result = client.trigger_generation(config, opener=opener)

        self.assertEqual(result.status, "published")
        self.assertEqual(result.slug, "brigadeiro-de-colher")
        opener.assert_called_once()
        request = opener.call_args.args[0]
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.full_url, config.endpoint_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer fixture-secret")
        self.assertEqual(request.data, b"{}")

    def test_draft_is_reported_as_success(self) -> None:
        config = client.TriggerConfig("https://www.chocolicia.site", "fixture-secret")
        result = client.trigger_generation(
            config,
            opener=lambda *_args, **_kwargs: FakeResponse(b'{"status":"draft"}'),
        )
        self.assertEqual(result.status, "draft")

    def test_http_401_is_clear_and_does_not_expose_response_body(self) -> None:
        config = client.TriggerConfig("https://www.chocolicia.site", "fixture-secret")
        error = HTTPError(config.endpoint_url, 401, "Unauthorized", {}, io.BytesIO(b"do-not-print-this"))
        with self.assertRaisesRegex(client.GenerationError, "HTTP 401") as raised:
            client.trigger_generation(config, opener=Mock(side_effect=error))
        self.assertNotIn("do-not-print-this", str(raised.exception))

    def test_timeout_is_not_retried(self) -> None:
        config = client.TriggerConfig("https://www.chocolicia.site", "fixture-secret")
        opener = Mock(side_effect=URLError("offline"))
        with self.assertRaises(client.GenerationError):
            client.trigger_generation(config, opener=opener)
        opener.assert_called_once()

    def test_invalid_or_failed_json_is_not_treated_as_success(self) -> None:
        config = client.TriggerConfig("https://www.chocolicia.site", "fixture-secret")
        for body in (b"not-json", b'{"status":"failed"}', b'{"status":[]}'):
            with self.subTest(body=body):
                with self.assertRaises(client.GenerationError):
                    client.trigger_generation(config, opener=lambda *_a, **_k: FakeResponse(body))


if __name__ == "__main__":
    unittest.main()
