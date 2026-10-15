import type {GameState} from '../../../domain/game';
import type {OilQuotaEffect} from '../../../domain/organizations';
import {economicEffects,activeMember,effectActive} from './effectSelectors';
export function activeOilQuota(state:GameState,countryId:string):OilQuotaEffect|undefined {
 return economicEffects(state).filter((e):e is OilQuotaEffect=>e.kind==='organizationOilQuota'&&effectActive(state,e)&&Object.hasOwn(e.quotas,countryId)&&activeMember(state,'opecPlus',countryId))
  .sort((a,b)=>b.startsDay-a.startsDay||(a.id<b.id?1:a.id>b.id?-1:0))[0];
}
/** Capacity stays intact: quota expiry restores extraction without changing the scenario production field. */
export function constrainedOilOutput(state:GameState,countryId:string):number {
 const capacity=Math.max(0,state.countries[countryId]?.resourceProduction.oil??0),e=activeOilQuota(state,countryId);
 return e?Math.min(capacity,e.quotas[countryId]+(e.allowedDeviationByCountry[countryId]??0)):capacity;
}
export function processQuotaStanding(state:GameState):GameState {
 let next=state;
 for(const e of economicEffects(state)){
  if(e.kind!=='organizationOilQuota'||!effectActive(state,e)||e.lastStandingDay>=state.day)continue;
  const organization=next.world.organizations.byId.opecPlus,standingByCountry={...organization.standingByCountry};
  for(const id of Object.keys(e.quotas).sort())if(activeOilQuota(next,id)?.id===e.id){
   const excess=Math.max(0,constrainedOilOutput(next,id)-e.quotas[id]);
   if(excess>1e-8)standingByCountry[id]=Math.max(0,(standingByCountry[id]??0)-Math.min(2,excess/Math.max(.001,e.quotas[id])*2));
  }
  const o=next.world.organizations;
  next={...next,world:{...next.world,organizations:{...o,byId:{...o.byId,opecPlus:{...organization,standingByCountry}},effects:{...o.effects,[e.id]:{...e,lastStandingDay:state.day}}}}};
 }
 return next;
}
