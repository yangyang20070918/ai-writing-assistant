"""Runtime configuration shared by the API layer.

Demo mode is the default. The paid Claude API is reachable only when a developer
sets AI_MODE=live explicitly: the mere presence of ANTHROPIC_API_KEY never enables
it, and any unrecognised AI_MODE value falls back to demo.
"""

import os

from dotenv import load_dotenv

load_dotenv()

DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://localhost:3001"


def is_live_mode() -> bool:
    return os.getenv("AI_MODE", "demo").strip().lower() == "live"


def get_api_key() -> str:
    return os.getenv("ANTHROPIC_API_KEY", "").strip()


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
