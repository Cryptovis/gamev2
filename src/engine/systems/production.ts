import {leaderModifiers} from './leaderPerks';
import {activeCountries} from '../../domain/sovereignty';
import type { CountryState, EquipmentStockpile, EquipmentType, GameState, NationalProductionState, ProductionLine } from '../../domain/game';
import type {NationalIndustrialEconomy} from '../../domain/industrial';
import {TANK_COMPONENTS} from '../../data/industrialCatalog';
import { EQUIPMENT_CATALOG, EQUIPMENT_TYPES } from '../../data/equipmentCatalog';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const emptyStock=():EquipmentStockpile=>({infantry_equipment:0,artillery:0,armor:0,fighters:0,logistics:0,naval:0});

export function militaryFactoryCapacity(country:CountryState,production:NationalProductionState){
  return Math.max(0,Math.floor(country.industry.factories*(country.industry.utilization/100)*(production.militaryFactoryShare/100)));
}

function line(id:EquipmentType,factories:number,efficiency:number):ProductionLine{
  return {id:`line-${id}`,equipment:id,factories,efficiency,lastOutput:0};
}

function allocate(capacity:number,weights:Record<EquipmentType,number>,efficiency:number){
  const lines={} as Record<EquipmentType,ProductionLine>;
  let assigned=0;
  EQUIPMENT_TYPES.forEach((type,index)=>{
    const factories=index===EQUIPMENT_TYPES.length-1?Math.max(0,capacity-assigned):Math.max(0,Math.floor(capacity*weights[type]));
    assigned+=factories;
    lines[type]=line(type,factories,efficiency);
  });
  return lines;
}

export function createInitialProduction(country:CountryState):NationalProductionState{
  const share=country.military.assessment.capability>=70?60:country.military.assessment.capability>=40?52:44;
  const capacity=Math.max(0,Math.floor(country.industry.factories*(country.industry.utilization/100)*(share/100)));
  const weights:Record<EquipmentType,number>={
    infantry_equipment:.27,
    artillery:.14,
    armor:.18,
    fighters:.15,
    logistics:.18,
    naval:.08,
  };
  const baseEfficiency=clamp(52+country.military.technology*.28,45,82);
  return {
    militaryFactoryShare:share,
    lines:allocate(capacity,weights,baseEfficiency),
    stockpile:{
      infantry_equipment:Math.max(2500,Math.round(country.military.personnel*.08)),
      artillery:Math.max(10,Math.round(country.military.artillery*.10)),
      armor:Math.max(5,Math.round(country.military.tanks*.10)),
      fighters:Math.max(3,Math.round(country.military.fighters*.12)),
      logistics:Math.max(40,Math.round(country.military.personnel/3000)),
      naval:Math.max(1,Math.round(country.military.warships*.10)),
    },
    lastDailyOutput:emptyStock(),
    lastInputUse:{steel:0,fuel:0,electricity:0,treasury:0},
    throughput:100,
    bottleneck:'none',
  };
}

export function createInitialProductionMap(countries:Record<string,CountryState>){
  return Object.fromEntries(Object.values(countries).map(country=>[country.id,createInitialProduction(country)]));
}

function techMultiplier(country:CountryState,type:EquipmentType){
  let bonus=1+country.military.technology/500;
  if(country.technology.unlocked.includes('ind-automation'))bonus+=.08;
  if(country.technology.unlocked.includes('ind-metallurgy')&&(type==='armor'||type==='artillery'||type==='naval'))bonus+=.06;
  if(country.technology.unlocked.includes('mil-modernization'))bonus+=.08;
  return bonus;
}

function bottleneckFor(country:CountryState,need:{steel:number;fuel:number;electricity:number;treasury:number}){
  const ratios={
    steel:need.steel<=0?1:country.processedResources.steel/need.steel,
    fuel:need.fuel<=0?1:country.processedResources.fuel/need.fuel,
    electricity:need.electricity<=0?1:country.processedResources.electricity/need.electricity,
    treasury:need.treasury<=0?1:Math.max(0,country.economy.treasury)/need.treasury,
  };
  const entries=Object.entries(ratios) as Array<[keyof typeof ratios,number]>;
  const [key,value]=entries.sort((a,b)=>a[1]-b[1])[0];
  return {ratio:clamp(value,0,1),key:value>=1?'none':key};
}

