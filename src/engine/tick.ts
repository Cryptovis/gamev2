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
import { simulateResources } from './systems/resources';
import { processTradeDeals } from './systems/trade';
import { processMinistries } from './systems/ministries';
import { processIndustry } from './systems/industry';
import { processAutoWars } from './systems/warfare';
import { processIntelOperations } from './systems/espionage';
import { processInfluence } from './systems/influence';
import { processStrategicGoals } from './systems/strategicGoals';
import { processLivingEconomyAI } from './systems/livingEconomyAI';
import { processWorldDiplomacy,processTradeRelations } from './systems/worldDynamics';
import { maybeCreateResourceAdvisor } from './systems/advisor';
import { processIncomingDiplomaticOffers } from './systems/diplomaticOffers';
import { processProduction, processProductionAI } from './systems/production';
import {processIndustrialEconomy,processIndustrialAI} from './systems/industrialEconomy';
import {processIndustrialContracts,processIndustrialMarketAI} from './systems/industrialMarket';
import {processLeadership} from './systems/leadership';
import { processInfrastructure, processInfrastructureAI } from './systems/infrastructure';

export function tickCountry(country: CountryState,boost=1,managedEnergy=false): CountryState {
  const administered = processMinistries(country);
  const resources = simulateResources(administered,boost);
  const economy = simulateEconomy(administered, resources);
  const politics = simulatePolitics(administered, economy, resources);
  const base: CountryState = {
    ...administered,
    demographics: populationForecast(administered,resources),
    economy: economy.next,
    resources: resources.next,
    politics,
  };
  return processIndustry(base,boost,managedEnergy);
}

function processElection(state: GameState): GameState {
  const player = state.countries[state.playerCountryId];
  if (!player || player.politics.electionDaysRemaining > 0 || !['democracy','republic'].includes(player.politics.regime)) return state;
  if (player.politics.approval >= 45) {
    const nextPlayer = { ...player, politics:{...player.politics,electionDaysRemaining:1460,approval:Math.min(100,player.politics.approval+2)} };
    return { ...state, countries:{...state.countries,[player.id]:nextPlayer}, sitrep:[`ELECTION // ${player.name} government re-elected with ${player.politics.approval.toFixed(1)}% approval.`,...state.sitrep].slice(0,12) };
  }
  return { ...state, campaignStatus:'lost', speed:0, sitrep:[`CAMPAIGN LOST // The government lost the election with ${player.politics.approval.toFixed(1)}% approval.`,...state.sitrep].slice(0,12) };
}

export function tickGame(state: GameState): GameState {
  if (state.campaignStatus !== 'active' || state.activeEvent || state.activeAdvisor || state.world.living?.advice.active || state.world.living?.notice || pendingVictory(state)) return state;
  const dated=processLeadership({...state,day:state.day+1});
  const boostActive=dated.day<dated.leadership.celebrationUntilDay;
  const countries = distributeMigration(Object.fromEntries(Object.entries(state.countries).map(([id, country]) => [id, country.annexedBy?country:tickCountry(country,(id===state.playerCountryId&&boostActive?1.12:1)*((occupationFor(dated,id)?.unrest??0)>=80?.7:1),true)])));
  const nextDay = state.day + 1;
  const player = countries[state.playerCountryId];
  const notices: string[] = [];
  if (nextDay % 30 === 0) notices.push(`Day ${nextDay}: monthly strategic review completed.`);
  if (player) {
    const foodPerMillion = player.resources.food / Math.max(1, player.demographics.population / 1_000_000);
    if (foodPerMillion < 0.15) notices.push(`Day ${nextDay}: strategic food reserves are critically low.`);
    if (player.resources.oil <= 10) notices.push(`Day ${nextDay}: oil reserve warning — military readiness is at risk.`);
  }

  const influenceByCountry = { ...state.council.influenceByCountry };
  for (const country of Object.values(countries)) {
    const current = influenceByCountry[country.id] ?? Math.max(8, country.diplomacy.reputation * 0.25);
    influenceByCountry[country.id] = Math.min(100, current + 0.025 + country.diplomacy.reputation * 0.00025);
  }
  let next: GameState = { ...dated, day: nextDay, countries, council: { ...state.council, influenceByCountry }, sitrep: [...notices, ...dated.sitrep].slice(0, 12) };
  next = processWorldInstitutions(next);
  next = processPrograms(next);
  next = processGovernance(next);
  next = processResearch(next);
  next = processTradeRelations(next);
  next = processTradeDeals(next);
  next = processInfrastructure(next);
  next = processEnergy(next);
  next = processIndustrialEconomy(next);
  next = processIndustrialContracts(next);
  next = processProduction(next);
  next = processAutoWars(next);
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
  next = processIntegration(next);
  next = processWellbeing(next);
  if(!next.world.living?.advice.active&&!next.world.living?.notice)next = maybeCreateResourceAdvisor(next);
  return next;
}
