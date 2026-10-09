import {activeCountries} from '../../domain/sovereignty';
import {GOLD_PRODUCERS,SILVER_PRODUCERS} from '../../data/preciousMetals';
import {occupationFor} from './governance';
import type {CountryState,GameState} from '../../domain/game';
import type {FacilityKind,IndustrialGood,NationalIndustrialEconomy} from '../../domain/industrial';
import {canUnlockTechnology,unlockTechnology} from './technology';
import {FACILITIES,GOODS,MINERALS} from '../../data/industrialCatalog';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
// Balanced game estimates; deterministic profiles, not real-world geological measurements.
const WATER_RICH=new Set(['BRA','CAN','RUS','NOR','SWE','FIN','COL','PER','IDN','COD','NZL']);
const WATER_DRY=new Set(['SAU','QAT','ARE','BHR','KWT','OMN','DZA','EGY','LBY']);
export function createIndustrialEconomy(c:CountryState):NationalIndustrialEconomy {
 const size=clamp(c.industry.mines/30,.15,8),manufacturing=clamp(Math.floor(c.industry.factories/60),0,8);
 const potential={gold:GOLD_PRODUCERS[c.id]??.05,silver:SILVER_PRODUCERS[c.id]??.05,water:WATER_RICH.has(c.id)?2.4:WATER_DRY.has(c.id)?.25:1,coal:size,copper:size*.7,silicon:Math.max(.4,size*.6),aluminum:size*.5,rare_earths:size*.2,rubber:c.region==='Asia'||c.region==='South America'?1.5:.6};
 const facilities=Object.fromEntries(Object.keys(FACILITIES).map(k=>[k,0])) as NationalIndustrialEconomy['facilities'];
 facilities.gold_mine=GOLD_PRODUCERS[c.id]?1:0;facilities.silver_mine=SILVER_PRODUCERS[c.id]?1:0;
 facilities.waterworks=Math.max(1,Math.ceil(c.demographics.population/30e6));
 facilities.coal_mine=Math.ceil(size);facilities.copper_mine=Math.ceil(size*.7);facilities.silicon_mine=Math.ceil(size*.5);facilities.bauxite_mine=Math.floor(size*.5);facilities.rare_earth_mine=Math.floor(size*.3);facilities.rubber_plant=Math.ceil(size*.4);
 facilities.armor_mill=manufacturing;facilities.engine_works=manufacturing;facilities.electronics_works=manufacturing;
 const stock=Object.fromEntries(Object.keys(GOODS).map(k=>[k,0])) as Record<IndustrialGood,number>;
 Object.assign(stock,{gold:Math.max(.03,potential.gold*.1),silver:Math.max(.3,potential.silver*2),water:100*potential.water,coal:20*size,copper:15*size,silicon:15*size,aluminum:12*size,rare_earths:5*size,rubber:12*size,armor_plate:10*manufacturing,engines:6*manufacturing,electronics:10*manufacturing});
 return {stock,facilities,enabled:Object.fromEntries(Object.keys(FACILITIES).map(k=>[k,true])) as NationalIndustrialEconomy['enabled'],potential,deposits:Object.fromEntries(MINERALS.map(k=>[k,k==='gold'?potential[k]*80:k==='silver'?potential[k]*500:Math.max(100,potential[k]*2000)])) as NationalIndustrialEconomy['deposits'],lastOutput:{},lastCosts:0,lastTradeBalance:0,bottlenecks:{},projects:[]};
}
export function createIndustrialMap(countries:Record<string,CountryState>){return Object.fromEntries(Object.values(countries).map(c=>[c.id,createIndustrialEconomy(c)]));}
export function goodStock(state:GameState,id:string,good:IndustrialGood):number {
 const c=state.countries[id];if(!c)return 0;
 if(good==='steel'||good==='fuel')return c.processedResources[good];
 if(good==='tanks')return state.production[id]?.stockpile.armor??0;
 return state.industrialEconomy[id]?.stock[good]??0;
}
export function changeGoodStock(state:GameState,id:string,good:IndustrialGood,delta:number):GameState {
 const value=Math.max(0,goodStock(state,id,good)+delta);
 if(good==='steel'||good==='fuel'){const c=state.countries[id];return {...state,countries:{...state.countries,[id]:{...c,processedResources:{...c.processedResources,[good]:value}}}};}
 if(good==='tanks'){const p=state.production[id];return {...state,production:{...state.production,[id]:{...p,stockpile:{...p.stockpile,armor:value}}}};}
 const n=state.industrialEconomy[id];return {...state,industrialEconomy:{...state.industrialEconomy,[id]:{...n,stock:{...n.stock,[good]:value}}}};
}
export function buildFacility(state:GameState,id:string,kind:FacilityKind):GameState {
 const c=state.countries[id],n=state.industrialEconomy[id],d=FACILITIES[kind];
 if(!c||!n||!d||!Number.isFinite(c.economy.treasury)||c.economy.treasury<d.cost||n.projects.length>=6||(d.tech&&!c.technology.unlocked.includes(d.tech))||(d.deposit&&n.deposits[d.deposit]<=0))return state;
 let serial=n.projects.length;while(n.projects.some(p=>p.id===`${id}-${kind}-${state.day}-${serial}`))serial++;
 const project={id:`${id}-${kind}-${state.day}-${serial}`,kind,readyDay:state.day+d.days};
 return {...state,countries:{...state.countries,[id]:{...c,economy:{...c.economy,treasury:c.economy.treasury-d.cost}}},industrialEconomy:{...state.industrialEconomy,[id]:{...n,projects:[...n.projects,project]}},sitrep:id===state.playerCountryId?[`INDUSTRY // ${d.label} commissioned; ready Day ${project.readyDay}.`,...state.sitrep].slice(0,12):state.sitrep};
}
/** Facility running costs scale down below $400B GDP (floor 2%); flat catalog upkeep alone exceeded the whole fiscal surplus of small states. */
export const facilityUpkeepScale=(c:CountryState)=>clamp(c.economy.gdp/400,.02,1);
/** Output multiplier of one facility: deposit grade for mines, national water/rubber potential, otherwise 1. */
export function facilityPotential(n:NationalIndustrialEconomy,kind:FacilityKind){
 const d=FACILITIES[kind];
 return d.deposit?n.potential[d.deposit]:d.output==='water'?n.potential.water:d.output==='rubber'?n.potential.rubber:1;
}
/**
 * Daily running cost of `count` facilities (audit C10). GDP-scaled like before; a mine's cost also follows its
 * deposit grade (floor 10%, cap 100%), so a low-grade deposit is a smaller operation rather than a guaranteed loss.
 */
