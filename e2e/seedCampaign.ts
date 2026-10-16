import type {Page} from '@playwright/test';
import type {GameState} from '../src/domain/game';
import {makeInitialState} from '../src/data/initialState';
import {snapshotGame} from '../src/persistence/snapshot';
export function campaignFixture(language:GameState['playerProfile']['language']='tr'):GameState {
 const s=makeInitialState();s.speed=0;s.playerProfile={...s.playerProfile,setupComplete:true,language,commanderName:'Browser playtest'};
 s.world.tutorial={...s.world.tutorial,active:false,completed:true};s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 return s;
}
export async function resumeFixture(page:Page,state:GameState) {
 await page.goto('/');
 await page.evaluate(async state=>{
  sessionStorage.setItem('trp-demo-session-v1','guest');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('alpyx-global-command');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{const store=req.result.createObjectStore('saves',{keyPath:'id'});store.createIndex('updatedAt','updatedAt');};});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put({id:'manual',owner:'guest',name:'Prepared playtest',updatedAt:Date.now(),schemaVersion:state.schemaVersion,state});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },snapshotGame(state));
 await page.reload();await page.locator('.load-previous').click();
}
/** Opens the player's country panel. The flag button toggles and a fixture can already have the panel selected, so click only when it is not pressed. */
export async function openNation(page:Page){
 const flag=page.locator('[data-guide="nation"]').first();
 await flag.waitFor();
 if((await flag.getAttribute('aria-pressed'))!=='true')await flag.click();
}
