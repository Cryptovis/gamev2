import type {GameLanguage} from '../domain/game';

/** One string per game language. Always complete: a missing language is a type error. */
export type LocalizedText=Record<GameLanguage,string>;

/** Builds a LocalizedText in the fixed order en, tr, es, zh, ru. */
export const localized=(en:string,tr:string,es:string,zh:string,ru:string):LocalizedText=>({en,tr,es,zh,ru});

export const QUOTE_CATEGORIES=['statecraft','war_and_peace','diplomacy','economics','liberty','wisdom'] as const;
export type QuoteCategory=(typeof QUOTE_CATEGORIES)[number];

export type QuoteEra='antiquity'|'medieval'|'early_modern'|'modern'|'contemporary';

/** public_domain: text or translation is out of copyright. short_quotation: a brief attributed excerpt of a protected work or speech. */
export type QuoteRights='public_domain'|'short_quotation';

export interface QuoteProvenance {
  /** ISO 639 code of the original utterance or text. */
  originalLanguage:string;
  /** Precise citation for maintainers. */
  citation:string;
  /** True only after a person has checked the source and all five translations. */
  reviewed:boolean;
  rights:QuoteRights;
  note?:string;
}
