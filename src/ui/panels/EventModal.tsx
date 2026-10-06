import { useGameStore } from '../../store/gameStore';
import { EventArtwork } from '../events/EventArtwork';

const EVENT_LABEL:Record<string,string>={food_crisis:'SUPPLY CRISIS',inflation_shock:'ECONOMIC SHOCK',war_weariness:'WAR HOME FRONT',corruption_scandal:'POLITICAL CRISIS',fuel_crisis:'ENERGY SECURITY',intelligence_breach:'COVERT CRISIS'};

export function EventModal(){
 const event=useGameStore(s=>s.activeEvent);
 const resolveEvent=useGameStore(s=>s.resolveEvent);
 if(!event)return null;
 return <div className="event-backdrop"><section className="event-modal event-modal-v2">
  <div className="event-art"><EventArtwork kind={event.kind}/><div className="event-art-shade"/><span>{EVENT_LABEL[event.kind]??'NATIONAL EVENT'}</span><b>DAY {event.triggeredDay}</b></div>
  <div className="event-copy"><div className="panel-kicker">NATIONAL DECISION REQUIRED</div><h2>{event.title}</h2><p>{event.description}</p><div className="event-options">{event.options.map((o,i)=><button key={o.id} onClick={()=>resolveEvent(o.id)}><em>OPTION {String(i+1).padStart(2,'0')}</em><strong>{o.label}</strong><span>{o.consequenceHint}</span></button>)}</div></div>
 </section></div>;
}
