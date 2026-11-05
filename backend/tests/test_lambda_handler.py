import importlib.util
import json
import logging
from pathlib import Path
from types import SimpleNamespace

import pytest

HANDLER_PATH = Path(__file__).resolve().parents[2] / "lambda" / "handler.py"
SECRET = "SENSITIVE-DETAIL"


@pytest.fixture
def handler(monkeypatch):
    """Load the handler fresh, with no key: importing it must not require one."""
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    spec = importlib.util.spec_from_file_location("lambda_handler", HANDLER_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StubClient:
    def __init__(self, outcome):
        self.calls = []
        self.messages = SimpleNamespace(create=self._create)
        self._outcome = outcome

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self._outcome, Exception):
            raise self._outcome
        return self._outcome


def event(body):
    return {"body": json.dumps(body)}


@pytest.mark.parametrize(
    "name, body",
    [
        ("translate", {"text": "x", "source_lang": "Japanese", "target_lang": "English"}),
        ("summarize", {"text": "x"}),
        ("generate", {"keywords": "x"}),
    ],
)
def test_disabled_by_default_even_with_key(handler, monkeypatch, name, body):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-dummy-key-not-real")
    monkeypatch.delenv("AI_MODE")
    stub = StubClient(RuntimeError("must not be called"))
    handler._client = stub
    res = getattr(handler, name)(event(body), None)
    assert res["statusCode"] == 503
    assert stub.calls == []


def test_preflight_is_answered_without_live_mode(handler):
    assert handler.summarize({"httpMethod": "OPTIONS"}, None)["statusCode"] == 200


def test_live_success_with_stubbed_client(handler, monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    reply = SimpleNamespace(content=[SimpleNamespace(type="text", text="mocked")])
    handler._client = StubClient(reply)
    res = handler.summarize(event({"text": "x", "language": "English"}), None)
    assert res["statusCode"] == 200
    assert json.loads(res["body"]) == {"result": "mocked", "demo": False}


@pytest.mark.parametrize(
    "name, body",
    [
        ("summarize", {"text": ""}),
        ("summarize", {"text": "x", "language": "French"}),
        ("summarize", {"text": "a" * 10_001}),
        ("generate", {"keywords": "x", "style": "poem"}),
        ("translate", {"text": "x", "source_lang": "English", "target_lang": "English"}),
    ],
)
def test_invalid_input_is_rejected_before_calling_claude(handler, monkeypatch, name, body):
    monkeypatch.setenv("AI_MODE", "live")
    stub = StubClient(RuntimeError("must not be called"))
    handler._client = stub
    assert getattr(handler, name)(event(body), None)["statusCode"] == 400
    assert stub.calls == []


def test_malformed_json_returns_400(handler, monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    assert handler.summarize({"body": "{bad"}, None)["statusCode"] == 400


def test_failure_details_reach_neither_client_nor_logs(handler, monkeypatch, caplog):
    monkeypatch.setenv("AI_MODE", "live")
    handler._client = StubClient(RuntimeError(SECRET))
    with caplog.at_level(logging.INFO):
        res = handler.summarize(event({"text": "x"}), None)
    assert res["statusCode"] == 502
    assert SECRET not in res["body"]
    assert SECRET not in caplog.text
    assert "type=RuntimeError" in caplog.text
