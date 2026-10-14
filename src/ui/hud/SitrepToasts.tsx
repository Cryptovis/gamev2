import {useEffect,useRef,useState} from 'react';
import {useGameStore} from '../../store/gameStore';
import {useWorldView} from '../../store/useWorldView';
import {commandAlerts} from '../../store/commandIntelligence';
import {enqueueToasts,newJournalToasts,type ToastEvent} from '../../presentation/newsChannels';
import {LocaleText,translateLive} from '../../i18n/localeText';
export function SitrepToasts(){
 const state=useWorldView(),marker=useGameStore(s=>s.saveMessage),previous=useRef(state),loadMarker=useRef(marker);
 const [queue,setQueue]=useState<ToastEvent[]>([]),[paused,setPaused]=useState(false);
 const seen=useRef(new Set((state.world.journal??[]).map(e=>e.id)));
 useEffect(()=>{
  const before=previous.current,loaded=marker!==loadMarker.current&&(marker??'').startsWith('Loaded Day');
  if(loaded||state.day<before.day||state.playerCountryId!==before.playerCountryId){setQueue([]);seen.current=new Set((state.world.journal??[]).map(e=>e.id));}
  else{
   const events=newJournalToasts(before,state).filter(e=>!seen.current.has(e.id));
   const oldAlerts=new Set(commandAlerts(before).map(a=>a.id+':'+a.severity));
   for(const alert of commandAlerts(state))if((alert.severity==='critical'||alert.id==='refined-fuel'||alert.id==='oil-declining')&&!oldAlerts.has(alert.id+':'+alert.severity))events.push({id:`alert:${state.day}:${alert.id}:${alert.severity}`,message:alert.title,priority:alert.severity==='critical'?2:1,day:state.day,channel:alert.category==='diplomacy'?'diplomacy':'economy',count:1});
   events.forEach(e=>seen.current.add(e.id));if(seen.current.size>1024)seen.current=new Set([...seen.current].slice(-512));
   if(events.length)setQueue(q=>enqueueToasts(q,events));
  }
  previous.current=state;loadMarker.current=marker;
 },[state,marker]);
 const toast=queue[0];useEffect(()=>{if(!toast||paused)return;const timer=setTimeout(()=>setQueue(q=>q.slice(1)),6000);return()=>clearTimeout(timer);},[toast?.id,paused]);
 if(!toast)return null;
 return <aside className="sitrep-toast" role="status" aria-live="polite" data-toast-id={toast.id} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPaused(false);}}>
  <p><LocaleText value={toast.message}/>{toast.count>1&&<small> · +{toast.count-1}</small>}</p>
  <button onClick={()=>useGameStore.getState().routeWorkspace({kind:'news',filter:toast.channel==='economy'?'economy':toast.channel})}><LocaleText value="View in News"/></button>
  <button aria-label={translateLive('Dismiss alert')} onClick={()=>setQueue(q=>q.slice(1))}>×</button>
 </aside>;
}
