import type { GameState } from '../../domain/game';
import type { FacilityKind } from '../../domain/industrial';
import { living, withLiving } from './livingEconomy';

/**
 * Audit A5 (0.87): player actions that used to write the store directly now run as typed commands through
 * the engine, so they are validated, deduplicated and recorded like every other command.
 */

/** Switches one of the player's facility types on or off. Unknown facility kinds are ignored. */
export function toggleFacility(s: GameState, kind: FacilityKind): GameState {
  const id = s.playerCountryId, economy = s.industrialEconomy[id];
  if (!economy || !(kind in economy.enabled)) return s;
  return { ...s, industrialEconomy: { ...s.industrialEconomy, [id]: { ...economy, enabled: { ...economy.enabled, [kind]: !economy.enabled[kind] } } } };
}

/** Stops future shipments of an active contract the player is a party to. */
export function cancelIndustrialContract(s: GameState, contractId: string): GameState {
  const contract = s.industrialContracts[contractId];
  if (!contract || !contract.active || (contract.sellerId !== s.playerCountryId && contract.buyerId !== s.playerCountryId)) return s;
  return { ...s, industrialContracts: { ...s.industrialContracts, [contractId]: { ...contract, active: false } } };
}

/** Moves the tutorial to a step (0–9) and pauses the clock; finishing it marks it completed. */
export function setTutorialStep(s: GameState, step: number, active: boolean): GameState {
  if (!Number.isInteger(step)) return s;
  const tutorial = s.world.tutorial, next = Math.max(0, Math.min(9, step));
  return {
    ...s, speed: 0,
    world: { ...s.world, tutorial: { ...tutorial, step: next, active, completed: !active, practiceProjectId: next === tutorial.step ? tutorial.practiceProjectId : undefined } },
  };
}

/** Marks diplomatic letters or leader correspondence as read. */
export function markInboxRead(s: GameState, scope: 'letters' | 'leadership'): GameState {
  if (scope === 'leadership') {
    if (s.leadership.messages.every(m => m.read)) return s;
    return { ...s, leadership: { ...s.leadership, messages: s.leadership.messages.map(m => ({ ...m, read: true })) } };
  }
  const l = living(s);
  if (l.letters.every(x => x.read)) return s;
  return withLiving(s, { ...l, letters: l.letters.map(x => ({ ...x, read: true })) });
}

/** Closes the current economic notice. */
export function dismissLivingNotice(s: GameState): GameState {
  const l = living(s);
  return l.notice ? withLiving(s, { ...l, notice: null }) : s;
}
