import type {GameState} from '../../../domain/game';
import {economicEffects,activeMember,effectActive} from './effectSelectors';
/** Overlapping agreements use the strongest reduction, never multiplicative free bonuses. */
export function integrationBenefits(state:GameState,a:string,b:string):{frictionMultiplier:number;volumeMultiplier:number} {
 let reduction=0;
 for(const e of economicEffects(state))if(e.kind==='organizationMarketIntegration'&&effectActive(state,e)&&e.agreement.countryIds.includes(a)&&e.agreement.countryIds.includes(b)&&
  activeMember(state,e.organizationId,a)&&activeMember(state,e.organizationId,b))reduction=Math.max(reduction,e.agreement.tariffReduction);
 return {frictionMultiplier:1-.05*reduction,volumeMultiplier:1+.2*reduction};
}
