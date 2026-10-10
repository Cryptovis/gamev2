import type { CountryState, PoliticsState } from '../../domain/game';
import type { EconomyFlow } from './economy';
import type { ResourceFlow } from './resources';
import { ministryStabilitySupport } from './ministries';
import { coalitionStabilityEffect } from './factions';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Share of the gap between stability and its target closed per day (half-life ≈ 170 days). */
export const STABILITY_DRIFT = 0.004;
/** Tax rate above which each further point carries an extra daily approval cost (audit C4). */
export const HIGH_TAX_THRESHOLD = 30;
export const HIGH_TAX_APPROVAL_COST = 0.003;

/**
 * Long-run stability a government settles toward: mostly public approval, partly social cohesion,
 * plus the interior/society ministry contribution. Ministries raise the target; they no longer add
 * an unbounded daily climb, so stability falls when approval collapses (audit D1).
 * 0.88: the governing coalition's faction support moves the target by up to ±4 points (factions.ts).
 */
export function stabilityTarget(country: CountryState) {
  return clamp(country.politics.approval * 0.55 + country.society.cohesion * 0.45 + ministryStabilitySupport(country) + coalitionStabilityEffect(country), 0, 100);
}

export function simulatePolitics(
  country: CountryState,
  economy: EconomyFlow,
  resources: ResourceFlow,
): PoliticsState {
  let approvalDelta = 0;
  let stabilityDelta = 0;

  approvalDelta += Math.max(-.1,Math.min(.04,(22-country.economy.taxRate)*.0025));
  // Audit C4: above 30% each extra point costs a further 0.003/day, so a 60% rate is no free lunch (-0.185/day in total).
  approvalDelta -= Math.max(0,country.economy.taxRate-HIGH_TAX_THRESHOLD)*HIGH_TAX_APPROVAL_COST;
  if (economy.next.inflation > 10) approvalDelta -= 0.035;
  if (economy.next.unemployment > 10) approvalDelta -= 0.025;
  if (economy.dailyGrowthRate > 0.00005) approvalDelta += 0.012;

  if (resources.foodShortage) {
    approvalDelta -= 0.45;
    stabilityDelta -= 0.2;
  }
  if (resources.oilShortage) approvalDelta -= 0.08;
  stabilityDelta += (stabilityTarget(country) - country.politics.stability) * STABILITY_DRIFT;

  return {
    ...country.politics,
    approval: clamp(country.politics.approval + approvalDelta, 0, 100),
    stability: clamp(country.politics.stability + stabilityDelta, 0, 100),
    electionDaysRemaining: ['democracy','republic'].includes(country.politics.regime) ? Math.max(0, country.politics.electionDaysRemaining - 1) : country.politics.electionDaysRemaining,
  };
}
