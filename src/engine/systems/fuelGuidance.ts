import type {GameState} from '../../domain/game';
import {processIndustry} from './industry';
import {industrialDailyUse} from './industrialMarket';
import {simulateResources} from './resources';
import {warFuelReadiness} from './warRules';
import {GOODS} from '../../data/industrialCatalog';
import {processEnergy} from './energy';

/** Read-only planning estimate from engine production/use helpers, never a simulated tick. */
export function fuelGuidance(state:GameState,countryId=state.playerCountryId){
 const country=state.countries[countryId];if(!country)return null;
 // Current domestic planning flow includes both refinery and power-plant crude use.
 // Scheduled trade/contract deliveries and combat remain conditional, not guaranteed output.
 const resources=simulateResources(country);
 const refined=processIndustry({...country,resources:resources.next},1,true);
 const powered=processEnergy({...state,countries:{[countryId]:refined}}).countries[countryId];
 const produced=Math.max(0,refined.processedResources.fuel-country.processedResources.fuel);
 const net=produced-industrialDailyUse(state,countryId,'fuel');
 const oilNet=powered.resources.oil-country.resources.oil;
 const readiness=warFuelReadiness(state,countryId);
 return {stock:country.processedResources.fuel,produced,net,oilNet,oilStock:country.resources.oil,
  low:country.processedResources.fuel<GOODS.fuel.reserve,declining:net<0,oilDeclining:oilNet<0,
  days:net<0?country.processedResources.fuel/-net:null,readiness};
}
