/**
 * Common types used across the services
 */

/**
 * A vocabulary entry in the database
 */
export interface Vocab {
  baseForm: string;  // word stem
  selection: string; // the word as highlighted on the device
  context: string;   // word context
  def?: string | any[]; // definition
  _removed?: boolean;
}

/**
 * A book entry from Kindle
 */
export interface Book {
  id: string;
  title: string;
  authors: string;
  language: string;
  asin: string;
  cover: string;     // an image URL
  count: number;
  lastLookup: number;
  vocabs?: Vocab[];  // undefined until the vocab items are resolved
}

/**
 * A looked up word
 */
export interface VocabItem {
  baseForm: string; // the word stem
  selection: string; // the word as highlighted on the device
  context: string; // the context the word appears in
  def?: string | any[];
  language?: string;
  _removed?: boolean;
}

/**
 * A collection of words from a Kindle book
 */
export interface BookDeck {
  title: string;
  authors: string;
  lang: string;
  language: string;
  cover: string;
  words: VocabItem[];
}

/**
 * A word definition type
 */
export type WordDef = undefined | string | Array<{ text: string }>;

/**
 * A word entry
 * The same as Vocab
 */
export interface Word {
  baseForm: string; // word stem
  selection: string; // the word as highlighted on the device
  context: string; // word context
  def?: string | any[]; // definition
  _removed?: boolean;
}

/**
 * A deck of words from the fluentcards extension
 */
export interface ExtensionDeck {
  lang: string;
  language: string;
  words: VocabItem[];
}