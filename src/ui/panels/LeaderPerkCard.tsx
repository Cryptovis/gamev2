import type {LeaderArchetype} from '../../domain/industrial';
import {LEADER_PERKS} from '../../data/leaderArchetypes';
import {LocaleText} from '../../i18n/localeText';
export function LeaderPerkCard({archetype}:{archetype:LeaderArchetype}){
 const perk=LEADER_PERKS[archetype];
 return <div className="leader-perk" data-archetype={archetype}><strong><LocaleText value={perk.title}/></strong><span><LocaleText value={perk.description}/></span><small><LocaleText value="Campaign perk is fixed at start; later portrait changes are cosmetic."/></small></div>;
}
