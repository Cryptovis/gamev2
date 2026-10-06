import { useGameStore } from '../../store/gameStore';

export function EventModal(){
  const event=useGameStore((s)=>s.activeEvent);
  const resolveEvent=useGameStore((s)=>s.resolveEvent);
  if(!event)return null;
  return <div className="event-backdrop">
    <section className="event-modal">
      <div className="panel-kicker">NATIONAL EVENT // DAY {event.triggeredDay}</div>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <div className="event-options">{event.options.map((option)=><button key={option.id} onClick={()=>resolveEvent(option.id)}><strong>{option.label}</strong><span>{option.consequenceHint}</span></button>)}</div>
    </section>
  </div>;
}
