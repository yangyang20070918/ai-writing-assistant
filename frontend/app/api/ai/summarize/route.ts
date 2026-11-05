import demoResponses from "../../../../lib/demo-responses.json";
import { createAiRoute } from "../../../../lib/server/aiRoute";
import { parseSummarize } from "../../../../lib/server/validation";

export const POST = createAiRoute({
  operation: "summarize",
  parse: parseSummarize,
  demo: ({ language }) => demoResponses.summarize[language],
  prompt: ({ text, language }) =>
    `Summarize the following text in ${language}. Keep it concise (3-5 sentences).\n\n${text}`,
  maxTokens: 1024,
});
