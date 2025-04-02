import config from "../config";

/**
 * Get an article for a given word and language
 *
 * @param data The word data containing grammatical information
 * @param lang The language code
 * @returns The appropriate article for the word
 */
export function getArticle(data: any, lang: string): string {
  const { articles } = config;
  return articles[lang]
    ? (articles[lang] as Record<string, string>)[data.num] ||
        (articles[lang] as Record<string, string>)[data.gen]
    : "";
}
