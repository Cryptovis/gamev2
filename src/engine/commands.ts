import {cancelIndustrialContract,dismissLivingNotice,markInboxRead,setTutorialStep,toggleFacility} from './systems/playerRecords';
import {startTacticalBattle,tacticalStartStatus,tacticalCommandStatus,combatAllowed,resolveTacticalRound,chooseTacticalOrders,playerSide} from './systems/tactical';
import {buildPlant,togglePlant,cancelPowerProject} from './systems/energy';
import {buildFacility} from './systems/industrialEconomy';
import {placeIndustrialOrder} from './systems/industrialMarket';
import {creditOfferStatus,postCredit,acceptCredit,cancelCredit} from './systems/sovereignCredit';
import {prepareIntegration,beginIntegration} from './systems/integration';
import {postListing,buyListing,cancelListing,moveBankGold,startActivity,recruitPersonnel,resolveIncomingLetter} from './systems/livingEconomy';
import {buildCampus,hirePilots,manageOccupation,fundPoliticalCampaign,acceptElectionOffer} from './systems/governance';
import {startProgram} from './systems/nationalPrograms';
import {grantConcession,respondToCrisis,acknowledgeCrisis} from './systems/factions';
import {cancelConstruction} from './systems/investmentReview';
import {applyMembership,proposeAttack,voteWorld,startOutreach} from './systems/worldInstitutions';
import {cancelResearch} from './systems/technology';
import {recordReports} from './journal';
import {arrears} from './systems/sovereignCredit';
import {pendingVictory} from './systems/victory';
import {requestDiplomacy,diplomaticProposalStatus} from './systems/livingEconomy';
import {applyWarCondemnation} from './systems/worldInstitutions';
import type { GameCommand } from '../domain/commands';
import type { CountryState, GameState, TradeResource, WarState } from '../domain/game';
import { tickGame } from './tick';
import { applyThirdPartyTradeReaction, changeRelations, embassyRelationBonus, relationFor, sendResourceGift, sendTreasuryGift, setWarRelation, updateBilateralRelation, endWarRelation } from './systems/diplomacy';
import { makeImportDeal } from './systems/trade';
import { emptyLosses, getWarPreview, resolveCombatRound } from './systems/warfare';
import { resolveEvent } from './systems/events';
import { setMinistryAllocation } from './systems/ministries';
import { unlockTechnology } from './systems/technology';
import { formBloc, inviteToBloc } from './systems/blocs';
import { proposeCouncilResolution } from './systems/council';
import { launchIntelOperation } from './systems/espionage';
import { agreementEligibility, concludeAgreement, ALLIANCE_MIN_SCORE, NON_AGGRESSION_MIN_SCORE } from './systems/treaties';
import { deployEquipment, setMilitaryFactoryShare, setProductionFactories } from './systems/production';
import { investInfrastructure } from './systems/infrastructure';
import { BASE_COST_B, actionCooldownDays, actionEffectMultiplier, diplomaticMissionStatus, formatCostB, publicGain, recordActionUse, scaledCostB, sendDiplomaticMission, type DomesticAction } from './systems/policyPressure';

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

/**
 * Instant domestic programmes (audit C4/C15): GDP-scaled cost, a cooldown, and effects multiplied by the repeat-fatigue
 * multiplier so spamming the same lever yields less each time.
 */
function domesticAction(state: GameState, action: DomesticAction, baseCostB: number, costNote: string, doneNote: string, apply: (player: CountryState, multiplier: number) => CountryState): GameState {
  const player = state.countries[state.playerCountryId];
  if (!player) return state;
  const cost = scaledCostB(player, baseCostB), wait = actionCooldownDays(state, player.id, action);
  if (wait > 0) return note(state, `POLICY // This programme can be repeated in ${wait} days.`);
  if (player.economy.treasury < cost) return note(state, costNote.replace('{0}', formatCostB(cost)));
  const multiplier = actionEffectMultiplier(state, player.id, action);
  const updated = apply({ ...player, economy: { ...player.economy, treasury: player.economy.treasury - cost } }, multiplier);
  const next = recordActionUse({ ...state, countries: { ...state.countries, [player.id]: updated } }, player.id, action);
  return note(next, multiplier < 0.995 ? `${doneNote} Repeat fatigue: ${Math.round(multiplier * 100)}% effect.` : doneNote);
}

