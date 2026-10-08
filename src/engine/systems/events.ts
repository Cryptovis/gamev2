import type { ActiveGameEvent, EventKind, GameState } from '../../domain/game';
import { nextRandom } from '../rng';
import { foodReserveDays, SHORTAGE_RESERVE_DAYS } from './resources';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Candidate={kind:EventKind;pressure:number;event:ActiveGameEvent};

/** Days before the same public-agenda event kind may fire again (on top of the global cooldown). */
export const EVENT_KIND_COOLDOWN = 60;
/** Food per million people below which the reserve crisis fires; resources.ts flags shortage at 0.15. */
export const FOOD_CRISIS_PER_MILLION = 0.3;

/** Seeded pressure-weighted pick, so lower-pressure kinds (e.g. earthquakes) still occur. */
export function pickWeighted<T extends {pressure:number}>(items:T[],value:number):T|undefined{
 const total=items.reduce((sum,item)=>sum+item.pressure,0);
 let cursor=value*total;
 for(const item of items){cursor-=item.pressure;if(cursor<0)return item;}
 return items.at(-1);
}

/** Option costs in $B as promised by each consequenceHint; used to refuse unaffordable responses. */
const OPTION_COST:Record<string,number>={imports:10,fuel_imports:9,reform:4,subsidize:8,address:3,investigate:5,reform_package:6,health_fund:7,targeted_health:3,review_policy:2,disaster_relief:8,local_response:3};

function candidate(kind:EventKind,pressure:number,state:GameState,title:string,description:string,options:ActiveGameEvent['options']):Candidate{
 return {kind,pressure,event:{id:`${kind}-${state.day}`,kind,title,description,triggeredDay:state.day,options}};
}

