import { VocabItem } from "../../types";
import { buildBatchPrompt } from "../prompts/definition";
import { DefinitionPromptOptions, VocabDefinitionResponse } from "../types";
import { BaseLlmProvider } from "./base";
import { extractJsonFromText } from "../utils";

export class OpenAiProvider extends BaseLlmProvider {
  async fetchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): Promise<VocabDefinitionResponse> {
    const prompt = buildBatchPrompt(items, options);
    const body = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful dictionary assistant that provides concise, accurate definitions. Always format your responses as valid JSON when requested.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API Error:", errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const definitionsText = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(extractJsonFromText(definitionsText));
  }
}