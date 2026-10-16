import type {Page} from '@playwright/test';
import type {GameState} from '../src/domain/game';
import {makeInitialState} from '../src/data/initialState';
import {snapshotGame} from '../src/persistence/snapshot';
import {continueCampaign} from './helpers/enterAsGuest';
export function campaignFixture(language:GameState['playerProfile']['language']='tr'):GameState {
 const s=makeInitialState();s.speed=0;s.playerProfile={...s.playerProfile,setupComplete:true,language,commanderName:'Browser playtest'};
 s.world.tutorial={...s.world.tutorial,active:false,completed:true};s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 return s;
}
/** Writes raw save records for the guest profile and reloads, leaving the player on the landing screen. */
export async function seedRecords(page:Page,records:readonly object[]) {
 await page.goto('/');
 await page.evaluate(async records=>{
  sessionStorage.setItem('trp-demo-session-v1','guest');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('alpyx-global-command');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{const store=req.result.createObjectStore('saves',{keyPath:'id'});store.createIndex('updatedAt','updatedAt');};});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('saves','readwrite');for(const record of records)tx.objectStore('saves').put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },records as object[]);
 await page.reload();
}
/** Saves a campaign for the guest profile and reloads onto the landing screen without continuing it. */
export async function seedSave(page:Page,state:GameState) {
 await seedRecords(page,[{id:'manual',owner:'guest',name:'Prepared playtest',updatedAt:Date.now(),schemaVersion:state.schemaVersion,state:snapshotGame(state)}]);
}
export async function resumeFixture(page:Page,state:GameState) {
 await seedSave(page,state);
 await continueCampaign(page);
}
/** Opens the player's country panel. The flag button toggles and a fixture can already have the panel selected, so click only when it is not pressed. */
export async function openNation(page:Page){
 const flag=page.locator('[data-guide="nation"]').first();
 await flag.waitFor();
 if((await flag.getAttribute('aria-pressed'))!=='true')await flag.click();
}
