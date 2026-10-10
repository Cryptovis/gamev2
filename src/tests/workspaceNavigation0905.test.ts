import {describe,it,expect} from 'vitest';
import {useGameStore} from '../store/gameStore';
import {workspaceParent,workspaceVisible,type WorkspaceFrame} from '../store/workspaceNavigation';
import {UI_CATALOG_0905} from '../i18n/uiCatalog0905';
import {translateText} from '../i18n/localeText';
const empty:WorkspaceFrame={activeTool:null,selectedCountryId:null,warWindowId:null,navigation:null};
describe('workspace parent navigation',()=>{
 it('restores the previous country and navigation request when a child closes',()=>{
  useGameStore.setState({...empty,workspaceTrail:[]});
  const store=useGameStore.getState();store.navigate('military','TUR');
  const parent=useGameStore.getState().navigation;store.openTool('research');
  expect(useGameStore.getState().selectedCountryId).toBeNull();
  store.closeWorkspace();expect(useGameStore.getState().selectedCountryId).toBe('TUR');
  expect(useGameStore.getState().navigation).toEqual(parent);expect(useGameStore.getState().workspaceTrail).toEqual([]);
 });
 it('root rail navigation clears old parents; closing does not resurrect them',()=>{
  useGameStore.setState({...empty,workspaceTrail:[]});const store=useGameStore.getState();
  store.selectCountry('TUR');store.openTool('research');store.openTool('pulse',false);store.closeWorkspace();
  expect(useGameStore.getState().activeTool).toBeNull();expect(useGameStore.getState().selectedCountryId).toBeNull();
 });
 it('market sections remain in one frame and war close restores the world',()=>{
  useGameStore.setState({...empty,workspaceTrail:[]});const store=useGameStore.getState();
  store.openTool('market',false);store.openTool('credit');expect(useGameStore.getState().workspaceTrail).toHaveLength(0);
  store.openTool('pulse',false);store.openWarWindow('test-war');store.openWarWindow(null);
  expect(useGameStore.getState().activeTool).toBe('pulse');
 });
 it('bounds parent history and never records identical selections',()=>{
  const state={...empty,activeTool:'pulse',workspaceTrail:Array.from({length:16},()=>empty)};
  expect(workspaceParent(state,{...empty,activeTool:'market'})).toHaveLength(16);
  expect(workspaceParent(state,{...empty,activeTool:'pulse'})).toBe(state.workspaceTrail);
 });
});
it('new window labels translate in every supported language',()=>{
 for(const [key,values] of Object.entries(UI_CATALOG_0905))for(const [i,lang] of ['tr','es','zh','ru'].entries())expect(translateText(lang,key)).toBe(values[i]);
});

it('national Power keeps a short name without changing the energy label',()=>{
 expect(translateText('en','National power')).toBe('Power');
 expect(translateText('tr','National power')).toBe('Güç');
 expect(translateText('tr','POWER')).not.toBe('Güç');
});

it('country popup follows sibling country navigation while separate child tools hide it',()=>{
 const owner={...empty,selectedCountryId:'TUR'};
 expect(workspaceVisible(owner,{...empty,selectedCountryId:'GRC'})).toBe(true);
 expect(workspaceVisible(owner,{...empty,activeTool:'research'})).toBe(false);
 expect(workspaceVisible(owner,{...empty,warWindowId:'war'})).toBe(false);
 expect(workspaceVisible({...empty,activeTool:'pulse'},{...empty,selectedCountryId:'GRC'})).toBe(false);
});
