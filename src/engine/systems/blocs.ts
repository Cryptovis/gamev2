import type { AllianceBloc, GameState } from '../../domain/game';
import { relationFor } from './diplomacy';
import { BASE_COST_B, formatCostB, scaledCostB } from './policyPressure';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

export function blocForCountry(state:GameState,countryId:string){return Object.values(state.blocs).find((bloc)=>bloc.memberIds.includes(countryId))??null;}

export function formBloc(state:GameState,targetId:string):GameState{
  const player=state.countries[state.playerCountryId]; const target=state.countries[targetId];
  if(!player||!target||blocForCountry(state,player.id))return state;
  const rel=relationFor(player,target.id),cost=scaledCostB(player,BASE_COST_B.strategicBloc);
  if(!rel.treaties.includes('alliance')||rel.score<65||player.economy.treasury<cost)return {...state,sitrep:[`BLOC // Strategic bloc requires an alliance, +65 relations and ${formatCostB(cost)}.`,...state.sitrep].slice(0,12)};
  const id=`BLOC-${player.id}-${state.day}`;
  const bloc:AllianceBloc={id,name:`${player.name} Strategic Compact`,leaderId:player.id,memberIds:[player.id,target.id],cohesion:68,doctrine:'collective_security'};
  const nextPlayer={...player,economy:{...player.economy,treasury:player.economy.treasury-cost}};
  return {...state,countries:{...state.countries,[player.id]:nextPlayer},blocs:{...state.blocs,[id]:bloc},sitrep:[`BLOC // ${bloc.name} formed with ${target.name}.`,...state.sitrep].slice(0,12)};
}

export function inviteToBloc(state:GameState,targetId:string):GameState{
  const player=state.countries[state.playerCountryId]; const target=state.countries[targetId]; const bloc=blocForCountry(state,state.playerCountryId);
  if(!player||!target||!bloc||bloc.memberIds.includes(targetId))return state;
  const rel=relationFor(player,targetId);
  if(!rel.treaties.includes('alliance')||rel.score<60)return {...state,sitrep:[`BLOC // ${target.name} requires an alliance and +60 relations.`,...state.sitrep].slice(0,12)};
  const updated={...bloc,memberIds:[...bloc.memberIds,targetId],cohesion:clamp(bloc.cohesion-2,0,100)};
  return {...state,blocs:{...state.blocs,[bloc.id]:updated},sitrep:[`BLOC // ${target.name} joined ${bloc.name}.`,...state.sitrep].slice(0,12)};
}
