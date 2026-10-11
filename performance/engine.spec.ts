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
