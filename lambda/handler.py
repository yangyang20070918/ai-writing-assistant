"""AWS Lambda variant of the Claude integration. It has no demo responses.

Disabled unless AI_MODE=live is set, so this handler spends nothing by default: the
presence of ANTHROPIC_API_KEY alone does not enable it. The current demo frontend
does not call it.
"""

import base64
import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
REQUEST_TIMEOUT_SECONDS = 30.0
MAX_TEXT_LENGTH = 10_000
MAX_KEYWORDS_LENGTH = 500
LANGUAGES = {"Japanese", "English", "Chinese"}
STYLES = {"blog", "formal", "casual", "technical"}

_client = None


class BadRequest(Exception):
    pass


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=1,
        )
    return _client


def _is_live() -> bool:
    return os.getenv("AI_MODE", "demo").strip().lower() == "live"


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": os.getenv(
                "CORS_ALLOW_ORIGIN", "http://localhost:3000"
            ),
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def _parse_body(event: dict) -> dict:
    body = event.get("body") or "{}"
    try:
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body).decode("utf-8")
        data = json.loads(body)
    except ValueError as exc:
        raise BadRequest("Invalid JSON body") from exc
    if not isinstance(data, dict):
        raise BadRequest("Request body must be a JSON object")
    return data


def _require_text(data: dict, field: str, max_length: int) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise BadRequest(f"{field} is required")
    value = value.strip()
    if len(value) > max_length:
        raise BadRequest(f"{field} must be at most {max_length} characters")
    return value


def _require_option(value, options: set, field: str) -> str:
    if value not in options:
        raise BadRequest(f"{field} is not supported")
    return value


def _is_preflight(event: dict) -> bool:
    return (
        event.get("httpMethod") == "OPTIONS"
        or event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS"
    )


def _handle(operation: str, event: dict, build_prompt, max_tokens: int) -> dict:
    if _is_preflight(event):
        return _response(200, {})
    if not _is_live():
        return _response(503, {"detail": "AI service is disabled"})
    try:
        prompt = build_prompt(_parse_body(event))
        message = _get_client().messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in message.content if b.type == "text")
        if not text:
            logger.error("Claude returned no text: operation=%s", operation)
            return _response(502, {"detail": "AI service returned no text"})
        return _response(200, {"result": text, "demo": False})
    except BadRequest as exc:
        return _response(400, {"detail": str(exc)})
    except Exception as exc:
        # Only the class name: the message could contain user input or upstream details.
        logger.error("Request failed: operation=%s type=%s", operation, type(exc).__name__)
        return _response(502, {"detail": "AI service request failed"})


def _translate_prompt(data: dict) -> str:
    text = _require_text(data, "text", MAX_TEXT_LENGTH)
    source_lang = _require_option(data.get("source_lang"), LANGUAGES, "source_lang")
    target_lang = _require_option(data.get("target_lang"), LANGUAGES, "target_lang")
    if source_lang == target_lang:
        raise BadRequest("source_lang and target_lang must differ")
    return f"Translate the following text from {source_lang} to {target_lang}. Return only the translated text, no explanations.\n\n{text}"


def _summarize_prompt(data: dict) -> str:
    text = _require_text(data, "text", MAX_TEXT_LENGTH)
    language = _require_option(data.get("language", "Japanese"), LANGUAGES, "language")
    return f"Summarize the following text in {language}. Keep it concise (3-5 sentences).\n\n{text}"


def _generate_prompt(data: dict) -> str:
    keywords = _require_text(data, "keywords", MAX_KEYWORDS_LENGTH)
    language = _require_option(data.get("language", "Japanese"), LANGUAGES, "language")
    style = _require_option(data.get("style", "blog"), STYLES, "style")
    return f"Write a {style} article in {language} about the following topic/keywords: {keywords}\n\nWrite 3-5 paragraphs."


def translate(event, context):
    return _handle("translate", event, _translate_prompt, 2048)


def summarize(event, context):
    return _handle("summarize", event, _summarize_prompt, 1024)


def generate(event, context):
    return _handle("generate", event, _generate_prompt, 2048)
