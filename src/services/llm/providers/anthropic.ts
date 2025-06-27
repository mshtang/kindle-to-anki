import { VocabItem } from "../../types";
import { buildBatchPrompt } from "../prompts/definition";
import { DefinitionPromptOptions, VocabDefinitionResponse } from "../types";
import { BaseLlmProvider } from "./base";
import { extractJsonFromText } from "../utils";

export class AnthropicProvider extends BaseLlmProvider {
  async fetchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): Promise<VocabDefinitionResponse> {
    const prompt = buildBatchPrompt(items, options);
    const body = JSON.stringify({
      model: "claude-instant-1",
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      max_tokens_to_sample: 1000,
      temperature: 0.3,
    });

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API Error:", errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const definitionsText = data.completion || "{}";
    return JSON.parse(extractJsonFromText(definitionsText));
  }
}