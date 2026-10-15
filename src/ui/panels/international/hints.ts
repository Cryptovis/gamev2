import type {TacticalHintSpec} from '../../hints/types';

/**
 * One tactical hint per International Affairs tab. Keys are canonical English strings;
 * translations (tr, es, zh, ru) live in src/i18n/uiCatalogHints.ts.
 * Hint ids are stable and must never be reused for different content.
 */
export type InternationalTabId='overview'|'resolutions'|'finance'|'markets'|'sanctions';

export const INTERNATIONAL_HINTS:Record<InternationalTabId,TacticalHintSpec>={
  overview:{
    id:'intl.overview',
    titleKey:'Hub overview',
    bodyKey:'Fourteen organizations share one command hub, and every action follows the same engine rules. NDB and IDB are financial facilities under BRICS+ and OIC. Starting rosters and charters are game scenarios.',
  },
  resolutions:{
    id:'intl.resolutions',
    titleKey:'How voting works',
    bodyKey:'Proposals follow simulated charters, and approval is a vote, not an automatic effect. Rules differ by body: Security Council permanent members can veto, NATO needs consensus, and the EU needs a double majority. The electorate is fixed when a proposal opens.',
  },
  finance:{
    id:'intl.finance',
    titleKey:'Financing terms',
    bodyKey:'Loans and grants pay out in tranches and accrue APR interest on drawn principal, which becomes debt. Repayments move real treasury. Cancelling releases undrawn funds but does not forgive drawn debt.',
    learnMoreKey:'Only your country can request its own financing.',
  },
  markets:{
    id:'intl.markets',
    titleKey:'Quotas, tariffs and swaps',
    bodyKey:'OPEC+ quotas limit daily oil output in game units, and deviating from your quota costs standing each day. WTO countermeasures apply targeted tariffs. Swaps authorize settlement but do not create treasury.',
  },
  sanctions:{
    id:'intl.sanctions',
    titleKey:'Sanctions and exemptions',
    bodyKey:'Sanctions restrict only their declared channels. Humanitarian exemptions never permit weapons transfers. Hardware transfers move existing reserve equipment, and alliance, trade access and embargo checks apply.',
  },
};
