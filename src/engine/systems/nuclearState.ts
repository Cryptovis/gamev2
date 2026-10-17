import type { GameState } from '../../domain/game';
import { emptyDelivery, emptyMaterial, emptyNuclear, type IaeaRecord, type NuclearProgram, type NuclearState } from '../../domain/nuclear';
import { NUCLEAR_ARSENALS } from '../../data/nuclearArsenals';
import { emptyBaseline } from './nuclearForces';

/** Days between the IAEA's snap inspections of a state in good standing, of one under question and with the additional protocol. */
export const INSPECTION_DAYS = 90;
export const INSPECTION_DAYS_QUERIED = 30;
export const INSPECTION_DAYS_PROTOCOL = 60;
/** Parties of the treaty at the start of the campaign: every state except the four that never joined or that left. */
const OUTSIDE_TREATY = ['IND', 'PAK', 'ISR', 'PRK'];

export const nuclearOf = (state: GameState): NuclearState => state.world.nuclear ?? emptyNuclear();
export const hasProgram = (state: GameState, id: string) => !!state.world.nuclear?.programs[id];

/** What a state holds before it has acted: the legacy arsenal from the data, or nothing. */
export function baselineProgram(id: string): NuclearProgram {
  const arsenal = NUCLEAR_ARSENALS[id];
  if (!arsenal) return { sites: [], stock: emptyMaterial(), warheads: 0, assembly: 0, delivery: emptyDelivery(), patrol: 0, readiness: 100, builds: [], serial: 0, baseline: emptyBaseline() };
  return {
    sites: [], stock: emptyMaterial(), warheads: arsenal.warheads, assembly: 3, delivery: { ...arsenal.delivery },
    patrol: Math.ceil(arsenal.delivery.ssbn / 2), readiness: 100, builds: [], serial: 0, baseline: { warheads: arsenal.warheads, delivery: { ...arsenal.delivery }, patrol: Math.ceil(arsenal.delivery.ssbn / 2) },
  };
}

export function baselineIaea(id: string, day: number): IaeaRecord {
  const outside = OUTSIDE_TREATY.includes(id);
  return { npt: !outside, compliance: outside ? 0 : 100, suspicion: 0, additionalProtocol: false, nextInspectionDay: day + INSPECTION_DAYS, status: outside ? 'withdrawn' : 'compliant', findings: [] };
}

export const programOf = (state: GameState, id: string): NuclearProgram => state.world.nuclear?.programs[id] ?? baselineProgram(id);
export const iaeaOf = (state: GameState, id: string): IaeaRecord => state.world.nuclear?.iaea[id] ?? baselineIaea(id, state.day);

/** Stores a programme (creating its IAEA record on first use). */
export function withProgram(state: GameState, id: string, program: NuclearProgram): GameState {
  const nuclear = nuclearOf(state);
  const iaea = nuclear.iaea[id] ?? baselineIaea(id, state.day);
  return { ...state, world: { ...state.world, nuclear: { programs: { ...nuclear.programs, [id]: program }, iaea: { ...nuclear.iaea, [id]: iaea } } } };
}

export function withIaea(state: GameState, id: string, record: IaeaRecord): GameState {
  const nuclear = nuclearOf(state);
  return { ...state, world: { ...state.world, nuclear: { ...nuclear, iaea: { ...nuclear.iaea, [id]: record } } } };
}

export const note = (state: GameState, text: string): GameState => ({ ...state, sitrep: [text, ...state.sitrep].slice(0, 12) });