export function processNationalProduction(country:CountryState,production:NationalProductionState,industrial?:NationalIndustrialEconomy,boost=1){
  const components=industrial?{...industrial.stock}:null;
  const capacity=militaryFactoryCapacity(country,production);
  let remainingCapacity=capacity;
  let steel=country.processedResources.steel;
  let fuel=country.processedResources.fuel;
  let electricity=country.processedResources.electricity;
  let treasury=country.economy.treasury;
  const stockpile={...production.stockpile};
  const lastDailyOutput=emptyStock();
  const lines={} as Record<EquipmentType,ProductionLine>;
  const inputUse={steel:0,fuel:0,electricity:0,treasury:0};
  let weightedPotential=0,weightedActual=0;
  let globalBottleneck:NationalProductionState['bottleneck']='none';
  let worstRatio=1;

  for(const type of EQUIPMENT_TYPES){
    const prev=production.lines[type];
    const assigned=Math.min(prev.factories,remainingCapacity);
    remainingCapacity=Math.max(0,remainingCapacity-assigned);
    const def=EQUIPMENT_CATALOG[type];
    const efficiency=clamp(prev.efficiency,20,100);
    const need={
      steel:def.inputs.steel*assigned,
      fuel:def.inputs.fuel*assigned,
      electricity:def.inputs.electricity*assigned,
      treasury:def.inputs.treasury*assigned,
    };
    const localCountry={...country,processedResources:{fuel,steel,electricity},economy:{...country.economy,treasury}};
    const bottle=bottleneckFor(localCountry,need);
    let ratio=bottle.ratio;
    let lineBottleneck=bottle.key as NationalProductionState['bottleneck'];
    const potential=def.baseOutput*assigned*(efficiency/100)*techMultiplier(country,type)*boost;
    if(type==='armor'&&components&&potential>0){
      if(!country.technology.unlocked.includes('mil-armor-assembly')){ratio=0;lineBottleneck='technology';}
      else for(const [good,amount] of Object.entries(TANK_COMPONENTS)){
        const available=components[good as keyof typeof components];
        const componentRatio=available/(potential*(amount??1));
        if(componentRatio<ratio){ratio=Math.max(0,componentRatio);lineBottleneck='components';}
      }
    }
    if(ratio<worstRatio){worstRatio=ratio;globalBottleneck=lineBottleneck;}
    const output=potential*ratio;
    if(type==='armor'&&components)for(const [good,amount] of Object.entries(TANK_COMPONENTS))components[good as keyof typeof components]=Math.max(0,components[good as keyof typeof components]-output*(amount??0));

    steel=Math.max(0,steel-need.steel*ratio);
    fuel=Math.max(0,fuel-need.fuel*ratio);
    electricity=Math.max(0,electricity-need.electricity*ratio);
    treasury=treasury-need.treasury*ratio;
    inputUse.steel+=need.steel*ratio;
    inputUse.fuel+=need.fuel*ratio;
    inputUse.electricity+=need.electricity*ratio;
    inputUse.treasury+=need.treasury*ratio;
    stockpile[type]+=output;
    lastDailyOutput[type]=output;
    weightedPotential+=potential;
    weightedActual+=output;

    const nextEfficiency=assigned>0?clamp(efficiency+(ratio>=.85?.30:-.65),20,100):efficiency;
    lines[type]={...prev,efficiency:nextEfficiency,lastOutput:output};
  }

  if(Object.values(production.lines).reduce((sum,l)=>sum+l.factories,0)>capacity && globalBottleneck==='none')globalBottleneck='capacity';
  const throughput=weightedPotential<=0?100:clamp(weightedActual/weightedPotential*100,0,100);
  return {
    country:{...country,processedResources:{...country.processedResources,steel,fuel,electricity},economy:{...country.economy,treasury}},
    production:{...production,lines,stockpile,lastDailyOutput,lastInputUse:inputUse,throughput,bottleneck:globalBottleneck},
    industrial:industrial&&components?{...industrial,stock:components}:industrial,
  };
}

export function processProduction(state:GameState):GameState{
  const countries={...state.countries};
  const production={...state.production};
  const industrialEconomy={...state.industrialEconomy};
  for(const country of activeCountries(state.countries)){
    const current=production[country.id]??createInitialProduction(country);
    const result=processNationalProduction(countries[country.id],current,industrialEconomy[country.id],(country.id===state.playerCountryId&&state.day<state.leadership.celebrationUntilDay?1.12:1)*leaderModifiers(state,country.id).factory);
    countries[country.id]=result.country;
    production[country.id]=result.production;
    if(result.industrial)industrialEconomy[country.id]=result.industrial;
  }
  return {...state,countries,production,industrialEconomy};
}

function normalizeFactories(production:NationalProductionState,capacity:number){
  const total=EQUIPMENT_TYPES.reduce((sum,t)=>sum+production.lines[t].factories,0);
  if(total<=capacity)return production;
  let used=0;
  const lines={...production.lines};
  EQUIPMENT_TYPES.forEach((type,index)=>{
    const next=index===EQUIPMENT_TYPES.length-1?Math.max(0,capacity-used):Math.floor(production.lines[type].factories/Math.max(1,total)*capacity);
    used+=next;
    lines[type]={...production.lines[type],factories:next};
  });
  return {...production,lines};
}

