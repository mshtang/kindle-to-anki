import { VocabItem } from "./types";

const localStorage = window.localStorage;
const LLM_API_KEY_STORAGE_KEY = "fluentcards.llmApiKey";
const LLM_API_URL_STORAGE_KEY = "fluentcards.llmApiUrl";

interface LlmApiSettings {
  apiKey: string;
  apiUrl: string;
}

// Add these at the top of the file, after the existing imports and constants
const MAX_REQUESTS_PER_MINUTE = 15;
const REQUEST_INTERVAL_MS = (60 * 1000) / MAX_REQUESTS_PER_MINUTE; // Time between requests in ms

/**
 * Service for handling LLM-based word definitions
 */
class LlmDefinitionService {
  private apiKey: string = "";
  private apiUrl: string = "";
  private lastRequestTime: number = 0; // Track the last request time
  private requestQueue: Array<() => Promise<void>> = []; // Queue for pending requests
  private isProcessingQueue: boolean = false; // Flag to track if we're processing the queue

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

  /**
   * Get current API settings
   */
  public getSettings(): LlmApiSettings {
    return {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
    };
  }

  /**
   * Check if API settings are configured
   */
  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiUrl);
  }

  /**
   * Fetch definitions for vocabulary items using LLM
   * @param items The vocabulary items to get definitions for
   * @returns Promise resolving to the updated items
   */
  public async fetchDefinitions(items: VocabItem[]): Promise<VocabItem[]> {
    if (!this.isConfigured()) {
      throw new Error("LLM API not configured. Please set API key and URL.");
    }

    const itemsToUpdate = items.filter((item) => !item.def);

    if (itemsToUpdate.length === 0) {
      return items; // No items need definitions
    }

    const updatedItems = [...items];

    // Process items in smaller batches to avoid rate limiting
    const batchSize = 3; // Reduced from 5 to 3 to be safer with rate limits
    for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
      const batch = itemsToUpdate.slice(i, i + batchSize);

      // Process each item sequentially with rate limiting instead of in parallel
      for (const item of batch) {
        try {
          // Wait for rate limit before processing
          await this.waitForRateLimit();

          const result = await this.fetchSingleDefinition(item);

          // Update the definition in the original array
          const index = updatedItems.findIndex(
            (originalItem) =>
              originalItem.selection === result.selection &&
              originalItem.context === result.context
          );

          if (index !== -1) {
            updatedItems[index].def = result.def;
          }
        } catch (error) {
          console.error(
            `Error fetching definition for "${item.selection}":`,
            error
          );
          // Continue with other items instead of failing the entire batch
          // You could also implement retry logic here
        }
      }
    }

    return updatedItems;
  }

  /**
   * Fetch definition for a single vocabulary item
   * @param item The vocabulary item to get definition for
   * @returns Promise resolving to the updated item
   */
  private async fetchSingleDefinition(item: VocabItem): Promise<VocabItem> {
    const updatedItem = { ...item };

    try {
      // Construct a prompt that will yield concise, accurate definitions
      const prompt = `Define the German word _${item.baseForm}_ as used in this context: _${item.context}_. Provide only the English definition, focusing on the specific meaning in this context. Be concise and clear. If the word is a noun, also show its article and the plural form at the end of the definition.`;

      // Determine which API format to use based on the URL
      let requestBody;
      let headers: {
        "Content-Type": string;
        Authorization?: string | undefined;
      } = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      // Format request based on API provider
      if (this.apiUrl.includes("openai")) {
        requestBody = JSON.stringify({
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
        requestBody = JSON.stringify({
          model: "claude-instant-1",
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: 100,
          temperature: 0.3,
        });
        headers["x-api-key"] = this.apiKey;
        delete headers["Authorization"];
      } else if (this.apiUrl.includes("gemini")) {
        requestBody = JSON.stringify({
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

        headers["Content-Type"] = "application/json";
        delete headers["Authorization"];
      } else {
        // Generic format for custom APIs
        requestBody = JSON.stringify({
          prompt: prompt,
          max_tokens: 100,
          temperature: 0.3,
        });
      }

      const response = await fetch(
        this.apiUrl.includes("gemini")
          ? `${this.apiUrl}:generateContent?key=${this.apiKey}`
          : this.apiUrl,
        {
          method: "POST",
          headers: headers,
          body: requestBody,
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Extract the definition from the response based on API format
      let definition = "";
      if (this.apiUrl.includes("openai")) {
        definition = data.choices[0]?.message?.content || "";
      } else if (this.apiUrl.includes("anthropic")) {
        definition = data.completion || "";
      } else if (this.apiUrl.includes("gemini")) {
        // Add safer property access with optional chaining
        definition = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Add debugging for Gemini API errors
        if (!definition && data.error) {
          console.error("Gemini API error:", data.error);
          throw new Error(
            `Gemini API error: ${data.error.message || "Unknown error"}`
          );
        }
      } else {
        // Generic extraction for custom APIs
        definition =
          data.text || data.output || data.result || data.definition || "";
      }

      // Clean up the definition
      definition = definition.trim();

      updatedItem.def = definition;
      return updatedItem;
    } catch (error) {
      console.error(
        `Error fetching definition for "${item.selection}":`,
        error
      );
      throw error;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeElapsed = now - this.lastRequestTime;

    if (timeElapsed < REQUEST_INTERVAL_MS && this.lastRequestTime !== 0) {
      // Need to wait before making another request
      const delayMs = REQUEST_INTERVAL_MS - timeElapsed;
      console.log(`Rate limiting: waiting ${delayMs}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Update the last request time
    this.lastRequestTime = Date.now();
  }
}

export default new LlmDefinitionService();
