"""Claude integration tests. All HTTP goes through httpx.MockTransport: nothing is sent."""

import json
import logging

import anthropic
import httpx
import pytest

from app.routers import ai
from app.services import claude_service
from app.services.claude_service import ClaudeServiceError

SECRET_INPUT = "SENSITIVE-USER-TEXT"
UPSTREAM_SECRET = "UPSTREAM-INTERNAL-DETAIL"
API_KEY = "test-dummy-key-not-real"


def ok_body(content=None, stop_reason="end_turn"):
    return {
        "id": "msg_test",
        "type": "message",
        "role": "assistant",
        "model": claude_service.MODEL,
        "content": [{"type": "text", "text": "mocked"}] if content is None else content,
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 1, "output_tokens": 1},
    }


@pytest.fixture
def use_mock_api(monkeypatch):
    """Switch to live mode with a client whose HTTP layer is a local handler."""

    def install(handler):
        requests = []

        def recording_handler(request):
            requests.append(request)
            return handler(request)

        mock_client = anthropic.AsyncAnthropic(
            api_key=API_KEY,
            max_retries=0,
            http_client=httpx.AsyncClient(
                transport=httpx.MockTransport(recording_handler)
            ),
        )
        monkeypatch.setenv("AI_MODE", "live")
        monkeypatch.setenv("ANTHROPIC_API_KEY", API_KEY)
        monkeypatch.setattr(claude_service, "_build_client", lambda key: mock_client)
        return requests

    return install


async def test_translate_sends_expected_request(use_mock_api):
    requests = use_mock_api(lambda r: httpx.Response(200, json=ok_body()))
    assert await claude_service.translate_text("hello", "English", "Japanese") == "mocked"

    assert len(requests) == 1
    assert requests[0].url.path == "/v1/messages"
    assert requests[0].headers["x-api-key"] == API_KEY
    body = json.loads(requests[0].content)
    assert body["model"] == "claude-haiku-4-5-20251001"
    assert body["max_tokens"] == 2048
    prompt = body["messages"][0]["content"]
    assert "from English to Japanese" in prompt and prompt.endswith("hello")


async def test_summarize_and_generate_build_their_prompts(use_mock_api):
    requests = use_mock_api(lambda r: httpx.Response(200, json=ok_body()))
    await claude_service.summarize_text("body", "English")
    await claude_service.generate_text("AI", "Chinese", "formal")

    summarize, generate = (json.loads(r.content) for r in requests)
    assert summarize["max_tokens"] == 1024
    assert "Summarize the following text in English" in summarize["messages"][0]["content"]
    assert "Write a formal article in Chinese" in generate["messages"][0]["content"]


async def test_multiple_text_blocks_are_joined(use_mock_api):
    blocks = [
        {"type": "text", "text": "part1 "},
        {"type": "text", "text": "part2"},
    ]
    use_mock_api(lambda r: httpx.Response(200, json=ok_body(blocks)))
    assert await claude_service.summarize_text("x", "English") == "part1 part2"


def test_real_client_has_timeout_and_retry_limit():
    # Constructing the client sends nothing.
    built = claude_service._build_client(API_KEY)
    assert isinstance(built, anthropic.AsyncAnthropic)
    assert built.timeout == claude_service.REQUEST_TIMEOUT_SECONDS
    assert built.max_retries == claude_service.MAX_RETRIES


@pytest.mark.parametrize(
    "status, expected",
    [(400, 502), (401, 502), (404, 502), (429, 503), (500, 502), (529, 502)],
)
async def test_upstream_status_maps_to_safe_error(use_mock_api, status, expected):
    use_mock_api(
        lambda r: httpx.Response(status, json={"error": {"message": UPSTREAM_SECRET}})
    )
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == expected
    assert UPSTREAM_SECRET not in caught.value.public_message


async def test_timeout_maps_to_504(use_mock_api):
    def handler(request):
        raise httpx.ReadTimeout("slow", request=request)

    use_mock_api(handler)
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == 504


async def test_connection_failure_maps_to_502(use_mock_api):
    def handler(request):
        raise httpx.ConnectError("refused", request=request)

    use_mock_api(handler)
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == 502


async def test_response_without_text_is_an_error(use_mock_api):
    use_mock_api(
        lambda r: httpx.Response(200, json=ok_body(content=[], stop_reason="refusal"))
    )
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == 502


async def test_service_refuses_direct_call_in_demo_mode(monkeypatch):
    def fail(key):
        pytest.fail("client built in demo mode")

    monkeypatch.setattr(claude_service, "_build_client", fail)
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == 503


async def test_live_mode_without_key_is_unavailable(monkeypatch):
    def fail(key):
        pytest.fail("client built without a key")

    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    monkeypatch.setattr(claude_service, "_build_client", fail)
    with pytest.raises(ClaudeServiceError) as caught:
        await claude_service.summarize_text("x", "English")
    assert caught.value.status_code == 503


def test_live_mode_response_is_not_marked_demo(client, use_mock_api):
    use_mock_api(lambda r: httpx.Response(200, json=ok_body()))
    res = client.post("/api/ai/summarize", json={"text": "x", "language": "English"})
    assert res.status_code == 200
    assert res.json() == {"result": "mocked", "demo": False}


def test_upstream_error_details_reach_neither_client_nor_logs(
    client, use_mock_api, caplog
):
    use_mock_api(
        lambda r: httpx.Response(401, json={"error": {"message": UPSTREAM_SECRET}})
    )
    with caplog.at_level(logging.INFO):
        res = client.post(
            "/api/ai/summarize", json={"text": SECRET_INPUT, "language": "English"}
        )
    assert res.status_code == 502
    assert res.json() == {"detail": "AIサービスでエラーが発生しました。"}
    for secret in (UPSTREAM_SECRET, SECRET_INPUT, API_KEY):
        assert secret not in res.text
        assert secret not in caplog.text
    assert "status=401" in caplog.text


def test_unexpected_exception_is_not_leaked(client, monkeypatch, caplog):
    async def explode(*args):
        raise RuntimeError(f"db password=hunter2 input={SECRET_INPUT}")

    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.setattr(ai, "summarize_text", explode)
    with caplog.at_level(logging.INFO):
        res = client.post(
            "/api/ai/summarize", json={"text": SECRET_INPUT, "language": "English"}
        )
    assert res.status_code == 500
    assert res.json() == {"detail": "内部エラーが発生しました。"}
    assert "hunter2" not in res.text
    assert "hunter2" not in caplog.text
    assert SECRET_INPUT not in caplog.text
    assert "type=RuntimeError" in caplog.text
