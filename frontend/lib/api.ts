// Defaults to the built-in Next.js API Routes; set NEXT_PUBLIC_API_BASE_URL to use FastAPI.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/ai").replace(
  /\/+$/,
  ""
);

export interface ApiResult {
  result: string;
  demo?: boolean;
}

export async function apiTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<ApiResult> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
  });
  if (!res.ok) throw new Error("Translation failed");
  return res.json();
}

export async function apiSummarize(
  text: string,
  language: string
): Promise<ApiResult> {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error("Summarization failed");
  return res.json();
}

export async function apiGenerate(
  keywords: string,
  language: string,
  style: string
): Promise<ApiResult> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, language, style }),
  });
  if (!res.ok) throw new Error("Generation failed");
  return res.json();
}
