import { VocabItem } from "../types";
import { AnthropicProvider } from "./providers/anthropic";
import { BaseLlmProvider } from "./providers/base";
import { GeminiProvider } from "./providers/gemini";
import { OpenAiProvider } from "./providers/openai";
import {
  DefinitionPromptOptions,
  LLM_API_KEY_STORAGE_KEY,
  LLM_API_URL_STORAGE_KEY,
  LlmApiSettings,
  REQUEST_INTERVAL_MS,
  RESPONSE_TOKEN_BUFFER,
  TOKEN_LIMIT_PER_REQUEST,
} from "./types";
import { estimateTokenCount } from "./utils";

export class LlmDefinitionService {
  private provider: BaseLlmProvider | null = null;
  private lastRequestTime: number = 0;

  constructor() {
    this.restoreSettings();
  }

  private restoreSettings(): void {
    const savedApiKey = localStorage.getItem(LLM_API_KEY_STORAGE_KEY);
    const savedApiUrl = localStorage.getItem(LLM_API_URL_STORAGE_KEY);

    if (savedApiKey && savedApiUrl) {
      this.initializeProvider({ apiKey: savedApiKey, apiUrl: savedApiUrl });
    }
  }

  public saveSettings(settings: LlmApiSettings): void {
    localStorage.setItem(LLM_API_KEY_STORAGE_KEY, settings.apiKey);
    localStorage.setItem(LLM_API_URL_STORAGE_KEY, settings.apiUrl);
    this.initializeProvider(settings);
  }

  private initializeProvider(settings: LlmApiSettings): void {
    if (settings.apiUrl.includes("openai")) {
      this.provider = new OpenAiProvider(settings);
    } else if (settings.apiUrl.includes("anthropic")) {
      this.provider = new AnthropicProvider(settings);
    } else if (settings.apiUrl.includes("gemini")) {
      this.provider = new GeminiProvider(settings);
    } else {
      throw new Error("Unsupported LLM provider");
    }
  }

  public getSettings(): LlmApiSettings {
    return {
      apiKey: localStorage.getItem(LLM_API_KEY_STORAGE_KEY) || "",
      apiUrl: localStorage.getItem(LLM_API_URL_STORAGE_KEY) || "",
    };
  }

  public isConfigured(): boolean {
    return this.provider !== null;
  }

  private calculateOptimalBatchSize(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): number {
    if (items.length <= 1) return items.length;

    const sampleItems = items.slice(0, 10);
    const templateTokens = estimateTokenCount(JSON.stringify(sampleItems));
    const perItemTokens = templateTokens / 10;

    const availableTokens = TOKEN_LIMIT_PER_REQUEST - RESPONSE_TOKEN_BUFFER;
    let estimatedBatchSize = Math.floor(availableTokens / perItemTokens);

    estimatedBatchSize = Math.max(
      1,
      Math.min(estimatedBatchSize, items.length)
    );

    return Math.min(estimatedBatchSize, 100);
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
    let processedCount = 0;

    while (processedCount < itemsToUpdate.length) {
      try {
        await this.waitForRateLimit();

        const remainingItems = itemsToUpdate.slice(processedCount);
        const batchSize = this.calculateOptimalBatchSize(
          remainingItems,
          options
        );
        const batch = remainingItems.slice(0, batchSize);

        console.log(
          `Processing batch of ${batch.length} items (${processedCount + 1}-${
            processedCount + batch.length
          } of ${itemsToUpdate.length})`
        );

        const results = await this.provider!.fetchDefinitions(batch, options);

        batch.forEach((item, idx) => {
          const definition = results[String(idx + 1)];
          const itemIndex = updatedItems.findIndex(
            (originalItem) => originalItem === item
          );
          if (itemIndex !== -1 && definition) {
            updatedItems[itemIndex].def = this.normalizeDefinition(definition);
          }
        });

        processedCount += batch.length;
      } catch (error) {
        console.error(
          `Error fetching definitions for batch starting at index ${processedCount}:`,
          error
        );
        processedCount += this.calculateOptimalBatchSize(
          itemsToUpdate.slice(processedCount),
          options
        );
      }
    }

    return updatedItems;
  }

  private normalizeDefinition(definition: string): string {
    return definition.split(":")[1]?.trim() || definition.trim();
  }
}