function makeEvent(state: GameState): { event: ActiveGameEvent | null; seed: number } {
  const player = state.countries[state.playerCountryId];
  if (!player || state.activeEvent || state.day < state.eventCooldownUntil) return { event: null, seed: state.simulationSeed };

  const activeWar = Object.values(state.wars).find((war) => war.status === 'active' && (war.attackerId === player.id || war.defenderId === player.id));
  const roll = nextRandom(state.simulationSeed);

  // Strategic emergencies bypass the slower public-agenda cadence.
  // Fires ahead of the resources.ts shortage (reserve days < SHORTAGE_RESERVE_DAYS) or when the per-capita stock is critically thin.
  if (foodReserveDays(player) < SHORTAGE_RESERVE_DAYS*2 || player.resources.food < player.demographics.population/1_000_000*FOOD_CRISIS_PER_MILLION) return {seed:roll.seed,event:candidate('food_crisis',100,state,'Strategic Food Reserve Crisis','National food reserves have fallen below the emergency threshold. Supply chains are beginning to strain.',[{id:'imports',label:'Emergency Imports',consequenceHint:'-$10B, +120 food'},{id:'ration',label:'Introduce Rationing',consequenceHint:'Approval -2, stability -1, +35 food'}]).event};
  if (player.processedResources.fuel < 12 && player.military.readiness > 55) return {seed:roll.seed,event:candidate('fuel_crisis',100,state,'National Fuel Emergency','Military and industrial fuel reserves have fallen to operationally dangerous levels. Refinery output cannot meet current demand.',[{id:'fuel_imports',label:'Emergency Fuel Purchases',consequenceHint:'-$9B, +35 fuel'},{id:'priority',label:'Prioritize Military Allocation',consequenceHint:'Fuel +12, industry utilization -5'}]).event};

  const compromisedOps=Object.values(state.intelOperations).filter(op=>op.status==='compromised'&&op.sourceCountryId===player.id&&state.day-op.completeDay<=5).length;
  if(compromisedOps>0)return {seed:roll.seed,event:candidate('intelligence_breach',100,state,'Intelligence Network Exposed','A recent covert operation has been publicly linked to your government. Opposition parties and foreign diplomats are demanding answers.',[{id:'deny',label:'Issue Formal Denial',consequenceHint:'Reputation -3, approval -1'},{id:'reform',label:'Order Internal Review',consequenceHint:'-$4B, counter-intel +5, reputation +1'}]).event};

  // Public agenda is evaluated weekly rather than producing daily random popups.
  if(state.day<21 || state.day%7!==0)return {event:null,seed:roll.seed};

  const casualties=activeWar?activeWar.attackerLosses.personnel+activeWar.defenderLosses.personnel:0;
  const hostileCount=Object.values(player.diplomacy.relations).filter(r=>r.status==='hostile'||r.status==='war').length;
  const candidates:Candidate[]=[
   candidate('inflation_shock',clamp((player.economy.inflation-7)*6,0,95),state,'Cost of Living Shock','Rapid price growth is squeezing households and eroding confidence in the government.',[{id:'subsidize',label:'Targeted Subsidies',consequenceHint:'-$8B, approval +2'},{id:'tighten',label:'Fiscal Tightening',consequenceHint:'Inflation -1.2, approval -2'}]),
   candidate('war_weariness',activeWar?clamp(casualties/250+Math.max(0,60-player.military.morale),0,95):0,state,'War Weariness','Mounting casualties are dominating national media and public debate.',[{id:'address',label:'Address the Nation',consequenceHint:'-$3B, approval +1, morale +2'},{id:'mobilize',label:'Double Down on Mobilization',consequenceHint:'Readiness +4, approval -3'}]),
   candidate('tax_protest',clamp((player.economy.taxRate-28)*4+Math.max(0,55-player.politics.approval),0,95),state,'Tax Burden Protests','Business groups and households are organizing demonstrations against the current tax burden and cost of government.',[{id:'tax_relief',label:'Temporary Tax Relief',consequenceHint:'Tax -3, approval +3'},{id:'hold_tax',label:'Defend Fiscal Policy',consequenceHint:'Stability -2, treasury discipline maintained'}]),
   candidate('reform_demand',clamp(Math.max(0,52-player.politics.approval)*2+Math.max(0,60-player.politics.stability),0,90),state,'Public Reform Campaign','Civil society groups are demanding institutional reforms, transparency measures and stronger public accountability.',[{id:'reform_package',label:'Launch Reform Package',consequenceHint:'-$6B, approval +3, stability +2'},{id:'delay_reform',label:'Delay the Agenda',consequenceHint:'Approval -2, stability -1'}]),
   candidate('health_crisis',clamp(Math.max(0,7-player.economy.treasury/Math.max(1,player.demographics.population/10_000_000))*8+Math.max(0,50-player.politics.stability),0,82),state,'Public Health Capacity Alert','Hospitals and local health services report mounting capacity pressure. The issue is beginning to dominate public debate.',[{id:'health_fund',label:'Emergency Health Funding',consequenceHint:'-$7B, approval +2, stability +1'},{id:'targeted_health',label:'Target Hotspots',consequenceHint:'-$3B, approval +1'}]),
   candidate('foreign_policy_backlash',clamp(hostileCount*9+Math.max(0,50-player.diplomacy.reputation),0,86),state,'Foreign Policy Backlash','Opposition figures and civic groups are questioning recent external alignments and the diplomatic cost of current partnerships.',[{id:'defend_policy',label:'Defend the Strategy',consequenceHint:'Reputation +1, approval -1'},{id:'review_policy',label:'Order Foreign Policy Review',consequenceHint:'-$2B, approval +1, reputation +2'}]),
   candidate('corruption_scandal',18,state,'Procurement Scandal','Investigative journalists allege irregularities in a major defense procurement contract.',[{id:'investigate',label:'Open Independent Investigation',consequenceHint:'-$5B, approval +3, stability +2'},{id:'cover',label:'Contain the Story',consequenceHint:'Approval -4, stability -3'}]),
   candidate('earthquake',3,state,'Major Earthquake','A destructive earthquake has struck a populated region. Emergency services are requesting immediate national support.',[{id:'disaster_relief',label:'Mobilize National Relief',consequenceHint:'-$8B, approval +3, stability +2'},{id:'local_response',label:'Delegate Regional Response',consequenceHint:'-$3B, stability -2'}]),
  ].filter(c=>c.pressure>0&&state.day-(player.eventLastFired?.[c.kind]??-Infinity)>=EVENT_KIND_COOLDOWN).sort((a,b)=>b.pressure-a.pressure);

  const top=candidates[0];
  if(!top)return {event:null,seed:roll.seed};
  const threshold=clamp(.985-top.pressure/180,0.45,.97);
  if(roll.value<=threshold)return {event:null,seed:roll.seed};
  // The strongest pressure sets how likely an agenda event is; which one fires is a weighted draw.
  const pick=nextRandom(roll.seed);
  return {event:pickWeighted(candidates,pick.value)!.event,seed:pick.seed};
}

