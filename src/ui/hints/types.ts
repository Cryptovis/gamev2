/** Namespaced, stable and never reused, e.g. `intl.finance`. */
export type HintId = `${string}.${string}`;

/**
 * `titleKey`, `bodyKey` and `learnMoreKey` are canonical English strings; the
 * i18n layer (LocaleText / translateLive) resolves them for the active language.
 */
export interface TacticalHintSpec {
  id: HintId;
  titleKey: string;
  bodyKey: string;
  /** Further existing strings, rendered as consecutive paragraphs after `bodyKey`. */
  extraKeys?: readonly string[];
  learnMoreKey?: string;
}
