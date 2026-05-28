import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic()


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"Translate the following text from {source_lang} to {target_lang}. Return only the translated text, no explanations.\n\n{text}",
            }
        ],
    )
    return message.content[0].text


async def summarize_text(text: str, language: str) -> str:
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"Summarize the following text in {language}. Keep it concise (3-5 sentences).\n\n{text}",
            }
        ],
    )
    return message.content[0].text


async def generate_text(keywords: str, language: str, style: str) -> str:
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"Write a {style} article in {language} about the following topic/keywords: {keywords}\n\nWrite 3-5 paragraphs.",
            }
        ],
    )
    return message.content[0].text
