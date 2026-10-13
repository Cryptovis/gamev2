/**
 * Phase 6.1 (playtest.15): the target-country diplomatic hub.
 * A read-only view model over engine rules: every card carries the typed GameCommand it sends and the engine
 * check that enables it. Nothing here computes simulation numbers; costs, eligibility and stances come from
 * the same engine functions DiplomacyPanel uses, so the hub and the Full Dossier can never disagree.
 */
import type { GameCommand } from '../../domain/commands';
import type { GameState } from '../../domain/game';
import type { StrategicActionKind } from '../../domain/interaction';
import type { StrategicDecisionContext } from '../../engine/systems/strategicDecision';
import { embassyFor, relationFor, relationshipIndex, relationshipStance, type RelationshipStance } from '../../engine/systems/diplomacy';
import { diplomaticProposalStatus } from '../../engine/systems/livingEconomy';
import { diplomaticMissionStatus, formatCostB } from '../../engine/systems/policyPressure';
import { agreementCost, agreementEligibility, ALLIANCE_MIN_SCORE, NON_AGGRESSION_MIN_SCORE, type AgreementBlock } from '../../engine/systems/treaties';
import { capitalName } from '../../data/capitalNames';

export type HubActionId = 'embassy' | 'trade' | 'nonAggression' | 'alliance' | 'embargo' | 'aid' | 'mission' | 'espionage';
export type HubArt =
  | { set: 'asset'; kind: 'embassy' }
  | { set: 'civic'; kind: 'trade' | 'letter' | 'bloc' | 'war' | 'gold' }
  | { set: 'command'; kind: 'diplomacy' | 'intel' };
export type HubTone = 'positive' | 'neutral' | 'danger';
/** ready: can be sent now · active: already in force (the card may still offer an action, e.g. lift an embargo) · locked: rules block it. */
export type HubStatus = 'ready' | 'active' | 'locked';

export interface HubVariant { label: string; command: GameCommand; allowed: boolean; context?: StrategicDecisionContext }
export interface HubAction {
  id: HubActionId;
  title: string;
  /** Short subtitle: what it costs or why it is blocked. */
  detail: string;
  art: HubArt;
  tone: HubTone;
  status: HubStatus;
  /** Whether the main button may be pressed. */
  allowed: boolean;
  command: GameCommand;
  /** Strategic review shown before sending (same kinds as the Full Dossier); absent for operations without one. */
  decision?: StrategicActionKind;
  /** When a proposal is already pending or cooling down, the card opens the proposal tracker instead. */
  trackProposal?: boolean;
  /** Amount choices (economic aid). */
  variants?: HubVariant[];
}

export interface HubSummary {
  countryId: string;
  capital: string | null;
  treasuryB: number;
  gfpRank: number | null;
  capability: number;
  population: number;
  relationIndex: number;
  stance: RelationshipStance;
  atWar: boolean;
  mood: string;
}

const MOOD: Record<RelationshipStance, string> = {
  HOSTILE: '😠', TENSE: '😤', COLD: '😒', NEUTRAL: '😐', GOOD: '🙂', FRIENDLY: '😊', 'STRATEGIC PARTNER': '🤝',
};
const AID_AMOUNTS = [1, 5, 10] as const;

/** Which workspace a country selection opens: the hub for foreign states, the full panel for the player and for tab requests. */
export function workspaceForSelection(
  state: Pick<GameState, 'playerCountryId'> & { selectedCountryId?: string | null; navigation?: { countryId: string } | null },
  selectedId: string | null | undefined,
  dossierFor: string | null,
): 'none' | 'panel' | 'hub' {
  if (!selectedId) return 'none';
  if (selectedId === state.playerCountryId) return 'panel';
  if (dossierFor === selectedId) return 'panel';
  // Another window asked for a specific tab of this country (e.g. "open partner diplomacy"): honour it.
  // A navigation that opened a child tool (selection cleared, country kept in the trail) is not a tab request.
  if (state.selectedCountryId === selectedId && state.navigation?.countryId === selectedId) return 'panel';
  return 'hub';
}

export function targetHubSummary(state: GameState, targetId: string): HubSummary | null {
  const player = state.countries[state.playerCountryId], target = state.countries[targetId];
  if (!player || !target || player.id === target.id) return null;
  const relation = relationFor(player, target.id);
  const stance = relationshipStance(relation), atWar = relation.status === 'war';
  return {
    countryId: target.id,
    capital: capitalName(target.id) ?? null,
    treasuryB: target.economy.treasury,
    gfpRank: target.military.assessment.gfpRank,
    capability: target.military.assessment.capability,
    population: target.demographics.population,
    relationIndex: relationshipIndex(relation),
    stance,
    atWar,
    mood: atWar ? '⚔️' : MOOD[stance],
  };
}

function blockReason(block: AgreementBlock | undefined, relationRule: string): string {
  switch (block) {
    case 'active': return 'Already in force';
    case 'war': return 'Unavailable during war';
    case 'sanctions': return 'Blocked by sanctions';
    case 'relations': return relationRule;
    case 'cooldown': return 'Proposal on cooldown';
    case 'treasury': return 'Insufficient treasury';
    default: return 'Unavailable';
  }
}

