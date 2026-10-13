import {beforeEach,describe,expect,it} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {useGameStore} from '../store/gameStore';
import {intentFrame,workspaceVisible,type WorkspaceDestination,type WorkspaceFrame} from '../store/workspaceNavigation';
import {workspaceForSelection} from '../ui/panels/targetCountryHub';
import {commandAlerts} from '../store/commandIntelligence';
import {snapshotGame} from '../persistence/snapshot';

const empty:WorkspaceFrame={selectedCountryId:null,activeTool:null,warWindowId:null,navigation:null};
beforeEach(()=>useGameStore.setState({...makeInitialState(),...empty,workspaceTrail:[]}));
const destinations: Array<[WorkspaceDestination,string|null,string|null,string]> = [
 [{kind:'country-hub',countryId:'FRA'},'FRA',null,'country-hub'],
 [{kind:'country-info',countryId:'FRA'},'FRA',null,'country-info'],
 [{kind:'country-panel',countryId:'FRA',tab:'trade'},'FRA',null,'trade'],
 [{kind:'operational-assessment',targetCountryId:'FRA'},'FRA',null,'operational-assessment'],
 [{kind:'fuel-help',targetCountryId:'FRA'},null,'help','fuel-help'],
 [{kind:'factory',focusedFactory:'civil_factory'},'TUR',null,'production'],
 [{kind:'market',tab:'open',focusedGood:'fuel'},null,'market','market'],
 [{kind:'market',tab:'contracts',focusedGood:'fuel'},null,'market','market'],
 [{kind:'diplomatic-inbox',tab:'offers'},null,'desk','diplomatic-inbox'],
 [{kind:'diplomatic-inbox',tab:'correspondence'},null,'diplomacy','diplomatic-inbox'],
 [{kind:'news',filter:'wars'},null,'sitrep','news'],
];
describe('Phase 7 semantic workspace routes',()=>{
 it.each(destinations)('maps %j to the existing workspace', (intent,country,tool,panel)=>{
  const store=useGameStore.getState();expect(store.routeWorkspace(intent)).toBe(true);
  const current=useGameStore.getState();expect(current.selectedCountryId).toBe(country);expect(current.activeTool).toBe(tool);
  expect(current.navigation).toMatchObject({panel,intent});expect(current.warWindowId).toBeNull();
 });
 it('both country launchers retain the same assessment intent and return to their own frame',()=>{
  for(const source of [{kind:'country-hub',countryId:'FRA'},{kind:'country-panel',countryId:'FRA',tab:'war'}] as const){
   const store=useGameStore.getState();store.openTool(null);store.routeWorkspace(source);
   const parent=useGameStore.getState().navigation;
   store.routeWorkspace({kind:'operational-assessment',targetCountryId:'FRA'});
   const state=useGameStore.getState();
   expect(workspaceForSelection(state,'FRA','FRA')).toBe('hub');
   expect(state.navigation?.intent).toEqual({kind:'operational-assessment',targetCountryId:'FRA'});
   store.closeWorkspace();expect(useGameStore.getState().navigation).toBe(parent);
  }
 });
 it.each(['factory','market'] as const)('assessment → helper → %s → assessment retains the foreign target',kind=>{
  const store=useGameStore.getState(),assessment={kind:'operational-assessment',targetCountryId:'FRA'} as const;
  store.routeWorkspace({kind:'country-hub',countryId:'FRA'});store.routeWorkspace(assessment);
  const parent=useGameStore.getState().navigation;
  store.routeWorkspace({kind:'fuel-help',targetCountryId:'FRA'});
  store.routeWorkspace(kind==='factory'?{kind,focusedFactory:'civil_factory',returnTo:assessment}:{kind,tab:'contracts',focusedGood:'fuel',returnTo:assessment});
  expect(useGameStore.getState().selectedCountryId).toBe(kind==='factory'?'TUR':null);
  store.closeWorkspace();expect(useGameStore.getState().selectedCountryId).toBe('FRA');
  expect(useGameStore.getState().navigation).toBe(parent);
  store.closeWorkspace();expect(useGameStore.getState().navigation?.intent?.kind).toBe('country-hub');
 });
 it('an implicit return visits the helper before the assessment',()=>{
  const store=useGameStore.getState();store.routeWorkspace({kind:'operational-assessment',targetCountryId:'FRA'});
  store.routeWorkspace({kind:'fuel-help',targetCountryId:'FRA'});store.routeWorkspace({kind:'market',tab:'open',focusedGood:'fuel'});
  store.closeWorkspace();expect(useGameStore.getState().navigation?.intent?.kind).toBe('fuel-help');
  store.closeWorkspace();expect(useGameStore.getState().navigation?.intent).toEqual({kind:'operational-assessment',targetCountryId:'FRA'});
 });
 it('explicit return context works even without a previously open assessment',()=>{
  const store=useGameStore.getState();store.routeWorkspace({kind:'market',tab:'open',focusedGood:'fuel',returnTo:{kind:'operational-assessment',targetCountryId:'GRC'}});
  store.closeWorkspace();expect(useGameStore.getState().selectedCountryId).toBe('GRC');
  expect(useGameStore.getState().navigation?.intent?.kind).toBe('operational-assessment');
 });
 it('missing and annexed countries and self assessments fail without changing the workspace',()=>{
  const store=useGameStore.getState();store.routeWorkspace({kind:'country-hub',countryId:'FRA'});
  const before=useGameStore.getState();
  expect(store.routeWorkspace({kind:'operational-assessment',targetCountryId:'missing'})).toBe(false);
  expect(store.routeWorkspace({kind:'operational-assessment',targetCountryId:'TUR'})).toBe(false);
  expect(store.routeWorkspace({kind:'market',tab:'open',returnTo:{kind:'country-hub',countryId:'missing'}})).toBe(false);
  expect(useGameStore.getState()).toBe(before);
  useGameStore.setState({countries:{...before.countries,GRC:{...before.countries.GRC,annexedBy:'TUR'}}});
  expect(store.routeWorkspace({kind:'operational-assessment',targetCountryId:'GRC'})).toBe(false);
 });
 it('an annexed assessment target is skipped when its helper closes',()=>{
  const store=useGameStore.getState();store.openTool('pulse',false);
  store.routeWorkspace({kind:'operational-assessment',targetCountryId:'FRA'});store.routeWorkspace({kind:'fuel-help',targetCountryId:'FRA'});
  const current=useGameStore.getState();useGameStore.setState({countries:{...current.countries,FRA:{...current.countries.FRA,annexedBy:'TUR'}}});
  store.closeWorkspace();expect(useGameStore.getState().activeTool).toBe('pulse');expect(useGameStore.getState().selectedCountryId).toBeNull();
 });
 it('an assessment suspends its full-panel parent even when country IDs match',()=>{
  const parent=intentFrame({kind:'country-panel',countryId:'FRA',tab:'trade'},'TUR',1);
  const child=intentFrame({kind:'operational-assessment',targetCountryId:'FRA'},'TUR',2);
  expect(workspaceVisible(parent,child)).toBe(false);expect(workspaceVisible(parent,parent)).toBe(true);
 });
 it('explicit assessment requests use the common intent while legacy War routes stay compatible',()=>{
  const store=useGameStore.getState();store.navigate('operational-assessment','FRA');
  expect(useGameStore.getState().navigation?.intent?.kind).toBe('operational-assessment');
  store.navigate('war','FRA');expect(useGameStore.getState().navigation?.panel).toBe('war');expect(useGameStore.getState().navigation?.intent).toBeUndefined();
  store.navigate('war','TUR');expect(useGameStore.getState().navigation?.panel).toBe('war');expect(useGameStore.getState().navigation?.intent).toBeUndefined();
 });
 it('root rail navigation discards all assessment return frames',()=>{
  const store=useGameStore.getState();store.routeWorkspace({kind:'operational-assessment',targetCountryId:'FRA'});
  store.routeWorkspace({kind:'factory',focusedFactory:'civil_factory'});store.openTool('pulse',false);store.closeWorkspace();
  expect(useGameStore.getState().workspaceTrail).toEqual([]);expect(useGameStore.getState().selectedCountryId).toBeNull();
 });
 it('unread diplomatic alerts and legacy inbox calls cannot select the player bilateral panel',()=>{
  const state=makeInitialState();state.countries[state.playerCountryId].globalSanctions=true;state.leadership.messages=[{id:'unread',senderId:'FRA',day:state.day,kind:'birthday',text:'Hello',tone:'warm',read:false}];
  expect(commandAlerts(state).filter(a=>a.id==='sanctions'||a.id==='messages').every(a=>a.panel==='diplomacy-inbox')).toBe(true);
  const alert=commandAlerts(state).find(a=>a.id==='messages');expect(alert?.panel).toBe('diplomacy-inbox');
  const store=useGameStore.getState();store.navigate(alert!.panel,state.playerCountryId);
  expect(useGameStore.getState().activeTool).toBe('diplomacy');expect(useGameStore.getState().selectedCountryId).toBeNull();
  store.routeWorkspace({kind:'diplomatic-inbox',tab:'offers'});expect(useGameStore.getState().activeTool).toBe('desk');
 });
 it('UI intents never enter the save snapshot or mutate engine state/RNG',()=>{
  const store=useGameStore.getState(),before=snapshotGame(store);
  store.routeWorkspace({kind:'operational-assessment',targetCountryId:'FRA'});store.routeWorkspace({kind:'factory',focusedFactory:'civil_factory'});
  const after=snapshotGame(useGameStore.getState());
  expect(after).toEqual({...before,selectedCountryId:'TUR'});expect(after.schemaVersion).toBe(17);
  expect(after).not.toHaveProperty('navigation');expect(after).not.toHaveProperty('workspaceTrail');
 });
 it('country info remains a hub subview even after the full panel was chosen',()=>{
  const frame=intentFrame({kind:'country-info',countryId:'FRA'},'TUR',1);
  expect(workspaceForSelection({...frame,playerCountryId:'TUR'},'FRA','FRA')).toBe('hub');
 });
});
