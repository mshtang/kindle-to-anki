import { VocabItem } from "../../types";
import { buildBatchPrompt } from "../prompts/definition";
import { DefinitionPromptOptions, VocabDefinitionResponse } from "../types";
import { extractJsonFromText } from "../utils";
import { BaseLlmProvider } from "./base";

export class GeminiProvider extends BaseLlmProvider {
  async fetchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): Promise<VocabDefinitionResponse> {
    const prompt = buildBatchPrompt(items, options);
    console.log("GeminiProvider fetchDefinitions prompt:", prompt);
    
    const url = `${this.apiUrl}:generateContent?key=${this.apiKey}`;
    
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const definition = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    if (!definition && data.error) {
      console.error("Gemini API error:", data.error);
      throw new Error(
        `Gemini API error: ${data.error.message || "Unknown error"}`
      );
    }

    return JSON.parse(extractJsonFromText(definition));
  }
}