function executeGameCommand(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case 'tactical/start': return startTacticalBattle(state,command.warId);
    case 'tactical/commit': return resolveTacticalRound(state,command.warId,command.orders,command.expectedRound);
    case 'energy/build': return buildPlant(state,state.playerCountryId,command.kind);
    case 'energy/toggle': return togglePlant(state,state.playerCountryId,command.kind);
    case 'energy/cancel': return cancelPowerProject(state,state.playerCountryId,command.id);
    case 'industry/build': {
      const n=buildFacility(state,state.playerCountryId,command.kind);
      const project=n.industrialEconomy[state.playerCountryId].projects.at(-1);
      return n!==state&&state.world.tutorial.active&&state.world.tutorial.step===3&&project?{...n,world:{...n.world,tutorial:{...n.world.tutorial,practiceProjectId:project.id}}}:n;
    }
    case 'industry/order': return placeIndustrialOrder(state,command.partnerId,command.good,command.quantity,command.direction,command.years);
    case 'credit/post': return postCredit(state,command.kind,command.principal,command.apr,command.days);
    case 'credit/accept': return acceptCredit(state,command.id);
    case 'credit/cancel': return cancelCredit(state,command.id);
    case 'integration/prepare': return prepareIntegration(state,command.id,command.kind);
    case 'integration/begin': return beginIntegration(state,command.id);
    case 'exchange/post': return postListing(state,command.good,command.quantity,command.price);
    case 'exchange/buy': return buyListing(state,command.id,command.quantity);
    case 'exchange/cancel': return cancelListing(state,command.id);
    case 'gold/move': return moveBankGold(state,command.tonnes,command.direction);
    case 'activity/start': return startActivity(state,command.kind);
    case 'personnel/recruit': return recruitPersonnel(state,command.count);
    case 'diplomacy/request': return requestDiplomacy(state,command.id,command.kind,command.years);
    case 'diplomacy/resolveLetter': return resolveIncomingLetter(state,command.id,command.accept);
    case 'campus/build': return buildCampus(state,command.kind);
    case 'pilots/hire': return hirePilots(state,command.count);
    case 'occupation/manage': return manageOccupation(state,command.id,command.action,command.value);
    case 'politics/campaign': return fundPoliticalCampaign(state,command.id);
    case 'politics/acceptElection': return acceptElectionOffer(state,command.id);
    case 'program/start': return startProgram(state,command.kind);
    case 'construction/cancel': {const n=cancelConstruction(state,command.id);return n!==state&&state.world.tutorial.practiceProjectId===command.id?{...n,world:{...n.world,tutorial:{...n.world.tutorial,practiceProjectId:undefined}}}:n;}
    case 'world/membership': return applyMembership(state,command.id);
    case 'world/attackProposal': return proposeAttack(state,command.id);
    case 'world/vote': return voteWorld(state,command.id,command.choice);
    case 'industry/toggleFacility': return toggleFacility(state,command.kind);
    case 'industry/cancelContract': return cancelIndustrialContract(state,command.id);
    case 'tutorial/set': return setTutorialStep(state,command.step,command.active);
    case 'inbox/read': return markInboxRead(state,command.scope);
    case 'living/dismissNotice': return dismissLivingNotice(state);
    case 'politics/concession': return grantConcession(state,command.faction);
    case 'politics/crisisResponse': return respondToCrisis(state,command.option);
    case 'politics/acknowledgeCrisis': return acknowledgeCrisis(state);
    case 'world/outreach': return startOutreach(state,command.id,command.religion);
    case 'technology/cancel': return cancelResearch(state,state.playerCountryId);
    case 'time/advanceDay': return tickGame(state);
    case 'clock/setSpeed': {
      const preferredSpeed = command.speed === 0 ? state.preferredSpeed : command.speed;
      if (pendingVictory(state) || state.activeEvent || state.activeAdvisor || state.world.living?.advice.active || state.world.living?.notice || state.campaignStatus !== 'active') return { ...state, preferredSpeed, speed: 0 };
      return { ...state, speed: command.speed, preferredSpeed };
    }
    case 'production/setMilitaryShare': return setMilitaryFactoryShare(state,state.playerCountryId,command.share);
    case 'production/setFactories': return setProductionFactories(state,state.playerCountryId,command.equipment,command.factories);
    case 'production/deploy': return deployEquipment(state,state.playerCountryId,command.equipment);
    case 'infrastructure/invest': return investInfrastructure(state,state.playerCountryId,command.asset);
    case 'economy/setTaxRate': {
      const player = state.countries[state.playerCountryId];
      if (!player) return state;
      return { ...state, countries: { ...state.countries, [player.id]: { ...player, economy: { ...player.economy, taxRate: clamp(command.rate, arrears(state,player.id)>0?45:0, 60) } } } };
    }
    case 'diplomacy/improveRelations': {
      // Audit C15: GDP-scaled fee, 30-day cooldown per target and fading goodwill on repeats (policyPressure.ts).
      const target = state.countries[command.targetCountryId];
      const status = diplomaticMissionStatus(state, state.playerCountryId, command.targetCountryId);
      if (!target) return state;
      if (!status.allowed) return note(state, status.cooldownDays > 0 ? `DIPLOMACY // Next mission to ${target.name} possible in ${status.cooldownDays} days.` : status.reason === 'Insufficient treasury for diplomatic mission.' ? 'DIPLOMACY // Insufficient treasury for diplomatic mission.' : `DIPLOMACY // ${status.reason}`);
      return note(sendDiplomaticMission(state, state.playerCountryId, target.id), `DIPLOMACY // Relations with ${target.name} improved (+${status.gain}).`);
    }
    case 'diplomacy/giftTreasury': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      if (player.economy.treasury < command.amountB) return note(state, `DIPLOMACY // Treasury gift requires ${command.amountB}B.`);
      const before = relationFor(player,target.id).score;
      const next = sendTreasuryGift(state,player.id,target.id,command.amountB);
      const after = relationFor(next.countries[player.id],target.id).score;
      if (after === before) return note(state,`DIPLOMACY // ${target.name} cannot receive the proposed financial gesture.`);
      return note(next,`DIPLOMACY // ${command.amountB}B goodwill grant sent to ${target.name}. Bilateral relations improved.`);
    }
    case 'diplomacy/giftResource': {
      const player = state.countries[state.playerCountryId];
      const target = state.countries[command.targetCountryId];
      if (!player || !target) return state;
      const beforeStock = player.resources[command.resource];
      const next = sendResourceGift(state,player.id,target.id,command.resource);
      const sent = beforeStock - next.countries[player.id].resources[command.resource];
      if (sent <= 0) return note(state,`DIPLOMACY // No ${command.resource.toUpperCase()} package is available for aid.`);
      return note(next,`DIPLOMACY // Humanitarian ${command.resource.toUpperCase()} shipment sent to ${target.name} (${sent.toFixed(1)} units).`);
    }
    case 'diplomacy/signTradePact': return requestDiplomacy(state,command.targetCountryId,'trade_pact');
    case 'diplomacy/signNonAggression': {
      const target = state.countries[command.targetCountryId];
      const check = agreementEligibility(state, state.playerCountryId, command.targetCountryId, 'nonAggression');
      if (!target || check.block === 'invalid' || check.block === 'active') return state;
      if (check.block === 'war' || check.block === 'relations') return note(state, `DIPLOMACY // ${target.name} requires relations of at least +${NON_AGGRESSION_MIN_SCORE} for a non-aggression pact.`);
      if (check.block === 'treasury') return note(state, `DIPLOMACY // Non-aggression talks require ${formatCostB(check.cost)}.`);
      const next = concludeAgreement(state, state.playerCountryId, target.id, 'nonAggression');
      return next === state ? state : note(next, `DIPLOMACY // Non-aggression pact signed with ${target.name}.`);
    }
    case 'diplomacy/signAlliance': {
      const target = state.countries[command.targetCountryId];
      const check = agreementEligibility(state, state.playerCountryId, command.targetCountryId, 'alliance');
      if (!target || check.block === 'invalid' || check.block === 'active') return state;
      if (check.block === 'war' || check.block === 'relations') return note(state, `DIPLOMACY // ${target.name} requires relations of at least +${ALLIANCE_MIN_SCORE} for an alliance.`);
      if (check.block === 'treasury') return note(state, `DIPLOMACY // Alliance summit requires ${formatCostB(check.cost)}.`);
      const next = concludeAgreement(state, state.playerCountryId, target.id, 'alliance');
      return next === state ? state : note(next, `DIPLOMACY // Strategic alliance signed with ${target.name}.`);
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
      if (defender.annexedBy || defender.controllerCountryId != null) return note(state, `WAR // ${defender.name} is not an independent state and cannot be targeted.`);
      const existing = Object.values(state.wars).find((war) => war.status === 'active' && ((war.attackerId === attacker.id && war.defenderId === defender.id) || (war.attackerId === defender.id && war.defenderId === attacker.id)));
      if (existing) return note(state, `WAR // Conflict with ${defender.name} is already active.`);
      let warId = `${attacker.id}-${defender.id}-${state.day}`;
      let suffix=0;while(state.wars[warId])warId=`${attacker.id}-${defender.id}-${state.day}-${++suffix}`;
      const preview = getWarPreview(attacker, defender, state.infrastructure[attacker.id], state.infrastructure[defender.id]);
      const war: WarState = { id: warId, attackerId: attacker.id, defenderId: defender.id, startedDay: state.day, progress: 0, rounds: 0, autoAssault: false, status: 'active', terrain: preview.terrain, attackerSupply: preview.attackerSupply, defenderSupply: preview.defenderSupply, airSuperiority: preview.airSuperiority, attackerExhaustion: 0, defenderExhaustion: 0, lastCombatDay: state.day - 1, attackerLosses: emptyLosses(), defenderLosses: emptyLosses(), attackerStartPersonnel: attacker.military.personnel, defenderStartPersonnel: defender.military.personnel, lastReport: `Mobilization ordered · ${preview.terrain.toUpperCase()} theatre · supply ${preview.attackerSupply.toFixed(0)}%.` };
      let next = cancelPairTrades(state, attacker.id, defender.id);
      next = setWarRelation(next, attacker.id, defender.id);
      next = { ...next, wars: { ...next.wars, [warId]: war }, countries: { ...next.countries, [attacker.id]: { ...next.countries[attacker.id], diplomacy: { ...next.countries[attacker.id].diplomacy, reputation: clamp(next.countries[attacker.id].diplomacy.reputation - 8, 0, 100) } } } };
      return applyWarCondemnation(state,note(next, `WAR // ${attacker.name} declared war on ${defender.name}.`),attacker.id,defender.id);
    }
    case 'military/assault': { const w=state.wars[command.warId];if(!w||![w.attackerId,w.defenderId].includes(state.playerCountryId)||!combatAllowed(state))return state;return w.tactical?resolveTacticalRound(state,w.id,chooseTacticalOrders(state,w.id,playerSide(state,w)),w.tactical.round):resolveCombatRound(state,w.id); }
    case 'military/setAutoAssault': {
      const war = state.wars[command.warId];
      if (!war || war.status !== 'active' || ![war.attackerId,war.defenderId].includes(state.playerCountryId)) return state;
      return note({ ...state, wars: { ...state.wars, [war.id]: { ...war, autoAssault: command.enabled } } }, `WAR // Auto assault ${command.enabled ? 'ENGAGED' : 'HALTED'}.`);
    }

    case 'development/economicResearch': return domesticAction(state, 'development/economicResearch', BASE_COST_B.economicResearch, 'DEVELOPMENT // Economic research requires {0}.', 'DEVELOPMENT // Economic modernization program completed. Productivity improved.', (p, m) => ({ ...p, economy: { ...p.economy, productivity: clamp(p.economy.productivity + 2.5 * m, 1, 100) }, industry: { ...p.industry, utilization: clamp(p.industry.utilization + 1.5 * m, 0, 100) } }));
    case 'development/militaryResearch': return domesticAction(state, 'development/militaryResearch', BASE_COST_B.militaryResearch, 'DEVELOPMENT // Military R&D requires {0}.', 'DEVELOPMENT // Military technology program advanced.', (p, m) => ({ ...p, military: { ...p.military, technology: clamp(p.military.technology + 2.5 * m, 0, 100), readiness: clamp(p.military.readiness + 1 * m, 0, 100), assessment: { ...p.military.assessment, capability: clamp(p.military.assessment.capability + 1.2 * m, 0, 100) } } }));
    case 'development/intelligenceResearch': return domesticAction(state, 'development/intelligenceResearch', BASE_COST_B.intelligenceResearch, 'DEVELOPMENT // Intelligence modernization requires {0}.', 'DEVELOPMENT // Intelligence network modernization completed.', (p, m) => ({ ...p, intelligence: { ...p.intelligence, networkStrength: clamp(p.intelligence.networkStrength + 4 * m, 0, 100), counterIntelligence: clamp(p.intelligence.counterIntelligence + 3 * m, 0, 100), intelConfidence: clamp(p.intelligence.intelConfidence + 3 * m, 0, 100) } }));
    case 'society/religiousOutreach': return domesticAction(state, 'society/religiousOutreach', BASE_COST_B.religiousOutreach, 'SOCIETY // Outreach program requires {0}.', 'SOCIETY // Religious outreach strengthened social cohesion.', (p, m) => ({ ...p, society: { ...p.society, cohesion: publicGain(p.society.cohesion, 2, m), secularization: clamp(p.society.secularization - 2 * m, 0, 100) }, politics: { ...p.politics, approval: publicGain(p.politics.approval, 0.5, m) } }));
    case 'society/civicCampaign': return domesticAction(state, 'society/civicCampaign', BASE_COST_B.civicCampaign, 'SOCIETY // Civic program requires {0}.', 'SOCIETY // Civic campaign improved institutional cohesion.', (p, m) => ({ ...p, society: { ...p.society, cohesion: publicGain(p.society.cohesion, 1.5, m), secularization: clamp(p.society.secularization + 2 * m, 0, 100) }, politics: { ...p.politics, stability: publicGain(p.politics.stability, 1, m) } }));
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
      if (!war || war.status !== 'active' || ![war.attackerId,war.defenderId].includes(state.playerCountryId)) return state;
      const defending=war.defenderId===state.playerCountryId;
      let next:GameState = { ...state, wars: { ...state.wars, [war.id]: { ...war, status: defending?'victory':'withdrawn', autoAssault: false, lastReport: defending?'Defender withdrew and conceded control.':'Attacker withdrew from the theatre.' } } };
      if(defending){const d=next.countries[war.defenderId];next={...next,countries:{...next.countries,[d.id]:{...d,controllerCountryId:war.attackerId,politics:{...d.politics,stability:clamp(d.politics.stability-15,0,100)}}}};}
      next = endWarRelation(next, war.attackerId, war.defenderId);
      return note(next, defending?'WAR // Defender withdrew and conceded control to the attacker.':'WAR // Forces withdrew. Ceasefire established under hostile relations.');
    }
  }
}

