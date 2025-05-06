import config from "../config";
import { Book, BookDeck, Vocab, Word } from "./types";

const localStorage = window.localStorage;
const storageKey = "fluentcards.kindleBooks";

class KindleVocab {
  /**
   * Collection of books
   */
  private books: Book[];

  constructor() {
    this.books = [];

    this.restoreSavedBooks();

    // if (!this.books.length) {
    //   fetch('/data/books.json')
    //     .then(resp => resp.json())
    //     .then(data => !this.setBooks(data));
    // }
  }

  /**
   * Restore books from local storage.
   *
   * @see storageKey
   */
  private restoreSavedBooks(): void {
    const savedBooks = localStorage.getItem(storageKey);
    savedBooks && this.setBooks(JSON.parse(savedBooks));
  }

  /**
   * Update books and save into local storage
   *
   * @param books The books to save
   */
  public setBooks(books: Book[]): void {
    this.books = books;
    localStorage.setItem(storageKey, JSON.stringify(this.books));
  }

  /**
   * Retrieve a book by id.
   *
   * @param id The book id (must exist)
   * @returns The book deck
   */
  public getBook(id: string): BookDeck {
    const book = this.books.find((item) => item.id === id);

    if (!book) {
      throw new Error(`Book with id ${id} not found`);
    }

    return {
      lang: book.language,
      language: config.languages[book.language] || book.language,
      title: book.title,
      authors: book.title,
      cover: book.cover,

      words: book.vocabs
        ? book.vocabs.filter((item) => !item._removed)
        : // .map((item) => ({
          //   selection: item.selection || "",
          //   baseForm: item.baseForm || "",
          //   context: item.context,
          //   def: item.def,
          // }))
          [],
    };
  }

  /**
   * Return the kindle vocabulary.
   *
   * @returns The books in the Kindle vocabulary
   */
  public getBooks(): Book[] {
    return this.books;
  }

  /**
   * Update a vocabulary item in a book managed by this instance.
   *
   * @param bookId The book id
   * @param item The vocabulary item to update
   * @param newFields The fields to update
   */
  public updateItem(
    bookId: string,
    item: Word,
    newFields: Partial<Word>
  ): void {
    const book = this.books.find((b) => b.id === bookId);

    if (book && book.vocabs) {
      const index = book.vocabs.findIndex((vocab) => {
        return (
          vocab.selection === item.selection && vocab.context === item.context
        );
      });

      if (index !== -1) {
        book.vocabs[index] = { ...book.vocabs[index], ...newFields } as Vocab;
        this.setBooks(this.books);
      }
    }
  }
}

export default new KindleVocab();
