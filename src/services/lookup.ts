import wordsApiDefine from './words-api';
import yandexDefine from './yandex-dictionary';

/**
 * Load the definition of a word, potentially trying different APIs.
 *
 * @param word The word to look up
 * @param lang The source language
 * @param targetLang The target language
 * @returns A promise that either contains an object with information
 * about the definition or null if the word was not found.
 */
const load = (word: string, lang: string, targetLang: string): Promise<any> => {
  return (lang == 'en' && targetLang == 'en') ?
    wordsApiDefine(word).catch(() => yandexDefine(word, lang, targetLang)) :
    yandexDefine(word, lang, targetLang).catch(() => null);
};

/**
 * Look up a word definition
 * 
 * @param word The word to look up
 * @param lang The source language
 * @param targetLang The target language (defaults to 'en')
 * @returns A promise resolving to the word definition
 */
export function lookup(word: string, lang: string, targetLang: string = 'en'): Promise<any> {
  return load(word, lang, targetLang);
}