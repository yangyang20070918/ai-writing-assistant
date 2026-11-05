import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "./validation";

// Server-only module: ANTHROPIC_API_KEY has no NEXT_PUBLIC_ prefix, so Next.js never
// bundles it for the browser. Do not import this file from a client component.

const MODEL = "claude-haiku-4-5-20251001";
const REQUEST_TIMEOUT_MS = 30_000;

// Demo mode is the default. A key alone never enables the paid API.
export function isLiveMode(): boolean {
  return process.env.AI_MODE?.trim().toLowerCase() === "live";
}

class ClaudeRequestError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string
  ) {
    super(publicMessage);
  }
}

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ClaudeRequestError(503, "AI service is unavailable");
  }

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ClaudeRequestError(504, "AI service timed out");
    }
    throw new ClaudeRequestError(502, "AI service could not be reached");
  }

  if (!res.ok) {
    throw new ClaudeRequestError(502, `AI service error (upstream ${res.status})`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  if (!text) {
    throw new ClaudeRequestError(502, "AI service returned no text");
  }
  return text;
}

export function createAiRoute<T>(config: {
  operation: string;
  parse: (body: unknown) => T;
  demo: (input: T) => string;
  prompt: (input: T) => string;
  maxTokens: number;
}) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    let input: T;
    try {
      input = config.parse(await request.json());
    } catch (error) {
      const message =
        error instanceof ValidationError ? error.message : "Invalid JSON body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!isLiveMode()) {
      return NextResponse.json({ result: config.demo(input), demo: true });
    }

    try {
      const result = await callClaude(config.prompt(input), config.maxTokens);
      return NextResponse.json({ result, demo: false });
    } catch (error) {
      // Log only the operation and error class: never the key, user text or upstream body.
      const known = error instanceof ClaudeRequestError;
      console.error(
        `[ai] ${config.operation} failed: ${
          known ? error.publicMessage : (error as Error).name
        }`
      );
      return NextResponse.json(
        { error: "AI service request failed" },
        { status: known ? error.status : 500 }
      );
    }
  };
}
