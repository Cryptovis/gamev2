import type { GameState, WarState } from '../../domain/game';
import { endWarRelation, relationFor } from './diplomacy';
import { queueVictory } from './victory';

/**
 * End-of-war lifecycle shared by every way a war can end (combat round, withdrawal, concession, AI ceasefire,
 * Global Council ceasefire). Idempotent: calling it again for the same war changes nothing.
 *
 * - A player victory (as attacker or defender) queues the victory scroll and pauses time (queueVictory).
 * - Allies that joined the defender leave the war: their war relation with the attacker becomes hostile.
 * - If the player's home country is no longer independent, the campaign is lost (checkHomeFront).
 */
export function settleWarOutcome(state: GameState, warId: string): GameState {
  let next = queueVictory(state, warId);
  const war = next.wars[warId];
  if (!war || war.status === 'active') return next;
  next = releaseCoalition(next, war);
  return checkHomeFront(next);
}

/** True while `aId` and `bId` still face each other in an active war, directly or as a defender's ally. */
export function stillFighting(state: GameState, aId: string, bId: string): boolean {
  const sides = (w: WarState) => ({ attacker: [w.attackerId], defender: [w.defenderId, ...(w.defenderAllies ?? [])] });
  return Object.values(state.wars).some(w => {
    if (w.status !== 'active') return false;
    const s = sides(w);
    return (s.attacker.includes(aId) && s.defender.includes(bId)) || (s.attacker.includes(bId) && s.defender.includes(aId));
  });
}

/** Co-belligerents return from war to hostile relations with the attacker once no other front keeps them fighting. */
export function releaseCoalition(state: GameState, war: WarState): GameState {
  let next = state;
  for (const allyId of war.defenderAllies ?? []) {
    const ally = next.countries[allyId];
    if (!ally || relationFor(ally, war.attackerId).status !== 'war' || stillFighting(next, allyId, war.attackerId)) continue;
    next = endWarRelation(next, allyId, war.attackerId);
  }
  return next;
}

/**
 * The player governs from the home country. If it falls under foreign control (lost defensive war or a defender's
 * concession) or is annexed, the government is gone: the campaign ends exactly like a lost election ('lost').
 */
export function checkHomeFront(state: GameState): GameState {
  const home = state.countries[state.playerCountryId];
  if (state.campaignStatus !== 'active' || !home) return state;
  const ruler = home.annexedBy ?? (home.controllerCountryId && home.controllerCountryId !== home.id ? home.controllerCountryId : null);
  if (!ruler) return state;
  const name = state.countries[ruler]?.name ?? ruler;
  return { ...state, campaignStatus: 'lost', speed: 0, sitrep: [`CAMPAIGN LOST // ${home.name} fell under ${name} control.`, ...state.sitrep].slice(0, 12) };
}
