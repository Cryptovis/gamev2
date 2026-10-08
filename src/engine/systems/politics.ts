import type { CountryState, PoliticsState } from '../../domain/game';
import type { EconomyFlow } from './economy';
import type { ResourceFlow } from './resources';
import { ministryStabilitySupport } from './ministries';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Share of the gap between stability and its target closed per day (half-life ≈ 170 days). */
export const STABILITY_DRIFT = 0.004;

/**
 * Long-run stability a government settles toward: mostly public approval, partly social cohesion,
 * plus the interior/society ministry contribution. Ministries raise the target; they no longer add
 * an unbounded daily climb, so stability falls when approval collapses (audit D1).
 */
export function stabilityTarget(country: CountryState) {
  return clamp(country.politics.approval * 0.55 + country.society.cohesion * 0.45 + ministryStabilitySupport(country), 0, 100);
}

export function simulatePolitics(
  country: CountryState,
  economy: EconomyFlow,
  resources: ResourceFlow,
): PoliticsState {
  let approvalDelta = 0;
  let stabilityDelta = 0;

  approvalDelta += Math.max(-.1,Math.min(.04,(22-country.economy.taxRate)*.0025));
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
    electionDaysRemaining: Math.max(0, country.politics.electionDaysRemaining - 1),
  };
}
