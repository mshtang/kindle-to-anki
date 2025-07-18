import { Book, Vocab } from './types';

export default class KindleService {
  private SQL: any;
  private db: any;

  constructor() {
    this.SQL = null;
    this.db = null;
  }

  async init(): Promise<void> {
    const sqlJsUrl = "vendor/sql-memory-growth.js";
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = sqlJsUrl;
      script.onload = () => {
        this.SQL = window["SQL"];
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  loadDb(uints: Uint8Array): void {
    this.db = new this.SQL.Database(uints);
  }

  /**
   * Fetch books from the database, sorted by the last lookup time in
   * descending order.
   *
   * @returns the books in the database.
   */
  queryBooks(): Book[] | null {
    let booksQuery;
    try {
      booksQuery = this.db.exec(
        "SELECT id, title, authors, lang, asin FROM book_info GROUP BY asin;"
      );
    } catch (err) {
      return null;
    }

    let books = booksQuery[0].values.map((book: any[]) => {
      let escapedId = book[0].replace(/'/g, "''");
      let countQuery = this.db.exec(
        `SELECT COUNT(timestamp) FROM lookups WHERE book_key='${escapedId}'`
      );
      let timestampQuery = this.db.exec(
        `SELECT timestamp FROM lookups WHERE book_key='${escapedId}' ORDER BY timestamp DESC LIMIT 1;`
      );
      let asin = book[4];
      let cover =
        asin.length == 10
          ? `http://images.amazon.com/images/P/${asin}.01.20TRZZZZ.jpg`
          : "";
      let slugQuery = this.db.exec(
        `SELECT lookups.id FROM lookups WHERE lookups.book_key='${escapedId}' LIMIT 1`
      );

      // A book without look-ups
      if (!slugQuery.length) return null;

      return {
        id: book[0],
        title: book[1],
        authors: book[2],
        language: book[3].split("-")[0],
        asin: asin,
        cover: cover,
        count: countQuery[0].values[0][0],
        lastLookup: timestampQuery[0] ? timestampQuery[0].values[0][0] : 0,
      };
    });

    books = books.filter(Boolean) as Book[];
    books.sort((a, b) => b.lastLookup - a.lastLookup); // newest first

    return books;
  }

  /**
   * Retrieve the vocabulary entries associated with a book id.
   * @param id the book id
   * @return vocabulary entries
   */
  queryVocabs(id: string): Vocab[] | undefined {
    let escapedId = id.replace(/'/g, "''");
    let vocabsQuery = this.db.exec(`
SELECT
lookups.id, words.stem, words.word, lookups.usage
FROM lookups
LEFT OUTER JOIN words
ON lookups.word_key=words.id
WHERE lookups.book_key='${escapedId}';
`);

    if (!vocabsQuery[0]) return;

    return vocabsQuery[0].values.map((row: any[]) => {
      return {
        id: row[0],
        baseForm: row[1],
        selection: row[2],
        context: row[3],
      };
    });
  }
}