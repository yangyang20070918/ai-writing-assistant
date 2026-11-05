import demoResponses from "../../../../lib/demo-responses.json";
import { createAiRoute } from "../../../../lib/server/aiRoute";
import { parseGenerate } from "../../../../lib/server/validation";

export const POST = createAiRoute({
  operation: "generate",
  parse: parseGenerate,
  demo: ({ language, style }) => demoResponses.generate[language][style],
  prompt: ({ keywords, language, style }) =>
    `Write a ${style} article in ${language} about the following topic/keywords: ${keywords}\n\nWrite 3-5 paragraphs.`,
  maxTokens: 2048,
});
