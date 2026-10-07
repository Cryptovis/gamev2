import type { GameState } from '../../domain/game';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function processInfluence(state:GameState):GameState{
 if(state.day%7!==0)return state;const player=state.countries[state.playerCountryId];if(!player)return state;const countries={...state.countries};const culturalInfluence={...state.culturalInfluence};
 for(const c of Object.values(countries)){if(c.id===player.id)continue;const rel=player.diplomacy.relations[c.id];const score=rel?.score??0;const sameI=c.society.ideology===player.society.ideology;const sameR=c.society.dominantReligion===player.society.dominantReligion;const bloc=Object.values(state.blocs).some(b=>b.memberIds.includes(player.id)&&b.memberIds.includes(c.id))?.45:0;const drift=(score/100)*.22+(sameI?.18:-.04)+(sameR?.08:0)+bloc;const cur=culturalInfluence[c.id]??0;culturalInfluence[c.id]=clamp(cur+drift,0,100);const pressure=culturalInfluence[c.id];countries[c.id]={...c,society:{...c.society,influencePressure:{ideology:clamp(c.society.influencePressure.ideology+Math.max(0,drift)*.18,0,100),religion:clamp(c.society.influencePressure.religion+(sameR?Math.max(0,drift)*.12:-.02),0,100)}},politics:{...c.politics,stability:clamp(c.politics.stability+(pressure>55&&sameI?.02:pressure>65&&!sameI?-.025:0),0,100)}};}
 return {...state,countries,culturalInfluence};
}
