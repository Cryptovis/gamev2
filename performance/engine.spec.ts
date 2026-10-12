import {test,expect} from 'vitest';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {cpus} from 'node:os';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
import {snapshotGame} from '../src/persistence/snapshot';
import {canLoadSave} from '../src/persistence/migrations';
import {distribution,measuredCampaign} from './campaign';
import {connectionIndex} from '../src/map/connectionIndex';

test('measure real campaigns, snapshots and save validation without changing rules',()=>{
 const reports=[];
 for(const days of [0,365,1095]){
  const ticks:number[]=[];
  const state=measuredCampaign(days,ms=>ticks.push(ms));
  expect(canLoadSave(state)).toBe(true);
  const snapshot:number[]=[],validation:number[]=[];
  for(let i=0;i<12;i++){
   let started=performance.now();const saved=snapshotGame(state);const duration=performance.now()-started;
   started=performance.now();expect(canLoadSave(saved)).toBe(true);const checked=performance.now()-started;
   if(i>1){snapshot.push(duration);validation.push(checked);}
  }
  const ids=Object.keys(state.countries),legacy:number[]=[],indexed:number[]=[];
  const scan=()=>ids.map(id=>{
   const connected=(d:{active:boolean;buyerId:string;sellerId:string})=>d.active&&((d.buyerId===state.playerCountryId&&d.sellerId===id)||(d.sellerId===state.playerCountryId&&d.buyerId===id));
   return [Object.values(state.tradeDeals).some(connected)||Object.values(state.industrialContracts).some(connected),Object.values(state.embassies).some(e=>(e.countryA===state.playerCountryId&&e.countryB===id)||(e.countryB===state.playerCountryId&&e.countryA===id))];
  });
  const lookup=()=>{const index=connectionIndex(state.playerCountryId,state.tradeDeals,state.industrialContracts,state.embassies);return ids.map(id=>[index.tradePartners.has(id),index.embassyPartners.has(id)]);};
  expect(lookup()).toEqual(scan());
  for(let i=0;i<32;i++){
   let start=performance.now();scan();const scanned=performance.now()-start;
   start=performance.now();lookup();const built=performance.now()-start;
   if(i>1){legacy.push(scanned);indexed.push(built);}
  }
  reports.push({days,day:state.day,countries:ids.length,tradeDeals:Object.keys(state.tradeDeals).length,contracts:Object.keys(state.industrialContracts).length,embassies:Object.keys(state.embassies).length,saveBytes:Buffer.byteLength(JSON.stringify(snapshotGame(state))),ticksMs:ticks.length?distribution(ticks):null,snapshotMs:distribution(snapshot),validationMs:distribution(validation),relationScanMs:distribution(legacy),relationIndexMs:distribution(indexed)});
 }
 mkdirSync('performance/results',{recursive:true});
 writeFileSync('performance/results/engine.json',JSON.stringify({version,node:process.version,cpu:cpus()[0]?.model,reports},null,2)+'\n');
 console.log(JSON.stringify(reports));
});

// Phase 1 baseline only: independent, identical seeded inputs; no balance or selector changes.
import {makeInitialState} from '../src/data/initialState';
import {applyGameCommand} from '../src/engine/commands';
import {withWarFuel} from '../src/tests/warFixture';
import {startTacticalBattle,processAutoTacticalWars} from '../src/engine/systems/tactical';
import {processAutoWars} from '../src/engine/systems/warfare';
import {processTradeRelations} from '../src/engine/systems/worldDynamics';
import {tickGame} from '../src/engine/tick';

test('Phase 1 baseline for relation updates and simultaneous wars',()=>{
 const reports=[];
 for(const warCount of [0,4,8]){
  let state=makeInitialState();state.world.tutorial.active=false;state.eventCooldownUntil=100000;state.advisorCooldownUntil=100000;
  const pairs=[['TUR','GRC'],['USA','CAN'],['FRA','DEU'],['RUS','CHN'],['BRA','ARG'],['IND','PAK'],['IRN','IRQ'],['JPN','KOR']];
  for(const [i,[attacker,target]] of pairs.slice(0,warCount).entries()){
   state=withWarFuel({...state,playerCountryId:attacker},attacker);
   state=applyGameCommand(state,{type:'military/declareWar',targetCountryId:target});
   const war=Object.values(state.wars).find(w=>w.attackerId===attacker&&w.defenderId===target)!;expect(war).toBeDefined();
   if(i===0)state=startTacticalBattle(state,war.id);
   state.wars[war.id].autoAssault=true;
  }
  state={...state,playerCountryId:'TUR',day:state.day+1};expect(canLoadSave(state)).toBe(true);
  const resolved=processAutoTacticalWars(processAutoWars(state));
  expect(Object.values(resolved.wars).filter(w=>w.rounds>state.wars[w.id].rounds)).toHaveLength(warCount);
  const times:Record<string,number[]>={relations:[],combat:[],tick:[]};
  for(let i=0;i<22;i++)for(const [name,run] of Object.entries({relations:()=>processTradeRelations(state),combat:()=>processAutoTacticalWars(processAutoWars(state)),tick:()=>tickGame(state)})){
   const start=performance.now();const next=run();const ms=performance.now()-start;if(i>1)times[name].push(ms);expect(Number.isFinite(next.day)).toBe(true);
  }
  reports.push({warCount,activeWars:Object.values(state.wars).filter(w=>w.status==='active').length,relationEntries:Object.values(state.countries).reduce((sum,c)=>sum+Object.keys(c.diplomacy.relations).length,0),timingsMs:Object.fromEntries(Object.entries(times).map(([key,value])=>[key,distribution(value)]))});
 }
 mkdirSync('performance/results',{recursive:true});writeFileSync('performance/results/phase1-engine.json',JSON.stringify({node:process.version,cpu:cpus()[0]?.model,reports},null,2)+'\n');console.log(JSON.stringify(reports));
});
