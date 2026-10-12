import type { BattlefieldTerrain, CountryState, NationalInfrastructureState } from '../../domain/game';
import { simulateResources } from './resources';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const terrainFactor:Record<BattlefieldTerrain,number>={plains:1,urban:.88,mountain:.69,forest:.82,desert:.84,coastal:.9};

export interface SupplyNetworkSnapshot {
  throughput:number;
  logisticsEfficiency:number;
  reserveFactor:number;
  fuelDays:number;
  steelDays:number;
  foodDays:number;
  frontDemand:number;
  militaryFuelDemand:number;
  militarySteelDemand:number;
  infrastructure:number;
  terrainFactor:number;
  supplyScore:number;
  bottleneck:'fuel'|'steel'|'food'|'transport'|'power'|'none';
  stages:{id:'production'|'depots'|'transport'|'front';label:string;value:number;detail:string}[];
}

export function calculateSupplyNetwork(country:CountryState,terrain:BattlefieldTerrain='plains',role:'home'|'attacker'|'defender'='home',network?:NationalInfrastructureState):SupplyNetworkSnapshot{
  const flow=simulateResources(country);
  const militaryFuelDemand=Math.max(.8,1+country.military.tanks*.0014+country.military.fighters*.018+country.military.bombers*.028+country.military.warships*.005);
  const militarySteelDemand=Math.max(.35,.45+country.military.tanks*.00032+country.military.artillery*.00028+country.industry.factories*.0035);
  const fuelDays=country.processedResources.fuel/Math.max(.01,militaryFuelDemand);
  const steelDays=country.processedResources.steel/Math.max(.01,militarySteelDemand);
  const foodDays=country.resources.food/Math.max(.01,flow.consumption.food);
  const derivedInfrastructure=clamp(
    country.industry.utilization*.38+
    Math.min(100,country.industry.powerCapacity*.42)*.22+
    Math.min(100,country.industry.factories*1.5)*.2+
    Math.min(100,country.industry.refineries*4)*.2,
    8,100,
  );
  const infrastructure=network?.throughput??derivedInfrastructure;
  const logisticsEfficiency=clamp(
    country.military.logistics*.48+
    infrastructure*.32+
    country.military.readiness*.12+
    (network?.hubs??derivedInfrastructure)*.08,
    5,100
  );
  const reserveFactor=clamp(Math.min(1,fuelDays/30)*.46+Math.min(1,steelDays/45)*.26+Math.min(1,foodDays/45)*.28,.08,1);
  const frontDemand=clamp(18+country.military.personnel/45000+country.military.tanks*.012+country.military.artillery*.006+country.military.fighters*.055,12,100);
  // Phase 3: an attacker's extended lines cost 4%; a defender holds its normal home throughput (was .92 / 1.04, a 13% gap).
  const roleFactor=role==='attacker'?.96:1;
  const theatre=terrainFactor[terrain];
  const powerFactor=clamp(country.processedResources.electricity/70,.35,1);
  const throughput=clamp((logisticsEfficiency*.52+infrastructure*.3+powerFactor*100*.18)*reserveFactor,4,100);
  const supplyScore=clamp(throughput*theatre*roleFactor-(frontDemand-50)*.08,5,100);

  const candidates:{id:SupplyNetworkSnapshot['bottleneck'];score:number}[]=[
    {id:'fuel',score:Math.min(100,fuelDays/30*100)},
    {id:'steel',score:Math.min(100,steelDays/45*100)},
    {id:'food',score:Math.min(100,foodDays/45*100)},
    {id:'transport',score:logisticsEfficiency},
    {id:'power',score:powerFactor*100},
  ];
  const weakest=candidates.sort((a,b)=>a.score-b.score)[0];
  const bottleneck=weakest.score>82?'none':weakest.id;

  return {
    throughput,logisticsEfficiency,reserveFactor,fuelDays,steelDays,foodDays,frontDemand,militaryFuelDemand,militarySteelDemand,infrastructure,terrainFactor:theatre,supplyScore,bottleneck,
    stages:[
      {id:'production',label:'Production',value:clamp((country.industry.utilization+powerFactor*100)/2,0,100),detail:`${country.industry.factories} factories · ${country.industry.refineries} refineries`},
      {id:'depots',label:'Strategic Depots',value:clamp(reserveFactor*100,0,100),detail:`Fuel ${fuelDays.toFixed(0)}d · Steel ${steelDays.toFixed(0)}d`},
      {id:'transport',label:'Transport Net',value:logisticsEfficiency,detail:network?`Road ${network.roads.toFixed(0)} · Rail ${network.rail.toFixed(0)} · Hubs ${network.hubs.toFixed(0)}`:`Infrastructure ${infrastructure.toFixed(0)}%`},
      {id:'front',label:'Front Delivery',value:supplyScore,detail:`${terrain.toUpperCase()} · demand ${frontDemand.toFixed(0)}`},
    ],
  };
}
