import type {GameState,CountryState} from '../../domain/game';
import type {LeaderArchetype} from '../../domain/industrial';
export interface LeaderModifiers {factory:number;tax:number;stabilityRecovery:number;recruitment:number;defense:number;debtInterest:number;consumer:number;embassy:number}
export const NEUTRAL_LEADER:Readonly<LeaderModifiers>=Object.freeze({factory:1,tax:1,stabilityRecovery:1,recruitment:1,defense:1,debtInterest:1,consumer:1,embassy:1});
const modifiers:Record<LeaderArchetype,Readonly<LeaderModifiers>>={
 executive:Object.freeze({...NEUTRAL_LEADER,factory:1.1,tax:1.05}),
 reformer:Object.freeze({...NEUTRAL_LEADER,stabilityRecovery:1.1}),
 diplomat:Object.freeze({...NEUTRAL_LEADER,embassy:.8}),
 commander:Object.freeze({...NEUTRAL_LEADER,recruitment:1.1,defense:1.15}),
 chancellor:Object.freeze({...NEUTRAL_LEADER,debtInterest:.85}),
 governor:Object.freeze({...NEUTRAL_LEADER,consumer:.85}),
};
/** Absent metadata means legacy neutral gameplay; cosmetic avatar changes never alter the chosen campaign perk. */
export function leaderModifiers(state:Pick<GameState,'leadership'|'playerCountryId'>,countryId=state.playerCountryId):Readonly<LeaderModifiers>{
 const role=state.leadership.archetype;
 return countryId===state.playerCountryId&&role&&Object.hasOwn(modifiers,role)?modifiers[role]:NEUTRAL_LEADER;
}
export function leaderOpeningValues(country:CountryState,role:LeaderArchetype){
 return {treasury:country.economy.treasury*(role==='chancellor'?1.2:1),approval:Math.min(100,country.politics.approval*(role==='reformer'?1.08:1))};
}

export function facilityLeaderFactor(state:Pick<GameState,'leadership'|'playerCountryId'>,id:string,kind:string){
 return ['rubber_plant','armor_mill','engine_works','electronics_works'].includes(kind)?leaderModifiers(state,id).factory:1;
}