/** The eight hub cards, in display order (two rows of four). */
export function targetHubActions(state: GameState, targetId: string): HubAction[] {
  const player = state.countries[state.playerCountryId], target = state.countries[targetId];
  if (!player || !target || player.id === target.id) return [];
  const relation = relationFor(player, target.id);
  const atWar = relation.status === 'war';
  const embassy = embassyFor(state, player.id, target.id);
  const embassyStatus = diplomaticProposalStatus(state, target.id, 'embassy');
  const tradeStatus = diplomaticProposalStatus(state, target.id, 'trade_pact');
  const hasTrade = relation.treaties.includes('trade');
  const nonAggression = agreementEligibility(state, player.id, target.id, 'nonAggression');
  const alliance = agreementEligibility(state, player.id, target.id, 'alliance');
  const hasNonAggression = relation.treaties.includes('nonAggression'), hasAlliance = relation.treaties.includes('alliance');
  const mission = diplomaticMissionStatus(state, player.id, target.id);
  const espionageActive = Object.values(state.intelOperations).some((op) => op.status === 'active' && op.sourceCountryId === player.id && op.targetCountryId === target.id && op.type === 'gather_intelligence');
  // A letter already sent or waiting: the card becomes a link to the proposal tracker, as in the Full Dossier.
  const proposalCard = (kind: 'embassy' | 'trade_pact', active: boolean, status: { allowed: boolean; reason: string; letter?: unknown }, cost: string) => ({
    status: (active ? 'active' : status.allowed ? 'ready' : 'locked') as HubStatus,
    allowed: !active && (status.allowed || Boolean(status.letter)),
    trackProposal: !active && !status.allowed && Boolean(status.letter),
    detail: active ? 'Already in force' : status.allowed ? `${cost} if accepted · reply in 3 days` : status.letter ? 'Track proposal / status' : status.reason,
    command: { type: 'diplomacy/request', id: target.id, kind, years: 1 } as GameCommand,
  });

  return [
    { id: 'embassy', title: 'Open Embassy', art: { set: 'asset', kind: 'embassy' }, tone: 'positive', decision: 'embassy',
      ...proposalCard('embassy', Boolean(embassy), embassyStatus, formatCostB(agreementCost(state, player.id, 'embassy'))) },
    { id: 'trade', title: 'Trade Pact', art: { set: 'civic', kind: 'trade' }, tone: 'positive', decision: 'trade_pact',
      ...proposalCard('trade_pact', hasTrade, tradeStatus, formatCostB(agreementCost(state, player.id, 'trade'))) },
    { id: 'nonAggression', title: 'Non-Aggression Pact', art: { set: 'civic', kind: 'letter' }, tone: 'neutral', decision: 'non_aggression',
      status: hasNonAggression ? 'active' : nonAggression.allowed ? 'ready' : 'locked', allowed: nonAggression.allowed,
      detail: hasNonAggression ? 'mutual restraint active' : nonAggression.allowed ? `-${formatCostB(nonAggression.cost)} · mutual restraint` : blockReason(nonAggression.block, relation.score < NON_AGGRESSION_MIN_SCORE ? 'requires REL 63/100' : 'Unavailable'),
      command: { type: 'diplomacy/signNonAggression', targetCountryId: target.id } },
    { id: 'alliance', title: 'Defensive Alliance', art: { set: 'civic', kind: 'bloc' }, tone: 'positive', decision: 'alliance',
      status: hasAlliance ? 'active' : alliance.allowed ? 'ready' : 'locked', allowed: alliance.allowed,
      detail: hasAlliance ? 'strategic alignment active' : alliance.allowed ? `-${formatCostB(alliance.cost)} · high trust` : blockReason(alliance.block, relation.score < ALLIANCE_MIN_SCORE ? 'requires REL 80/100' : 'Unavailable'),
      command: { type: 'diplomacy/signAlliance', targetCountryId: target.id } },
    { id: 'embargo', title: relation.sanctions ? 'Lift Embargo' : 'Impose Embargo', art: { set: 'civic', kind: 'war' }, tone: 'danger', decision: 'embargo',
      status: atWar ? 'locked' : relation.sanctions ? 'active' : 'ready', allowed: !atWar,
      detail: atWar ? 'Unavailable during war' : relation.sanctions ? 'restore access' : 'trade cancelled · relations fall',
      command: { type: 'diplomacy/toggleEmbargo', targetCountryId: target.id } },
    { id: 'aid', title: 'Economic Aid', art: { set: 'civic', kind: 'gold' }, tone: 'positive', decision: 'treasury_aid',
      status: atWar ? 'locked' : 'ready', allowed: !atWar && player.economy.treasury >= AID_AMOUNTS[0],
      detail: atWar ? 'Unavailable during war' : 'Direct grant · immediate goodwill',
      command: { type: 'diplomacy/giftTreasury', targetCountryId: target.id, amountB: AID_AMOUNTS[0] },
      variants: AID_AMOUNTS.map((amountB) => ({ label: `$${amountB}B`, allowed: !atWar && player.economy.treasury >= amountB, context: { amountB },
        command: { type: 'diplomacy/giftTreasury', targetCountryId: target.id, amountB } as GameCommand })) },
    { id: 'mission', title: 'Diplomatic Mission', art: { set: 'command', kind: 'diplomacy' }, tone: 'positive', decision: 'diplomatic_mission',
      status: mission.allowed ? 'ready' : 'locked', allowed: mission.allowed,
      detail: mission.cooldownDays > 0 ? `next mission in ${mission.cooldownDays} days` : mission.allowed ? `-${formatCostB(mission.costB)} · gradual goodwill` : mission.reason,
      command: { type: 'diplomacy/improveRelations', targetCountryId: target.id } },
    { id: 'espionage', title: 'Espionage Operation', art: { set: 'command', kind: 'intel' }, tone: 'neutral',
      status: espionageActive ? 'active' : 'ready', allowed: !espionageActive,
      detail: espionageActive ? 'Operation underway' : 'Gather Intelligence · 5 days · $3B',
      command: { type: 'intelligence/launch', operationType: 'gather_intelligence', targetCountryId: target.id } },
  ];
}
