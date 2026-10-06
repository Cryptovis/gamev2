import type { ActiveGameEvent, GameState } from '../../domain/game';
import { nextRandom } from '../rng';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function makeEvent(state: GameState): { event: ActiveGameEvent | null; seed: number } {
  const player = state.countries[state.playerCountryId];
  if (!player || state.activeEvent || state.day < state.eventCooldownUntil) return { event: null, seed: state.simulationSeed };

  const activeWar = Object.values(state.wars).find((war) => war.status === 'active' && (war.attackerId === player.id || war.defenderId === player.id));
  const roll = nextRandom(state.simulationSeed);

  if (player.resources.food < 80) {
    return { seed: roll.seed, event: { id:`food-${state.day}`, kind:'food_crisis', title:'Strategic Food Reserve Crisis', description:'National food reserves have fallen below the emergency threshold. Supply chains are beginning to strain.', triggeredDay:state.day, options:[{id:'imports',label:'Emergency Imports',consequenceHint:'-$10B, +120 food'},{id:'ration',label:'Introduce Rationing',consequenceHint:'Approval -2, stability -1, +35 food'}] } };
  }
  if (player.economy.inflation > 14) {
    return { seed: roll.seed, event: { id:`inflation-${state.day}`, kind:'inflation_shock', title:'Cost of Living Shock', description:'Rapid price growth is squeezing households and eroding confidence in the government.', triggeredDay:state.day, options:[{id:'subsidize',label:'Targeted Subsidies',consequenceHint:'-$8B, approval +2'},{id:'tighten',label:'Fiscal Tightening',consequenceHint:'Inflation -1.2, approval -2'}] } };
  }
  if (activeWar && activeWar.attackerLosses.personnel + activeWar.defenderLosses.personnel > 12000) {
    return { seed: roll.seed, event: { id:`war-${state.day}`, kind:'war_weariness', title:'War Weariness', description:'Mounting casualties are dominating national media and public debate.', triggeredDay:state.day, options:[{id:'address',label:'Address the Nation',consequenceHint:'-$3B, approval +1, morale +2'},{id:'mobilize',label:'Double Down on Mobilization',consequenceHint:'Readiness +4, approval -3'}] } };
  }
  if (state.day >= 20 && roll.value > 0.76) {
    return { seed: roll.seed, event: { id:`corruption-${state.day}`, kind:'corruption_scandal', title:'Procurement Scandal', description:'Investigative journalists allege irregularities in a major defense procurement contract.', triggeredDay:state.day, options:[{id:'investigate',label:'Open Independent Investigation',consequenceHint:'-$5B, approval +3, stability +2'},{id:'cover',label:'Contain the Story',consequenceHint:'Approval -4, stability -3'}] } };
  }
  return { event: null, seed: roll.seed };
}

export function maybeTriggerEvent(state: GameState): GameState {
  const result = makeEvent(state);
  if (!result.event) return { ...state, simulationSeed: result.seed };
  return { ...state, simulationSeed: result.seed, activeEvent: result.event, speed: 0, sitrep:[`EVENT // ${result.event.title}`, ...state.sitrep].slice(0,12) };
}

export function resolveEvent(state: GameState, optionId: string): GameState {
  const event = state.activeEvent;
  const player = state.countries[state.playerCountryId];
  if (!event || !player) return state;
  let nextPlayer = player;
  let summary = 'Government response executed.';

  if (event.kind === 'food_crisis') {
    if (optionId === 'imports') {
      nextPlayer = { ...player, economy:{...player.economy,treasury:player.economy.treasury-10}, resources:{...player.resources,food:player.resources.food+120} };
      summary = 'Emergency food imports secured.';
    } else {
      nextPlayer = { ...player, resources:{...player.resources,food:player.resources.food+35}, politics:{...player.politics,approval:clamp(player.politics.approval-2,0,100),stability:clamp(player.politics.stability-1,0,100)} };
      summary = 'Rationing program introduced.';
    }
  } else if (event.kind === 'inflation_shock') {
    if (optionId === 'subsidize') {
      nextPlayer = { ...player, economy:{...player.economy,treasury:player.economy.treasury-8}, politics:{...player.politics,approval:clamp(player.politics.approval+2,0,100)} };
      summary = 'Targeted household subsidies announced.';
    } else {
      nextPlayer = { ...player, economy:{...player.economy,inflation:Math.max(-2,player.economy.inflation-1.2)}, politics:{...player.politics,approval:clamp(player.politics.approval-2,0,100)} };
      summary = 'Fiscal tightening package enacted.';
    }
  } else if (event.kind === 'war_weariness') {
    if (optionId === 'address') {
      nextPlayer = { ...player, economy:{...player.economy,treasury:player.economy.treasury-3}, politics:{...player.politics,approval:clamp(player.politics.approval+1,0,100)}, military:{...player.military,morale:clamp(player.military.morale+2,0,100)} };
      summary = 'National address steadied public morale.';
    } else {
      nextPlayer = { ...player, politics:{...player.politics,approval:clamp(player.politics.approval-3,0,100)}, military:{...player.military,readiness:clamp(player.military.readiness+4,0,100)} };
      summary = 'Full mobilization order issued.';
    }
  } else if (event.kind === 'corruption_scandal') {
    if (optionId === 'investigate') {
      nextPlayer = { ...player, economy:{...player.economy,treasury:player.economy.treasury-5}, politics:{...player.politics,approval:clamp(player.politics.approval+3,0,100),stability:clamp(player.politics.stability+2,0,100)} };
      summary = 'Independent investigation launched.';
    } else {
      nextPlayer = { ...player, politics:{...player.politics,approval:clamp(player.politics.approval-4,0,100),stability:clamp(player.politics.stability-3,0,100)} };
      summary = 'The scandal was contained at a political cost.';
    }
  }

  return { ...state, countries:{...state.countries,[player.id]:nextPlayer}, activeEvent:null, eventCooldownUntil:state.day+18, sitrep:[`EVENT RESOLVED // ${summary}`,...state.sitrep].slice(0,12) };
}
