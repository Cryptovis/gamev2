/** Sentence case for a translated label that a catalog stores in capitals (e.g. "GIDA" → "Gıda"). Locale-aware for Turkish İ/ı. */
export function naturalCase(text: string, language: string) {
  const upper = text.toLocaleUpperCase(language);
  if (text.length < 2 || text !== upper || !/\p{Lu}/u.test(text)) return text;
  return text.charAt(0) + text.slice(1).toLocaleLowerCase(language);
}
