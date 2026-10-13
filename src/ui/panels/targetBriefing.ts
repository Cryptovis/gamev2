/**
 * 0.91.0: read-only view models for the Target Country modal's two sub-views, War Planning and Full Dossier.
 * Every figure comes from an engine function (`getWarPreview`, `warDeclarationStatus`, `warFuelReadiness`);
 * nothing here owns a formula except the presentation bands that colour the bars.
 */
import type {GameState} from '../../domain/game';
import {getWarPreview} from '../../engine/systems/warfare';
import {warDeclarationReason,warDeclarationStatus,warFuelReadiness} from '../../engine/systems/warRules';

export type WarOutlook='favourable'|'balanced'|'unfavourable';
export type AirBadge='superiority'|'contested'|'inferiority';
export interface WarPlanningView{
 targetId:string;terrain:string;
 powerRatio:number;/** Our share of the combined strength, 4–96 so both sides stay visible on the bar. */ourShare:number;outlook:WarOutlook;
 ourSupply:number;enemySupply:number;
 airSuperiority:number;air:AirBadge;
 fuel:{have:number;required:number;days:number;ready:boolean};
 /** Engine eligibility; `reason` is the engine's own sentence. */
 allowed:boolean;reason?:string;
 activeWarId:string|null;
}
export const outlookFor=(ratio:number):WarOutlook=>ratio>=1.25?'favourable':ratio>=.8?'balanced':'unfavourable';
export const airBadgeFor=(air:number):AirBadge=>air>=15?'superiority':air>-15?'contested':'inferiority';
export const ratioShare=(ratio:number):number=>{const r=Number.isFinite(ratio)&&ratio>0?ratio:0;return Math.min(96,Math.max(4,r/(1+r)*100));};

export function warPlanningView(state:GameState,targetId:string):WarPlanningView|null{
 const player=state.countries[state.playerCountryId],target=state.countries[targetId];
 if(!player||!target||player.id===target.id)return null;
 const p=getWarPreview(player,target,state.infrastructure[player.id],state.infrastructure[target.id]),status=warDeclarationStatus(state,player.id,target.id),fuel=warFuelReadiness(state,player.id);
 const active=Object.values(state.wars).find(w=>w.status==='active'&&((w.attackerId===player.id&&w.defenderId===target.id)||(w.defenderId===player.id&&w.attackerId===target.id)));
 return {
  targetId,terrain:p.terrain,powerRatio:p.powerRatio,ourShare:ratioShare(p.powerRatio),outlook:outlookFor(p.powerRatio),
  ourSupply:p.attackerSupply,enemySupply:p.defenderSupply,airSuperiority:p.airSuperiority,air:airBadgeFor(p.airSuperiority),
  fuel:{have:player.processedResources.fuel,required:fuel.required,days:fuel.days,ready:fuel.allowed},
  allowed:status.allowed,reason:warDeclarationReason(status),activeWarId:active?.id??null,
 };
}

export interface DossierView{
 regime:string;gdpB:number;treasuryB:number;debtB:number;inflation:number;unemployment:number;taxRate:number;
 approval:number;stability:number;population:number;
 personnel:number;tanks:number;fighters:number;warships:number;readiness:number;
 reputation:number;
}
export function dossierView(state:GameState,targetId:string):DossierView|null{
 const c=state.countries[targetId];
 if(!c)return null;
 return {
  regime:c.politics.regime,gdpB:c.economy.gdp,treasuryB:c.economy.treasury,debtB:c.economy.debt,inflation:c.economy.inflation,unemployment:c.economy.unemployment,taxRate:c.economy.taxRate,
  approval:c.politics.approval,stability:c.politics.stability,population:c.demographics.population,
  personnel:c.military.personnel,tanks:c.military.tanks,fighters:c.military.fighters,warships:c.military.warships,readiness:c.military.readiness,
  reputation:c.diplomacy.reputation,
 };
}
