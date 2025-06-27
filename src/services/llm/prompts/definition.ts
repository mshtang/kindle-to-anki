import { VocabItem } from "../../types";
import { DefinitionPromptOptions } from "../types";

export function buildBatchPrompt(
  items: VocabItem[],
  options: DefinitionPromptOptions = {}
): string {
  const sourceLang = options.sourceLang || "German";
  const targetLang = options.targetLang || "English";

  let prompt = `Define these ${sourceLang} words in ${targetLang}. Be concise and focus on the meaning in the given context.\n`;

  if (sourceLang.toLowerCase() === "german") {
    prompt += `For German nouns, include article and plural form in the definition.\n\n`;
  }

  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.selection}\nContext: ${item.context}\n\n`;
  });

  prompt += `Format your response as a valid JSON object with the following structure:\n`;
  prompt += `{\n  "1": "definition of word 1",\n  "2": "definition of word 2",\n  ...\n}\n`;
  prompt += `Each key should be the index number of the word, and each value should be the definition. Don't prefix or suffix any words or symbols etc. before the opening brace and after the closing brace of the json object.\n`;

  return prompt;
}