export function setMilitaryFactoryShare(state:GameState,countryId:string,share:number):GameState{
  const country=state.countries[countryId],current=state.production[countryId];
  if(!country||!current)return state;
  const production={...current,militaryFactoryShare:clamp(Math.round(share),25,80)};
  const normalized=normalizeFactories(production,militaryFactoryCapacity(country,production));
  return {...state,production:{...state.production,[countryId]:normalized}};
}

export function setProductionFactories(state:GameState,countryId:string,type:EquipmentType,factories:number):GameState{
  const country=state.countries[countryId],current=state.production[countryId];
  if(!country||!current)return state;
  const capacity=militaryFactoryCapacity(country,current);
  const other=EQUIPMENT_TYPES.filter(t=>t!==type).reduce((sum,t)=>sum+current.lines[t].factories,0);
  const allowed=Math.max(0,capacity-other);
  const next=Math.max(0,Math.min(Math.round(factories),allowed));
  return {...state,production:{...state.production,[countryId]:{...current,lines:{...current.lines,[type]:{...current.lines[type],factories:next}}}}};
}

export function deployEquipment(state:GameState,countryId:string,type:EquipmentType):GameState{
  const country=state.countries[countryId],production=state.production[countryId],def=EQUIPMENT_CATALOG[type];
  if(!country||!production||production.stockpile[type]<def.deployPack)return state;
  const stockpile={...production.stockpile,[type]:production.stockpile[type]-def.deployPack};
  let military={...country.military};
  if(type==='infantry_equipment')military={...military,readiness:clamp(military.readiness+1.5,0,100),morale:clamp(military.morale+.5,0,100)};
  if(type==='artillery')military={...military,artillery:military.artillery+def.deployPack};
  if(type==='armor')military={...military,tanks:military.tanks+def.deployPack};
  if(type==='fighters')military={...military,fighters:military.fighters+def.deployPack};
  if(type==='logistics')military={...military,logistics:clamp(military.logistics+2.5,0,100),readiness:clamp(military.readiness+.5,0,100)};
  if(type==='naval')military={...military,warships:military.warships+def.deployPack};
  const nextCountry={...country,military};
  return {...state,countries:{...state.countries,[countryId]:nextCountry},production:{...state.production,[countryId]:{...production,stockpile}},sitrep:[`PRODUCTION // ${def.label} deployed to active forces in ${country.name}.`,...state.sitrep].slice(0,12)};
}

export function strategicReserveScore(state:GameState,countryId:string){
  const country=state.countries[countryId],p=state.production[countryId];
  if(!country||!p)return 50;
  const targets:EquipmentStockpile={
    infantry_equipment:Math.max(5000,country.military.personnel*.08),
    artillery:Math.max(20,country.military.artillery*.08),
    armor:Math.max(10,country.military.tanks*.08),
    fighters:Math.max(6,country.military.fighters*.08),
    logistics:Math.max(80,country.military.personnel/3000),
    naval:Math.max(2,country.military.warships*.08),
  };
  const ratios=EQUIPMENT_TYPES.map(t=>clamp(p.stockpile[t]/Math.max(1,targets[t]),0,1.5));
  return clamp(ratios.reduce((a,b)=>a+b,0)/ratios.length/1.0*100,0,100);
}

export function productionCombatModifier(state:GameState,countryId:string){
  const score=strategicReserveScore(state,countryId);
  return .82+Math.min(100,score)/100*.18;
}

const AI_WEIGHTS:Record<CountryState['ai']['strategicGoal'],Record<EquipmentType,number>>={
  stabilize:{infantry_equipment:.28,artillery:.10,armor:.08,fighters:.10,logistics:.36,naval:.08},
  grow_economy:{infantry_equipment:.26,artillery:.10,armor:.10,fighters:.12,logistics:.34,naval:.08},
  rearm:{infantry_equipment:.20,artillery:.17,armor:.23,fighters:.20,logistics:.12,naval:.08},
  secure_resources:{infantry_equipment:.24,artillery:.10,armor:.12,fighters:.12,logistics:.34,naval:.08},
  expand_influence:{infantry_equipment:.18,artillery:.11,armor:.18,fighters:.18,logistics:.15,naval:.20},
};

export function processProductionAI(state:GameState):GameState{
  if(state.day%14!==0)return state;
  const production={...state.production};
  for(const country of activeCountries(state.countries)){
    if(country.id===state.playerCountryId)continue;
    const current=production[country.id]??createInitialProduction(country);
    const share=country.ai.strategicGoal==='rearm'?66:country.ai.strategicGoal==='expand_influence'?60:country.ai.strategicGoal==='stabilize'?42:50;
    const withShare={...current,militaryFactoryShare:share};
    const capacity=militaryFactoryCapacity(country,withShare);
    production[country.id]={...withShare,lines:allocate(capacity,AI_WEIGHTS[country.ai.strategicGoal],clamp(Object.values(current.lines).reduce((s,l)=>s+l.efficiency,0)/6,35,95))};
  }
  return {...state,production};
}
