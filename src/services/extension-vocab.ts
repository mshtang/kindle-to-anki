import { interval, ReplaySubject } from "rxjs";
import { map, retry, take } from "rxjs/operators";
import config from "../config";
import { ExtensionDeck, VocabItem } from "./types";

const localStorage = window.localStorage;
const storageKey = "fluentcards.extensionWords";

class ExtensionVocab extends ReplaySubject<any> {
  /**
   * Collection of vocabulary words
   */
  private words: VocabItem[];

  constructor() {
    super(1);

    this.words = [];

    this.restoreSavedWords();
    this.addExtensionWords();
  }

  /**
   * Add words from the extension.
   */
  private addExtensionWords(): void {
    interval(50)
      .pipe(
        map(() => {
          if (!window.fluentcards) throw Error("No extension data");
          return window.fluentcards;
        }),
        retry(100),
        take(1)
      )
      .subscribe({
        next: (words: VocabItem[]) => this.addUniqueWords(words),
        error: (err: Error) => console.warn(err),
      });
  }

  /**
   * Restore words from local storage
   *
   * @see storageKey
   */
  private restoreSavedWords(): void {
    const savedWords = localStorage.getItem(storageKey);
    savedWords && this.setWords(JSON.parse(savedWords));
  }

  /**
   * Update words and and save them into local storage.
   *
   * @param words The words to save
   */
  private setWords(words: VocabItem[]): void {
    this.words = words;
    localStorage.setItem(storageKey, JSON.stringify(this.words));
  }

  /**
   * Add words that are not yet in the list.
   *
   * @param words The list of words to add. The `selection` and
   *   `context` members will be used to establish item equality.
   */
  public addUniqueWords(words: VocabItem[]): void {
    const newWords = words.filter((word) => {
      return !this.words.some(
        (item) =>
          item.selection === word.selection && item.context === word.context
      );
    });

    if (newWords.length) {
      this.setWords(this.words.concat(newWords));
      this.next({});
    }
  }

  /**
   * Collect all words associated with a language into a deck.
   *
   * @param lang The language code.
   * @returns The extension deck for the specified language
   */
  public getDeck(lang: string): ExtensionDeck {
    return {
      lang,
      language: config.languages[lang] || lang,
      words: this.words.filter(
        (item) => !item._removed && item.language === lang
      ),
    };
  }

  /**
   * Get all decks grouped by language.
   *
   * @returns An array of extension decks
   */
  public getDecks(): ExtensionDeck[] {
    const langs = this.words
      .filter((item) => !item._removed)
      .reduce((acc: Record<string, boolean>, item) => {
        acc[item.language] = true;
        return acc;
      }, {});

    return Object.keys(langs).map((lang) => this.getDeck(lang));
  }

  /**
   * Update a vocabulary item.
   *
   * @param item The item to update
   * @param newFields The fields to update
   */
  public updateItem(item: VocabItem, newFields: Partial<VocabItem>): void {
    const index = this.words.findIndex((word) => {
      return word.selection === item.selection && word.context === item.context;
    });

    if (index !== -1) {
      this.words[index] = { ...this.words[index], ...newFields };
      this.setWords(this.words);
    }
  }
}

// Add fluentcards property to Window interface
declare global {
  interface Window {
    fluentcards?: VocabItem[];
  }
}

export default new ExtensionVocab();
