import {constrainedOilOutput} from './systems/organizations/quotas';
import {organizationSanctionsBlock} from './systems/organizations/sanctions';
import {organizationCountryAccounts} from './systems/organizations/financing';
import {processOrganizations} from './systems/organizations/tick';
import {leaderModifiers,NEUTRAL_LEADER,type LeaderModifiers} from './systems/leaderPerks';
import { processFlights } from './systems/flights';
import { processTradeFlights, reportFlightArrivals } from './systems/flightHooks';
import { processCommodityExchange } from './systems/commodityExchange';
import {recordEconomicHistory} from './systems/economicHistory';
import {processAutoTacticalWars} from './systems/tactical';
import {processEnergy,processEnergyAI} from './systems/energy';
import {processResearch} from './systems/technology';
import {processCredit} from './systems/sovereignCredit';
import {processIntegration} from './systems/integration';
import {pendingVictory} from './systems/victory';
import {processExchange,processWellbeing,processLetters} from './systems/livingEconomy';
import {populationForecast,distributeMigration} from './systems/population';
import {processGovernance,occupationFor} from './systems/governance';
import {processPrograms} from './systems/nationalPrograms';
import {processWorldInstitutions} from './systems/worldInstitutions';
import type { CountryState, GameState } from '../domain/game';
import { processCountryAI } from './systems/ai';
import { simulateEconomy } from './systems/economy';
import { maybeTriggerEvent } from './systems/events';
import { simulatePolitics } from './systems/politics';
import { processPoliticalLayer } from './systems/factions';
import { simulateResources, type TradeInflow } from './systems/resources';
import { processTradeDeals } from './systems/trade';
import { processMinistries } from './systems/ministries';
import { processIndustry } from './systems/industry';
import { processAutoWars } from './systems/warfare';
import { processIntelOperations } from './systems/espionage';
import { processInfluence } from './systems/influence';
import { processStrategicGoals } from './systems/strategicGoals';
import { processLivingEconomyAI } from './systems/livingEconomyAI';
import { processWorldDiplomacy,processTradeRelations } from './systems/worldDynamics';
import { processPactStrain } from './systems/treaties';
import { maybeCreateResourceAdvisor } from './systems/advisor';
import { processCampaignVictory } from './systems/campaignVictory';
import { processIncomingDiplomaticOffers } from './systems/diplomaticOffers';
import { processProduction, processProductionAI } from './systems/production';
import {processIndustrialEconomy,processIndustrialAI} from './systems/industrialEconomy';
import {processIndustrialContracts,processIndustrialMarketAI} from './systems/industrialMarket';
import {processLeadership} from './systems/leadership';
import { processInfrastructure, processInfrastructureAI } from './systems/infrastructure';
import { processAiWars } from './systems/aiWar';

export function tickCountry(country: CountryState,boost=1,managedEnergy=false,tradeInflow?: TradeInflow,perks:Readonly<LeaderModifiers>=NEUTRAL_LEADER,organizationDebt=0,fiscalAdjustmentB=0,oilOutput=country.resourceProduction.oil): CountryState {
  const administered = processMinistries(country);
  const resources = simulateResources(administered,boost,tradeInflow,perks.consumer,oilOutput);
  const economy = simulateEconomy(administered, resources,perks,organizationDebt,fiscalAdjustmentB);
  const politics = simulatePolitics(administered, economy, resources,perks.stabilityRecovery);
  const base: CountryState = {
    ...administered,
    demographics: populationForecast(administered,resources),
    economy: economy.next,
    resources: resources.next,
    politics,
  };
  return processIndustry(base,boost,managedEnergy,perks.factory);
}

/** Average daily food/oil each country receives (+) or ships (-) under active trade deals. */
function contractedTradeInflow(state: GameState): Record<string, TradeInflow> {
  const inflow: Record<string, TradeInflow> = {};
  for (const deal of Object.values(state.tradeDeals)) {
    if (!deal.active || organizationSanctionsBlock(state,deal.sellerId,deal.buyerId,'trade',deal.resource) || (deal.resource !== 'food' && deal.resource !== 'oil')) continue;
    const buyer = (inflow[deal.buyerId] ??= {}), seller = (inflow[deal.sellerId] ??= {});
    buyer[deal.resource] = (buyer[deal.resource] ?? 0) + deal.quantityPerDay;
    seller[deal.resource] = (seller[deal.resource] ?? 0) - deal.quantityPerDay;
  }
  return inflow;
}

