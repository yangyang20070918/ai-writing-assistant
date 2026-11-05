from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_cors_origins, is_live_mode
from app.routers import ai

app = FastAPI(title="AI Writing Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(ai.router)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # FastAPI's default body echoes the rejected input back; report only field and rule.
    errors = [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "入力内容が正しくありません。", "errors": errors},
    )


@app.get("/")
def root():
    return {
        "message": "AI Writing Assistant API",
        "version": "1.0.0",
        "mode": "live" if is_live_mode() else "demo",
    }
