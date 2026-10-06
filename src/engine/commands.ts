import type { GameCommand } from '../domain/commands';
import type { GameState, TradeResource, WarState } from '../domain/game';
import { tickGame } from './tick';
import { addTreaty, changeRelations, relationFor, setWarRelation, updateBilateralRelation, endWarRelation } from './systems/diplomacy';
import { makeImportDeal } from './systems/trade';
import { emptyLosses, getWarPreview, resolveCombatRound } from './systems/warfare';
import { resolveEvent } from './systems/events';
import { setMinistryAllocation } from './systems/ministries';
import { unlockTechnology } from './systems/technology';
import { formBloc, inviteToBloc } from './systems/blocs';
import { proposeCouncilResolution } from './systems/council';
import { launchIntelOperation } from './systems/espionage';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const note = (state: GameState, message: string): GameState => ({ ...state, sitrep: [message, ...state.sitrep].slice(0, 12) });

function cancelPairTrades(state: GameState, aId: string, bId: string): GameState {
  const tradeDeals = Object.fromEntries(Object.entries(state.tradeDeals).map(([id, deal]) => [id, (deal.sellerId === aId && deal.buyerId === bId) || (deal.sellerId === bId && deal.buyerId === aId) ? { ...deal, active: false } : deal]));
  return { ...state, tradeDeals };
}

function createImport(state: GameState, targetCountryId: string, resource: TradeResource): GameState {
  const player = state.countries[state.playerCountryId];
  const target = state.countries[targetCountryId];
  if (!player || !target) return state;
  const relation = relationFor(player, targetCountryId);
  if (!relation.treaties.includes('trade') || relation.status === 'war' || relation.sanctions) return note(state, `TRADE // A trade pact with ${target.name} is required.`);
  const deal = makeImportDeal(state, targetCountryId, resource);
  if (!deal) return note(state, `TRADE // ${target.name} has no safe export surplus of ${resource.toUpperCase()}. Seek another supplier or change the strategic situation.`);
  return note({ ...state, tradeDeals: { ...state.tradeDeals, [deal.id]: deal } }, `TRADE // ${resource.toUpperCase()} import contract signed with ${target.name} at $${deal.pricePerUnit.toFixed(3)}/unit.`);
}

