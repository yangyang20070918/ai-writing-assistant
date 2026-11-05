const API_BASE = "http://localhost:8000/api/ai";

export async function apiTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
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
  const data = await res.json();
  return data.result;
}

export async function apiSummarize(
  text: string,
  language: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error("Summarization failed");
  const data = await res.json();
  return data.result;
}

export async function apiGenerate(
  keywords: string,
  language: string,
  style: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, language, style }),
  });
  if (!res.ok) throw new Error("Generation failed");
  const data = await res.json();
  return data.result;
}
