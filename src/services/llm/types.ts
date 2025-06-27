export interface LlmApiSettings {
  apiKey: string;
  apiUrl: string;
}

export interface DefinitionPromptOptions {
  sourceLang?: string;
  targetLang?: string;
}

export interface VocabDefinitionResponse {
  [key: string]: string;
}

export const LLM_API_KEY_STORAGE_KEY = 'llm_api_key';
export const LLM_API_URL_STORAGE_KEY = 'llm_api_url';
export const TOKEN_LIMIT_PER_REQUEST = 4000;
export const RESPONSE_TOKEN_BUFFER = 1000;
export const REQUEST_INTERVAL_MS = 1000;
export const TOKENS_PER_CHAR_ESTIMATE = 0.25;
export const TOKENS_PER_WORD_ESTIMATE = 1.3;