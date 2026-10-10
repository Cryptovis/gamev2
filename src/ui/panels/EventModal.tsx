import {ManagedDialog} from '../windows/ManagedDialog';
import {WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {LocaleText} from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { EventArtwork } from '../events/EventArtwork';
import { EVENT_CATALOGUE } from '../../data/events';

const EVENT_LABEL:Record<string,string>={food_crisis:'SUPPLY CRISIS',inflation_shock:'ECONOMIC SHOCK',war_weariness:'WAR HOME FRONT',corruption_scandal:'POLITICAL CRISIS',fuel_crisis:'ENERGY SECURITY',intelligence_breach:'COVERT CRISIS',earthquake:'NATURAL DISASTER',health_crisis:'PUBLIC HEALTH',tax_protest:'DOMESTIC PRESSURE',reform_demand:'REFORM AGENDA',foreign_policy_backlash:'FOREIGN POLICY'};

export function EventModal(){
 const event=useGameStore(s=>s.activeEvent);
 const resolveEvent=useGameStore(s=>s.resolveEvent);
 if(!event)return null;
 return <div className="event-backdrop"><ManagedDialog className="event-modal event-modal-v2" label={event.title} layer={WINDOW_LAYERS.modal}>
  <div className="event-art"><EventArtwork kind={event.kind}/><div className="event-art-shade"/><span><LocaleText value={EVENT_LABEL[event.kind]??EVENT_CATALOGUE[event.kind]?.label??'NATIONAL EVENT'}/></span><b><LocaleText value={"DAY "}/><LocaleText value={event.triggeredDay}/></b></div>
  <div className="event-copy"><div className="panel-kicker"><LocaleText value={"NATIONAL DECISION REQUIRED"}/></div><h2><LocaleText value={event.title}/></h2><p><LocaleText value={event.description}/></p><div className="event-options">{event.options.map((o,i)=><button key={o.id} onClick={()=>resolveEvent(o.id)}><em><LocaleText value={"OPTION "}/><LocaleText value={String(i+1).padStart(2,'0')}/></em><strong><LocaleText value={o.label}/></strong><span><LocaleText value={o.consequenceHint}/></span></button>)}</div></div>
 </ManagedDialog></div>;
}
