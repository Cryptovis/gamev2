/**
 * Phase 6.2 (playtest.16): the executive desk — one inbox for what needs the president's attention.
 * A read-only view model over existing state: incoming proposals already live in `world.living.letters`
 * (processLetters folds every diplomaticOffer into a pending incoming letter with its expiresDay), wars and
 * intelligence operations come from their own records, and news from the dated journal plus the sitrep.
 * Decisions go out as the existing typed command `diplomacy/resolveLetter`; nothing here changes the engine.
 */
import type { GameCommand } from '../../domain/commands';
import type { GameState, IntelOperationType } from '../../domain/game';
import type { DiplomaticLetter } from '../../domain/living';
import { letterCost, living } from '../../engine/systems/livingEconomy';
import { newsEntries } from '../../store/commandIntelligence';

export type DeskTab = 'diplomacy' | 'war' | 'intel';
export const DESK_TABS: DeskTab[] = ['diplomacy', 'war', 'intel'];
/** Three days or fewer left is shown as urgent. */
export const URGENT_DAYS = 3;

/** Sitrep/journal categories ("WAR // …") shown on each tab; anything else stays in the News window. */
const NEWS_CATEGORIES: Record<DeskTab, string[]> = {
  diplomacy: ['DIPLOMACY', 'DIPLOMATIC OFFER', 'TRADE', 'BLOC', 'COUNCIL', 'WORLD', 'SUPPLY CONTRACT', 'EMBASSY'],
  war: ['WAR', 'ALLIANCE', 'VICTORY', 'CAMPAIGN LOST', 'BLOCKADE', 'TRAINING'],
  intel: ['INTEL', 'EVENT', 'EVENT RESOLVED', 'UNREST', 'REBELLION', 'REGIME', 'POLITICAL', 'POLITICS', 'ELECTION'],
};
const NEWS_LIMIT = 12;
/** Categories that are always about the player (offers to the player, the player's events and operations) or always
 * worth a president's attention (every war). Other news enters the desk only from the player's own commands or when it
 * names the player's country, so AI-to-AI treaties and foreign elections stay in the News window. */
const ALWAYS_SHOWN = new Set(['DIPLOMATIC OFFER', 'EVENT', 'EVENT RESOLVED', 'INTEL', 'REGIME', 'UNREST', 'REBELLION', 'ALLIANCE', 'CAMPAIGN LOST', 'BLOCKADE', 'TRAINING', 'WAR']);

export interface DeskCountdown { daysLeft: number; urgent: boolean; lastDay: boolean }
export interface DeskOffer {
  id: string;
  kind: 'embassy' | 'trade_pact';
  senderId: string;
  message: string;
  sentDay: number;
  countdown: DeskCountdown;
  read: boolean;
  /** The player's half of the shared setup fee and whether both sides can pay it today (engine fee rule). */
  playerShareB: number;
  partnerShareB: number;
  affordable: boolean;
  accept: GameCommand;
  decline: GameCommand;
}
export interface DeskWar { id: string; enemyId: string; defending: boolean; front: number; rounds: number; startedDay: number }
export interface DeskOperation { id: string; type: IntelOperationType; targetId: string; countdown: DeskCountdown }
export interface DeskNews { id: string; day: number | null; category: string; text: string }

/** "WAR // Front collapsed" → ["WAR", "Front collapsed"]; messages without a category return null. */
export function newsCategory(message: string): [string, string] | null {
  const match = message.match(/^\s*([A-Z][A-Z ]*?)\s*\/\/\s*([\s\S]*)$/);
  return match ? [match[1], match[2]] : null;
}
export function deskTabForCategory(category: string): DeskTab | null {
  return DESK_TABS.find((tab) => NEWS_CATEGORIES[tab].includes(category)) ?? null;
}

export function countdown(expiresDay: number, day: number): DeskCountdown {
  const daysLeft = Math.max(0, expiresDay - day);
  return { daysLeft, urgent: daysLeft <= URGENT_DAYS, lastDay: daysLeft === 0 };
}

/** Pending incoming proposals the player can still answer (same filter as the engine's resolveIncomingLetter), soonest first. */
export function deskOffers(state: GameState): DeskOffer[] {
  const player = state.countries[state.playerCountryId];
  if (!player) return [];
  const actionable = (x: DiplomaticLetter): x is DiplomaticLetter & { kind: 'embassy' | 'trade_pact' } =>
    x.incoming && x.status === 'pending' && x.kind !== 'closure' && x.receiverId === player.id && x.expiresDay >= state.day && Boolean(state.countries[x.senderId]);
  return living(state).letters.filter(actionable).map((x): DeskOffer => {
    const partner = state.countries[x.senderId];
    const playerShareB = letterCost(state, player.id, x.kind) * 0.5, partnerShareB = letterCost(state, x.senderId, x.kind) * 0.5;
    return {
      id: x.id, kind: x.kind, senderId: x.senderId, message: x.message, sentDay: x.sentDay, read: x.read,
      countdown: countdown(x.expiresDay, state.day),
      playerShareB, partnerShareB,
      affordable: player.economy.treasury >= playerShareB && partner.economy.treasury >= partnerShareB,
      accept: { type: 'diplomacy/resolveLetter', id: x.id, accept: true },
      decline: { type: 'diplomacy/resolveLetter', id: x.id, accept: false },
    };
  }).sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft || a.sentDay - b.sentDay || a.id.localeCompare(b.id));
}

/** Active wars the player is part of; `front` is from the player's side (-100…100). */
export function deskWars(state: GameState): DeskWar[] {
  const id = state.playerCountryId;
  return Object.values(state.wars).filter((w) => w.status === 'active' && (w.attackerId === id || w.defenderId === id)).map((w) => {
    const defending = w.defenderId === id;
    return { id: w.id, enemyId: defending ? w.attackerId : w.defenderId, defending, front: defending ? -w.progress : w.progress, rounds: w.rounds, startedDay: w.startedDay };
  }).sort((a, b) => a.startedDay - b.startedDay || a.id.localeCompare(b.id));
}

/** The player's covert operations still running, the soonest result first. */
export function deskOperations(state: GameState): DeskOperation[] {
  return Object.values(state.intelOperations).filter((op) => op.status === 'active' && op.sourceCountryId === state.playerCountryId)
    .map((op) => ({ id: op.id, type: op.type, targetId: op.targetCountryId, countdown: countdown(op.completeDay, state.day) }))
    .sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft || a.id.localeCompare(b.id));
}

/** Newest categorised news for one tab (dated journal first, then undated opening sitrep lines). */
export function deskNews(state: GameState, tab: DeskTab): DeskNews[] {
  const out: DeskNews[] = [];
  const playerName = state.countries[state.playerCountryId]?.name.toLowerCase();
  for (const entry of newsEntries(state)) {
    const parsed = newsCategory(entry.message);
    if (!parsed || deskTabForCategory(parsed[0]) !== tab) continue;
    const aboutPlayer = entry.kind === 'command' || ALWAYS_SHOWN.has(parsed[0]) || (playerName ? parsed[1].toLowerCase().includes(playerName) : false);
    if (!aboutPlayer) continue;
    out.push({ id: entry.id, day: entry.day, category: parsed[0], text: parsed[1] });
    if (out.length >= NEWS_LIMIT) break;
  }
  return out;
}

/** Items that need a decision on each tab (badges). Wars count as open business until they end. */
export function deskCounts(state: GameState): Record<DeskTab, number> {
  return { diplomacy: deskOffers(state).length, war: deskWars(state).length, intel: deskOperations(state).length };
}
