import {describe,it,expect} from 'vitest';
import {landingReducer,normalizeLegacyScreen,INITIAL_LANDING_STATE,type LandingEvent,type LandingState} from '../ui/landing/landingMachine';

const run=(events:LandingEvent[],from:LandingState=INITIAL_LANDING_STATE)=>events.reduce(landingReducer,from);
const landing=run([{type:'BOOT_RESOLVED'}]);
const loading=run([{type:'CONTINUE'}],landing);

describe('landingReducer',()=>{
 it('starts booting and resolves to the landing screen',()=>{
  expect(INITIAL_LANDING_STATE.screen).toBe('booting');
  expect(landing).toEqual({screen:'landing',overlay:null,intent:null,progress:0,error:null});
 });
 it('goes straight to the game when boot finds an active game',()=>{
  const state=run([{type:'BOOT_RESOLVED',hasActiveGame:true}]);
  expect(state.screen).toBe('game');expect(state.progress).toBe(100);
 });
 it('opens setup for Play now and New campaign, and returns on cancel',()=>{
  for(const type of ['PLAY_NOW','NEW_CAMPAIGN'] as const){
   const setup=run([{type}],landing);expect(setup.screen).toBe('setup');
   expect(run([{type:'SETUP_CANCELLED'}],setup).screen).toBe('landing');
  }
 });
 it('loads for Continue with the continue intent',()=>expect(loading).toMatchObject({screen:'loading',intent:'continue',progress:0,error:null}));
 it('loads after setup is committed with the new intent',()=>{
  const state=run([{type:'PLAY_NOW'},{type:'SETUP_COMMITTED'}],landing);
  expect(state).toMatchObject({screen:'loading',intent:'new'});
 });
 it('only moves progress forward, clamps it below 100 and ignores bad numbers',()=>{
  let state=run([{type:'PRELOAD_PROGRESS',percent:40}],loading);expect(state.progress).toBe(40);
  state=run([{type:'PRELOAD_PROGRESS',percent:25}],state);expect(state.progress).toBe(40);
  state=run([{type:'PRELOAD_PROGRESS',percent:250}],state);expect(state.progress).toBe(99);
  state=run([{type:'PRELOAD_PROGRESS',percent:NaN},{type:'PRELOAD_PROGRESS',percent:-5}],state);expect(state.progress).toBe(99);
 });
 it('returns the same state object when progress does not change',()=>{
  const state=run([{type:'PRELOAD_PROGRESS',percent:30}],loading);
  expect(landingReducer(state,{type:'PRELOAD_PROGRESS',percent:10})).toBe(state);
 });
 it('reaches the game at exactly 100 on LOAD_OK',()=>{
  const state=run([{type:'PRELOAD_PROGRESS',percent:80},{type:'LOAD_OK'}],loading);
  expect(state).toMatchObject({screen:'game',progress:100,error:null});
 });
 it('stays on the loading screen with the reason when a load fails, and freezes progress and success',()=>{
  const failed=run([{type:'PRELOAD_PROGRESS',percent:50},{type:'LOAD_FAILED',reason:'corrupt'}],loading);
  expect(failed).toMatchObject({screen:'loading',error:'corrupt',progress:50});
  expect(landingReducer(failed,{type:'PRELOAD_PROGRESS',percent:70})).toBe(failed);
  expect(landingReducer(failed,{type:'LOAD_OK'})).toBe(failed);
  expect(run([{type:'LOAD_FAILED'}],loading).error).toBe('unknown');
 });
 it('retries a failed load with START_PRELOAD, keeping the intent and clearing error and progress',()=>{
  const failed=run([{type:'PRELOAD_PROGRESS',percent:50},{type:'LOAD_FAILED',reason:'missing'}],loading);
  expect(landingReducer(failed,{type:'START_PRELOAD'})).toEqual({screen:'loading',overlay:null,intent:'continue',progress:0,error:null});
 });
 it('returns to the landing screen from setup, loading and game, clearing load state',()=>{
  const game=run([{type:'LOAD_OK'}],loading);
  const failed=run([{type:'LOAD_FAILED',reason:'corrupt'}],loading);
  for(const from of [run([{type:'PLAY_NOW'}],landing),loading,failed,game])expect(landingReducer(from,{type:'RETURN_TO_MENU'})).toEqual(landing);
 });
 it('opens and closes the profile overlay on the landing screen only',()=>{
  const open=run([{type:'OPEN_PROFILE'}],landing);expect(open.overlay).toBe('profile');
  expect(landingReducer(open,{type:'OPEN_PROFILE'})).toBe(open);
  expect(landingReducer(open,{type:'CLOSE_OVERLAY'}).overlay).toBeNull();
  expect(landingReducer(landing,{type:'CLOSE_OVERLAY'})).toBe(landing);
  expect(landingReducer(loading,{type:'OPEN_PROFILE'})).toBe(loading);
 });
 it('drops the overlay when leaving the landing screen',()=>{
  expect(run([{type:'OPEN_PROFILE'},{type:'PLAY_NOW'}],landing).overlay).toBeNull();
 });
 it('ignores events that do not apply to the current screen',()=>{
  const setup=run([{type:'PLAY_NOW'}],landing);
  const cases:[LandingState,LandingEvent[]][]=[
   [INITIAL_LANDING_STATE,[{type:'PLAY_NOW'},{type:'CONTINUE'},{type:'RETURN_TO_MENU'},{type:'LOAD_OK'},{type:'SETUP_COMMITTED'}]],
   [landing,[{type:'BOOT_RESOLVED'},{type:'LOAD_OK'},{type:'LOAD_FAILED'},{type:'SETUP_COMMITTED'},{type:'SETUP_CANCELLED'},{type:'START_PRELOAD'},{type:'PRELOAD_PROGRESS',percent:5},{type:'RETURN_TO_MENU'}]],
   [setup,[{type:'PLAY_NOW'},{type:'CONTINUE'},{type:'LOAD_OK'},{type:'PRELOAD_PROGRESS',percent:5},{type:'OPEN_PROFILE'}]],
   [loading,[{type:'PLAY_NOW'},{type:'CONTINUE'},{type:'SETUP_COMMITTED'},{type:'SETUP_CANCELLED'},{type:'BOOT_RESOLVED'}]],
  ];
  for(const [state,events] of cases)for(const event of events)expect(landingReducer(state,event),`${state.screen} ${event.type}`).toBe(state);
 });
 it('does not modify the state it is given',()=>{
  const before=JSON.stringify(loading);
  landingReducer(loading,{type:'PRELOAD_PROGRESS',percent:60});landingReducer(loading,{type:'LOAD_FAILED',reason:'corrupt'});
  expect(JSON.stringify(loading)).toBe(before);
 });
});

describe('normalizeLegacyScreen',()=>{
 it('maps the pre-9.4 login, register and hub screens to landing',()=>{
  for(const legacy of ['login','register','hub'])expect(normalizeLegacyScreen(legacy)).toBe('landing');
 });
 it('keeps current screens and falls back to landing for anything else',()=>{
  for(const screen of ['booting','landing','setup','loading','game'] as const)expect(normalizeLegacyScreen(screen)).toBe(screen);
  for(const bad of [undefined,null,42,'',{},'Hub'])expect(normalizeLegacyScreen(bad)).toBe('landing');
 });
});
