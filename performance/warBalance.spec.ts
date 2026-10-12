import {test,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {BALANCE_SEEDS,SCENARIOS,mean,runAuto,runSmallEconomyDefense,runTactical} from '../src/tests/warBalanceHarness';

/** Phase 3 paired war-balance measurement. Writes performance/results/war-balance-<label>.json and a console table. */
test('measure paired war-balance scenarios',()=>{
 const auto=SCENARIOS.map(spec=>{
  const runs=BALANCE_SEEDS.map(seed=>runAuto(spec,seed,90));
  const first30=runs.map(r=>mean(r.deltas.slice(0,30)));
  const ended=runs.filter(r=>r.endDay!==null);
  return {scenario:spec.name,meanDelta30:+mean(first30).toFixed(3),minDelta30:+Math.min(...first30).toFixed(3),maxDelta30:+Math.max(...first30).toFixed(3),
   victories:runs.filter(r=>r.status==='victory').length,defeats:runs.filter(r=>r.status==='defeat').length,ongoing:runs.filter(r=>r.status==='active').length,
   meanEndDay:ended.length?+mean(ended.map(r=>r.endDay!)).toFixed(1):null,attackerLoss:+mean(runs.map(r=>r.attackerLosses)).toFixed(4),defenderLoss:+mean(runs.map(r=>r.defenderLosses)).toFixed(4),
   attackerFuel:+mean(runs.map(r=>r.attackerFuelUsed)).toFixed(1),defenderFuel:+mean(runs.map(r=>r.defenderFuelUsed)).toFixed(1),air:+runs[0].air.toFixed(1),supply:runs[0].supply.map(v=>+v.toFixed(1))};
 });
 const tactical=['equal · plains','equal · mountain','attacker 1.5× forces'].map(name=>{
  const spec=SCENARIOS.find(s=>s.name===name)!,runs=BALANCE_SEEDS.slice(0,12).map(seed=>runTactical(spec,seed,20));
  const moves=(side:'attacker'|'defender')=>runs.reduce((n,r)=>n+r.moves[side],0),rev=(side:'attacker'|'defender')=>runs.reduce((n,r)=>n+r.reversals[side],0);
  return {scenario:name,meanRounds:mean(runs.map(r=>r.rounds)),meanProgress:+mean(runs.map(r=>r.progress)).toFixed(2),
   reversalRate:{attacker:+(rev('attacker')/Math.max(1,moves('attacker'))).toFixed(3),defender:+(rev('defender')/Math.max(1,moves('defender'))).toFixed(3)},
   captures:{attacker:runs.reduce((n,r)=>n+r.captures.attacker,0),defender:runs.reduce((n,r)=>n+r.captures.defender,0)}};
 });
 const small=BALANCE_SEEDS.slice(0,6).map(seed=>runSmallEconomyDefense(seed));
 for(const r of small)console.log(`[small] ${JSON.stringify(r)}`);
 for(const r of auto)console.log(`[war] ${r.scenario.padEnd(36)} Δ30 ${String(r.meanDelta30).padStart(7)} [${r.minDelta30}, ${r.maxDelta30}] V/D/A ${r.victories}/${r.defeats}/${r.ongoing} end ${r.meanEndDay} loss ${r.attackerLoss}/${r.defenderLoss} fuel ${r.attackerFuel}/${r.defenderFuel} air ${r.air} supply ${r.supply}`);
 for(const r of tactical)console.log(`[tactical] ${r.scenario.padEnd(24)} rounds ${r.meanRounds} progress ${r.meanProgress} reversal ${JSON.stringify(r.reversalRate)} captures ${JSON.stringify(r.captures)}`);
 const label=(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_');
 mkdirSync('performance/results',{recursive:true});writeFileSync(`performance/results/war-balance-${label}.json`,JSON.stringify({seeds:BALANCE_SEEDS.length,auto,tactical,small},null,1)+'\n');
 expect(auto.length).toBe(SCENARIOS.length);
});