export function maybeTriggerEvent(state: GameState): GameState {
  const result = makeEvent(state);
  if (!result.event) return { ...state, simulationSeed: result.seed };
  const player = state.countries[state.playerCountryId];
  const countries = { ...state.countries, [player.id]: { ...player, eventLastFired: { ...player.eventLastFired, [result.event.kind]: state.day } } };
  return { ...state, countries, simulationSeed: result.seed, activeEvent: result.event, speed: 0, sitrep:[`EVENT // ${result.event.title}`, ...state.sitrep].slice(0,12) };
}

export function resolveEvent(state: GameState, optionId: string): GameState {
  const event = state.activeEvent;
  const player = state.countries[state.playerCountryId];
  if (!event || !player || !event.options.some((option) => option.id === optionId)) return state;
  const cost = OPTION_COST[optionId] ?? 0;
  const affordable = (id: string) => (OPTION_COST[id] ?? 0) <= player.economy.treasury;
  // Refuse a response the treasury cannot fund while a cheaper option exists; never strand the event.
  if (!affordable(optionId) && event.options.some((option) => affordable(option.id))) return { ...state, sitrep: [`EVENT // Treasury cannot fund this response ($${cost}B).`, ...state.sitrep].slice(0, 12) };
  let nextPlayer = player;
  let summary = 'Government response executed.';

  if(event.kind==='food_crisis'){
    if(optionId==='imports'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-10},resources:{...player.resources,food:player.resources.food+120}};summary='Emergency food imports secured.';}
    else{nextPlayer={...player,resources:{...player.resources,food:player.resources.food+35},politics:{...player.politics,approval:clamp(player.politics.approval-2,0,100),stability:clamp(player.politics.stability-1,0,100)}};summary='Rationing program introduced.';}
  } else if(event.kind==='fuel_crisis'){
    if(optionId==='fuel_imports'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-9},processedResources:{...player.processedResources,fuel:player.processedResources.fuel+35}};summary='Emergency refined-fuel purchases arrived.';}
    else{nextPlayer={...player,processedResources:{...player.processedResources,fuel:player.processedResources.fuel+12},industry:{...player.industry,utilization:clamp(player.industry.utilization-5,0,100)}};summary='Fuel allocation was diverted toward military readiness.';}
  } else if(event.kind==='intelligence_breach'){
    if(optionId==='deny'){nextPlayer={...player,politics:{...player.politics,approval:clamp(player.politics.approval-1,0,100)},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation-3,0,100)}};summary='Government issued a formal denial amid continued scrutiny.';}
    else{nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-4},intelligence:{...player.intelligence,counterIntelligence:clamp(player.intelligence.counterIntelligence+5,0,100)},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation+1,0,100)}};summary='An internal intelligence review was ordered.';}
  } else if(event.kind==='inflation_shock'){
    if(optionId==='subsidize'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-8},politics:{...player.politics,approval:clamp(player.politics.approval+2,0,100)}};summary='Targeted household subsidies announced.';}
    else{nextPlayer={...player,economy:{...player.economy,inflation:Math.max(-2,player.economy.inflation-1.2)},politics:{...player.politics,approval:clamp(player.politics.approval-2,0,100)}};summary='Fiscal tightening package enacted.';}
  } else if(event.kind==='war_weariness'){
    if(optionId==='address'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-3},politics:{...player.politics,approval:clamp(player.politics.approval+1,0,100)},military:{...player.military,morale:clamp(player.military.morale+2,0,100)}};summary='National address steadied public morale.';}
    else{nextPlayer={...player,politics:{...player.politics,approval:clamp(player.politics.approval-3,0,100)},military:{...player.military,readiness:clamp(player.military.readiness+4,0,100)}};summary='Full mobilization order issued.';}
  } else if(event.kind==='corruption_scandal'){
    if(optionId==='investigate'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-5},politics:{...player.politics,approval:clamp(player.politics.approval+3,0,100),stability:clamp(player.politics.stability+2,0,100)}};summary='Independent investigation launched.';}
    else{nextPlayer={...player,politics:{...player.politics,approval:clamp(player.politics.approval-4,0,100),stability:clamp(player.politics.stability-3,0,100)}};summary='The scandal was contained at a political cost.';}
  } else if(event.kind==='tax_protest'){
    if(optionId==='tax_relief'){nextPlayer={...player,economy:{...player.economy,taxRate:clamp(player.economy.taxRate-3,0,60)},politics:{...player.politics,approval:clamp(player.politics.approval+3,0,100)}};summary='Temporary tax relief announced.';}
    else{nextPlayer={...player,politics:{...player.politics,stability:clamp(player.politics.stability-2,0,100)}};summary='Government defended the current fiscal framework.';}
  } else if(event.kind==='reform_demand'){
    if(optionId==='reform_package'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-6},politics:{...player.politics,approval:clamp(player.politics.approval+3,0,100),stability:clamp(player.politics.stability+2,0,100)},society:{...player.society,cohesion:clamp(player.society.cohesion+1,0,100)}};summary='Institutional reform package launched.';}
    else{nextPlayer={...player,politics:{...player.politics,approval:clamp(player.politics.approval-2,0,100),stability:clamp(player.politics.stability-1,0,100)}};summary='Reform agenda delayed.';}
  } else if(event.kind==='health_crisis'){
    const cost=optionId==='health_fund'?7:3,approval=optionId==='health_fund'?2:1,stability=optionId==='health_fund'?1:0;
    nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-cost},politics:{...player.politics,approval:clamp(player.politics.approval+approval,0,100),stability:clamp(player.politics.stability+stability,0,100)}};
    summary=optionId==='health_fund'?'Emergency health funding approved.':'Targeted health response deployed.';
  } else if(event.kind==='foreign_policy_backlash'){
    if(optionId==='defend_policy'){nextPlayer={...player,politics:{...player.politics,approval:clamp(player.politics.approval-1,0,100)},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation+1,0,100)}};summary='Government publicly defended its foreign-policy doctrine.';}
    else{nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-2},politics:{...player.politics,approval:clamp(player.politics.approval+1,0,100)},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation+2,0,100)}};summary='Foreign-policy review commissioned.';}
  } else if(event.kind==='earthquake'){
    if(optionId==='disaster_relief'){nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-8},politics:{...player.politics,approval:clamp(player.politics.approval+3,0,100),stability:clamp(player.politics.stability+2,0,100)}};summary='National disaster-relief mobilization launched.';}
    else{nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-3},politics:{...player.politics,stability:clamp(player.politics.stability-2,0,100)}};summary='Regional authorities assumed primary disaster response.';}
  }

  const cooldown=24+((state.simulationSeed>>>6)%88);
  return { ...state, countries:{...state.countries,[player.id]:nextPlayer}, activeEvent:null, speed:state.preferredSpeed, eventCooldownUntil:state.day+cooldown, sitrep:[`EVENT RESOLVED // ${summary}`,...state.sitrep].slice(0,12) };
}
