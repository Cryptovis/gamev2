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

export function tickCountry(country: CountryState): CountryState {
  const administered = processMinistries(country);
  const resources = simulateResources(administered);
  const economy = simulateEconomy(administered, resources);
  const politics = simulatePolitics(administered, economy, resources);
  const base: CountryState = {
    ...administered,
    demographics: { ...administered.demographics, population: Math.max(1, administered.demographics.population * (1 + administered.demographics.growthRate / 100 / 365)) },
    economy: economy.next,
    resources: resources.next,
    politics,
  };
  return processIndustry(base);
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
  if (state.campaignStatus !== 'active' || state.activeEvent) return state;
  const countries = Object.fromEntries(Object.entries(state.countries).map(([id, country]) => [id, tickCountry(country)]));
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
  let next: GameState = { ...state, day: nextDay, countries, council: { ...state.council, influenceByCountry }, sitrep: [...notices, ...state.sitrep].slice(0, 12) };
  next = processTradeDeals(next);
  next = processAutoWars(next);
  next = processElection(next);
  next = processIntelOperations(next);
  next = processInfluence(next);
  next = processStrategicGoals(next);
  next = processCountryAI(next);
  next = maybeTriggerEvent(next);
  return next;
}
