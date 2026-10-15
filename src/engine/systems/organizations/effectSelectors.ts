import type {GameState} from '../../../domain/game';
import type {OrganizationId,OrganizationEconomicEffect,OrganizationSanctionEffect} from '../../../domain/organizations';
export function activeMember(state:GameState,id:OrganizationId,countryId:string):boolean {
 const m=state.world.organizations.byId[id].memberships[countryId],c=state.countries[countryId];
 return !!c&&!c.annexedBy&&m?.status==='active'&&m.tier!=='Observer';
}
/** Effects are strictly validated at the persistence/command boundary; selectors never consume RNG. */
export function economicEffects(state:GameState):OrganizationEconomicEffect[] {
 return Object.values(state.world.organizations.effects).filter((e):e is OrganizationEconomicEffect=>!!e&&typeof e==='object'&&'kind' in e&&
  ['organizationOilQuota','organizationTradeRemedy','organizationMarketIntegration','organizationCurrencySwap'].includes(String(e.kind))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export const effectActive=(state:GameState,e:{status:string;startsDay:number;endsDay:number})=>e.status==='active'&&state.day>=e.startsDay&&state.day<e.endsDay;
export function sanctionEffects(state:GameState):OrganizationSanctionEffect[] {
 return Object.values(state.world.organizations.effects).filter((e):e is OrganizationSanctionEffect=>!!e&&typeof e==='object'&&'kind' in e&&e.kind==='organizationSanctions');
}
