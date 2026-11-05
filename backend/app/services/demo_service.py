"""Fixed, repeatable sample responses for demo mode. Performs no network access.

The input text does not influence the output: these are prepared samples, not
generated results.
"""

import json
from pathlib import Path

_DATA = json.loads(
    Path(__file__).with_name("demo_responses.json").read_text(encoding="utf-8")
)


def translate_demo(source_lang: str, target_lang: str) -> str:
    return _DATA["translate"][source_lang][target_lang]


def summarize_demo(language: str) -> str:
    return _DATA["summarize"][language]


def generate_demo(language: str, style: str) -> str:
    return _DATA["generate"][language][style]
