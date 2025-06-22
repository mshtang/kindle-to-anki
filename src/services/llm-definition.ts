import { VocabItem } from "./types";

const localStorage = window.localStorage;
const LLM_API_KEY_STORAGE_KEY = "fluentcards.llmApiKey";
const LLM_API_URL_STORAGE_KEY = "fluentcards.llmApiUrl";

interface LlmApiSettings {
  apiKey: string;
  apiUrl: string;
}

// Constants for API rate limiting and batching
const MAX_REQUESTS_PER_MINUTE = 10;
const REQUEST_INTERVAL_MS = (60 * 1000) / MAX_REQUESTS_PER_MINUTE;
const TOKEN_LIMIT_PER_REQUEST = 200000;
const TOKENS_PER_CHAR_ESTIMATE = 0.35;
const TOKENS_PER_WORD_ESTIMATE = 1.5;
const RESPONSE_TOKEN_BUFFER = 1000; // Buffer for response tokens

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
   * Estimate token count for a string
   * @param text The text to estimate tokens for
   * @returns Estimated token count
   */
  private estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Simple estimation based on character count and word count
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    return Math.ceil(
      (charCount * TOKENS_PER_CHAR_ESTIMATE + wordCount * TOKENS_PER_WORD_ESTIMATE) / 2
    );
  }

  /**
   * Calculate optimal batch size based on token limits
   * @param items The vocabulary items to process
   * @param options The prompt options
   * @returns The optimal batch size
   */
  private calculateOptimalBatchSize(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): number {
    if (items.length <= 1) return 1;
    
    const templatePrompt = this.buildBatchPrompt(items.slice(0, 2), options);
    const templateTokens = this.estimateTokenCount(templatePrompt);
    
    const perItemTokens = templateTokens / 2;
    
    // Calculate how many items we can fit within token limit, leaving room for response
    const availableTokens = TOKEN_LIMIT_PER_REQUEST - RESPONSE_TOKEN_BUFFER;
    const estimatedBatchSize = Math.floor(availableTokens / perItemTokens);

    return Math.max(1, Math.min(estimatedBatchSize, items.length));
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
    
    // Process items in dynamically sized batches
    let processedCount = 0;
    while (processedCount < itemsToUpdate.length) {
      try {
        await this.waitForRateLimit();
        
        const remainingItems = itemsToUpdate.slice(processedCount);
        const batchSize = this.calculateOptimalBatchSize(remainingItems, options);
        const batch = remainingItems.slice(0, batchSize);
        
        console.log(`Processing batch of ${batch.length} items (${processedCount + 1}-${processedCount + batch.length} of ${itemsToUpdate.length})`);
          const results = await this.fetchBatchDefinitions(batch, options);
          // results is a json object like {"1": "definition 1", "2": "definition 2"}
          // Assign definitions to items based on their index in the batch
          batch.forEach((item, idx) => {
            const definition = results[String(idx + 1)];
            const itemIndex = updatedItems.findIndex(
              (originalItem) => originalItem === item
            );
            if (itemIndex !== -1 && definition) {
              updatedItems[itemIndex].def = definition;
            }
          });
        
        processedCount += batch.length;
      } catch (error) {
        console.error(
          `Error fetching definitions for batch starting at index ${processedCount}:`,
          error
        );
      }
    }

    return updatedItems;
  }

  /**
   * Fetch definitions for a batch of vocabulary items
   * @param items The batch of vocabulary items to get definitions for
   * @param options Optional: prompt/language customization
   * @returns Promise resolving to the updated items
   */
  private async fetchBatchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions = {}
  ): Promise<{ [key: string]: string }> {
    try {
      const prompt = this.buildBatchPrompt(items, options);
      const estimatedTokens = this.estimateTokenCount(prompt);
      console.log(`Batch prompt estimated tokens: ${estimatedTokens}`);

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
      const definitionsText = this.extractDefinitionFromResponse(data);
      return JSON.parse(this.extractJsonFromText(definitionsText));
    } catch (error) {
      console.error(`Error fetching batch definitions:`, error);
      throw error;
    }
  }

  /**
   * Extract valid JSON from text that might contain markdown or other formatting
   * @param text The text that might contain JSON
   * @returns Cleaned JSON string
   */
  private extractJsonFromText(text: string): string {
    // Remove markdown code block markers if present
    let cleanedText = text.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object in the text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    return cleanedText;
  }

  /**
   * Build a batch prompt for multiple vocabulary items
   * @param items The vocabulary items to include in the prompt
   * @param options Optional: prompt/language customization
   * @returns The batch prompt string
   */
  protected buildBatchPrompt(
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
      prompt += `${index + 1}. ${item.baseForm}\nContext: ${item.context}\n\n`;
    });
    
    prompt += `Format your response as a valid JSON object with the following structure:\n`;
    prompt += `{\n  "1": "definition of word 1",\n  "2": "definition of word 2",\n  ...\n}\n`;
    prompt += `Each key should be the index number of the word, and each value should be the definition.\n`;
    
    return prompt;
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
    let prompt = `Define the ${sourceLang} word "${item.baseForm}" as used in this context: "${item.context}". Provide only the ${targetLang} definition, focusing on the specific meaning in this context. Be concise and clear.`;
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
              "You are a helpful dictionary assistant that provides concise, accurate definitions. Always format your responses as valid JSON when requested.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });
    } else if (this.apiUrl.includes("anthropic")) {
      body = JSON.stringify({
        model: "claude-instant-1",
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 1000,
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
        ]
      });
      url = `${this.apiUrl}:generateContent?key=${this.apiKey}`;
      delete headers["Authorization"];
    } else {
      // Generic format for custom APIs
      body = JSON.stringify({
        prompt: prompt,
        max_tokens: 1000,
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
