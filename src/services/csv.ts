import { VocabItem } from "./types";
import { escapeRegexp } from "./Utils";

/**
 * Format a vocabulary item's word with appropriate article and grammatical information
 *
 * @param item The vocabulary item
 * @returns The formatted word
 */
function formatWord(item: VocabItem): string {
  // const data = item.def[0];
  // const article = getArticle(data, item.language);
  // let word = data.text;
  // if (article) word = `${article} ${data.text}`;
  // const extra = [data.fl, data.num || data.gen].filter(Boolean).join(", ");
  // if (extra) word += `; ${extra}`;
  // return word;
}

/**
 * Format the definition of a vocabulary item
 *
 * @param item The vocabulary item
 * @param maxDefs Maximum number of definitions to include
 * @returns The formatted definition
 */
function formatDefinition(item: VocabItem, maxDefs: number = 2): string {
  // const definitions: string[] = [];
  // if (item.def && item.def[0] && item.def[0].tr) {
  //   item.def.forEach((def) =>
  //     def.tr.forEach((tr) => definitions.push(tr.text))
  //   );
  // }
  // return definitions.slice(0, maxDefs).join("; ");
}

/**
 * Format the context of a vocabulary item with the selection highlighted
 *
 * @param item The vocabulary item
 * @returns The formatted context with HTML highlighting
 */
function formatContext(item: VocabItem): string {
  // Context with the selection highlighted
  let parts = item.context.split(
    new RegExp("\\b" + escapeRegexp(item.selection) + "\\b")
  );
  if (parts.length === 1) {
    parts = item.context.split(item.selection);
  }
  return parts.join(`<b>${item.selection}</b>`).replace(/\n/g, " ");
}

/**
 * Format a vocabulary item as plain text
 *
 * @param item The vocabulary item
 * @returns Array of formatted strings
 */
function plain(item: VocabItem): string[] {
  return [
    formatWord(item),
    item.context.replace(/\n/g, " "),
    formatDefinition(item),
  ];
}

/**
 * Formats vocabulary as an Anki basic card
 *
 * @param item The vocabulary item
 * @returns A CSV entry where the first element is the front and the second is the back
 */
function basic(item: VocabItem): [string, string] {
  // const word = formatWord(item);
  // const ts = item.def[0].ts
  //   ? `<br /><small class="ipa">${item.def[0].ts}</small>`
  //   : "";
  // const context = `<p class="context">${formatContext(item)}</p>`;
  // return [
  //   // front
  //   `${word}${ts}${context}`,
  //   // back
  //   formatDefinition(item) || context,
  // ];
}

/**
 * Formats vocabulary as a cloze card
 *
 * @param item The vocabulary item
 * @returns A CSV entry where the first element is the front and the second is the back
 */
function cloze(item: VocabItem): [string, string, string] {
  // const word = formatWord(item);
  // const def = formatDefinition(item);
  // let parts = item.context.split(
  //   new RegExp("\\b" + escapeRegexp(item.selection) + "\\b")
  // );
  // if (parts.length === 1) {
  //   parts = item.context.split(item.selection);
  // }
  // const cloze = parts.join(`{{c1::${item.selection}}}`).replace(/\n/g, " ");
  // return [cloze, word, def];
}

/**
 * Export vocabulary items to CSV format
 *
 * @param items The vocabulary items to export
 * @param type The export format type
 * @returns CSV formatted string
 */
export default function exportCsv(items: VocabItem[], type: string): string {
  let mappingFn: (item: VocabItem) => string[] = plain;

  if (type === "basic") {
    mappingFn = basic as (item: VocabItem) => string[];
  } else if (type === "cloze") {
    mappingFn = cloze as (item: VocabItem) => string[];
  }

  return items
    .filter((item) => !item._removed)
    .map((item) => mappingFn(item).join("\t"))
    .join("\n");
}
