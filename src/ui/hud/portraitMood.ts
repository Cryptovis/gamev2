/** playtest.19 (Phase 6.5): the commander portrait glows red in a crisis or war and gold in prosperity. Pure; the engine decides nothing here. */
export type PortraitMood='alarm'|'gold'|'calm';
export interface PortraitMoodInput{atWar:boolean;regimeCrisis:boolean;stability:number;approval:number}
export const ALARM_STABILITY=30,GOLD_APPROVAL=70,GOLD_STABILITY=60;
export function portraitMood(i:PortraitMoodInput):PortraitMood{
 if(i.atWar||i.regimeCrisis||i.stability<ALARM_STABILITY)return 'alarm';
 return i.approval>=GOLD_APPROVAL&&i.stability>=GOLD_STABILITY?'gold':'calm';
}
