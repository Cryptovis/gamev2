import { exp } from '../detMath';
import type { CountryState } from '../../domain/game';
import type { DeliveryForces, NuclearBuildKind, NuclearProgram } from '../../domain/nuclear';
import { emptyDelivery } from '../../domain/nuclear';

/**
 * Phase 9.7: the strategic triad. Warheads are carried by silo-based missiles, ballistic missile submarines and bombers.
 * Deterrence is the credibility of a second strike: how many warheads would still be deliverable after an attack, which
 * depends on how well each leg survives (hardened silos, submarines on patrol, bombers on the ground).
 */
/** Warheads one launcher can carry (multiple warheads per missile, missiles per submarine, weapons per bomber). */
export const WARHEADS_PER: Record<keyof DeliveryForces, number> = { icbm: 3, ssbn: 16, bombers: 4 };
/** Share of a leg that survives a first strike. Submarines survive only when they are at sea. */
export const SURVIVAL: Record<'icbm' | 'ssbnPatrol' | 'ssbnPort' | 'bombers', number> = { icbm: 0.6, ssbnPatrol: 0.95, ssbnPort: 0.25, bombers: 0.3 };
/** Survivable warheads at which the deterrence index reaches 63 (one minus 1/e). */
export const DETERRENCE_SCALE = 25;
/** A state above this index cannot be attacked by one below LOW_DETERRENCE. */
export const DETERRENCE_SHIELD = 50;
export const LOW_DETERRENCE = 25;

/** Costs and times, in $B and days. Costs are scaled by `costScale` so a small economy is not priced out of the system. */
export const BUILD_BASE: Record<NuclearBuildKind, { cost: number; days: number }> = {
  centrifuges: { cost: 0.8, days: 90 },
  assembly: { cost: 2.5, days: 180 },
  icbm: { cost: 1.2, days: 240 },
  ssbn: { cost: 9, days: 720 },
  bomber: { cost: 2.2, days: 360 },
};
/** A clandestine hall costs more: the same machines, built in secret. */
export const CLANDESTINE_COST_FACTOR = 1.6;
export const WARHEAD_COST = 0.04;
export const ASSEMBLY_MAX_LEVEL = 3;
/** Warheads one assembly batch can finish at each level, and the days the line needs between batches. */
export const ASSEMBLY_BATCH = [0, 2, 4, 8] as const;
export const ASSEMBLY_REST_DAYS = 30;

export const costScale = (country: CountryState) => Math.min(5, Math.max(0.4, country.economy.gdp / 1500));

/** Annual upkeep in $B per unit of each part of the programme. Legacy forces are in the standing defence budget. */
export const UPKEEP_YEAR = { warhead: 0.004, icbm: 0.05, ssbn: 0.8, bomber: 0.12, block: 0.03, assembly: 0.05, patrol: 0.3 } as const;

export function deliveryCapacity(delivery: DeliveryForces): Record<keyof DeliveryForces, number> {
  return { icbm: delivery.icbm * WARHEADS_PER.icbm, ssbn: delivery.ssbn * WARHEADS_PER.ssbn, bombers: delivery.bombers * WARHEADS_PER.bombers };
}

export interface ForceView {
  warheads: number;
  capacity: number;
  deliverable: number;
  survivable: number;
  /** Credibility of a second strike, 0 to 100. */
  deterrence: number;
  readiness: number;
  /** Warheads each leg would carry, in proportion to its capacity. */
  byLeg: Record<keyof DeliveryForces, number>;
}

/** Deterrence from the numbers alone; `readiness` is a percentage of funded maintenance. */
export function forceView(warheads: number, delivery: DeliveryForces, patrol: number, readiness: number): ForceView {
  const cap = deliveryCapacity(delivery);
  const capacity = cap.icbm + cap.ssbn + cap.bombers;
  const deliverable = Math.min(warheads, capacity);
  const share = (leg: keyof DeliveryForces) => (capacity > 0 ? (deliverable * cap[leg]) / capacity : 0);
  const byLeg = { icbm: share('icbm'), ssbn: share('ssbn'), bombers: share('bombers') };
  const atSea = delivery.ssbn > 0 ? Math.min(1, patrol / delivery.ssbn) : 0;
  const ssbnSurvival = atSea * SURVIVAL.ssbnPatrol + (1 - atSea) * SURVIVAL.ssbnPort;
  const survivable = (byLeg.icbm * SURVIVAL.icbm + byLeg.ssbn * ssbnSurvival + byLeg.bombers * SURVIVAL.bombers) * (readiness / 100);
  return { warheads, capacity, deliverable, survivable, deterrence: 100 * (1 - exp(-survivable / DETERRENCE_SCALE)), readiness, byLeg };
}

export const programForce = (program: Pick<NuclearProgram, 'warheads' | 'delivery' | 'patrol'>, readiness: number) => forceView(program.warheads, program.delivery, program.patrol, readiness);

/** Daily upkeep in $B: only growth beyond the legacy arsenal is billed, plus every cascade block and the assembly line. */
export function dailyUpkeep(program: NuclearProgram): number {
  const extra = (now: number, base: number) => Math.max(0, now - base);
  const blocks = program.sites.reduce((sum, site) => sum + site.centrifuges / 1000, 0);
  const yearly =
    extra(program.warheads, program.baseline.warheads) * UPKEEP_YEAR.warhead +
    extra(program.delivery.icbm, program.baseline.delivery.icbm) * UPKEEP_YEAR.icbm +
    extra(program.delivery.ssbn, program.baseline.delivery.ssbn) * UPKEEP_YEAR.ssbn +
    extra(program.delivery.bombers, program.baseline.delivery.bombers) * UPKEEP_YEAR.bomber +
    blocks * UPKEEP_YEAR.block + extra(program.assembly, program.baseline.warheads > 0 ? ASSEMBLY_MAX_LEVEL : 0) * UPKEEP_YEAR.assembly + extra(program.patrol, program.baseline.patrol) * UPKEEP_YEAR.patrol;
  return yearly / 365;
}

export const emptyBaseline = () => ({ warheads: 0, delivery: emptyDelivery(), patrol: 0 });
