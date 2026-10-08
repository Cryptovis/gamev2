import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {processResearch,researchCapacity,researchDuration,cancelResearch,unlockTechnology} from '../engine/systems/technology';
import {migrateSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {selectMostRecentCompatibleSave} from '../persistence/saveGame';
import {AutosaveCoordinator} from '../persistence/autosaveCoordinator';
import {recordReports,JOURNAL_LIMIT} from '../engine/journal';
import {translateText} from '../i18n/localeText';
import {processEnergyAI,createEnergy} from '../engine/systems/energy';

const prepared=()=>{const s=makeInitialState();s.countries.TUR.economy.treasury=100;s.countries.TUR.technology.researchPoints=100;return s;};
describe('0.82 reliable commands and saves',()=>{
 it('one confirmed power request charges once across save/load; separate requests build separately',()=>{
  const s=prepared(),command={type:'energy/build' as const,kind:'solar' as const,commandId:'confirmation-A'};
  const n=applyGameCommand(s,command),loaded=migrateSave(snapshotGame(n))!;
  expect(executeCommandResult(loaded,command).status).toBe('duplicate');
  expect(applyGameCommand(loaded,command)).toBe(loaded);
  const separate=applyGameCommand(loaded,{...command,commandId:'confirmation-B'});
  expect(separate.world.energy!.TUR.projects).toHaveLength(2);
  expect(separate.countries.TUR.economy.treasury).toBeCloseTo(98.8);
 });
 it('unavailable confirmation has no charge and can be retried after meeting requirements',()=>{
  const s=prepared();s.countries.TUR.economy.treasury=0;
  const command={type:'energy/build' as const,kind:'solar' as const,commandId:'retry'};
  expect(executeCommandResult(s,command).status).toBe('unavailable');
  s.countries.TUR.economy.treasury=10;
  expect(executeCommandResult(s,command).status).toBe('applied');
 });
 it('retains funded tutorial project identity instead of requiring another investment after load',()=>{
  const s=prepared();s.world.tutorial={active:true,step:3,completed:false};
  const n=applyGameCommand(s,{type:'industry/build',kind:'coal_mine',commandId:'practice'});
  expect(n.world.tutorial.practiceProjectId).toBeTruthy();
  const loaded=migrateSave(snapshotGame(n))!;
  expect(loaded.world.tutorial.practiceProjectId).toBe(n.world.tutorial.practiceProjectId);
  const cancelled=applyGameCommand(loaded,{type:'construction/cancel',id:n.world.tutorial.practiceProjectId!});
  expect(cancelled.world.tutorial.practiceProjectId).toBeUndefined();
 });
 it('migrates schema 14 without deleting energy, credit, unlocks or reports',()=>{
  const s=prepared();s.schemaVersion=14;s.countries.TUR.technology.unlocked=['energy-grid'];
  const old=applyGameCommand(s,{type:'energy/build',kind:'solar'});delete old.world.journal;delete old.world.commandIds;
  const n=migrateSave(snapshotGame(old))!;
  expect(n.schemaVersion).toBe(15);expect(n.world.energy).toEqual(old.world.energy);expect(n.countries.TUR.technology.unlocked).toEqual(['energy-grid']);expect(n.world.journal![0].kind).toBe('legacy');
 });
 it('rejects malformed shapes and non-finite values without throwing',()=>{
  const s=prepared();s.countries.TUR.economy.treasury=NaN;expect(migrateSave(s)).toBeNull();
  expect(migrateSave({schemaVersion:15} as typeof s)).toBeNull();
 });
 it('loads a previous compatible record when the newest is incompatible',()=>{
  const s=prepared();expect(selectMostRecentCompatibleSave([{state:{...s,schemaVersion:99}},{state:s}])?.day).toBe(s.day);
 });
 it('autosave failure is retryable at the same day',async()=>{
  const c=new AutosaveCoordinator();let attempts=0;
  expect(await c.save('campaign-A:5',async()=>{attempts++;throw Error('disk');})).toBe(false);
  expect(await c.save('campaign-A:5',async()=>{attempts++;})).toBe(true);
  expect(attempts).toBe(2);
 });
 it('deduplicates pending and successful writes while distinguishing campaigns',async()=>{
  const c=new AutosaveCoordinator();let count=0,release!:()=>void;
  const write=()=>{count++;return new Promise<void>(r=>release=r)};
  const a=c.save('A:5',write),b=c.save('A:5',write);await Promise.resolve();release();
  expect(await a).toBe(true);expect(await b).toBe(true);expect(count).toBe(1);
  await c.save('A:5',write);await c.save('B:5',async()=>{count++;});expect(count).toBe(2);
 });
});
describe('0.82 funded multi-day research',()=>{
 it('pays once, blocks parallel projects and preserves work on load',()=>{
  const s=prepared(),n=unlockTechnology(s,'TUR','econ-logistics');
  expect(n.countries.TUR.technology.researchPoints).toBe(76);
  expect(n.countries.TUR.technology.unlocked).not.toContain('econ-logistics');
  expect(unlockTechnology(n,'TUR','energy-grid')).toBe(n);
  const next=processResearch({...n,day:n.day+1}),restored=migrateSave(snapshotGame(next))!;
  expect(restored.countries.TUR.technology.project).toEqual(next.countries.TUR.technology.project);
 });
 it('same day cannot progress twice; completion applies exactly once',()=>{
  let s=unlockTechnology(prepared(),'TUR','econ-logistics');
  expect(processResearch(s)).toBe(s);
  s=processResearch({...s,day:s.day+1});expect(processResearch(s)).toBe(s);
  const days=researchDuration(s,'TUR','econ-logistics');
  for(let i=0;i<days;i++)s=processResearch({...s,day:s.day+1});
  expect(s.countries.TUR.technology.unlocked.filter(id=>id==='econ-logistics')).toHaveLength(1);expect(s.countries.TUR.technology.project).toBeNull();expect(processResearch(s)).toBe(s);
 });
 it('campus capacity speeds research; occupied teams pause',()=>{
  let s=prepared();const before=researchCapacity(s,'TUR');
  s.world.governance!.academies.TUR.buildings.institute+=2;
  expect(researchCapacity(s,'TUR')).toBeGreaterThan(before);
  s=unlockTechnology(s,'TUR','econ-logistics');s.countries.TUR.controllerCountryId='GRC';
  const n=processResearch({...s,day:s.day+1});expect(n.countries.TUR.technology.project!.workDone).toBe(0);
 });
 it('cancellation refunds only the unfinished 80 percent once',()=>{
  let s=unlockTechnology(prepared(),'TUR','econ-logistics');s=processResearch({...s,day:s.day+1});
  const p=s.countries.TUR.technology.project!,n=cancelResearch(s,'TUR');
  expect(n.countries.TUR.technology.researchPoints).toBeCloseTo(76+24*.8*(1-p.workDone/p.requiredWork));expect(cancelResearch(n,'TUR')).toBe(n);
 });
 it('energy AI starts research under the same project rules without instantly unlocking',()=>{
  const s=prepared();s.day=14;s.countries.GRC.economy.treasury=100;s.countries.GRC.technology.researchPoints=100;
  s.world.energy={GRC:{...createEnergy(s.countries.GRC),lastDemand:100}};
  const n=processEnergyAI(s);
  expect(n.countries.GRC.technology.unlocked).not.toContain('energy-grid');expect(n.countries.GRC.technology.project).toBeDefined();
 });
 it('an acquired discovery retires overlapping research without applying its bonus twice',()=>{
  let s=unlockTechnology(prepared(),'TUR','econ-logistics');
  s.countries.TUR.technology.unlocked.push('econ-logistics');
  const productivity=s.countries.TUR.economy.productivity;
  s=processResearch({...s,day:s.day+1});
  expect(s.countries.TUR.technology.project).toBeNull();
  expect(s.countries.TUR.economy.productivity).toBe(productivity);
  expect(s.countries.TUR.technology.unlocked.filter(x=>x==='econ-logistics')).toHaveLength(1);
  expect(s.countries.TUR.technology.researchPoints).toBeCloseTo(95.2);
 });
 it('rejects unknown and invalid research projects before loading',()=>{
  const s=unlockTechnology(prepared(),'TUR','econ-logistics');
  s.countries.TUR.technology.project!.technologyId='unknown';expect(migrateSave(snapshotGame(s))).toBeNull();
  s.countries.TUR.technology.project!.technologyId='econ-logistics';s.countries.TUR.technology.project!.workDone=-1;
  expect(migrateSave(snapshotGame(s))).toBeNull();
 });
 it('same inputs produce identical research outcomes',()=>{
  const run=()=>{let s=unlockTechnology(prepared(),'TUR','energy-grid');for(let i=0;i<40;i++)s=processResearch({...s,day:s.day+1});return snapshotGame(s);};
  expect(run()).toEqual(run());
 });
});
describe('0.82 news and Turkish commands',()=>{
 it('keeps dated history beyond twelve recent reports with a bounded size',()=>{
  let s=prepared();for(let day=2;day<230;day++)s=recordReports(s,{...s,day,sitrep:[`Report ${day}`,...s.sitrep].slice(0,12)});
  expect(s.world.journal).toHaveLength(JOURNAL_LIMIT);expect(s.world.journal![0].day).toBe(229);expect(new Set(s.world.journal!.map(x=>x.id)).size).toBe(JOURNAL_LIMIT);
  expect(migrateSave(snapshotGame(s))!.world.journal).toEqual(s.world.journal);
 });
 it.each(['Loaded Day 10','Saved Day 10','RESEARCH // Integrated Logistics started by Turkey; estimated 23 days.','RESEARCH // Project cancelled; 12.00 RP refunded.','Buy / supply options','Return to your nation','News Archive'])('translates %s',message=>expect(translateText('tr',message)).not.toBe(message));
});
