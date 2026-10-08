import {describe,it,expect,beforeEach,vi} from 'vitest';
// Vitest runs in Node without IndexedDB, so the Dexie database is replaced by an in-memory table with the API saveGame uses.
vi.mock('../persistence/database',()=>{
 type Row={id:string;updatedAt:number;[key:string]:unknown};
 const rows=new Map<string,Row>();
 const sorted=(key:string)=>[...rows.values()].sort((a,b)=>Number(a[key])-Number(b[key]));
 const collection=(list:()=>Row[])=>({toArray:async()=>list(),primaryKeys:async()=>list().map(row=>row.id)});
 const saves={
  clear:async()=>{rows.clear();},put:async(row:Row)=>{rows.set(row.id,row);return row.id;},get:async(id:string)=>rows.get(id),
  delete:async(id:string)=>{rows.delete(id);},bulkDelete:async(ids:string[])=>{for(const id of ids)rows.delete(id);},toArray:async()=>[...rows.values()],
  orderBy:(key:string)=>({...collection(()=>sorted(key)),reverse:()=>collection(()=>sorted(key).reverse())}),
 };
 return {db:{saves}};
});
import {makeInitialState} from '../data/initialState';
import {db} from '../persistence/database';
import {snapshotGame} from '../persistence/snapshot';
import {saveGame,loadMostRecentSave,listSaves,autosaveId,AUTOSAVE_LIMIT} from '../persistence/saveGame';
import {AutosaveCoordinator,startAutosave} from '../persistence/autosaveCoordinator';

const campaign=(id:string,day=5)=>{const s=makeInitialState();s.day=day;s.world={...s.world,campaignId:id};return s;};
const tick=()=>new Promise(r=>setTimeout(r,2)); // distinct updatedAt timestamps
describe('0.84 per-campaign autosaves (A1)',()=>{
 beforeEach(async()=>{await db.saves.clear();});
 it('a new campaign does not overwrite the previous campaign autosave',async()=>{
  await saveGame(campaign('A',10),autosaveId('A'),'Autosave · Day 10','guest');await tick();
  await saveGame(campaign('B',5),autosaveId('B'),'Autosave · Day 5','guest');
  const ids=(await listSaves()).map(r=>r.id);
  expect(ids).toEqual(expect.arrayContaining(['autosave:A','autosave:B']));
  expect((await loadMostRecentSave())?.world.campaignId).toBe('B');
 });
 it('scopes autosave ids per owner and keeps legacy autosave records loadable',async()=>{
  expect((await saveGame(campaign('A'),autosaveId('A'),'x','alice')).id).toBe('alice:autosave:A');
  await db.saves.put({id:'autosave',owner:'guest',name:'legacy',updatedAt:Date.now()+1,schemaVersion:16,state:snapshotGame(campaign('legacy',15))});
  expect((await loadMostRecentSave())?.world.campaignId).toBe('legacy');
 });
 it('prunes the oldest autosaves beyond the limit per owner, leaving manual saves alone',async()=>{
  await saveGame(campaign('M'),'manual','Manual','guest');
  await saveGame(campaign('other'),autosaveId('other'),'x','bob');
  for(let i=0;i<AUTOSAVE_LIMIT+2;i++){await tick();await saveGame(campaign(`c${i}`),autosaveId(`c${i}`),'x','guest');}
  const guest=(await listSaves()).map(r=>r.id);
  expect(guest.filter(id=>id.startsWith('autosave:'))).toEqual(Array.from({length:AUTOSAVE_LIMIT},(_,i)=>`autosave:c${AUTOSAVE_LIMIT+1-i}`));
  expect(guest).toContain('manual');
  expect(await db.saves.get('bob:autosave:other')).toBeTruthy();
 });
});
describe('0.84 validated writes (A2)',()=>{
 beforeEach(async()=>{await db.saves.clear();});
 it('refuses to overwrite a good save with one that cannot be loaded back',async()=>{
  await saveGame(campaign('A',5),autosaveId('A'),'good','guest');
  const bad=campaign('A',10);bad.schemaVersion=99;
  await expect(saveGame(bad,autosaveId('A'),'bad','guest')).rejects.toThrow(/invalid save/);
  expect((await db.saves.get('autosave:A'))?.state.day).toBe(5);
 });
});
describe('0.84 autosave under StrictMode (A3)',()=>{
 it('mount → cleanup → mount reports success once instead of inheriting a cancelled write',async()=>{
  const c=new AutosaveCoordinator(),reports:string[]=[];let writes=0;
  const write=async()=>{writes++;await tick();};
  const report=(ok:boolean)=>reports.push(`ok=${ok}`);
  const cleanup=startAutosave(c,'A:5',write,report);cleanup();
  const cleanup2=startAutosave(c,'A:5',write,report);
  await tick();await tick();await tick();
  expect(reports).toEqual(['ok=true']);expect(writes).toBe(1);cleanup2();
 });
});
