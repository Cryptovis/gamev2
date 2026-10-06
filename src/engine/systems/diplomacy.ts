import type { CountryState, DiplomaticRelation, GameState, TreatyType } from '../../domain/game';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const neutralRelation = (): DiplomaticRelation => ({ score: 0, status: 'neutral', treaties: [], sanctions: false });

export function relationFor(country: CountryState, targetId: string): DiplomaticRelation {
  return country.diplomacy.relations[targetId] ?? neutralRelation();
}

function statusFromScore(score: number): DiplomaticRelation['status'] {
  if (score <= -50) return 'hostile';
  if (score >= 65) return 'ally';
  if (score >= 20) return 'friendly';
  return 'neutral';
}

export function updateBilateralRelation(
  state: GameState,
  aId: string,
  bId: string,
  updater: (relation: DiplomaticRelation) => DiplomaticRelation,
): GameState {
  const a = state.countries[aId];
  const b = state.countries[bId];
  if (!a || !b) return state;
  const nextA = updater(relationFor(a, bId));
  const nextB = updater(relationFor(b, aId));
  return {
    ...state,
    countries: {
      ...state.countries,
      [aId]: { ...a, diplomacy: { ...a.diplomacy, relations: { ...a.diplomacy.relations, [bId]: nextA } } },
      [bId]: { ...b, diplomacy: { ...b.diplomacy, relations: { ...b.diplomacy.relations, [aId]: nextB } } },
    },
  };
}

export function changeRelations(state: GameState, aId: string, bId: string, delta: number): GameState {
  return updateBilateralRelation(state, aId, bId, (relation) => {
    if (relation.status === 'war') return relation;
    const score = clamp(relation.score + delta, -100, 100);
    return { ...relation, score, status: statusFromScore(score) };
  });
}

export function addTreaty(state: GameState, aId: string, bId: string, treaty: TreatyType): GameState {
  return updateBilateralRelation(state, aId, bId, (relation) => ({
    ...relation,
    treaties: relation.treaties.includes(treaty) ? relation.treaties : [...relation.treaties, treaty],
    status: treaty === 'alliance' ? 'ally' : relation.status,
    score: treaty === 'alliance' ? Math.max(70, relation.score) : relation.score,
  }));
}

export function setWarRelation(state: GameState, aId: string, bId: string): GameState {
  return updateBilateralRelation(state, aId, bId, (relation) => ({ ...relation, score: -100, status: 'war', treaties: [], sanctions: true }));
}

export function endWarRelation(state: GameState, aId: string, bId: string): GameState {
  return updateBilateralRelation(state, aId, bId, (relation) => ({ ...relation, score: -65, status: 'hostile', treaties: [], sanctions: false }));
}
