import type {GameState} from '../../domain/game';
import {nextRandom} from '../rng';
import {expansion,updateExpansion} from './sovereignCredit';
import {VICTORY_QUOTES} from '../../data/victoryQuotes';
export function queueVictory(s:GameState,warId:string):GameState{const war=s.wars[warId],e=expansion(s);if(!war||e.victories.some(x=>x.warId===warId)||!((war.status==='victory'&&war.attackerId===s.playerCountryId)||(war.status==='defeat'&&war.defenderId===s.playerCountryId)))return s;const r=nextRandom(s.simulationSeed);return updateExpansion({...s,speed:0,simulationSeed:r.seed},{...e,victories:[...e.victories,{warId,day:s.day,quote:Math.min(VICTORY_QUOTES.length-1,Math.floor(r.value*VICTORY_QUOTES.length)),read:false}].slice(-100)});}
export const pendingVictory=(s:GameState)=>expansion(s).victories.find(x=>!x.read);
export function dismissVictory(s:GameState,id:string):GameState{const e=expansion(s);return updateExpansion(s,{...e,victories:e.victories.map(x=>x.warId===id?{...x,read:true}:x)});}
