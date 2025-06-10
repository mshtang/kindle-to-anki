import { VocabItem } from "./types";

const localStorage = window.localStorage;
const LLM_API_KEY_STORAGE_KEY = "fluentcards.llmApiKey";
const LLM_API_URL_STORAGE_KEY = "fluentcards.llmApiUrl";

interface LlmApiSettings {
  apiKey: string;
  apiUrl: string;
}

const MAX_REQUESTS_PER_MINUTE = 15;
const REQUEST_INTERVAL_MS = (60 * 1000) / MAX_REQUESTS_PER_MINUTE;

export interface DefinitionPromptOptions {
  sourceLang?: string;
  targetLang?: string;
  customPromptBuilder?: (
    item: VocabItem,
    opts: DefinitionPromptOptions
  ) => string;
  [key: string]: any;
}

/**
 * Service for handling LLM-based word definitions
 */
class LlmDefinitionService {
  private apiKey: string = "";
  private apiUrl: string = "";
  private lastRequestTime: number = 0;

  constructor() {
    this.restoreSettings();
  }

  /**
   * Restore API settings from local storage
   */
  private restoreSettings(): void {
    const savedApiKey = localStorage.getItem(LLM_API_KEY_STORAGE_KEY);
    const savedApiUrl = localStorage.getItem(LLM_API_URL_STORAGE_KEY);

    if (savedApiKey) this.apiKey = savedApiKey;
    if (savedApiUrl) this.apiUrl = savedApiUrl;
  }

  /**
   * Save API settings to local storage
   */
  public saveSettings(settings: LlmApiSettings): void {
    this.apiKey = settings.apiKey;
    this.apiUrl = settings.apiUrl;

    localStorage.setItem(LLM_API_KEY_STORAGE_KEY, settings.apiKey);
    localStorage.setItem(LLM_API_URL_STORAGE_KEY, settings.apiUrl);
  }

  public getSettings(): LlmApiSettings {
    return {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
    };
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiUrl);
  }

  /**
   * Fetch definitions for vocabulary items using LLM
   * @param items The vocabulary items to get definitions for
   * @param options Optional: prompt/language customization
   * @returns Promise resolving to the updated items
   */
  public async fetchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions = {}
  ): Promise<VocabItem[]> {
    if (!this.isConfigured()) {
      throw new Error("LLM API not configured. Please set API key and URL.");
    }

    const itemsToUpdate = items.filter((item) => !item.def);
    if (itemsToUpdate.length === 0) return items;

    const updatedItems = [...items];
    const batchSize = 3;

    for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
      const batch = itemsToUpdate.slice(i, i + batchSize);
      for (const item of batch) {
        try {
          await this.waitForRateLimit();
          const result = await this.fetchSingleDefinition(item, options);
          const index = updatedItems.findIndex(
            (originalItem) =>
              originalItem.selection === result.selection &&
              originalItem.context === result.context
          );
          if (index !== -1) updatedItems[index].def = result.def;
        } catch (error) {
          console.error(
            `Error fetching definition for "${item.selection}":`,
            error
          );
        }
      }
    }

    return updatedItems;
  }

  /**
   * Fetch definition for a single vocabulary item
   * @param item The vocabulary item to get definition for
   * @param options Optional: prompt/language customization
   * @returns Promise resolving to the updated item
   */
  private async fetchSingleDefinition(
    item: VocabItem,
    options: DefinitionPromptOptions = {}
  ): Promise<VocabItem> {
    const updatedItem = { ...item };

    try {
      const prompt = this.buildPrompt(item, options);

      const { url, headers, body } = this.buildApiRequest(prompt);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const definition = this.extractDefinitionFromResponse(data);

      updatedItem.def = definition.trim();
      return updatedItem;
    } catch (error) {
      console.error(
        `Error fetching definition for "${item.selection}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Build the prompt for the LLM API.
   * Can be overridden or replaced via options.customPromptBuilder.
   */
  protected buildPrompt(
    item: VocabItem,
    options: DefinitionPromptOptions = {}
  ): string {
    if (options.customPromptBuilder) {
      return options.customPromptBuilder(item, options);
    }
    const sourceLang = options.sourceLang || "German";
    const targetLang = options.targetLang || "English";
    let prompt = `Define the ${sourceLang} word _${item.baseForm}_ as used in this context: _${item.context}_. Provide only the ${targetLang} definition, focusing on the specific meaning in this context. Be concise and clear.`;
    if (sourceLang.toLowerCase() === "german") {
      prompt +=
        " If the word is a noun, also show its article and the plural form at the end of the definition.";
    }
    return prompt;
  }

  private buildApiRequest(prompt: string): {
    url: string;
    headers: Record<string, string>;
    body: string;
  } {
    let url = this.apiUrl;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    let body: string;

    if (this.apiUrl.includes("openai")) {
      body = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful dictionary assistant that provides concise, accurate definitions.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });
    } else if (this.apiUrl.includes("anthropic")) {
      body = JSON.stringify({
        model: "claude-instant-1",
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 100,
        temperature: 0.3,
      });
      headers["x-api-key"] = this.apiKey;
      delete headers["Authorization"];
    } else if (this.apiUrl.includes("gemini")) {
      body = JSON.stringify({
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
      url = `${this.apiUrl}:generateContent?key=${this.apiKey}`;
      delete headers["Authorization"];
    } else {
      // Generic format for custom APIs
      body = JSON.stringify({
        prompt: prompt,
        max_tokens: 100,
        temperature: 0.3,
      });
    }

    return { url, headers, body };
  }

  private extractDefinitionFromResponse(data: any): string {
    if (this.apiUrl.includes("openai")) {
      return data.choices?.[0]?.message?.content || "";
    } else if (this.apiUrl.includes("anthropic")) {
      return data.completion || "";
    } else if (this.apiUrl.includes("gemini")) {
      const definition = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!definition && data.error) {
        console.error("Gemini API error:", data.error);
        throw new Error(
          `Gemini API error: ${data.error.message || "Unknown error"}`
        );
      }
      return definition;
    } else {
      return data.text || data.output || data.result || data.definition || "";
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeElapsed = now - this.lastRequestTime;

    if (timeElapsed < REQUEST_INTERVAL_MS && this.lastRequestTime !== 0) {
      const delayMs = REQUEST_INTERVAL_MS - timeElapsed;
      console.log(`Rate limiting: waiting ${delayMs}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.lastRequestTime = Date.now();
  }
}

export default new LlmDefinitionService();
