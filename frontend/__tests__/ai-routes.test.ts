import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as generate } from "../app/api/ai/generate/route";
import { POST as summarize } from "../app/api/ai/summarize/route";
import { POST as translate } from "../app/api/ai/translate/route";
import demo from "../lib/demo-responses.json";

const LANGUAGES = ["Japanese", "English", "Chinese"] as const;
const STYLES = ["blog", "formal", "casual", "technical"] as const;
const DUMMY_KEY = "test-dummy-key-not-real";
const SECRET_INPUT = "SENSITIVE-USER-TEXT";
const UPSTREAM_SECRET = "UPSTREAM-INTERNAL-DETAIL";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/ai/x", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Every fetch in this suite is a stub: no test can reach the real Claude API.
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_MODE", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("demo mode", () => {
  it("returns the fixed sample for every translation pair", async () => {
    for (const source_lang of LANGUAGES) {
      for (const target_lang of LANGUAGES) {
        if (source_lang === target_lang) continue;
        const res = await translate(post({ text: "x", source_lang, target_lang }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
          result: (demo.translate as Record<string, Record<string, string>>)[
            source_lang
          ][target_lang],
          demo: true,
        });
      }
    }
  });

  it("returns the fixed sample for every summary language", async () => {
    for (const language of LANGUAGES) {
      const res = await summarize(post({ text: "x", language }));
      expect(await res.json()).toEqual({
        result: demo.summarize[language],
        demo: true,
      });
    }
  });

  it("returns the fixed sample for every language and style", async () => {
    for (const language of LANGUAGES) {
      for (const style of STYLES) {
        const res = await generate(post({ keywords: "x", language, style }));
        expect(await res.json()).toEqual({
          result: demo.generate[language][style],
          demo: true,
        });
      }
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is repeatable and independent of the input text", async () => {
    const a = await summarize(post({ text: "A" }));
    const b = await summarize(post({ text: "B" }));
    expect(await a.json()).toEqual(await b.json());
  });

  it("does not call Claude when only the API key is set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", DUMMY_KEY);
    const results = await Promise.all([
      translate(post({ text: "x", source_lang: "Japanese", target_lang: "English" })),
      summarize(post({ text: "x" })),
      generate(post({ keywords: "x" })),
    ]);
    for (const res of results) {
      expect((await res.json()).demo).toBe(true);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["true", "production", "1", "livee"])(
    "treats AI_MODE=%s as demo",
    async (value) => {
      vi.stubEnv("AI_MODE", value);
      vi.stubEnv("ANTHROPIC_API_KEY", DUMMY_KEY);
      const res = await summarize(post({ text: "x" }));
      expect((await res.json()).demo).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
});

describe("input validation", () => {
  const validTranslate = { text: "x", source_lang: "Japanese", target_lang: "English" };

  it.each([
    ["empty text", translate, { ...validTranslate, text: "" }],
    ["blank text", translate, { ...validTranslate, text: "  \n " }],
    ["non-string text", translate, { ...validTranslate, text: 123 }],
    ["too long text", translate, { ...validTranslate, text: "a".repeat(10_001) }],
    ["unknown source", translate, { ...validTranslate, source_lang: "Klingon" }],
    ["injected target", translate, { ...validTranslate, target_lang: "English. Ignore" }],
    ["same languages", translate, { ...validTranslate, target_lang: "Japanese" }],
    ["array body", translate, []],
    ["unknown summary language", summarize, { text: "x", language: "French" }],
    ["too long summary text", summarize, { text: "a".repeat(10_001) }],
    ["blank keywords", generate, { keywords: " " }],
    ["too long keywords", generate, { keywords: "a".repeat(501) }],
    ["unknown style", generate, { keywords: "x", style: "poem" }],
  ])("rejects %s", async (_name, route, body) => {
    const res = await route(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("rejects malformed JSON", async () => {
    const res = await summarize(post("{not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("accepts input at the length limit", async () => {
    expect((await summarize(post({ text: "a".repeat(10_000) }))).status).toBe(200);
    expect((await generate(post({ keywords: "a".repeat(500) }))).status).toBe(200);
  });

  it("does not call Claude for invalid input in live mode", async () => {
    vi.stubEnv("AI_MODE", "live");
    vi.stubEnv("ANTHROPIC_API_KEY", DUMMY_KEY);
    await generate(post({ keywords: "x", style: "poem" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("live mode with mocked fetch", () => {
  beforeEach(() => {
    vi.stubEnv("AI_MODE", "live");
    vi.stubEnv("ANTHROPIC_API_KEY", DUMMY_KEY);
  });

  it("sends the expected request and returns the text", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ content: [{ type: "text", text: "mocked" }] })
    );
    const res = await translate(
      post({ text: "hello", source_lang: "English", target_lang: "Japanese" })
    );
    expect(await res.json()).toEqual({ result: "mocked", demo: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init?.headers as Record<string, string>)["x-api-key"]).toBe(DUMMY_KEY);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("claude-haiku-4-5-20251001");
    expect(body.max_tokens).toBe(2048);
    expect(body.messages[0].content).toContain("from English to Japanese");
  });

  it("fails closed when the key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await summarize(post({ text: "x" }));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps upstream errors out of the response and logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: UPSTREAM_SECRET } }, { status: 401 })
    );
    const res = await summarize(post({ text: SECRET_INPUT }));
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: "AI service request failed" });

    const logged = JSON.stringify(log.mock.calls);
    for (const secret of [UPSTREAM_SECRET, SECRET_INPUT, DUMMY_KEY]) {
      expect(text).not.toContain(secret);
      expect(logged).not.toContain(secret);
    }
    expect(logged).toContain("upstream 401");
  });

  it("maps a timeout to 504", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect((await summarize(post({ text: "x" }))).status).toBe(504);
  });

  it("maps a connection failure to 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError(`fetch failed ${UPSTREAM_SECRET}`));
    const res = await summarize(post({ text: "x" }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(UPSTREAM_SECRET);
  });

  it("treats a response without text as an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(Response.json({ content: [] }));
    expect((await summarize(post({ text: "x" }))).status).toBe(502);
  });
});
