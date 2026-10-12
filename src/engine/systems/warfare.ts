import {settleWarOutcome,closeDependentWars} from './warOutcome';
import type { BattlefieldTerrain, CasualtySnapshot, CountryState, GameState, MilitaryState, NationalInfrastructureState, WarState } from '../../domain/game';
import {applyPilotCasualties,pilotCoverage} from './governance';
import { nextRandom } from '../rng';
import { endWarRelation } from './diplomacy';
import { calculateSupplyNetwork } from './supplyNetwork';
import { productionCombatModifier, strategicReserveScore } from './production';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const zeroLosses=():CasualtySnapshot=>({personnel:0,tanks:0,artillery:0,fighters:0,bombers:0,warships:0});
export const emptyLosses=zeroLosses;
/** Share of each national force type committed to one battle, in tactical and auto-resolve combat alike (audit B8). */
export const COMMITTED_SHARE=.25;
/** Auto-resolve commits the same share as a tactical battle and uses neutral modifiers, so war length no longer depends on the mode. */
function autoResolveOrders(a:CountryState,d:CountryState):CombatOrders{
 const committed=(c:CountryState):CasualtySnapshot=>({personnel:Math.floor(c.military.personnel*COMMITTED_SHARE),tanks:Math.floor(c.military.tanks*COMMITTED_SHARE),artillery:Math.floor(c.military.artillery*COMMITTED_SHARE),fighters:Math.floor(c.military.fighters*COMMITTED_SHARE),bombers:Math.floor(c.military.bombers*COMMITTED_SHARE),warships:Math.floor(c.military.warships*COMMITTED_SHARE)});
 return {attacking:true,attacker:{power:1,loss:1,fuel:COMMITTED_SHARE,forces:committed(a)},defender:{power:1,loss:1,fuel:0,forces:committed(d)}};
}
const MOUNTAIN=new Set(['TUR','GRC','GEO','ARM','AFG','NPL','BTN','CHE','AUT','KGZ','TJK','CHL','PER']);
const DESERT=new Set(['SAU','ARE','QAT','KWT','OMN','YEM','LBY','DZA','EGY','NER','MLI','MRT','TCD','JOR']);
const FOREST=new Set(['FIN','SWE','NOR','CAN','BRA','COD','GAB','CMR','IDN','MYS','PNG']);
const URBAN=new Set(['SGP','BEL','NLD','DEU','GBR','JPN','KOR']);
const COASTAL=new Set(['ISL','NZL','PHL','CUB','CYP','MLT','LKA','MDG']);
export function terrainForCountry(c:CountryState):BattlefieldTerrain{if(MOUNTAIN.has(c.id))return'mountain';if(DESERT.has(c.id))return'desert';if(FOREST.has(c.id))return'forest';if(URBAN.has(c.id))return'urban';if(COASTAL.has(c.id))return'coastal';if(c.subregion.toLowerCase().includes('northern africa'))return'desert';return'plains';}
const atk:Record<BattlefieldTerrain,number>={plains:1,urban:.76,mountain:.68,forest:.82,desert:.9,coastal:.86};
const def:Record<BattlefieldTerrain,number>={plains:1,urban:1.18,mountain:1.28,forest:1.16,desert:1.05,coastal:1.1};
/** Phase 3: full air superiority is worth exactly the defensive edge of mountain terrain, counted once (as a power factor). */
export const AIR_FULL_FACTOR=def.mountain/atk.mountain;
export const airFactor=(airSuperiority:number)=>Math.pow(AIR_FULL_FACTOR,clamp(airSuperiority,-100,100)/100);
/** Front momentum of a supplied offensive; a fuel-starved attacker has none (its power penalty and supply already apply). */
export const OFFENSIVE_INITIATIVE=1.2;
/** Share of a full round's operational fuel that a side holding its positions still burns (generators, patrols, resupply). */
export const SUSTAINMENT_SHARE=.25;
export function militaryPower(c:CountryState){const m=c.military,u=m.personnel*.002+m.tanks*1.6+m.artillery*1.1+m.fighters*8+m.bombers*11+m.warships*5,q=(m.readiness+m.morale+m.logistics+m.technology)/400;return Math.max(1,u*(.55+q*.9));}
function airPower(c:CountryState){return(c.military.fighters+c.military.bombers*.45)*(.35+c.military.technology/100*.4+c.military.readiness/100*.25);}
function supplyScore(c:CountryState,e:CountryState,isAttacker:boolean,t:BattlefieldTerrain,network?:NationalInfrastructureState){const national=calculateSupplyNetwork(c,t,isAttacker?'attacker':'defender',network);const reach=c.region===e.region?1:c.subregion===e.subregion?.88:.72;return clamp(national.supplyScore*reach,8,100);}
export function getWarPreview(a:CountryState,d:CountryState,aInfra?:NationalInfrastructureState,dInfra?:NationalInfrastructureState){const terrain=terrainForCountry(d),attackerSupply=supplyScore(a,d,true,terrain,aInfra),defenderSupply=supplyScore(d,a,false,terrain,dInfra),ap=airPower(a),dp=airPower(d),airSuperiority=clamp((ap-dp)/Math.max(1,ap+dp)*100,-100,100),powerRatio=(militaryPower(a)*(attackerSupply/100)*airFactor(airSuperiority))/(militaryPower(d)*(defenderSupply/100));return{terrain,attackerSupply,defenderSupply,airSuperiority,powerRatio};}
function applyLosses(m:MilitaryState,l:CasualtySnapshot,supply:number):MilitaryState{const stress=supply<35;return{...m,personnel:Math.max(0,m.personnel-l.personnel),tanks:Math.max(0,m.tanks-l.tanks),artillery:Math.max(0,m.artillery-l.artillery),fighters:Math.max(0,m.fighters-l.fighters),bombers:Math.max(0,m.bombers-l.bombers),warships:Math.max(0,m.warships-l.warships),readiness:clamp(m.readiness-(stress?2.2:.35),0,100),morale:clamp(m.morale-Math.min(1.5,l.personnel/7500)-(stress?.55:0),0,100),logistics:clamp(m.logistics-(stress?1.4:.18),0,100)};}
function addLosses(a:CasualtySnapshot,b:CasualtySnapshot):CasualtySnapshot{return{personnel:a.personnel+b.personnel,tanks:a.tanks+b.tanks,artillery:a.artillery+b.artillery,fighters:a.fighters+b.fighters,bombers:a.bombers+b.bombers,warships:a.warships+b.warships};}
function makeLosses(c:CountryState,rate:number,r:number):CasualtySnapshot{const m=c.military,scale=rate*(.72+r*.56);return{personnel:Math.min(m.personnel,Math.max(20,Math.round(m.personnel*scale))),tanks:Math.min(m.tanks,Math.max(0,Math.round(m.tanks*scale*.85))),artillery:Math.min(m.artillery,Math.max(0,Math.round(m.artillery*scale*.75))),fighters:Math.min(m.fighters,Math.max(0,Math.round(m.fighters*scale*.45))),bombers:Math.min(m.bombers,Math.max(0,Math.round(m.bombers*scale*.32))),warships:Math.min(m.warships,Math.max(0,Math.round(m.warships*scale*.18)))};}
/** Fuel one full-strength attacking round burns; tactical orders scale it. */
export function roundFuelCost(c:CountryState):number{return Math.max(3,2.5+c.military.tanks*.0016+c.military.fighters*.02+c.military.bombers*.032);}
/** Fuel a committed force burns in one round. Offensive action pays operational fuel (`share` of a full round); holding pays sustainment. Attacker and defender follow the same rule. */
export function combatRoundFuel(c:CountryState,side?:CombatSideOrders):number{const share=side?.fuel??0;return roundFuelCost(c)*(share>0?share:COMMITTED_SHARE*SUSTAINMENT_SHARE);}
/** Allies that joined the defender (audit E5) send an expeditionary force: this share of their national combat power. */
export const COALITION_SHARE=COMMITTED_SHARE*.5;
/** Allied support can at most double the defender's own power. */
export const COALITION_CAP=1;
/** Extra defender power from co-belligerents, as a fraction of the defender's own power (0 = none). Allies that lost independence no longer count. */
export function coalitionSupportFrom(state:GameState,defenderId:string,allyIds:readonly string[]):number{
 const d=state.countries[defenderId];if(!d||!allyIds.length)return 0;
 let allied=0;
 for(const id of allyIds){const c=state.countries[id];if(c&&!c.annexedBy&&!c.controllerCountryId)allied+=militaryPower(c)*COALITION_SHARE;}
 return Math.min(COALITION_CAP,allied/militaryPower(d));
}
export const coalitionSupport=(state:GameState,w:WarState)=>coalitionSupportFrom(state,w.defenderId,w.defenderAllies??[]);
export interface CombatSideOrders { power: number; loss: number; fuel: number; forces: CasualtySnapshot; lossByType?: Partial<Record<keyof CasualtySnapshot,number>> }
export interface CombatOrders { attacking: boolean; attacker: CombatSideOrders; defender: CombatSideOrders }
function boundedLosses(losses:CasualtySnapshot,side?:CombatSideOrders):CasualtySnapshot {
 if(!side)return losses;
 return Object.fromEntries(Object.entries(losses).map(([key,value])=>[key,Math.min(side.forces[key as keyof CasualtySnapshot],Math.round(value*.25*Math.min(1.25,Math.max(.75,side.loss+(side.lossByType?.[key as keyof CasualtySnapshot]??0)))))])) as unknown as CasualtySnapshot;
}
export function resolveCombatRound(state:GameState,warId:string,orders?:CombatOrders):GameState{
 state=closeDependentWars(state);const w=state.wars[warId];if(!w||w.status!=='active'||w.lastCombatDay===state.day)return state;const a=state.countries[w.attackerId],d=state.countries[w.defenderId];if(!a||!d)return state;
 orders=orders??autoResolveOrders(a,d);
 // Auto-resolve is an attack. Exhaustion and decisive outcomes require offensive pressure. Exhaustion and decisive outcomes require offensive pressure.
 const attacking=!orders||orders.attacking,aStart=w.attackerStartPersonnel??a.military.personnel,dStart=w.defenderStartPersonnel??d.military.personnel,collapseAt=(start:number)=>Math.max(Math.min(5000,start*.5),start*.08);
const combatA={...a,military:{...a.military,fighters:a.military.fighters*pilotCoverage(state,a.id),bombers:a.military.bombers*pilotCoverage(state,a.id)}},combatD={...d,military:{...d.military,fighters:d.military.fighters*pilotCoverage(state,d.id),bombers:d.military.bombers*pilotCoverage(state,d.id)}};const p=getWarPreview(combatA,combatD,state.infrastructure[a.id],state.infrastructure[d.id]),fuelCost=combatRoundFuel(a,orders.attacker),defenderFuel=Math.min(d.processedResources.fuel,combatRoundFuel(d,orders.defender)),hasFuel=!attacking||a.processedResources.fuel>=fuelCost,r1=nextRandom(state.simulationSeed),r2=nextRandom(r1.seed),r3=nextRandom(r2.seed),ae=1-w.attackerExhaustion/180,de=1-w.defenderExhaustion/190;
 const aReserve=productionCombatModifier(state,a.id),dReserve=productionCombatModifier(state,d.id),aPower=militaryPower(combatA)*aReserve*(orders?.attacker.power??1)*(hasFuel?1:.38)*(p.attackerSupply/100)*atk[w.terrain]*clamp(ae,.42,1)*airFactor(p.airSuperiority),dPower=militaryPower(combatD)*dReserve*(orders?.defender.power??1)*(1+coalitionSupport(state,w))*(p.defenderSupply/100)*def[w.terrain]*clamp(de,.44,1)*(.96+r1.value*.08),ratio=aPower/Math.max(1,dPower),al=boundedLosses(makeLosses(a,clamp(.0017+(1/Math.max(.4,ratio))*.0028+(p.attackerSupply<35?.002:0),.0015,.016),r2.value),orders?.attacker),dl=boundedLosses(makeLosses(d,clamp(.0018+ratio*.0032+(p.airSuperiority>35?.0008:0),.0015,.019),r3.value),orders?.defender),aep=al.personnel/Math.max(1,a.military.personnel),dep=dl.personnel/Math.max(1,d.military.personnel),aEx=clamp(w.attackerExhaustion+(attacking?1.2:.4)+aep*460+(p.attackerSupply<40?2.2:0),0,100),dEx=clamp(w.defenderExhaustion+(attacking?clamp(.75+ratio*.25,.75,1.25)+(p.defenderSupply<40?1.8:0):0)+dep*500,0,100),rawDelta=clamp((ratio-1)*13+(r3.value-.5)*5+(hasFuel?OFFENSIVE_INITIATIVE:0)-(aEx-dEx)*.035,-20,20),delta=orders&&!orders.attacking?Math.min(0,rawDelta):rawDelta,progress=clamp(w.progress+delta,-100,100);
 const na:CountryState={...a,processedResources:{...a.processedResources,fuel:Math.max(0,a.processedResources.fuel-Math.min(a.processedResources.fuel,fuelCost))},military:applyLosses(a.military,al,p.attackerSupply),politics:{...a.politics,approval:clamp(a.politics.approval-al.personnel/260000-aEx*.002,0,100)}},nd:CountryState={...d,processedResources:{...d.processedResources,fuel:Math.max(0,d.processedResources.fuel-defenderFuel)},military:applyLosses(d.military,dl,p.defenderSupply),politics:{...d.politics,stability:clamp(d.politics.stability-dl.personnel/170000-dEx*.0015,0,100)}};let status:WarState['status']='active';if(attacking&&(progress>=100||nd.military.personnel<collapseAt(dStart)||dEx>=100))status='victory';else if(progress<=-100||na.military.personnel<collapseAt(aStart)||aEx>=100)status='defeat';
 const reserveA=strategicReserveScore(state,a.id),reserveD=strategicReserveScore(state,d.id),report=`${a.name} ${w.terrain} assault: ${delta>=0?'+':''}${delta.toFixed(1)} front | supply ${p.attackerSupply.toFixed(0)}%/${p.defenderSupply.toFixed(0)}% | reserves ${reserveA.toFixed(0)}/${reserveD.toFixed(0)} | air ${p.airSuperiority>=0?'+':''}${p.airSuperiority.toFixed(0)} | losses ${al.personnel.toLocaleString()} / ${dl.personnel.toLocaleString()}${hasFuel?'':' | FUEL CRISIS'}`,nw:WarState={...w,attackerStartPersonnel:aStart,defenderStartPersonnel:dStart,progress,rounds:w.rounds+1,status,autoAssault:status==='active'?w.autoAssault:false,terrain:p.terrain,attackerSupply:p.attackerSupply,defenderSupply:p.defenderSupply,airSuperiority:p.airSuperiority,attackerExhaustion:aEx,defenderExhaustion:dEx,lastCombatDay:state.day,attackerLosses:addLosses(w.attackerLosses,al),defenderLosses:addLosses(w.defenderLosses,dl),lastReport:report};
 let next:GameState={...state,simulationSeed:r3.seed,countries:{...state.countries,[a.id]:na,[d.id]:nd},wars:{...state.wars,[warId]:nw},sitrep:[`WAR // ${report}`,...state.sitrep].slice(0,12)};next=applyPilotCasualties(applyPilotCasualties(next,a.id,al.fighters+al.bombers),d.id,dl.fighters+dl.bombers);if(status==='victory'){next={...next,countries:{...next.countries,[a.id]:{...next.countries[a.id],politics:{...next.countries[a.id].politics,approval:clamp(next.countries[a.id].politics.approval+4,0,100)}},[d.id]:{...next.countries[d.id],controllerCountryId:a.id,politics:{...next.countries[d.id].politics,stability:clamp(next.countries[d.id].politics.stability-15,0,100)}}},sitrep:[`VICTORY // ${d.name} is now under ${a.name} control.`,...next.sitrep].slice(0,12)};next=endWarRelation(next,a.id,d.id);}else if(status==='defeat')next={...endWarRelation(next,a.id,d.id),sitrep:[`DEFEAT // ${a.name} offensive collapsed under battlefield exhaustion.`,...next.sitrep].slice(0,12)};return settleWarOutcome(next,warId);
}
export function processAutoWars(state:GameState):GameState{let next=closeDependentWars(state);for(const w of Object.values(state.wars))if(w.status==='active'&&w.autoAssault&&!w.tactical)next=resolveCombatRound(next,w.id);return next;}