/** Factions, contested elections and regime crises for every country (0.88, audit E2; see systems/factions.ts). */
function processElection(state: GameState): GameState {
  return processPoliticalLayer(state);
}

export function tickGame(state: GameState): GameState {
  if (state.campaignStatus !== 'active' || state.activeEvent || state.activeAdvisor || state.world.living?.advice.active || state.world.living?.notice || pendingVictory(state)) return state;
  const dated=processOrganizations(processLeadership({...state,day:state.day+1}),'decisions');
  const financing=organizationCountryAccounts(dated);
  const boostActive=dated.day<dated.leadership.celebrationUntilDay;
  const inflow = contractedTradeInflow(state);
  const countries = distributeMigration(Object.fromEntries(Object.entries(dated.countries).map(([id, country]) => [id, country.annexedBy?country:tickCountry(country,(id===state.playerCountryId&&boostActive?1.12:1)*((occupationFor(dated,id)?.unrest??0)>=80?.7:1),true,inflow[id],leaderModifiers(state,id),financing[id]?.debtB??0,financing[id]?.fiscalAdjustmentB??0,constrainedOilOutput(dated,id))])));
  const nextDay = state.day + 1;
  const player = countries[state.playerCountryId];
  const notices: string[] = [];
  if (nextDay % 30 === 0) notices.push(`Day ${nextDay}: monthly strategic review completed.`);
  if (player) {
    const foodPerMillion = player.resources.food / Math.max(1, player.demographics.population / 1_000_000);
    if (foodPerMillion < 0.15) notices.push(`Day ${nextDay}: strategic food reserves are critically low.`);
    if (player.resources.oil <= 10) notices.push(`Day ${nextDay}: oil reserve warning — military readiness is at risk.`);
  }

  const influenceByCountry = { ...dated.council.influenceByCountry };
  for (const country of Object.values(countries)) {
    const current = influenceByCountry[country.id] ?? Math.max(8, country.diplomacy.reputation * 0.25);
    influenceByCountry[country.id] = Math.min(100, current + 0.025 + country.diplomacy.reputation * 0.00025);
  }
  let next: GameState = { ...dated, day: nextDay, countries, council: { ...dated.council, influenceByCountry }, sitrep: [...notices, ...dated.sitrep].slice(0, 12) };
  next = processWorldInstitutions(next);
  next = processPrograms(next);
  next = processGovernance(next);
  next = processResearch(next);
  next = processTradeRelations(next);
  next = processPactStrain(next);
  next = processTradeDeals(next);
  next = processInfrastructure(next);
  next = processEnergy(next);
  next = processIndustrialEconomy(next);
  next = processIndustrialContracts(next);
  next = processProduction(next);
  next = processAutoWars(next);
  next = processAutoTacticalWars(next);
  next = processElection(next);
  next = processIntelOperations(next);
  next = processInfluence(next);
  next = processStrategicGoals(next);
  next = processProductionAI(next);
  next = processInfrastructureAI(next);
  next = processLivingEconomyAI(next);
  next = processWorldDiplomacy(next);
  next = processIncomingDiplomaticOffers(next);
  next = processLetters(next);
  next = processExchange(next);
  next = processCountryAI(next);
  next = processEnergyAI(next);
  next = processIndustrialAI(next);
  next = processIndustrialMarketAI(next);
  next = maybeTriggerEvent(next);
  next = processCredit(next);
  next = processOrganizations(next,'finance');
  next = processIntegration(next);
  next = processWellbeing(next);
  next = processAiWars(next);
  if(!next.world.living?.advice.active&&!next.world.living?.notice)next = maybeCreateResourceAdvisor(next);
  next = processTradeFlights(next);
  next = reportFlightArrivals(processFlights(next));
  next = processCommodityExchange(next);
  next = processCampaignVictory(next);
  return recordEconomicHistory(next);
}
