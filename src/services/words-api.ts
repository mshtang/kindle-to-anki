const endpoint = 'https://dphk13sebjka5.cloudfront.net';

/**
 * Definition result from the Words API
 */
interface WordsApiResult {
  word: string;
  pronunciation?: {
    all?: string;
    [partOfSpeech: string]: string;
  };
  results: Array<{
    partOfSpeech: string;
    definition: string;
    definition?: string[];
  }>;
}

/**
 * Transformed definition format
 */
interface Definition {
  def: Array<{
    text: string;
    ts: string;
    tr: Array<{ text: string }>;
    pos: string;
  }>;
}

/**
 * Download a definition of a word
 *
 * @param word The word to look up
 * @returns A promise resolving to the word definition
 */
export default function getDefinition(word: string): Promise<Definition> {
  return fetch(`${endpoint}/${word}`)
    .then(resp => resp.json())
    .then((data: WordsApiResult) => ({
      def: data.results
        .reduce((acc: any[], next) => {
          const prev = acc[acc.length - 1];

          if (prev && prev.partOfSpeech === next.partOfSpeech) {
            prev.definition.push(next.definition);
          } else {
            next.definition = [next.definition as string];
            acc.push(next);
          }

          return acc;
        }, [])
        .map(result => ({
          text: data.word,
          ts: data.pronunciation ?
            data.pronunciation[result.partOfSpeech] || data.pronunciation.all :
            '',
          tr: result.definition.map(text => ({ text })),
          pos: result.partOfSpeech
        }))
    }));
};