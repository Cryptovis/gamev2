import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {db,type SaveRecord} from '../persistence/database';
import {saveGame,autosaveId,AUTOSAVE_LIMIT} from '../persistence/saveGame';
import {makeInitialState} from '../data/initialState';

const campaign=(id:string,day=5)=>{const s=makeInitialState();s.day=day;s.world.campaignId=id;return s;};
async function seed(){
 for(let i=0;i<AUTOSAVE_LIMIT;i++)await db.saves.put({id:autosaveId(`old${i}`),owner:'guest',name:'old',updatedAt:i+1,schemaVersion:17,state:campaign(`old${i}`)});
 await db.saves.put({id:'manual',owner:'guest',name:'manual',updatedAt:0,schemaVersion:17,state:campaign('manual')});
 await db.saves.put({id:'bob:autosave:other',owner:'bob',name:'other',updatedAt:0,schemaVersion:17,state:campaign('other')});
}
describe('Phase 8 foundation: real Dexie checkpoint transactions',()=>{
 beforeEach(async()=>{await db.saves.clear();vi.spyOn(Date,'now').mockReturnValue(10000);});
 afterEach(()=>vi.restoreAllMocks());
 it('rolls back both checkpoint insertion and deletion when pruning fails after deleting',async()=>{
  await seed();const before=await db.saves.toArray(),remove=db.saves.bulkDelete.bind(db.saves);
  vi.spyOn(db.saves,'bulkDelete').mockImplementation(ids=>remove(ids).then(()=>{throw new Error('Prune failed');}));
  await expect(saveGame(campaign('new'),autosaveId('new'),'new','guest')).rejects.toThrow('Prune failed');
  expect(await db.saves.toArray()).toEqual(before);
 });
 it('restores an overwritten checkpoint when the shared transaction aborts',async()=>{
  await seed();await db.saves.put({id:autosaveId('extra'),owner:'guest',name:'extra',updatedAt:6,schemaVersion:17,state:campaign('extra')});
  const before=await db.saves.toArray(),remove=db.saves.bulkDelete.bind(db.saves);
  vi.spyOn(db.saves,'bulkDelete').mockImplementation(ids=>remove(ids).then(()=>{throw new Error('Prune failed');}));
  await expect(saveGame(campaign('extra',10),autosaveId('extra'),'updated','guest')).rejects.toThrow('Prune failed');
  expect(await db.saves.toArray()).toEqual(before);
 });
 it('keeps a newer write from another connection after stale selection and deletion',async()=>{
  await seed();
  const other=new Dexie(db.name);other.version(1).stores({saves:'id, updatedAt'});await other.open();
  const stale=(await db.saves.get(autosaveId('old0')))!;
  const refreshed:SaveRecord={...stale,updatedAt:20000,state:campaign('old0',15)};
  const remove=db.saves.bulkDelete.bind(db.saves);let concurrent:Promise<unknown>|undefined;
  vi.spyOn(db.saves,'bulkDelete').mockImplementation(ids=>{
   // This write is queued after stale selection. The checkpoint transaction must
   // finish its deletion before the other connection can refresh that same key.
   concurrent=other.table<SaveRecord,string>('saves').put(refreshed);
   return remove(ids);
  });
  try{
   await saveGame(campaign('new'),autosaveId('new'),'new','guest');await concurrent;
   expect((await db.saves.get(stale.id))?.state.day).toBe(15);
   expect(await db.saves.get('manual')).toBeTruthy();expect(await db.saves.get('bob:autosave:other')).toBeTruthy();
  }finally{other.close();}
 });
 it('commits the checkpoint with only the newest five owner autosaves',async()=>{
  await seed();await saveGame(campaign('new'),autosaveId('new'),'new','guest');
  const rows=await db.saves.toArray();expect(rows.filter(r=>r.owner==='guest'&&r.id.startsWith('autosave:'))).toHaveLength(AUTOSAVE_LIMIT);
  expect(await db.saves.get(autosaveId('old0'))).toBeUndefined();expect(await db.saves.get(autosaveId('new'))).toBeTruthy();
  expect(await db.saves.get('manual')).toBeTruthy();expect(await db.saves.get('bob:autosave:other')).toBeTruthy();
 });
 it('refuses corrupted institution saves before overwriting a valid checkpoint',async()=>{
  const s=campaign('protected');await saveGame(s,autosaveId('protected'),'good','guest');
  const before=await db.saves.get(autosaveId('protected'));s.council.influenceByCountry.TUR=NaN;
  await expect(saveGame(s,autosaveId('protected'),'bad','guest')).rejects.toThrow('invalid save');
  expect(await db.saves.get(autosaveId('protected'))).toEqual(before);
 });
});
