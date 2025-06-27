import { VocabItem } from "../../types";
import { DefinitionPromptOptions, LlmApiSettings, VocabDefinitionResponse } from "../types";

export abstract class BaseLlmProvider {
  protected apiKey: string;
  protected apiUrl: string;

  constructor(settings: LlmApiSettings) {
    this.apiKey = settings.apiKey;
    this.apiUrl = settings.apiUrl;
  }

  abstract fetchDefinitions(
    items: VocabItem[],
    options: DefinitionPromptOptions
  ): Promise<VocabDefinitionResponse>;
}