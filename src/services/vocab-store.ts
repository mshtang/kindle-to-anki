import { ReplaySubject } from "rxjs";
import config from "../config";
import ExtensionVocab from "./extension-vocab";
import KindleVocab from "./kindle-vocab";
import { Book, BookDeck, ExtensionDeck, VocabItem } from "./types";

class VocabStore extends ReplaySubject<any> {
  constructor() {
    super(1);

    ExtensionVocab.subscribe(() => {
      this.next({});
    });

    this.next({});
  }

  /**
   * Gets the decks from the fluentcards extension and the Kindle library.
   *
   * @returns Object containing extension decks and Kindle books
   */
  getDecks(): { extensionDecks: ExtensionDeck[]; kindleBooks: Book[] } {
    return {
      extensionDecks: ExtensionVocab.getDecks(),
      kindleBooks: KindleVocab.getBooks(),
    };
  }

  /**
   * Retrieves a deck of words by language code or book id.
   *
   * @param id Can either be a language code or a book id.
   *  If language code, this method will collect all words for that language.
   *  Otherwise, the vocabulary from the book will be retrieved.
   * @returns The deck corresponding to the provided id
   */
  getDeck(id: string): ExtensionDeck | BookDeck {
    return id in config.languages
      ? ExtensionVocab.getDeck(id)
      : KindleVocab.getBook(id);
  }

  /**
   * Updates a vocabulary item.
   *
   * @param id A language code or a book id. If it is a language code, this method updates an extension vocabulary. Otherwise, it updates a book vocabulary item.
   * @param item The vocabulary item to update
   * @param newFields The fields to update
   */
  updateItem(id: string, item: VocabItem, newFields: Partial<VocabItem>): void {
    id in config.languages
      ? ExtensionVocab.updateItem(item, newFields)
      : KindleVocab.updateItem(id, item, newFields);

    this.next({});
  }

  /**
   * Removes a word from this collection (sets the removed flag to `true`).
   *
   * @param id The collection id (either a language code or a book id)
   * @param item The vocabulary item to remove
   */
  removeItem(id: string, item: VocabItem): void {
    this.updateItem(id, item, { _removed: true });
  }
}

export default new VocabStore();
