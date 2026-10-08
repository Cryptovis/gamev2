import {demoOwner} from '../session/demoAccounts';
import {useEffect,useRef} from 'react';
import {useGameStore} from '../store/gameStore';
import {AutosaveCoordinator} from '../persistence/autosaveCoordinator';
export function useAutosave(enabled=true) {
 const day=useGameStore(s=>s.day),campaignStatus=useGameStore(s=>s.campaignStatus),campaignId=useGameStore(s=>s.world.campaignId);
 const coordinator=useRef(new AutosaveCoordinator());
 useEffect(()=>{
  if(!enabled||campaignStatus!=='active'||day<5||day%5!==0)return;
  let cancelled=false,timer=0,attempt=0;
  const run=async()=>{
   const ok=await coordinator.current.save(`${campaignId}:${day}`,async()=>{
    const {saveGame}=await import('../persistence/saveGame');
    // Capture the intended campaign/day, not whichever state is current after async import.
    if(cancelled||useGameStore.getState().world.campaignId!==snapshot.world.campaignId)throw new Error('Autosave checkpoint superseded');
    await saveGame(snapshot,'autosave',`Autosave · Day ${day}`,owner);
   });
   if(cancelled)return;
   useGameStore.getState().setSaveMessage(ok?`Autosaved Day ${day}`:'Autosave failed; retrying');
   if(!ok)timer=window.setTimeout(run,Math.min(30000,3000*2**attempt++));
  };
  const snapshot=useGameStore.getState(),owner=demoOwner();void run();
  return ()=>{cancelled=true;if(timer)window.clearTimeout(timer);};
 },[enabled,campaignStatus,day,campaignId]);
}