export function facilityUpkeep(c:CountryState,n:NationalIndustrialEconomy,kind:FacilityKind,count=n.facilities[kind]){
 const d=FACILITIES[kind];
 return d.upkeep*count*facilityUpkeepScale(c)*(d.deposit?clamp(n.potential[d.deposit],.1,1):1);
}
export interface FacilityEconomics {output:number;outputValue:number;inputCost:number;upkeep:number;margin:number}
/** Daily output, input cost, upkeep and margin of one more facility of `kind` in country `id`, at the given prices. */
export function facilityDailyEconomics(state:GameState,id:string,kind:FacilityKind,priceOf:(good:IndustrialGood)=>number=good=>GOODS[good].price):FacilityEconomics|null {
 const c=state.countries[id],n=state.industrialEconomy[id],d=FACILITIES[kind];
 if(!c||!n||!d)return null;
 const output=d.yield*facilityPotential(n,kind)*c.industry.utilization/100;
 const outputValue=d.output?output*priceOf(d.output):0;
 const inputCost=Object.entries(d.inputs).reduce((sum,[good,amount])=>sum+(amount??0)*output*priceOf(good as IndustrialGood),0);
 const upkeep=facilityUpkeep(c,n,kind,1);
 return {output,outputValue,inputCost,upkeep,margin:outputValue-inputCost-upkeep};
}
/** Opening world density of national factories per $B of GDP (USA 181/29 000, DEU 29/4 700). */
export const FACTORIES_PER_GDP=.0065;
/** One-off GDP gain of a completed Industrial Park, as a share of its build cost, capped at 2% of GDP (audit C12). */
export const PARK_GDP_RETURN=.5,PARK_GDP_CAP=.02;
/** Factories an AI aims for (audit C12): 10% above the opening density, 25% above it under a growth or rearmament goal. */
export function civilFactoryTarget(c:CountryState){
 const ambition=c.ai.strategicGoal==='grow_economy'||c.ai.strategicGoal==='rearm'?1.25:1.1;
 return Math.max(2,Math.ceil(c.economy.gdp*FACTORIES_PER_GDP*ambition));
}
/** GDP added when an Industrial Park completes; returns fall to a quarter as factories outgrow the economy. */
export function civilParkGdpGain(c:CountryState){
 const saturation=clamp(c.economy.gdp*FACTORIES_PER_GDP/Math.max(1,c.industry.factories),.25,1);
 return Math.min(FACILITIES.civil_factory.cost*PARK_GDP_RETURN,Math.max(0,c.economy.gdp)*PARK_GDP_CAP)*saturation;
}
export function processIndustrialEconomy(state:GameState):GameState {
 // One mutable draft per country, written back once: avoids re-copying the 203-country maps on every facility step.
 const countries={...state.countries},industrialEconomy={...state.industrialEconomy};let production=state.production;
 for(const id of Object.keys(state.countries)){
 if(state.countries[id].annexedBy)continue;
  const src=industrialEconomy[id];
  const c={...countries[id]};c.economy={...c.economy};c.processedResources={...c.processedResources};c.industry={...c.industry};
  const n={...src,stock:{...src.stock},facilities:{...src.facilities},deposits:{...src.deposits},lastOutput:{},bottlenecks:{},lastCosts:0} as NationalIndustrialEconomy;
  let armor=production[id]?.stockpile.armor,armorTouched=false;
  const stockOf=(good:IndustrialGood)=>good==='steel'||good==='fuel'?c.processedResources[good]:good==='tanks'?armor??0:n.stock[good]??0;
  const changeStock=(good:IndustrialGood,delta:number)=>{
   const value=Math.max(0,stockOf(good)+delta);
   if(good==='steel'||good==='fuel')c.processedResources[good]=value;
   else if(good==='tanks'){armor=value;armorTouched=true;}
   else n.stock[good]=value;
  };
  for(const p of n.projects.filter(p=>p.readyDay<=state.day)){
   n.facilities[p.kind]++;
   if(p.kind==='civil_factory'){c.economy.gdp+=civilParkGdpGain(c);c.industry.factories+=5;c.industry.refineries+=1;}
  }
  n.projects=n.projects.filter(p=>p.readyDay>state.day);
  const boost=(id===state.playerCountryId&&state.day<state.leadership.celebrationUntilDay?1.12:1)*((occupationFor(state,id)?.unrest??0)>=80?.7:1);
  for(const [kind,d] of Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>){
   const count=n.facilities[kind];if(!count||!n.enabled[kind])continue;
   const output=d.yield*count*facilityPotential(n,kind)*(c.industry.utilization/100)*boost;
   const upkeep=facilityUpkeep(c,n,kind,count);
   let ratio=1,reason='';
   const constrain=(available:number,needed:number,label:string)=>{if(needed>0&&available/needed<ratio){ratio=clamp(available/needed,0,1);reason=label;}};
   constrain(Math.max(0,c.economy.treasury),upkeep,'treasury');constrain(c.processedResources.electricity,d.power*count,'electricity');
   for(const [good,amount] of Object.entries(d.inputs))constrain(stockOf(good as IndustrialGood),(amount??0)*output,GOODS[good as IndustrialGood].label);
   if(d.deposit)constrain(n.deposits[d.deposit],output,'deposit depleted');
   const actual=output*ratio;
   c.economy.treasury=c.economy.treasury-upkeep*ratio;
   c.processedResources.electricity=Math.max(0,c.processedResources.electricity-d.power*count*ratio);
   for(const [good,amount] of Object.entries(d.inputs))changeStock(good as IndustrialGood,-(amount??0)*actual);
   if(d.output)changeStock(d.output,actual);
   n.lastCosts=n.lastCosts+upkeep*ratio;
   if(d.output)n.lastOutput={...n.lastOutput,[d.output]:(n.lastOutput[d.output]??0)+actual};
   n.bottlenecks={...n.bottlenecks,[kind]:ratio<.999?reason:'operational'};
   if(d.deposit)n.deposits[d.deposit]=Math.max(0,n.deposits[d.deposit]-actual);
  }
  changeStock('water',-Math.max(.1,c.demographics.population/1e6*.04));
  countries[id]=c;industrialEconomy[id]=n;
  if(armorTouched){const p=production[id];production={...production,[id]:{...p,stockpile:{...p.stockpile,armor:armor??0}}};}
 }
 return {...state,countries,industrialEconomy,production};
}
export function processIndustrialAI(state:GameState):GameState {
 if(state.day%30!==0)return state;
 let next=state;
 for(const c of activeCountries(state.countries)){
  if(c.id===state.playerCountryId)continue;
  const research=['energy-water','ind-metallurgy','mil-command','mil-armor-assembly','ind-extraction','ind-engines','ind-electronics','ind-automation'].find(id=>canUnlockTechnology(next.countries[c.id],id));
  if(research){const reports=next.sitrep;next=unlockTechnology(next,c.id,research);next={...next,sitrep:reports};}
  if(c.economy.treasury<30)continue;
  const n=next.industrialEconomy[c.id];if(n.projects.length)continue;
  // Audit C12: Industrial Parks only toward a GDP-linked factory target, not every month a treasury allows it.
  const kind:FacilityKind|null=goodStock(next,c.id,'water')<25?'waterworks':c.ai.strategicGoal==='rearm'&&c.technology.unlocked.includes('ind-engines')?'engine_works':next.countries[c.id].industry.factories<civilFactoryTarget(next.countries[c.id])?'civil_factory':null;
  if(kind)next=buildFacility(next,c.id,kind);
 }
 return next;
}
