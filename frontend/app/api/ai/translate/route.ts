import demoResponses from "../../../../lib/demo-responses.json";
import { createAiRoute } from "../../../../lib/server/aiRoute";
import { parseTranslate } from "../../../../lib/server/validation";

const MOCK_TRANSLATIONS: Record<string, Record<string, string>> =
  demoResponses.translate;

export const POST = createAiRoute({
  operation: "translate",
  parse: parseTranslate,
  demo: ({ source_lang, target_lang }) =>
    MOCK_TRANSLATIONS[source_lang][target_lang],
  prompt: ({ text, source_lang, target_lang }) =>
    `Translate the following text from ${source_lang} to ${target_lang}. Return only the translated text, no explanations.\n\n${text}`,
  maxTokens: 2048,
});
