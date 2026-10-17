import type { DeliveryForces } from '../domain/nuclear';

/**
 * Nuclear-armed states at the start of the campaign, rounded from public estimates (SIPRI and the Federation of American
 * Scientists, 2025). These are game values, not intelligence: they give each state a realistic order of magnitude.
 * Delivery counts are launchers, not missiles in stock.
 */
export interface Arsenal { warheads: number; delivery: DeliveryForces }
export const NUCLEAR_ARSENALS: Readonly<Record<string, Arsenal>> = {
  RUS: { warheads: 5460, delivery: { icbm: 310, ssbn: 11, bombers: 60 } },
  USA: { warheads: 5180, delivery: { icbm: 400, ssbn: 14, bombers: 66 } },
  CHN: { warheads: 600, delivery: { icbm: 320, ssbn: 6, bombers: 20 } },
  FRA: { warheads: 290, delivery: { icbm: 0, ssbn: 4, bombers: 40 } },
  GBR: { warheads: 225, delivery: { icbm: 0, ssbn: 4, bombers: 0 } },
  IND: { warheads: 180, delivery: { icbm: 8, ssbn: 1, bombers: 48 } },
  PAK: { warheads: 170, delivery: { icbm: 0, ssbn: 0, bombers: 36 } },
  ISR: { warheads: 90, delivery: { icbm: 0, ssbn: 0, bombers: 30 } },
  PRK: { warheads: 50, delivery: { icbm: 6, ssbn: 0, bombers: 0 } },
};
export const isArmedAtStart = (id: string) => id in NUCLEAR_ARSENALS;

/** The five permanent members of the Security Council, who can veto a sanctions resolution. */
export const SECURITY_COUNCIL_P5: readonly string[] = ['USA', 'RUS', 'CHN', 'GBR', 'FRA'];
