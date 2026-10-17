/**
 * Phase 9.7: the nuclear system (Nükleer Sistem). Natural uranium is enriched through centrifuge cascades to three
 * assays, weapons-grade material is assembled into warheads, and warheads ride a triad of delivery systems. The IAEA
 * watches declared facilities; clandestine ones raise suspicion until they are exposed. Everything here is optional on
 * `WorldState.nuclear`: a save without it simply has no programmes, and the states that already hold weapons are read
 * from the arsenal data until they first act.
 */

/** The three assays a cascade can be set to, in the order material climbs through them. */
export type EnrichLevel = 'leu' | 'heu' | 'wgu';
export const ENRICH_LEVELS: readonly EnrichLevel[] = ['leu', 'heu', 'wgu'];
/** U-235 fraction of each product: 3.67% reactor fuel, 20% research and naval fuel, 90% weapons grade. */
export const LEVEL_ASSAY: Record<EnrichLevel, number> = { leu: 0.0367, heu: 0.2, wgu: 0.9 };
/** What a cascade is fed with: natural uranium from the national stock, or material from a lower stage. */
export type FeedSource = 'natural' | 'leu' | 'heu';

export type SiteKind = 'declared' | 'clandestine';

export interface NuclearSite {
  id: string;
  kind: SiteKind;
  /** Centrifuges installed; grows in blocks of 1000 as builds finish. */
  centrifuges: number;
  target: EnrichLevel;
  feed: FeedSource;
  builtDay: number;
  /** Clandestine sites only: how well the site hides, 0 to 100. It falls as the site grows and enriches higher. */
  concealment: number;
  /** Set when the IAEA has found the site. An exposed site is no longer hidden. */
  exposed?: boolean;
}

export type NuclearBuildKind = 'centrifuges' | 'assembly' | 'icbm' | 'ssbn' | 'bomber';
/** Work in progress; the item is added on `doneDay`. */
export interface NuclearBuild {
  id: string;
  kind: NuclearBuildKind;
  siteId?: string;
  qty: number;
  startDay: number;
  doneDay: number;
  cost: number;
}

/** Kilograms of enriched material held, by assay. */
export type MaterialStock = Record<EnrichLevel, number>;

export interface DeliveryForces {
  /** Intercontinental ballistic missiles in hardened silos. */
  icbm: number;
  /** Ballistic missile submarines. */
  ssbn: number;
  /** Strategic bombers. */
  bombers: number;
}

export interface NuclearProgram {
  sites: NuclearSite[];
  stock: MaterialStock;
  warheads: number;
  /** Assembly facility level, 0 (none) to 3. */
  assembly: number;
  delivery: DeliveryForces;
  /** Submarines on stealth patrol (never more than `delivery.ssbn`). */
  patrol: number;
  /** Day warheads were last assembled; a batch needs the assembly line to rest. */
  lastAssemblyDay?: number;
  /** Funded maintenance of the force, 0 to 100; it falls when upkeep cannot be paid. */
  readiness: number;
  builds: NuclearBuild[];
  /** Counters used to make build ids unique. */
  serial: number;
  /** Forces already in the standing defence budget when the programme was created; only growth beyond them is billed. */
  baseline: { warheads: number; delivery: DeliveryForces; patrol: number };
}

export type IaeaStatus = 'compliant' | 'queried' | 'noncompliant' | 'referred' | 'sanctioned' | 'withdrawn';
export type CaseStage = 'exposed' | 'board' | 'unsc' | 'closed';

/** The IAEA's case against a state once clandestine enrichment has been found (or the treaty has been left). */
export interface IaeaCase {
  openedDay: number;
  stage: CaseStage;
  /** 'exposure' for found clandestine work, 'withdrawal' for leaving the treaty. */
  cause: 'exposure' | 'withdrawal';
  boardDay: number;
  unscDay: number;
  /** Outcome of the Security Council vote once taken. */
  outcome?: 'sanctions' | 'vetoed' | 'failed';
  vetoedBy?: string;
}

export interface IaeaFinding {
  day: number;
  kind: 'clean' | 'queried' | 'exposed' | 'declared' | 'withdrawn' | 'sanctions' | 'vetoed' | 'board';
}

export interface IaeaRecord {
  /** Party to the non-proliferation treaty (safeguards apply). */
  npt: boolean;
  /** Safeguards compliance rating, 0 to 100. */
  compliance: number;
  /** How much the agency suspects hidden work, 0 to 100. A clandestine site is found at 100 or on a lucky snap inspection. */
  suspicion: number;
  /** The additional protocol: wider access, faster detection, better rating. */
  additionalProtocol: boolean;
  nextInspectionDay: number;
  lastInspectionDay?: number;
  status: IaeaStatus;
  case?: IaeaCase;
  /** The last few findings, newest first. */
  findings: IaeaFinding[];
}

export interface NuclearState {
  programs: Record<string, NuclearProgram>;
  iaea: Record<string, IaeaRecord>;
}

export const emptyMaterial = (): MaterialStock => ({ leu: 0, heu: 0, wgu: 0 });
export const emptyDelivery = (): DeliveryForces => ({ icbm: 0, ssbn: 0, bombers: 0 });
export const emptyNuclear = (): NuclearState => ({ programs: {}, iaea: {} });

/** Commands the player sends; the engine validates every one (nuclear.ts). */
export type NuclearCommand =
  | { type: 'nuclear/buildSite'; kind: SiteKind }
  | { type: 'nuclear/expandSite'; siteId: string }
  | { type: 'nuclear/configureSite'; siteId: string; target: EnrichLevel; feed: FeedSource }
  | { type: 'nuclear/dismantleSite'; siteId: string }
  | { type: 'nuclear/declareSite'; siteId: string }
  | { type: 'nuclear/buildAssembly' }
  | { type: 'nuclear/assembleWarheads'; count: number }
  | { type: 'nuclear/buildDelivery'; kind: 'icbm' | 'ssbn' | 'bomber' }
  | { type: 'nuclear/setPatrol'; count: number }
  | { type: 'nuclear/setProtocol'; enabled: boolean }
  | { type: 'nuclear/withdrawTreaty' };
