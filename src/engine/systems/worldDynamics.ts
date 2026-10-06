import type { CountryState, GameState } from '../../domain/game';
import { addTreaty, changeRelations, relationFor } from './diplomacy';

function stableHash(value:string){let h=2166136261;for(const ch of value){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function affinity(a:CountryState,b:CountryState){
 let score=0;
 if(a.region===b.region)score+=18;
 if(a.subregion&&a.subregion===b.subregion)score+=18;
 if(a.society.ideology===b.society.ideology)score+=12;
 if(a.society.dominantReligion===b.society.dominantReligion)score+=5;
 if(b.resourceProduction.oil>a.resourceProduction.oil*1.5)score+=5;
 if(b.economy.gdp>a.economy.gdp*.8)score+=3;
 const relation=relationFor(a,b.id);
 score+=relation.score*.35;
 if(relation.status==='war'||relation.sanctions)score-=200;
 return score;
}

export function processWorldDiplomacy(state:GameState):GameState{
 if(state.day%14!==0)return state;
 let next=state;
 const notes:string[]=[];
 const countries=Object.values(state.countries).filter((c)=>!c.controllerCountryId);
 for(const source0 of countries){
  if(source0.id===state.playerCountryId)continue;
  if(stableHash(`${source0.id}-${state.day}`)%4!==0)continue;
  const source=next.countries[source0.id];
  const target=countries.filter((c)=>c.id!==source.id&&c.id!==state.playerCountryId).map((c)=>({c,score:affinity(source,next.countries[c.id])})).sort((a,b)=>b.score-a.score)[0]?.c;
  if(!target)continue;
  const current=relationFor(source,target.id);
  if(current.status==='war'||current.score<-30)continue;
  const drift=source.ai.strategicGoal==='expand_influence'?3:source.ai.strategicGoal==='grow_economy'?2:1;
  if(current.score<75)next=changeRelations(next,source.id,target.id,drift);
  const rel=relationFor(next.countries[source.id],target.id);
  if(rel.score>=18&&!rel.treaties.includes('trade')){next=addTreaty(next,source.id,target.id,'trade');notes.push(`DIPLOMACY // ${source.name} and ${target.name} signed a trade pact.`);}
  else if(rel.score>=40&&!rel.treaties.includes('nonAggression')){next=addTreaty(next,source.id,target.id,'nonAggression');notes.push(`DIPLOMACY // ${source.name} and ${target.name} signed a non-aggression pact.`);}
  else if(rel.score>=72&&!rel.treaties.includes('alliance')){next=addTreaty(next,source.id,target.id,'alliance');notes.push(`DIPLOMACY // ${source.name} and ${target.name} entered a strategic alliance.`);}
 }
 return {...next,sitrep:[...notes,...next.sitrep].slice(0,12)};
}
