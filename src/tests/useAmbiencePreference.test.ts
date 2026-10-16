// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {useAmbiencePreference,type AmbiencePreference} from '../ui/hooks/useAmbiencePreference';
import {AUDIO_SETTINGS_KEY,DEFAULT_AUDIO_SETTINGS,useAudioSettings} from '../audio/audioSettings';
import type {AudioState} from '../audio/audioService';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root,latest:AmbiencePreference;
beforeEach(()=>{localStorage.clear();useAudioSettings.setState({muted:false});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});

const fakeService=(initial:AudioState='locked',afterUnlock:AudioState='ready')=>{
 let state=initial;
 return {state:()=>state,unlock:vi.fn(async()=>{state=afterUnlock;}),applySettings:vi.fn()};
};
function Probe({service}:{service:ReturnType<typeof fakeService>}) {latest=useAmbiencePreference(service);return null;}
// A new key each time, so every mount starts from the service it is given instead of the previous one's remembered state.
let mounts=0;
const mount=async(service=fakeService())=>{await act(async()=>{root.render(createElement(Probe,{service,key:++mounts}));});return service;};
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};

describe('useAmbiencePreference',()=>{
 it('mirrors the game\'s mute setting',async()=>{
  await mount();expect(latest.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);
  await act(async()=>{useAudioSettings.getState().setMuted(true);});expect(latest.muted).toBe(true);
 });
 it('toggles the shared setting and stores it where the in-game options read it',async()=>{
  await mount();
  await act(async()=>{latest.toggleMuted();});await settle();
  expect(latest.muted).toBe(true);expect(useAudioSettings.getState().muted).toBe(true);
  expect(JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY)!).muted).toBe(true);
  await act(async()=>{latest.toggleMuted();});await settle();
  expect(latest.muted).toBe(false);expect(JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY)!).muted).toBe(false);
 });
 it('unlocks the audio service on the press and applies the new setting afterwards',async()=>{
  const service=await mount();
  await act(async()=>{latest.toggleMuted();});await settle();
  expect(service.unlock).toHaveBeenCalledTimes(1);expect(service.applySettings).toHaveBeenCalledTimes(1);
 });
 it('treats a locked or ready backend as available',async()=>{
  for(const state of ['locked','loading','ready'] as AudioState[]){await mount(fakeService(state,state));expect(latest.audioAvailable,state).toBe(true);}
 });
 it('reports unavailable at once when the backend already failed, and after a press that finds it failed',async()=>{
  await mount(fakeService('unavailable'));expect(latest.audioAvailable).toBe(false);
  await mount(fakeService('locked','unavailable'));expect(latest.audioAvailable).toBe(true);
  await act(async()=>{latest.toggleMuted();});await settle();expect(latest.audioAvailable).toBe(false);
 });
 it('keeps the setting and does not throw when unlocking fails',async()=>{
  const service={state:()=>'locked' as AudioState,unlock:vi.fn(async()=>{throw new Error('blocked');}),applySettings:vi.fn()};
  await act(async()=>{root.render(createElement(Probe,{service}));});
  await act(async()=>{latest.toggleMuted();});await settle();
  expect(latest.muted).toBe(true);expect(service.applySettings).toHaveBeenCalledTimes(1);
 });
 it('never touches game state or the simulation',()=>{
  const sources=import.meta.glob<string>(['../ui/hooks/useAmbiencePreference.ts'],{query:'?raw',import:'default',eager:true});
  const source=Object.values(sources)[0];
  expect(source.length).toBeGreaterThan(100);
  expect(/store\/gameStore|useGameStore|engine\/|simulation\//.test(source)).toBe(false);
 });
});
