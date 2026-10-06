import type { CountryState, GameState, StrategicGoal } from '../../domain/game';
import { relationFor } from './diplomacy';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function chooseStrategicGoal(c:CountryState):StrategicGoal{
 const stress=[c.resources.food,c.resources.oil,c.resources.iron].filter(v=>v<80).length;
 if(c.politics.stability<48||c.politics.approval<40)return 'stabilize';
 if(stress>=2||c.processedResources.fuel<20)return 'secure_resources';
 if(c.military.readiness<58||(c.military.assessment.capability>65&&c.military.readiness<72))return 'rearm';
 if(c.economy.inflation>10||c.economy.unemployment>12||c.economy.treasury<c.economy.gdp*.035)return 'grow_economy';
 return 'expand_influence';
}
export function strategicGoalLabel(g:StrategicGoal){return ({stabilize:'Stabilize the State',grow_economy:'Accelerate Growth',rearm:'Rearm & Modernize',secure_resources:'Secure Strategic Resources',expand_influence:'Expand Regional Influence'} satisfies Record<StrategicGoal,string>)[g];}
function rebalance(c:CountryState,g:StrategicGoal):CountryState{
 const a={...c.ministries.allocations}; const targets:Record<StrategicGoal,Partial<typeof a>>={stabilize:{interior:24,society:20,economy:20},grow_economy:{economy:30,science:22,defense:13},rearm:{defense:32,science:22,economy:18},secure_resources:{economy:28,defense:21,science:18},expand_influence:{intelligence:22,society:19,economy:20}};
 for(const [key,target] of Object.entries(targets[g])){const k=key as keyof typeof a;a[k]=clamp(a[k]+Math.sign(Number(target)-a[k])*Math.min(2,Math.abs(Number(target)-a[k])),5,45);}
 const total=Object.values(a).reduce((x,y)=>x+y,0); if(total>0)for(const k of Object.keys(a) as Array<keyof typeof a>)a[k]=a[k]/total*100;
 const rt=g==='rearm'?78:g==='secure_resources'?70:64; const readiness=clamp(c.military.readiness+Math.sign(rt-c.military.readiness)*Math.min(.65,Math.abs(rt-c.military.readiness)),0,100);
 const tt=g==='grow_economy'?19:g==='stabilize'?24:c.economy.taxRate; const taxRate=clamp(c.economy.taxRate+Math.sign(tt-c.economy.taxRate)*Math.min(1,Math.abs(tt-c.economy.taxRate)),8,45);
 return {...c,ministries:{...c.ministries,allocations:a},military:{...c.military,readiness},economy:{...c.economy,taxRate}};
}
export function processStrategicGoals(state:GameState):GameState{
 if(state.day-state.lastStrategicReviewDay<14)return state; const countries={...state.countries}; const player=state.countries[state.playerCountryId];
 for(const c of Object.values(countries)){if(c.id===state.playerCountryId||c.controllerCountryId)continue;const g=chooseStrategicGoal(c);let threat=c.ai.threatFocus;const rel=relationFor(c,state.playerCountryId);if(player&&rel.score<-20)threat=player.id;const u=rebalance(c,g);countries[c.id]={...u,ai:{strategicGoal:g,goalProgress:clamp(u.ai.goalProgress+(u.ai.strategicGoal===g?5:0),0,100),threatFocus:threat,lastGoalReviewDay:state.day}};}
 return {...state,countries,lastStrategicReviewDay:state.day,sitrep:['WORLD // Governments completed a strategic doctrine review.',...state.sitrep].slice(0,12)};
}