export interface CommandResult {state:GameState;status:'applied'|'unavailable'|'duplicate';message:string}
export function executeCommandResult(state:GameState,command:GameCommand):CommandResult {
 if(command.commandId && state.world.commandIds?.includes(command.commandId))return {state,status:'duplicate',message:'This command has already been applied.'};
 // Reject NaN/Infinity in any numeric field before it can reach clamp() or the treasury.
 if(Object.values(command).some(v=>typeof v==='number'&&!Number.isFinite(v)))return {state,status:'unavailable',message:'Enter a valid finite number.'};
 if(command.type==='military/assault'&&!combatAllowed(state))return {state,status:'unavailable',message:'Resolve the pending campaign decision before giving combat orders.'};
 if(command.type==='tactical/start'){const reason=tacticalStartStatus(state,command.warId);if(reason)return {state,status:'unavailable',message:reason};}
 if(command.type==='tactical/commit'){const reasons=tacticalCommandStatus(state,command.warId,command.expectedRound,command.orders);if(reasons.length)return {state,status:'unavailable',message:reasons.join(' ')};}
 if(command.type==='credit/post'){const status=creditOfferStatus(state,command.kind,command.principal,command.apr,command.days);if(!status.allowed)return {state,status:'unavailable',message:status.reasons.join(' ')};}
 const proposal=command.type==='diplomacy/request'?diplomaticProposalStatus(state,command.id,command.kind):command.type==='diplomacy/signTradePact'?diplomaticProposalStatus(state,command.targetCountryId,'trade_pact'):null;
 if(proposal&&!proposal.allowed)return {state,status:'unavailable',message:proposal.reason};
 const next=executeGameCommand(state,command);
 const changed=next.countries!==state.countries||next.tradeDeals!==state.tradeDeals||next.world!==state.world||next.wars!==state.wars||next.production!==state.production||next.industrialContracts!==state.industrialContracts||next.industrialEconomy!==state.industrialEconomy||next.infrastructure!==state.infrastructure||next.intelOperations!==state.intelOperations||next.council!==state.council||next.leadership!==state.leadership||next.day!==state.day||next.speed!==state.speed;
 let recorded=recordReports(state,next,command.type==='time/advanceDay'?'world':'command');
 if(command.commandId && changed)recorded={...recorded,world:{...recorded.world,commandIds:[...(recorded.world.commandIds??[]),command.commandId].slice(-512)}};
 return {state:recorded,status:changed?'applied':'unavailable',message:next.sitrep[0]!==state.sitrep[0]?next.sitrep[0]:changed?'Your command has been applied.':'Check budget, stock, prerequisites, access or an existing order.'};
}
export function applyGameCommand(state:GameState,command:GameCommand):GameState {return executeCommandResult(state,command).state;}
