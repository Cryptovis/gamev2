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
 const potential={water:WATER_RICH.has(c.id)?2.4:WATER_DRY.has(c.id)?.25:1,coal:size,copper:size*.7,silicon:Math.max(.4,size*.6),aluminum:size*.5,rare_earths:size*.2,rubber:c.region==='Asia'||c.region==='South America'?1.5:.6};
 const facilities=Object.fromEntries(Object.keys(FACILITIES).map(k=>[k,0])) as NationalIndustrialEconomy['facilities'];
 facilities.waterworks=Math.max(1,Math.ceil(c.demographics.population/30e6));
 facilities.coal_mine=Math.ceil(size);facilities.copper_mine=Math.ceil(size*.7);facilities.silicon_mine=Math.ceil(size*.5);facilities.bauxite_mine=Math.floor(size*.5);facilities.rare_earth_mine=Math.floor(size*.3);facilities.rubber_plant=Math.ceil(size*.4);
 facilities.armor_mill=manufacturing;facilities.engine_works=manufacturing;facilities.electronics_works=manufacturing;
 const stock=Object.fromEntries(Object.keys(GOODS).map(k=>[k,0])) as Record<IndustrialGood,number>;
 Object.assign(stock,{water:100*potential.water,coal:20*size,copper:15*size,silicon:15*size,aluminum:12*size,rare_earths:5*size,rubber:12*size,armor_plate:10*manufacturing,engines:6*manufacturing,electronics:10*manufacturing});
 return {stock,facilities,enabled:Object.fromEntries(Object.keys(FACILITIES).map(k=>[k,true])) as NationalIndustrialEconomy['enabled'],potential,deposits:Object.fromEntries(MINERALS.map(k=>[k,Math.max(100,potential[k]*2000)])) as NationalIndustrialEconomy['deposits'],lastOutput:{},lastCosts:0,lastTradeBalance:0,bottlenecks:{},projects:[]};
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
export function processIndustrialEconomy(state:GameState):GameState {
 let next=state;
 for(const id of Object.keys(state.countries)){
  let c=next.countries[id];let n={...next.industrialEconomy[id],stock:{...next.industrialEconomy[id].stock},facilities:{...next.industrialEconomy[id].facilities},deposits:{...next.industrialEconomy[id].deposits},lastOutput:{},bottlenecks:{},lastCosts:0} as NationalIndustrialEconomy;
  for(const p of n.projects.filter(p=>p.readyDay<=state.day)){
   n.facilities[p.kind]++;
   if(p.kind==='civil_factory')c={...c,industry:{...c.industry,factories:c.industry.factories+5,refineries:c.industry.refineries+1}};
  }
  n.projects=n.projects.filter(p=>p.readyDay>state.day);
  next={...next,countries:{...next.countries,[id]:c},industrialEconomy:{...next.industrialEconomy,[id]:n}};
  const boost=id===state.playerCountryId&&state.day<state.leadership.celebrationUntilDay?1.12:1;
  for(const [kind,d] of Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>){
   const count=n.facilities[kind];if(!count||!n.enabled[kind])continue;
   const potential=d.deposit?n.potential[d.deposit]:d.output==='water'?n.potential.water:d.output==='rubber'?n.potential.rubber:1;
   const output=d.yield*count*potential*(c.industry.utilization/100)*boost;
   let ratio=1,reason='';
   const constrain=(available:number,needed:number,label:string)=>{if(needed>0&&available/needed<ratio){ratio=clamp(available/needed,0,1);reason=label;}};
   constrain(Math.max(0,c.economy.treasury),d.upkeep*count,'treasury');constrain(c.processedResources.electricity,d.power*count,'electricity');
   for(const [good,amount] of Object.entries(d.inputs))constrain(goodStock(next,id,good as IndustrialGood),(amount??0)*output,GOODS[good as IndustrialGood].label);
   if(d.deposit)constrain(n.deposits[d.deposit],output,'deposit depleted');
   const actual=output*ratio;
   c={...c,economy:{...c.economy,treasury:c.economy.treasury-d.upkeep*count*ratio},processedResources:{...c.processedResources,electricity:Math.max(0,c.processedResources.electricity-d.power*count*ratio)}};
   next={...next,countries:{...next.countries,[id]:c}};
   for(const [good,amount] of Object.entries(d.inputs))next=changeGoodStock(next,id,good as IndustrialGood,-(amount??0)*actual);
   if(d.output)next=changeGoodStock(next,id,d.output,actual);
   c=next.countries[id];n=next.industrialEconomy[id];n={...n,lastCosts:n.lastCosts+d.upkeep*count*ratio,lastOutput:{...n.lastOutput,...(d.output?{[d.output]:(n.lastOutput[d.output]??0)+actual}:{})},bottlenecks:{...n.bottlenecks,[kind]:ratio<.999?reason:'operational'},deposits:{...n.deposits,...(d.deposit?{[d.deposit]:Math.max(0,n.deposits[d.deposit]-actual)}:{})}};
   next={...next,industrialEconomy:{...next.industrialEconomy,[id]:n}};
  }
  next=changeGoodStock(next,id,'water',-Math.max(.1,c.demographics.population/1e6*.04));
 }
 return next;
}
export function processIndustrialAI(state:GameState):GameState {
 if(state.day%30!==0)return state;
 let next=state;
 for(const c of Object.values(state.countries)){
  if(c.id===state.playerCountryId)continue;
  const research=['energy-water','ind-metallurgy','mil-command','mil-armor-assembly','ind-extraction','ind-engines','ind-electronics','ind-automation'].find(id=>canUnlockTechnology(next.countries[c.id],id));
  if(research){const reports=next.sitrep;next=unlockTechnology(next,c.id,research);next={...next,sitrep:reports};}
  if(c.economy.treasury<30)continue;
  const n=next.industrialEconomy[c.id];if(n.projects.length)continue;
  const kind:FacilityKind=goodStock(next,c.id,'water')<25?'waterworks':c.ai.strategicGoal==='rearm'&&c.technology.unlocked.includes('ind-engines')?'engine_works':'civil_factory';
  next=buildFacility(next,c.id,kind);
 }
 return next;
}
