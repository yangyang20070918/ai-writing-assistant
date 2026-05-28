from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.claude_service import translate_text, summarize_text, generate_text

router = APIRouter(prefix="/api/ai", tags=["ai"])


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class SummarizeRequest(BaseModel):
    text: str
    language: str = "Japanese"


class GenerateRequest(BaseModel):
    keywords: str
    language: str = "Japanese"
    style: str = "blog"


class AIResponse(BaseModel):
    result: str


@router.post("/translate", response_model=AIResponse)
async def api_translate(req: TranslateRequest):
    try:
        result = await translate_text(req.text, req.source_lang, req.target_lang)
        return AIResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", response_model=AIResponse)
async def api_summarize(req: SummarizeRequest):
    try:
        result = await summarize_text(req.text, req.language)
        return AIResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=AIResponse)
async def api_generate(req: GenerateRequest):
    try:
        result = await generate_text(req.keywords, req.language, req.style)
        return AIResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
