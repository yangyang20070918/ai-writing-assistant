"""Claude API integration, used only when AI_MODE=live.

The client is created lazily, so importing this module needs no API key and opens
no connection. Log messages carry only the operation and error class or status:
never the API key, the user's text, or the upstream error body.
"""

import logging
from functools import lru_cache

import anthropic

from app.config import get_api_key, is_live_mode

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
REQUEST_TIMEOUT_SECONDS = 30.0
MAX_RETRIES = 1


class ClaudeServiceError(Exception):
    """An upstream failure, carrying only what is safe to show to API clients."""

    def __init__(self, status_code: int, public_message: str):
        super().__init__(public_message)
        self.status_code = status_code
        self.public_message = public_message


@lru_cache(maxsize=1)
def _build_client(api_key: str) -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key=api_key,
        timeout=REQUEST_TIMEOUT_SECONDS,
        max_retries=MAX_RETRIES,
    )


def _get_client() -> anthropic.AsyncAnthropic:
    # Second gate after the router: a direct call in demo mode must still not spend money.
    if not is_live_mode():
        raise ClaudeServiceError(503, "AIサービスは現在利用できません。")
    api_key = get_api_key()
    if not api_key:
        logger.error("AI_MODE=live is set but ANTHROPIC_API_KEY is empty")
        raise ClaudeServiceError(503, "AIサービスは現在利用できません。")
    return _build_client(api_key)


async def _create_message(operation: str, prompt: str, max_tokens: int) -> str:
    client = _get_client()
    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APITimeoutError as exc:
        logger.warning("Claude API timeout: operation=%s", operation)
        raise ClaudeServiceError(504, "AIサービスの応答がタイムアウトしました。") from exc
    except anthropic.RateLimitError as exc:
        logger.warning("Claude API rate limited: operation=%s", operation)
        raise ClaudeServiceError(503, "AIサービスが混み合っています。") from exc
    except anthropic.APIStatusError as exc:
        logger.error(
            "Claude API error: operation=%s status=%s", operation, exc.status_code
        )
        raise ClaudeServiceError(502, "AIサービスでエラーが発生しました。") from exc
    except anthropic.APIConnectionError as exc:
        logger.error("Claude API connection error: operation=%s", operation)
        raise ClaudeServiceError(502, "AIサービスに接続できませんでした。") from exc

    text = "".join(block.text for block in message.content if block.type == "text")
    if not text:
        logger.error(
            "Claude API returned no text: operation=%s stop_reason=%s",
            operation,
            message.stop_reason,
        )
        raise ClaudeServiceError(502, "AIサービスから有効な応答を得られませんでした。")
    return text


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    return await _create_message(
        "translate",
        f"Translate the following text from {source_lang} to {target_lang}. Return only the translated text, no explanations.\n\n{text}",
        2048,
    )


async def summarize_text(text: str, language: str) -> str:
    return await _create_message(
        "summarize",
        f"Summarize the following text in {language}. Keep it concise (3-5 sentences).\n\n{text}",
        1024,
    )


async def generate_text(keywords: str, language: str, style: str) -> str:
    return await _create_message(
        "generate",
        f"Write a {style} article in {language} about the following topic/keywords: {keywords}\n\nWrite 3-5 paragraphs.",
        2048,
    )
