import type { CountryState, GameState } from '../../domain/game';
import { technologyById } from '../../data/technologyTree';
import { academyFor } from './governance';
import { activeCountries } from '../../domain/sovereignty';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function canUnlockTechnology(country:CountryState,technologyId:string) {
 const node=technologyById[technologyId];
 return !!node && !country.technology.project && !country.technology.unlocked.includes(technologyId) && node.prerequisites.every(id=>country.technology.unlocked.includes(id)) && country.technology.researchPoints>=node.cost;
}
export function researchCapacity(s:GameState,id:string) {
 const a=academyFor(s,id);
 // One national team; campuses improve throughput, bounded at four research-work units/day.
 return Math.min(4,1+a.buildings.university*.15+a.buildings.institute*.35);
}
export function researchDuration(s:GameState,id:string,technologyId:string) {
 const n=technologyById[technologyId];
 return n?Math.ceil((12+n.tier*6+n.cost*.2)/researchCapacity(s,id)):0;
}
export function unlockTechnology(s:GameState,id:string,technologyId:string):GameState {
 const c=s.countries[id],n=technologyById[technologyId];
 if(!c||!n||!canUnlockTechnology(c,technologyId))return s;
 const project={id:`research-${id}-${s.day}-${technologyId}`,technologyId,startedDay:s.day,lastProgressDay:s.day,workDone:0,requiredWork:12+n.tier*6+n.cost*.2,cost:n.cost};
 return {...s,countries:{...s.countries,[id]:{...c,technology:{...c.technology,researchPoints:c.technology.researchPoints-n.cost,project}}},sitrep:[`RESEARCH // ${n.name} started by ${c.name}; estimated ${researchDuration(s,id,technologyId)} days.`,...s.sitrep].slice(0,12)};
}
export function cancelResearch(s:GameState,id:string):GameState {
 const c=s.countries[id],p=c?.technology.project;
 if(!p)return s;
 const refund=p.cost*.8*Math.max(0,1-p.workDone/p.requiredWork);
 return {...s,countries:{...s.countries,[id]:{...c,technology:{...c.technology,project:null,researchPoints:c.technology.researchPoints+refund}}},sitrep:[`RESEARCH // Project cancelled; ${refund.toFixed(2)} RP refunded.`,...s.sitrep].slice(0,12)};
}
function applyDiscovery(c:CountryState,id:string):CountryState {
 const n=technologyById[id];
 let next:CountryState={...c,technology:{...c.technology,project:null,unlocked:[...c.technology.unlocked,id]}};
 if(n.category==='economy')next={...next,economy:{...next.economy,productivity:clamp(next.economy.productivity+2.5,0,100)}};
 if(n.category==='industry')next={...next,industry:{...next.industry,utilization:clamp(next.industry.utilization+1.5,0,100)}};
 if(n.category==='military')next={...next,military:{...next.military,technology:clamp(next.military.technology+2.2,0,100),readiness:clamp(next.military.readiness+1.2,0,100)}};
 if(n.category==='intelligence')next={...next,intelligence:{...next.intelligence,intelConfidence:clamp(next.intelligence.intelConfidence+4,0,100)}};
 if(n.category==='society')next={...next,society:{...next.society,cohesion:clamp(next.society.cohesion+3,0,100)}};
 return next;
}
export function processResearch(s:GameState):GameState {
 let countries=s.countries;const notices:string[]=[];
 for(const c of activeCountries(s.countries)) {
  const p=c.technology.project;
  if(p&&c.technology.unlocked.includes(p.technologyId)){
   // Integration may bring this discovery from another country; retain its effects once.
   const refund=p.cost*.8*Math.max(0,1-p.workDone/p.requiredWork);
   countries={...countries,[c.id]:{...c,technology:{...c.technology,project:null,researchPoints:c.technology.researchPoints+refund}}};
   continue;
  }
  if(!p||p.lastProgressDay>=s.day||(c.controllerCountryId&&c.controllerCountryId!==c.id))continue;
  const workDone=Math.min(p.requiredWork,p.workDone+researchCapacity(s,c.id));
  const updated={...c,technology:{...c.technology,project:{...p,workDone,lastProgressDay:s.day}}};
  const complete=workDone>=p.requiredWork;
  countries={...countries,[c.id]:complete?applyDiscovery(updated,p.technologyId):updated};
  if(complete&&c.id===s.playerCountryId)notices.push(`TECH // ${technologyById[p.technologyId].name} unlocked by ${c.name}.`);
 }
 return countries===s.countries?s:{...s,countries,sitrep:[...notices,...s.sitrep].slice(0,12)};
}
