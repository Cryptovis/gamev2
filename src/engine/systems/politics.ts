import type { CountryState, PoliticsState } from '../../domain/game';
import type { EconomyFlow } from './economy';
import type { ResourceFlow } from './resources';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  if (country.politics.approval < 30) stabilityDelta -= 0.03;

  return {
    ...country.politics,
    approval: clamp(country.politics.approval + approvalDelta, 0, 100),
    stability: clamp(country.politics.stability + stabilityDelta, 0, 100),
    electionDaysRemaining: Math.max(0, country.politics.electionDaysRemaining - 1),
  };
}
