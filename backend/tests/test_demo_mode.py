import json
import socket
from pathlib import Path

import pytest

from app.services import claude_service
from conftest import ExternalNetworkBlocked

LANGUAGES = ["Japanese", "English", "Chinese"]
STYLES = ["blog", "formal", "casual", "technical"]
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DATA = REPO_ROOT / "backend/app/services/demo_responses.json"
FRONTEND_DATA = REPO_ROOT / "frontend/lib/demo-responses.json"
DEMO_DATA = json.loads(BACKEND_DATA.read_text(encoding="utf-8"))


@pytest.fixture
def forbid_claude(monkeypatch):
    def fail(*args, **kwargs):
        pytest.fail("demo mode tried to create a Claude client")

    monkeypatch.setattr(claude_service, "_build_client", fail)


@pytest.mark.parametrize("source", LANGUAGES)
@pytest.mark.parametrize("target", LANGUAGES)
def test_translate_returns_fixed_sample(client, forbid_claude, source, target):
    payload = {"text": "こんにちは", "source_lang": source, "target_lang": target}
    res = client.post("/api/ai/translate", json=payload)
    if source == target:
        assert res.status_code == 422
        return
    assert res.status_code == 200
    assert res.json() == {"result": DEMO_DATA["translate"][source][target], "demo": True}


@pytest.mark.parametrize("language", LANGUAGES)
def test_summarize_returns_fixed_sample(client, forbid_claude, language):
    res = client.post("/api/ai/summarize", json={"text": "本文", "language": language})
    assert res.status_code == 200
    assert res.json() == {"result": DEMO_DATA["summarize"][language], "demo": True}


@pytest.mark.parametrize("language", LANGUAGES)
@pytest.mark.parametrize("style", STYLES)
def test_generate_returns_fixed_sample(client, forbid_claude, language, style):
    res = client.post(
        "/api/ai/generate",
        json={"keywords": "AI", "language": language, "style": style},
    )
    assert res.status_code == 200
    assert res.json() == {"result": DEMO_DATA["generate"][language][style], "demo": True}


def test_results_are_repeatable_and_ignore_input(client, forbid_claude):
    first = client.post("/api/ai/summarize", json={"text": "A", "language": "English"})
    second = client.post("/api/ai/summarize", json={"text": "B", "language": "English"})
    assert first.json() == second.json()


def test_key_alone_does_not_enable_live_mode(client, forbid_claude, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-looks-real-but-is-not")
    monkeypatch.delenv("AI_MODE")
    res = client.post("/api/ai/summarize", json={"text": "本文"})
    assert res.status_code == 200
    assert res.json()["demo"] is True


def test_demo_works_without_any_key(client, forbid_claude, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    monkeypatch.delenv("AI_MODE")
    res = client.post("/api/ai/generate", json={"keywords": "AI"})
    assert res.status_code == 200
    assert res.json()["demo"] is True


@pytest.mark.parametrize("value", ["", "true", "production", "1", "livee"])
def test_unrecognised_mode_falls_back_to_demo(client, forbid_claude, monkeypatch, value):
    monkeypatch.setenv("AI_MODE", value)
    res = client.post("/api/ai/summarize", json={"text": "本文"})
    assert res.json()["demo"] is True


def test_root_reports_demo_mode(client):
    assert client.get("/").json()["mode"] == "demo"


def test_network_guard_is_active():
    with pytest.raises(ExternalNetworkBlocked):
        socket.create_connection(("api.anthropic.com", 443), timeout=1)


def test_backend_and_frontend_samples_match():
    assert json.loads(FRONTEND_DATA.read_text(encoding="utf-8")) == DEMO_DATA


def test_samples_do_not_describe_the_old_key_based_switching():
    assert "ANTHROPIC_API_KEY" not in BACKEND_DATA.read_text(encoding="utf-8")
