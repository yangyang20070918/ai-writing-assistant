// Mirrors the limits in backend/app/routers/ai.py.
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_KEYWORDS_LENGTH = 500;

const LANGUAGES = ["Japanese", "English", "Chinese"] as const;
const STYLES = ["blog", "formal", "casual", "technical"] as const;

export type Language = (typeof LANGUAGES)[number];
export type Style = (typeof STYLES)[number];

export class ValidationError extends Error {}

function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function requireOption<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string
): T {
  if (!options.includes(value as T)) {
    throw new ValidationError(`${field} is not supported`);
  }
  return value as T;
}

export function parseTranslate(body: unknown) {
  const data = requireObject(body);
  const source_lang = requireOption(data.source_lang, LANGUAGES, "source_lang");
  const target_lang = requireOption(data.target_lang, LANGUAGES, "target_lang");
  if (source_lang === target_lang) {
    throw new ValidationError("source_lang and target_lang must differ");
  }
  return {
    text: requireText(data.text, "text", MAX_TEXT_LENGTH),
    source_lang,
    target_lang,
  };
}

export function parseSummarize(body: unknown) {
  const data = requireObject(body);
  return {
    text: requireText(data.text, "text", MAX_TEXT_LENGTH),
    language: requireOption(data.language ?? "Japanese", LANGUAGES, "language"),
  };
}

export function parseGenerate(body: unknown) {
  const data = requireObject(body);
  return {
    keywords: requireText(data.keywords, "keywords", MAX_KEYWORDS_LENGTH),
    language: requireOption(data.language ?? "Japanese", LANGUAGES, "language"),
    style: requireOption(data.style ?? "blog", STYLES, "style"),
  };
}
