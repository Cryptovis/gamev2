import {activeCountries} from '../../domain/sovereignty';
import type { CountryState, DiplomaticRelation, EmbassyLevel, EmbassyMission, GameState, TradeResource, TreatyType } from '../../domain/game';

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
    ...(treaty==='trade'?{tradeStrainSinceDay:undefined}:{}),
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


export type RelationshipStance = 'HOSTILE' | 'TENSE' | 'COLD' | 'NEUTRAL' | 'GOOD' | 'FRIENDLY' | 'STRATEGIC PARTNER';

export function relationshipIndex(relation: DiplomaticRelation): number {
  if (relation.status === 'war') return 0;
  return clamp(Math.round((relation.score + 100) / 2), 0, 100);
}

export function relationshipStance(relation: DiplomaticRelation): RelationshipStance {
  const index = relationshipIndex(relation);
  if (index < 10) return 'HOSTILE';
  if (index < 20) return 'TENSE';
  if (index < 45) return 'COLD';
  if (index <= 50) return 'NEUTRAL';
  if (index < 75) return 'GOOD';
  if (index < 90) return 'FRIENDLY';
  return 'STRATEGIC PARTNER';
}

export function sendTreasuryGift(state: GameState, fromId: string, toId: string, amountB: 1 | 5 | 10): GameState {
  const from = state.countries[fromId];
  const to = state.countries[toId];
  if (!from || !to || from.economy.treasury < amountB || relationFor(from,toId).status === 'war') return state;
  const delta = amountB === 1 ? 2 : amountB === 5 ? 8 : 14;
  let next: GameState = {
    ...state,
    countries: {
      ...state.countries,
      [fromId]: { ...from, economy: { ...from.economy, treasury: from.economy.treasury - amountB } },
      [toId]: { ...to, economy: { ...to.economy, treasury: to.economy.treasury + amountB } },
    },
  };
  next = changeRelations(next, fromId, toId, delta);
  return next;
}

export const GIFT_PACKAGE: Record<TradeResource, number> = { food: 25, oil: 12, iron: 18, uranium: 1 };

export function sendResourceGift(state: GameState, fromId: string, toId: string, resource: TradeResource): GameState {
  const from = state.countries[fromId];
  const to = state.countries[toId];
  if (!from || !to || relationFor(from,toId).status === 'war') return state;
  const amount = Math.min(GIFT_PACKAGE[resource], from.resources[resource]);
  if (amount <= 0.01) return state;
  const scarcityBonus = to.resources[resource] < (resource === 'uranium' ? 3 : 60) ? 5 : 0;
  const delta = 5 + scarcityBonus;
  const next: GameState = {
    ...state,
    countries: {
      ...state.countries,
      [fromId]: { ...from, resources: { ...from.resources, [resource]: from.resources[resource] - amount } },
      [toId]: { ...to, resources: { ...to.resources, [resource]: to.resources[resource] + amount } },
    },
  };
  return changeRelations(next, fromId, toId, delta);
}

export function applyThirdPartyTradeReaction(state: GameState, actorId: string, partnerId: string): GameState {
  let next = state;
  for (const observer of activeCountries(state.countries)) {
    if (observer.id === actorId || observer.id === partnerId) continue;
    const observerToPartner = relationFor(observer, partnerId);
    const observerToActor = relationFor(observer, actorId);
    if (observerToPartner.status === 'war' || observerToPartner.score <= -35) {
      const penalty = observerToPartner.score <= -70 ? -4 : -2;
      if (observerToActor.status !== 'war') next = changeRelations(next, actorId, observer.id, penalty);
    }
  }
  return next;
}


const embassyKey=(aId:string,bId:string)=>[aId,bId].sort().join('::');

export function embassyFor(state:GameState,aId:string,bId:string):EmbassyMission|null{
  return state.embassies[embassyKey(aId,bId)] ?? null;
}

export function embassyRelationBonus(state:GameState,aId:string,bId:string):number{
  const embassy=embassyFor(state,aId,bId);
  return embassy ? 1 + embassy.level * 0.35 : 1;
}

export function openEmbassy(state:GameState,aId:string,bId:string,level:EmbassyLevel=1):GameState{
  const a=state.countries[aId], b=state.countries[bId];
  if(!a||!b||aId===bId||relationFor(a,bId).status==='war') return state;
  const key=embassyKey(aId,bId);
  const existing=state.embassies[key];
  const nextLevel:EmbassyLevel=existing ? Math.min(4,Math.max(existing.level,level)) as EmbassyLevel : level;
  const mission:EmbassyMission={id:key,countryA:key.split('::')[0],countryB:key.split('::')[1],openedDay:existing?.openedDay??state.day,level:nextLevel};
  let next={...state,embassies:{...state.embassies,[key]:mission}};
  if(!existing) next=changeRelations(next,aId,bId,6);
  return next;
}

export function closeEmbassy(state:GameState,aId:string,bId:string):GameState{
  const key=embassyKey(aId,bId);
  if(!state.embassies[key]) return state;
  const embassies={...state.embassies}; delete embassies[key];
  return {...state,embassies};
}
