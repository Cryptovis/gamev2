import type {GameState} from '../../domain/game';
import type {GameCommand} from '../../domain/commands';
import {FACTION_KEYS,type FactionKey} from '../../domain/politics';
import {CONCESSION_DAYS,FACTION_LABEL,concessionStatus,factionsFor} from '../../engine/systems/factions';

export type PolicyCardId='tax'|`concession:${FactionKey}`;
export interface PolicyCard{
 id:PolicyCardId;title:string;subtitle:string;
 art:{set:'command'|'civic';kind:string};
 status:'active'|'available'|'locked';
 activeUntilDay?:number;daysLeft?:number;
 reason?:string;costB?:number;satisfaction?:number;
 /** Only for the player's own country; a foreign country's cards are read-only. */
 command?:GameCommand;
 faction?:FactionKey;
 /** The rate shown on the Tax Code card (already a percentage). */
 taxRate?:number;
}

/** Presentation names of the five existing faction concessions. The engine has no laws system; these only name what already exists. */
export const CONCESSION_CARD:Record<FactionKey,{title:string;art:PolicyCard['art']}>={
 labour:{title:'Labour Charter',art:{set:'command',kind:'cabinet'}},
 business:{title:'Business Relief Act',art:{set:'command',kind:'investment'}},
 security:{title:'Security Mandate',art:{set:'command',kind:'military'}},
 traditional:{title:'Traditional Values Act',art:{set:'civic',kind:'festival'}},
 liberal:{title:'Urban Reform Act',art:{set:'command',kind:'governance'}},
};
/** Order shown in the grid after the Tax Code card. */
export const CONCESSION_ORDER:readonly FactionKey[]=['labour','business','security','traditional','liberal'];

export function policyCards(state:GameState,countryId:string):PolicyCard[]{
 const c=state.countries[countryId];
 if(!c)return [];
 const own=countryId===state.playerCountryId,f=factionsFor(c),status=concessionStatus(c,state.day);
 const running=f.concession&&f.concession.untilDay>=state.day?f.concession:undefined;
 const cards:PolicyCard[]=[{id:'tax',title:'Tax Code',subtitle:'Rate {0}%',art:{set:'command',kind:'treasury'},status:'available',taxRate:c.economy.taxRate}];
 for(const faction of CONCESSION_ORDER){
  if(!FACTION_KEYS.includes(faction))continue;
  const base={id:`concession:${faction}` as const,title:CONCESSION_CARD[faction].title,subtitle:'Courts {0} for 180 days',art:CONCESSION_CARD[faction].art,faction,satisfaction:f.satisfaction[faction],costB:status.costB};
  if(running?.faction===faction)cards.push({...base,status:'active',activeUntilDay:running.untilDay,daysLeft:Math.max(0,running.untilDay-state.day)});
  else if(!status.allowed)cards.push({...base,status:'locked',reason:status.reason});
  else cards.push({...base,status:'available',...(own?{command:{type:'politics/concession',faction}}:{})});
 }
 return cards;
}

export {CONCESSION_DAYS,FACTION_LABEL};

/** Splits the engine's lock reason into a translatable template and its values; the text itself still comes from `concessionStatus`. */
export function reasonParts(reason:string):{key:string;values:string[]}{
 const m=/^A concession to (.+) runs until day (\d+)\.$/.exec(reason);
 return m?{key:'A concession to {0} runs until day {1}.',values:[m[1],m[2]]}:{key:reason,values:[]};
}