export function applyGameCommand(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'time/advanceDay': return tickGame(state);
    case 'clock/setSpeed': {
      const preferredSpeed = command.speed === 0 ? state.preferredSpeed : command.speed;
      if (state.activeEvent || state.activeAdvisor || state.campaignStatus !== 'active') return { ...state, preferredSpeed, speed: 0 };
      return { ...state, speed: command.speed, preferredSpeed };
    }
    case 'economy/setTaxRate': {
      const player = state.countries[state.playerCountryId];
      if (!player) return state;
      return { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, taxRate: clamp(command.rate, 0, 60) } } } };
    }
    case 'diplomacy/improveRelations': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target || player.economy.treasury < 2) return note(state, 'DIPLOMACY // Insufficient treasury for diplomatic mission.');
      let next = { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 2 } } } };
      next = changeRelations(next, player.id, target.id, 10);
      return note(next, `DIPLOMACY // Relations with ${target.name} improved (+10).`);
    }
    case 'diplomacy/signTradePact': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      const relation = relationFor(player, target.id);
      if (relation.status === 'war' || relation.score < 15) return note(state, `DIPLOMACY // ${target.name} requires relations of at least +15 for a trade pact.`);
      if (player.economy.treasury < 5) return note(state, 'DIPLOMACY // Trade mission requires $5B.');
      let next: GameState = { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 5 } } } };
      next = addTreaty(next, player.id, target.id, 'trade');
      return note(next, `DIPLOMACY // Trade pact signed with ${target.name}.`);
    }
    case 'diplomacy/signNonAggression': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      const relation = relationFor(player, target.id);
      if (relation.status === 'war' || relation.score < 25) return note(state, `DIPLOMACY // ${target.name} requires relations of at least +25 for a non-aggression pact.`);
      if (player.economy.treasury < 4) return note(state, 'DIPLOMACY // Non-aggression talks require $4B.');
      let next: GameState = { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 4 } } } };
      next = addTreaty(next, player.id, target.id, 'nonAggression');
      return note(next, `DIPLOMACY // Non-aggression pact signed with ${target.name}.`);
    }
    case 'diplomacy/signAlliance': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      const relation = relationFor(player, target.id);
      if (relation.status === 'war' || relation.score < 60) return note(state, `DIPLOMACY // ${target.name} requires relations of at least +60 for an alliance.`);
      if (player.economy.treasury < 10) return note(state, 'DIPLOMACY // Alliance summit requires $10B.');
      let next: GameState = { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 10 } } } };
      next = addTreaty(next, player.id, target.id, 'alliance');
      next = changeRelations(next, player.id, target.id, 8);
      return note(next, `DIPLOMACY // Strategic alliance signed with ${target.name}.`);
    }
    case 'diplomacy/formBloc': return formBloc(state, command.targetCountryId);
    case 'diplomacy/inviteToBloc': return inviteToBloc(state, command.targetCountryId);
    case 'diplomacy/toggleEmbargo': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      const current = relationFor(player, target.id);
      let next = updateBilateralRelation(state, player.id, target.id, (relation) => ({ ...relation, sanctions: !current.sanctions, treaties: !current.sanctions ? relation.treaties.filter((t) => t !== 'trade') : relation.treaties, score: clamp(relation.score + (!current.sanctions ? -12 : 4), -100, 100) }));
      if (!current.sanctions) next = cancelPairTrades(next, player.id, target.id);
      return note(next, `DIPLOMACY // Embargo ${!current.sanctions ? 'imposed on' : 'lifted from'} ${target.name}.`);
    }
    case 'trade/createImport': return createImport(state, command.targetCountryId, command.resource);
    case 'trade/cancel': {
      const deal = state.tradeDeals[command.dealId];
      if (!deal) return state;
      return note({ ...state, tradeDeals: { ...state.tradeDeals, [deal.id]: { ...deal, active: false } } }, `TRADE // ${deal.resource.toUpperCase()} contract cancelled.`);
    }
    case 'military/declareWar': {
      const attacker = state.countries[state.playerCountryId];
      const defender = state.countries[command.targetCountryId];
      if (!attacker || !defender || attacker.id === defender.id) return state;
      const existing = Object.values(state.wars).find((war) => war.status === 'active' && ((war.attackerId === attacker.id && war.defenderId === defender.id) || (war.attackerId === defender.id && war.defenderId === attacker.id)));
      if (existing) return note(state, `WAR // Conflict with ${defender.name} is already active.`);
      const warId = `${attacker.id}-${defender.id}-${state.day}`;
      const preview = getWarPreview(attacker, defender);
      const war: WarState = { id: warId, attackerId: attacker.id, defenderId: defender.id, startedDay: state.day, progress: 0, rounds: 0, autoAssault: false, status: 'active', terrain: preview.terrain, attackerSupply: preview.attackerSupply, defenderSupply: preview.defenderSupply, airSuperiority: preview.airSuperiority, attackerExhaustion: 0, defenderExhaustion: 0, lastCombatDay: state.day - 1, attackerLosses: emptyLosses(), defenderLosses: emptyLosses(), lastReport: `Mobilization ordered · ${preview.terrain.toUpperCase()} theatre · supply ${preview.attackerSupply.toFixed(0)}%.` };
      let next = cancelPairTrades(state, attacker.id, defender.id);
      next = setWarRelation(next, attacker.id, defender.id);
      next = { ...next, wars: { ...next.wars, [warId]: war }, countries: { ...next.countries, [attacker.id]: { ...next.countries[attacker.id], diplomacy: { ...next.countries[attacker.id].diplomacy, reputation: clamp(next.countries[attacker.id].diplomacy.reputation - 8, 0, 100) } } } };
      return note(next, `WAR // ${attacker.name} declared war on ${defender.name}.`);
    }
    case 'military/assault': return resolveCombatRound(state, command.warId);
    case 'military/setAutoAssault': {
      const war = state.wars[command.warId];
      if (!war || war.status !== 'active') return state;
      return note({ ...state, wars: { ...state.wars, [war.id]: { ...war, autoAssault: command.enabled } } }, `WAR // Auto assault ${command.enabled ? 'ENGAGED' : 'HALTED'}.`);
    }

    case 'development/economicResearch': {
      const player = state.countries[state.playerCountryId];
      if (!player || player.economy.treasury < 8) return note(state, 'DEVELOPMENT // Economic research requires $8B.');
      const updated = { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 8, productivity: clamp(player.economy.productivity + 2.5, 1, 100) }, industry: { ...player.industry, utilization: clamp(player.industry.utilization + 1.5, 0, 100) } };
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, 'DEVELOPMENT // Economic modernization program completed. Productivity improved.');
    }
    case 'development/militaryResearch': {
      const player = state.countries[state.playerCountryId];
      if (!player || player.economy.treasury < 12) return note(state, 'DEVELOPMENT // Military R&D requires $12B.');
      const updated = { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 12 }, military: { ...player.military, technology: clamp(player.military.technology + 2.5, 0, 100), readiness: clamp(player.military.readiness + 1, 0, 100), assessment: { ...player.military.assessment, capability: clamp(player.military.assessment.capability + 1.2, 0, 100) } } };
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, 'DEVELOPMENT // Military technology program advanced.');
    }
    case 'development/intelligenceResearch': {
      const player = state.countries[state.playerCountryId];
      if (!player || player.economy.treasury < 7) return note(state, 'DEVELOPMENT // Intelligence modernization requires $7B.');
      const updated = { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 7 }, intelligence: { ...player.intelligence, networkStrength: clamp(player.intelligence.networkStrength + 4, 0, 100), counterIntelligence: clamp(player.intelligence.counterIntelligence + 3, 0, 100), intelConfidence: clamp(player.intelligence.intelConfidence + 3, 0, 100) } };
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, 'DEVELOPMENT // Intelligence network modernization completed.');
    }
    case 'society/religiousOutreach': {
      const player = state.countries[state.playerCountryId];
      if (!player || player.economy.treasury < 4) return note(state, 'SOCIETY // Outreach program requires $4B.');
      const updated = { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 4 }, society: { ...player.society, cohesion: clamp(player.society.cohesion + 2, 0, 100), secularization: clamp(player.society.secularization - 2, 0, 100) }, politics: { ...player.politics, approval: clamp(player.politics.approval + 0.5, 0, 100) } };
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, 'SOCIETY // Religious outreach strengthened social cohesion.');
    }
    case 'society/civicCampaign': {
      const player = state.countries[state.playerCountryId];
      if (!player || player.economy.treasury < 4) return note(state, 'SOCIETY // Civic program requires $4B.');
      const updated = { ...player, economy: { ...player.economy, treasury: player.economy.treasury - 4 }, society: { ...player.society, cohesion: clamp(player.society.cohesion + 1.5, 0, 100), secularization: clamp(player.society.secularization + 2, 0, 100) }, politics: { ...player.politics, stability: clamp(player.politics.stability + 1, 0, 100) } };
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, 'SOCIETY // Civic campaign improved institutional cohesion.');
    }
    case 'ministry/setAllocation': {
      const player = state.countries[state.playerCountryId];
      if (!player) return state;
      const updated = setMinistryAllocation(player, command.ministry, command.value);
      return note({ ...state, countries: { ...state.countries, [player.id]: updated } }, `CABINET // ${command.ministry.toUpperCase()} allocation set to ${updated.ministries.allocations[command.ministry].toFixed(1)}%.`);
    }
    case 'technology/unlock': return unlockTechnology(state, state.playerCountryId, command.technologyId);
    case 'council/propose': return proposeCouncilResolution(state, command.resolutionType, command.targetCountryId);
    case 'intelligence/launch': return launchIntelOperation(state, command.operationType, command.targetCountryId);
    case 'event/resolve': return resolveEvent(state, command.optionId);
    case 'military/withdraw': {
      const war = state.wars[command.warId];
      if (!war || war.status !== 'active') return state;
      let next = { ...state, wars: { ...state.wars, [war.id]: { ...war, status: 'withdrawn' as const, autoAssault: false, lastReport: 'Attacker withdrew from the theatre.' } } };
      next = endWarRelation(next, war.attackerId, war.defenderId);
      return note(next, 'WAR // Forces withdrew. Ceasefire established under hostile relations.');
    }
  }
}
