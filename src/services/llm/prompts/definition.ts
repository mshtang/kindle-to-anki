import { VocabItem } from "../../types";
import { DefinitionPromptOptions } from "../types";

export function buildBatchPrompt(
  items: VocabItem[],
  options: DefinitionPromptOptions = {}
): string {
  const sourceLang = options.sourceLang || "German";
  const targetLang = options.targetLang || "English";

  let prompt = `You are given the following words and the corresponding contexts in ${sourceLang}. You are going to extract information about the word in the given context and then return the information in ${targetLang}. The pieces of information needed are:\n`;

  if (sourceLang.toLowerCase() === "german") {
    prompt += `1. gender and plural form (for nouns). If the word is a noun, you must provide its article and its plural form. Otherwise, you leave it empty;\n
    2. word usage. If the word is a verb and the word belongs to a verb-preposition-combination or it is part of a phrase set, then you provide the relevant information. Be aware that the verb can be separable, which means its prefix is somewhere in the context. You only give the usage if the given word has a special usage in the sense that it belongs to a phrase set or a verb-preposition-combination or something like that, or it has a derived meaning in the given text which means plugging the direct meaning into the context would make no sense. Otherwise you leave this field blank. You are acting as a language teacher here to give the necessary information to the student who's learning the language in order for him to understand the word in the context;\n
    3. definition. You should provide a concise while accurate definition of the word in English in the given context; the definition should be in the BASIC form, regardless of the given word being in its plural, comparative, infinitive etc form.\n\n
    Your output must be a valid JSON object with the information of the words in the following format:\n
    {\n
    "index": ["definition, in basic form", "gender/plural form, when applicable", "usage, when necessary", "translation of usage in English, if usage field is empty, this field must also be empty"]\n}\n\n
    
    Examples:\n
    Given the words "bewarb", "Füße", "fing", "Anhieb" and the contexts "Er bewarb sich um eine neue Stelle", "Sie hat ein bisschen kalte Füße bekommen", "Er fing ein Gespräch mit ihr an", "Das kann ich nicht auf Anhieb sagen". Your output should be:\n{"1": ["apply", "", "sich um A. bewerben", "to apply for sth."], "2": ["foot", "der, Füße", "kalte Füße bekommen", "get cold feet"], "3": ["start", "", "mit jdm. anfangen", "to start with sb."], "4": ["(only in the phrase set)", "der, x", "auf Anhieb", "straight away"]}\nNote that in the examples: the first word is a verb in the past form, but in the response, the infinitive form is given, which is "bewerben". Since in the context, the verb is part of the "sich um A. bewerben" phrase set, the usage is given as "sich um A. bewerben" and the translation of the usage is "to apply for sth.". The second word is a noun, so its article and plural form are given, and the usage is "kalte Füße bekommen", which is a phrase set and translated to "to get cold feet". Whenever possible, just showing the ending of the plural form is enough: for Birne, its "die, -n" or for Computer its "der, -". In the third example, the verb is actually part of "anfing", so it translates to "start" and the usage is "mit D. anfangen" from the context. Another detail about the usage is: in example 1, it is "um A." because "neue Stelle" is a thing and accusative, so the abbreviation "A.", while in example 3, "mit jdm." because "ihr" is a person and dative. So you need to distinguish between a thing and a person and its case that is used in the phrase set and choose from "D.", "A.", "jdm.", "jdn." accordingly. In the usage translation field, use "sb." to refer to "somebody", "sth." to "something", as shown in example 1 and 3. In the 4th example, the word "Anhieb" is meaningless as a standalone word, it only makes sense in the phrase set "auf Anhieb", so you should return the information as well. Since it doesn't have a plural form, a "x" is used.\n\n`;
  }

  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.selection}\nContext: ${item.context}\n\n`;
  });

  prompt += `Remember to format your response as a valid JSON object with the key being the index number of the word. Don't prefix or suffix any words or symbols etc. before the opening brace and after the closing brace of the json object in your output.`;

  return prompt;
}