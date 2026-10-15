import type {GameState} from '../../../domain/game';
import {activeMember,effectActive,sanctionEffects} from './effectSelectors';
export type SanctionChannel='arms'|'trade'|'finance';
/** Country-scoped humanitarian exceptions never exempt weapons or unrelated commodities. */
export function organizationSanctionsBlock(state:GameState,a:string,b:string,scope:SanctionChannel,commodity?:string):boolean {
 return sanctionEffects(state).some(e=>{
  if(!effectActive(state,e)||!e.measures.some(m=>m.scope===scope&&m.intensity>0&&m.enforcement>0))return false;
  const partner=e.targetId===a?b:e.targetId===b?a:undefined;
  if(!partner||!activeMember(state,e.organizationId,partner))return false;
  if(scope==='trade'&&commodity&&e.exemptions.some(x=>(x.countryIds.length===0||x.countryIds.includes(partner))&&
    (x.scope===commodity||x.scope==='humanitarian'&&['food','medicine','water'].includes(commodity))))return false;
  return true;
 });
}
export function hasFinancialRestriction(state:GameState,countryId:string):boolean {
 return sanctionEffects(state).some(e=>effectActive(state,e)&&e.targetId===countryId&&e.measures.some(m=>m.scope==='finance'&&m.intensity>0&&m.enforcement>0));
}
export function canTransferMilitaryHardware(state:GameState,from:string,to:string):boolean {
 const a=state.countries[from],b=state.countries[to],r=a?.diplomacy.relations[to];
 return !!a&&!!b&&from!==to&&!a.annexedBy&&!b.annexedBy&&!a.globalSanctions&&!b.globalSanctions&&!!r&&r.status!=='war'&&!r.sanctions&&
  r.treaties.includes('trade')&&r.treaties.includes('alliance')&&!organizationSanctionsBlock(state,from,to,'arms')&&!organizationSanctionsBlock(state,from,to,'trade','weapons');
}

/** Anonymous vault/financial orders have no disclosed partner to establish a country-specific exception. */
export function anonymousMarketBlocked(state:GameState,countryId:string):boolean {
 return sanctionEffects(state).some(e=>effectActive(state,e)&&e.targetId===countryId&&e.measures.some(m=>(m.scope==='finance'||m.scope==='trade')&&m.intensity>0&&m.enforcement>0));
}
