import {demoOwner} from '../session/demoAccounts';
import {useEffect,useRef} from 'react';
import {useGameStore} from '../store/gameStore';
import {AutosaveCoordinator,startAutosave} from '../persistence/autosaveCoordinator';
import type {GameState} from '../domain/game';
// Capture the intended campaign/day, not whichever state is current after async import.
const autosaveWrite=(snapshot:GameState,owner:string)=>async()=>{
 const {saveGame,autosaveId}=await import('../persistence/saveGame');
 if(useGameStore.getState().world.campaignId!==snapshot.world.campaignId)throw new Error('Autosave checkpoint superseded');
 await saveGame(snapshot,autosaveId(snapshot.world.campaignId),`Autosave · Day ${snapshot.day}`,owner);
};
export function useAutosave(enabled=true) {
 const day=useGameStore(s=>s.day),campaignStatus=useGameStore(s=>s.campaignStatus),campaignId=useGameStore(s=>s.world.campaignId);
 const ref=useRef<AutosaveCoordinator|null>(null),coordinator=ref.current??=new AutosaveCoordinator();
 useEffect(()=>{
  if(!enabled||campaignStatus!=='active'||day<5||day%5!==0)return;
  const snapshot=useGameStore.getState();
  return startAutosave(coordinator,`${campaignId}:${day}`,autosaveWrite(snapshot,demoOwner()),ok=>useGameStore.getState().setSaveMessage(ok?`Autosaved Day ${day}`:'Autosave failed; retrying'));
 },[enabled,campaignStatus,day,campaignId,coordinator]);
 // Best-effort flush when the tab is hidden or closed; skipped when the current day is already saved.
 useEffect(()=>{
  if(!enabled)return;
  const flush=()=>{
   const s=useGameStore.getState(),key=`${s.world.campaignId}:${s.day}`;
   if(s.campaignStatus!=='active'||coordinator.isSaved(key))return;
   void coordinator.save(key,autosaveWrite(s,demoOwner()));
  };
  const onVisibility=()=>{if(document.visibilityState==='hidden')flush();};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',onVisibility);
  return ()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onVisibility);};
 },[enabled,coordinator]);
}
