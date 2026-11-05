import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function requestedUrl(base: string | undefined) {
  vi.resetModules();
  if (base !== undefined) vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", base);
  const fetchMock = vi.fn<typeof fetch>(async () =>
    Response.json({ result: "ok", demo: true })
  );
  vi.stubGlobal("fetch", fetchMock);
  const { apiSummarize } = await import("../lib/api");
  const result = await apiSummarize("text", "Japanese");
  expect(result).toEqual({ result: "ok", demo: true });
  return fetchMock.mock.calls[0][0];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("API client configuration", () => {
  it("defaults to the built-in API routes", async () => {
    expect(await requestedUrl(undefined)).toBe("/api/ai/summarize");
  });

  it("uses NEXT_PUBLIC_API_BASE_URL and tolerates a trailing slash", async () => {
    expect(await requestedUrl("http://localhost:8000/api/ai/")).toBe(
      "http://localhost:8000/api/ai/summarize"
    );
  });

  it("throws on an error response", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "bad" }, { status: 400 }))
    );
    const { apiSummarize } = await import("../lib/api");
    await expect(apiSummarize("text", "Japanese")).rejects.toThrow(
      "Summarization failed"
    );
  });
});

describe("API key isolation", () => {
  function clientSideSources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "api" ? [] : clientSideSources(path);
      }
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it("client-side code never references the key or server modules", () => {
    const files = [
      ...clientSideSources(join(FRONTEND_ROOT, "app")),
      join(FRONTEND_ROOT, "lib", "api.ts"),
    ];
    expect(files.length).toBeGreaterThan(4);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("ANTHROPIC");
      expect(source, file).not.toContain("x-api-key");
      expect(source, file).not.toContain("lib/server");
    }
  });
});
