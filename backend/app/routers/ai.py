import logging
from typing import Annotated, Awaitable, Callable, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, StringConstraints, model_validator

from app.config import is_live_mode
from app.services.claude_service import (
    ClaudeServiceError,
    generate_text,
    summarize_text,
    translate_text,
)
from app.services.demo_service import generate_demo, summarize_demo, translate_demo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

MAX_TEXT_LENGTH = 10_000
MAX_KEYWORDS_LENGTH = 500

Language = Literal["Japanese", "English", "Chinese"]
Style = Literal["blog", "formal", "casual", "technical"]
InputText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_TEXT_LENGTH),
]
InputKeywords = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=MAX_KEYWORDS_LENGTH
    ),
]


class TranslateRequest(BaseModel):
    text: InputText
    source_lang: Language
    target_lang: Language

    @model_validator(mode="after")
    def languages_must_differ(self) -> "TranslateRequest":
        if self.source_lang == self.target_lang:
            raise ValueError("source_lang and target_lang must differ")
        return self


class SummarizeRequest(BaseModel):
    text: InputText
    language: Language = "Japanese"


class GenerateRequest(BaseModel):
    keywords: InputKeywords
    language: Language = "Japanese"
    style: Style = "blog"


class AIResponse(BaseModel):
    result: str
    demo: bool = False


async def _respond(
    operation: str,
    demo_call: Callable[[], str],
    live_call: Callable[[], Awaitable[str]],
) -> AIResponse:
    try:
        if not is_live_mode():
            return AIResponse(result=demo_call(), demo=True)
        return AIResponse(result=await live_call(), demo=False)
    except ClaudeServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.public_message)
    except Exception as exc:
        # Only the class name: the message or traceback could contain user input.
        logger.error(
            "Unexpected error: operation=%s type=%s", operation, type(exc).__name__
        )
        raise HTTPException(status_code=500, detail="内部エラーが発生しました。")


@router.post("/translate", response_model=AIResponse)
async def api_translate(req: TranslateRequest):
    return await _respond(
        "translate",
        lambda: translate_demo(req.source_lang, req.target_lang),
        lambda: translate_text(req.text, req.source_lang, req.target_lang),
    )


@router.post("/summarize", response_model=AIResponse)
async def api_summarize(req: SummarizeRequest):
    return await _respond(
        "summarize",
        lambda: summarize_demo(req.language),
        lambda: summarize_text(req.text, req.language),
    )


@router.post("/generate", response_model=AIResponse)
async def api_generate(req: GenerateRequest):
    return await _respond(
        "generate",
        lambda: generate_demo(req.language, req.style),
        lambda: generate_text(req.keywords, req.language, req.style),
    )
