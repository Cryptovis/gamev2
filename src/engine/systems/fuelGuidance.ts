import type {GameState} from '../../domain/game';
import {processIndustry} from './industry';
import {industrialDailyUse} from './industrialMarket';
import {simulateResources} from './resources';
import {warFuelReadiness} from './warRules';
import {GOODS} from '../../data/industrialCatalog';

/** Read-only planning estimate from engine production/use helpers, never a simulated tick. */
export function fuelGuidance(state:GameState,countryId=state.playerCountryId){
 const country=state.countries[countryId];if(!country)return null;
 const produced=Math.max(0,processIndustry(country,1,true).processedResources.fuel-country.processedResources.fuel);
 const net=produced-industrialDailyUse(state,countryId,'fuel');
 const oilNet=simulateResources(country).net.oil;
 const readiness=warFuelReadiness(state,countryId);
 return {stock:country.processedResources.fuel,produced,net,oilNet,oilStock:country.resources.oil,
  low:country.processedResources.fuel<GOODS.fuel.reserve,declining:net<0,oilDeclining:oilNet<0,
  days:net<0?country.processedResources.fuel/-net:null,readiness};
}
