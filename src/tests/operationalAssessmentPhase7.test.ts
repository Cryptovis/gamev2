import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {warPlanningView} from '../ui/panels/targetBriefing';
import {forceBand,operationalVisibility} from '../engine/systems/operationalVisibility';
import {warDeclarationStatus,openWar} from '../engine/systems/warRules';
import {getWarPreview} from '../engine/systems/warfare';
import {withWarFuel} from './warFixture';

describe('player-visible operational assessment',()=>{
 it('Unknown reveals no enemy inventory, supply, air or exact ratio; repeated previews do not advance RNG',()=>{
  const state=withWarFuel(makeInitialState());state.intelligenceLedger.FRA=0;
  const before=structuredClone(state),view=warPlanningView(state,'FRA')!;
  expect(Object.values(view.enemyForces).every(value=>value===null)).toBe(true);expect(view.enemySupply).toBeNull();expect(view.air).toBe('unknown');expect(view.outlook).toBe('unknown');expect(view.confidence).toBe('unknown');
  expect(view).not.toHaveProperty('powerRatio');expect(view).not.toHaveProperty('airSuperiority');
  for(let i=0;i<10;i++)expect(warPlanningView(state,'FRA')).toEqual(view);
  expect(state).toEqual(before);
  const changed=structuredClone(state);changed.countries.FRA.military={...changed.countries.FRA.military,personnel:1234567,tanks:8765,fighters:987,logistics:13};changed.countries.FRA.processedResources.fuel=1;
  expect(warPlanningView(changed,'FRA')).toEqual(view);
 });
 it('estimates remain stable when hidden values move within their published bands',()=>{
  const state=withWarFuel(makeInitialState());state.intelligenceLedger.FRA=75;
  const target=state.countries.FRA;target.military={...target.military,personnel:20000,tanks:100,artillery:100,fighters:20,bombers:20,warships:20,readiness:55,morale:55,logistics:55,technology:55};
  const before=warPlanningView(state,'FRA')!;target.military.personnel+=1;target.military.tanks+=1;target.military.fighters+=1;target.military.readiness+=.01;
  expect(warPlanningView(state,'FRA')).toEqual(before);expect(before.confidence).toBe('established');
  expect(before.enemyForces.personnel).toEqual({min:10000,max:49999});
  expect(before.enemySupply!.min%20).toBe(0);
 });
 it('own inventory and supply come from the engine and are labeled separately from target estimates',()=>{
  const state=makeInitialState(),view=warPlanningView(state,'GRC')!;
  expect(view.ownForces.personnel).toBe(state.countries.TUR.military.personnel);
  expect(view.ourSupply).toBe(getWarPreview(state.countries.TUR,state.countries.GRC,state.infrastructure.TUR,state.infrastructure.GRC).attackerSupply);
  expect(operationalVisibility(state,'TUR')).toBeNull();expect(operationalVisibility(state,'missing')).toBeNull();
 });
 it('force bands include zero without publishing exact zero, and have bounded/open-ended ranges',()=>{
  expect(forceBand(0,'fighters')).toEqual({min:0,max:9});expect(forceBand(999,'personnel')).toEqual({min:0,max:999});expect(forceBand(1000,'personnel')).toEqual({min:1000,max:9999});expect(forceBand(8000,'tanks')).toEqual({min:5000,max:null});
 });
 it('structured blockers agree with declaration validators for fuel, foreign control and active wars',()=>{
  let state=makeInitialState();state.countries.TUR.processedResources.fuel=0;
  let view=warPlanningView(state,'GRC')!;expect(view.block).toBe('fuel');expect(view.fuel.missing).toBeGreaterThan(0);expect(view.allowed).toBe(warDeclarationStatus(state,'TUR','GRC').allowed);
  state=withWarFuel(state);state.countries.GRC.annexedBy='USA';view=warPlanningView(state,'GRC')!;expect(view.block).toBe('target_not_independent');
  delete state.countries.GRC.annexedBy;const opened=openWar(state,'TUR','GRC');state=opened.state;view=warPlanningView(state,'GRC')!;expect(view.block).toBe('active');expect(view.activeWarId).toBe(opened.warId);expect(view.allowed).toBe(false);
 });
});
